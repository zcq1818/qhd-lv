// 询价线索收集 API(Vercel Edge Function + Upstash Redis)
//
// 背景:此前当地向导页的预约表单是用 mailto 唤起访客自己的邮件客户端,
// 手机上多数人点了没有任何反应,线索直接蒸发,连「有人问过」都不知道。
// 现在改为直接写入 Redis,后台可查。
//
// POST /api/leads                提交一条线索,body 为 JSON
// GET  /api/leads                读取线索列表,口令放 X-Admin-Key 请求头(也接受 ?key=),?limit=100
// GET  /api/leads?stat=1         只返回统计摘要
// PATCH  /api/leads?id=xxx&status=done|new   标记处理状态(需口令)
// DELETE /api/leads?id=xxx      删除一条线索(同样需要口令)
//
// 存储结构:
//   leads:<时间戳>-<随机串>  →  线索 JSON(保存 400 天)
//   leads:index              →  有序集合,按提交时间排序,便于按时间翻页
//   leads:count              →  累计计数
//
// 口令通过环境变量 LEADS_ADMIN_KEY 配置;未配置时读取接口一律拒绝。

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  'Content-Type': 'application/json; charset=utf-8',
};

const TTL_DAYS = 400;

function getRedisConfig() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  }
  if (process.env.qhdlv_KV_REST_API_URL && process.env.qhdlv_KV_REST_API_TOKEN) {
    return { url: process.env.qhdlv_KV_REST_API_URL, token: process.env.qhdlv_KV_REST_API_TOKEN };
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  }
  return null;
}

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: CORS });

/** Upstash REST:用 pipeline 一次发多条命令 */
async function redis(cfg, commands) {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

const clean = (v, max = 400) => String(v ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, max);

/**
 * Server酱 的推送地址按 key 的代次不一样,这里自动识别,
 * 免得以后换了 key 又得回来改代码:
 *   sctp<uid>t…  Server酱³   https://<uid>.push.ft07.com/send/<key>.send
 *   SCT…         Turbo       https://sctapi.ftqq.com/<key>.send
 *   其余(SCU…)  旧版        https://sc.ftqq.com/<key>.send
 */
function serverChanUrl(sendKey) {
  const m = /^sctp(\d+)t/.exec(sendKey);
  if (m) return `https://${m[1]}.push.ft07.com/send/${sendKey}.send`;
  if (sendKey.startsWith('SCT')) return `https://sctapi.ftqq.com/${sendKey}.send`;
  return `https://sc.ftqq.com/${sendKey}.send`;
}

/**
 * 有新线索时推到微信。
 * 刻意做成「失败也不吭声」:线索这时已经写进数据库了,推送只是提醒,
 * 不能因为推送商挂了就让访客看到「提交失败」而重复提交。
 * 同时限时 5 秒 —— 访客还在等这个请求返回。
 */
async function notify(lead) {
  const sendKey = (process.env.SERVERCHAN_KEY || '').trim();
  if (!sendKey) return;

  const rows = [
    ['联系方式', lead.contact],
    ['姓名', lead.name],
    ['出行日期', lead.date],
    ['人数', lead.people],
    ['需求', lead.service],
    ['留言', lead.note],
    ['来源', lead.source],
    ['页面', lead.page],
  ].filter(([, v]) => v);

  const title = `新询价:${lead.contact}`.slice(0, 32);
  const desp = rows.map(([k, v]) => `**${k}**:${v}`).join('\n\n') +
    `\n\n[打开后台](https://www.divdu.com/dashboard)`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch(serverChanUrl(sendKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, desp }),
      signal: ctrl.signal,
    });
  } catch (e) {
    /* 推送失败不影响线索,已落库 */
  } finally {
    clearTimeout(timer);
  }
}

