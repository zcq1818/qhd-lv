// 每天自动向百度推送一批 URL(Vercel Cron 触发)
//
// 背景:百度普通收录的免费额度是 10 条/天,而且超了是「整批拒绝」不是
// 部分成功。全站 211 个该收录的 URL,按这个速度要三周才推得完 —— 指望人
// 每天记得跑一次命令,第三天就会忘。所以交给定时任务。
//
// 游标存在 Redis 里(和线索、浏览量同一个实例),推到哪儿下次接着推,
// 一轮推完从头再来(内容更新后本来也需要重推)。
//
// URL 列表直接读站点自己的 sitemap.xml —— 那份本来就是「该被收录的页面」的
// 权威清单,再维护第二份必然会和它不一致。
//
// GET /api/cron-push            由 Vercel Cron 调用(带 CRON_SECRET 校验)
// GET /api/cron-push?key=xxx    手动触发,key 为 LEADS_ADMIN_KEY

const SITE = 'https://www.divdu.com';
const BATCH = 10;                       // 百度免费额度
const CURSOR_KEY = 'push:baidu:cursor';

function redisConfig() {
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

async function redis(cfg, commands) {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

/** 从 sitemap 取该收录的 URL,顺序即推送优先级 */
async function urlsFromSitemap() {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: { 'User-Agent': 'divdu-cron' } });
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  const xml = await res.text();
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

  // 首页和赶海实时查询先推:一个是门面,一个是新页面且最可能带来搜索流量
  const head = [`${SITE}/`, `${SITE}/ganhai-time`];
  const rest = all.filter((u) => !head.includes(u));
  return [...head.filter((u) => all.includes(u)), ...rest];
}

/* 新文章插队。
   只按 sitemap 轮着推,新文章排进队里要等一整轮(两百多个 URL,三周)才轮到,
   而新文章恰恰是最需要尽快被收录的。所以每天先推最近 21 天发布、还没推过的,
   剩下的名额再接着轮。

   「新文章」读 rss.xml:它的 pubDate 是文章第一次提交的日期。sitemap 的
   lastmod 不能用 —— 每次打资源指纹都会改动上百个页面,lastmod 全是新的。 */
const FRESH_KEY = 'push:baidu:fresh';
const FRESH_DAYS = 21;

async function freshFromRss() {
  try {
    const res = await fetch(`${SITE}/rss.xml`, { headers: { 'User-Agent': 'divdu-cron' } });
    if (!res.ok) return [];
    const xml = await res.text();
    const since = Date.now() - FRESH_DAYS * 86400e3;
    return [...xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<pubDate>([^<]+)<\/pubDate>/g)]
      .filter((m) => Date.parse(m[2]) >= since)
      .map((m) => m[1].trim());
  } catch (e) {
    return [];                                    // RSS 读不到就只走轮换,不影响主流程
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Vercel Cron 会带 Authorization: Bearer <CRON_SECRET>;手动触发用后台口令
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const key = (req.query.key || '').trim();
  const adminKey = (process.env.LEADS_ADMIN_KEY || '').trim();
  const byCron = secret && auth === `Bearer ${secret}`;
  const byHand = adminKey && key === adminKey;
  if (!byCron && !byHand) {
    return res.status(401).json({ ok: false, error: '需要 CRON_SECRET 或后台口令' });
  }

  const token = (process.env.BAIDU_PUSH_TOKEN || '').trim();
  if (!token) return res.status(200).json({ ok: false, error: '没有配置 BAIDU_PUSH_TOKEN' });

  const cfg = redisConfig();
  if (!cfg) return res.status(200).json({ ok: false, error: '数据库未配置,无法记住推送进度' });

  try {
    const urls = await urlsFromSitemap();
    if (!urls.length) return res.status(200).json({ ok: false, error: 'sitemap 里没有 URL' });

    const recent = (await freshFromRss()).filter((u) => urls.includes(u));
    const got = await redis(cfg, [
      ['GET', CURSOR_KEY],
      ...(recent.length ? [['SMISMEMBER', FRESH_KEY, ...recent]] : []),
    ]);
    let cursor = parseInt(got?.[0]?.result, 10) || 0;
    if (cursor >= urls.length) cursor = 0;            // 推完一轮从头再来

    const done = (recent.length && got?.[1]?.result) || [];
    const fresh = recent.filter((u, i) => !done[i]).slice(0, BATCH);
    // 轮换部分跳过今天已经插队推过的,免得同一批里重复
    const rotation = urls.slice(cursor, cursor + BATCH - fresh.length).filter((u) => !fresh.includes(u));
    const batch = [...fresh, ...rotation];

    const push = await fetch(`http://data.zz.baidu.com/urls?site=${SITE}&token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: batch.join('\n'),
    });
    const text = await push.text();
    let d = null;
    try { d = JSON.parse(text); } catch (e) { /* 配额用尽时可能不是 JSON */ }

    if (!d || d.error) {
      // 配额不足时不推进游标,明天原样重试,不会漏
      return res.status(200).json({
        ok: false, cursor, attempted: batch.length,
        error: d ? `${d.error}: ${d.message}` : text.slice(0, 200),
      });
    }

    // 游标只按轮换走过的长度前进;插队的记进集合,不会第二天再插一次
    const next = cursor + (BATCH - fresh.length);
    await redis(cfg, [
      ['SET', CURSOR_KEY, String(next)],
      ...(fresh.length ? [['SADD', FRESH_KEY, ...fresh], ['EXPIRE', FRESH_KEY, String(60 * 86400)]] : []),
    ]);

    return res.status(200).json({
      ok: true,
      fresh,
      pushed: d.success,
      remain: d.remain,
      progress: `${next}/${urls.length}`,
      wrapped: next >= urls.length,
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err && err.message || err) });
  }
}
