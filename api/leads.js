// 询价线索收集 API(Vercel Edge Function + Upstash Redis)
//
// 背景:此前当地向导页的预约表单是用 mailto 唤起访客自己的邮件客户端,
// 手机上多数人点了没有任何反应,线索直接蒸发,连「有人问过」都不知道。
// 现在改为直接写入 Redis,后台可查。
//
// POST /api/leads                提交一条线索,body 为 JSON
// GET  /api/leads?key=xxx        读取线索列表(需口令),?limit=100&since=时间戳
// GET  /api/leads?key=xxx&stat=1 只返回统计摘要
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
      return json({ ok: true, id });
    } catch (e) {
      return json({ ok: false, error: '保存失败,请改用微信或邮件联系' }, 200);
    }
  }

  /* ---------------- 读取线索(需口令) ---------------- */
  // 环境变量在控制台里粘贴时很容易带上首尾空格或换行,严格比对会导致
  // 口令明明是对的却永远进不去,所以两边都先去掉首尾空白再比。
  const adminKey = (process.env.LEADS_ADMIN_KEY || '').trim();
  const key = (url.searchParams.get('key') || '').trim();
  if (!adminKey) return json({ ok: false, error: 'ADMIN_KEY_NOT_SET', message: '请在 Vercel 环境变量中设置 LEADS_ADMIN_KEY' }, 200);
  if (!key || key !== adminKey) return json({ ok: false, error: '口令错误' }, 401);

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