/** 简单限流:同一 IP 每 10 分钟最多 5 条,防刷 */
async function tooMany(cfg, ip) {
  if (!ip) return false;
  const key = `leads:rl:${ip}`;
  const out = await redis(cfg, [['INCR', key], ['EXPIRE', key, 600]]);
  const n = Number(out?.[0]?.result ?? 0);
  return n > 5;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const cfg = getRedisConfig();
  if (!cfg) return json({ ok: false, error: 'STORAGE_NOT_CONFIGURED', message: '数据库未配置' }, 200);

  const url = new URL(req.url);

  /* ---------------- 提交线索 ---------------- */
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch (e) { return json({ ok: false, error: '数据格式错误' }, 400); }

    // 蜜罐字段:正常用户看不到这个输入框,填了的一律当机器人
    if (clean(body.website)) return json({ ok: true, id: 'ignored' });

    const contact = clean(body.contact, 120);
    if (!contact) return json({ ok: false, error: '请填写联系方式' }, 400);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    try {
      if (await tooMany(cfg, ip)) return json({ ok: false, error: '提交过于频繁,请稍后再试' }, 429);
    } catch (e) { /* 限流失败不阻断正常提交 */ }

    const now = Date.now();
    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const lead = {
      id,
      createdAt: new Date(now).toISOString(),
      source: clean(body.source, 60) || 'unknown',   // 来自哪个页面/表单
      name: clean(body.name, 60),
      contact,
      date: clean(body.date, 40),
      people: clean(body.people, 40),
      service: clean(body.service, 80),
      note: clean(body.note, 800),
      page: clean(body.page, 200),                   // 提交时所在页面
      referrer: clean(req.headers.get('referer'), 200),
      ua: clean(req.headers.get('user-agent'), 200),
      status: 'new',
    };

    try {
      await redis(cfg, [
        ['SET', `leads:${id}`, JSON.stringify(lead), 'EX', String(TTL_DAYS * 86400)],
        ['ZADD', 'leads:index', String(now), id],
        ['INCR', 'leads:count'],
      ]);
    } catch (e) {
      return json({ ok: false, error: '保存失败,请改用微信或邮件联系' }, 200);
    }

    // 线索已经落库了,推送只是锦上添花:推失败绝不能让访客以为没提交成功
    await notify(lead);
    return json({ ok: true, id });
  }

  /* ---------------- 健康检查(不需要口令) ----------------
     只做一次和读线索完全相同的数据库往返,回报成功与否和耗时,
     不返回任何线索内容。用来区分「口令不对」和「数据库读不通」。 */
  if (url.searchParams.get('ping') === '1') {
    const t0 = Date.now();

    try {
      await redis(cfg, [['GET', 'leads:count'], ['ZCARD', 'leads:index']]);
      return json({ ok: true, ms: Date.now() - t0 });
    } catch (e) {
      return json({ ok: false, ms: Date.now() - t0, error: String(e && e.message || e) }, 200);
    }
  }

  /* ---------------- 读取线索(需口令) ---------------- */
  // 环境变量在控制台里粘贴时很容易带上首尾空格或换行,严格比对会导致
  // 口令明明是对的却永远进不去,所以两边都先去掉首尾空白再比。
  const adminKey = (process.env.LEADS_ADMIN_KEY || '').trim();
  // 优先取请求头:查询串会被写进函数请求日志和浏览器历史,口令不该出现在那里。
  // 仍然接受 ?key=,方便偶尔用地址栏直接排查。
  const key = (req.headers.get('x-admin-key') || url.searchParams.get('key') || '').trim();
  if (!adminKey) return json({ ok: false, error: 'ADMIN_KEY_NOT_SET', message: '请在 Vercel 环境变量中设置 LEADS_ADMIN_KEY' }, 200);
  if (!key || key !== adminKey) return json({ ok: false, error: '口令错误' }, 401);

  /* ---------------- 推送自测(需口令) ----------------
     不制造假线索,直接发一条测试推送,回报 Server酱 的原始应答。 */
  if (url.searchParams.get('testnotify') === '1') {
    const sendKey = (process.env.SERVERCHAN_KEY || '').trim();
    if (!sendKey) return json({ ok: false, error: '没有配置 SERVERCHAN_KEY' }, 200);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(serverChanUrl(sendKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '推送测试',
          desp: '看到这条就说明新线索通知已经能推到你微信了。\n\n[打开后台](https://www.divdu.com/dashboard)',
        }),
        signal: ctrl.signal,
      });
      const text = await r.text();
      return json({ ok: r.ok, status: r.status, endpoint: serverChanUrl(sendKey).replace(sendKey, '***'), reply: text.slice(0, 300) });
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e) }, 200);
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------------- 标记处理状态 ----------------
     PATCH /api/leads?id=xxx&status=done|new
     线索一多就分不清哪些回过了。这里只改 status 一个字段,
     用 KEEPTTL 保住原来的 400 天到期时间,不因为标记一下就续命。 */
  if (req.method === 'PATCH') {
    const id = (url.searchParams.get('id') || '').trim();
    const status = (url.searchParams.get('status') || '').trim();
    if (!id) return json({ ok: false, error: '缺少 id' }, 400);
    if (status !== 'done' && status !== 'new') return json({ ok: false, error: 'status 只能是 done 或 new' }, 400);

    try {
      const got = await redis(cfg, [['GET', `leads:${id}`]]);
      const raw = got?.[0]?.result;
      if (!raw) return json({ ok: false, error: '线索不存在(可能已过期或被删除)' }, 404);

      const lead = JSON.parse(raw);
      lead.status = status;
      lead.handledAt = status === 'done' ? new Date().toISOString() : '';
      await redis(cfg, [['SET', `leads:${id}`, JSON.stringify(lead), 'KEEPTTL']]);
      return json({ ok: true, id, status });
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e) }, 200);
    }
  }

  /* ---------------- 删除一条线索 ---------------- */
  if (req.method === 'DELETE') {
    const id = (url.searchParams.get('id') || '').trim();
    if (!id) return json({ ok: false, error: '缺少 id' }, 400);
    try {
      // 索引与正文一起删;leads:count 是累计提交数,不回退
      await redis(cfg, [['DEL', `leads:${id}`], ['ZREM', 'leads:index', id]]);
      return json({ ok: true, id });
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e) }, 200);
    }
  }

  try {
    const countOut = await redis(cfg, [['GET', 'leads:count'], ['ZCARD', 'leads:index']]);
    const total = Number(countOut?.[0]?.result ?? 0);
    const alive = Number(countOut?.[1]?.result ?? 0);

    if (url.searchParams.get('stat') === '1') return json({ ok: true, total, alive });

    const limit = Math.min(parseInt(url.searchParams.get('limit'), 10) || 100, 500);
    // 按时间倒序取 id
    const idsOut = await redis(cfg, [['ZRANGE', 'leads:index', '0', String(limit - 1), 'REV']]);
    const ids = idsOut?.[0]?.result || [];
    if (!ids.length) return json({ ok: true, total, alive, leads: [] });

    const rows = await redis(cfg, ids.map((i) => ['GET', `leads:${i}`]));
    const leads = rows.map((r) => { try { return JSON.parse(r.result); } catch (e) { return null; } }).filter(Boolean);
    return json({ ok: true, total, alive, leads });
  } catch (e) {
    return json({ ok: false, error: e.message }, 200);
  }
}
