// 博客阅读量统计 API (Vercel Edge Function + Upstash Redis)
// POST /api/view-counter?slug=xxx   → 阅读量+1 并返回新计数
// GET  /api/view-counter?slug=xxx   → 只读取当前计数（不+1）
// GET  /api/view-counter?list=1     → 批量读取所有文章计数（列表页用）
//
// 兼容两种环境变量（自动检测）：
//   1. Upstash Redis（推荐）：UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   2. 旧版 Vercel KV：KV_REST_API_URL + KV_REST_API_TOKEN

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

// 自动检测可用的 Redis 服务（优先 Upstash，兼容 KV 和自定义前缀）
function getRedisConfig() {
  // 标准前缀 UPSTASH_REDIS_REST_*
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  }
  // 项目前缀 qhdlv_KV_REST_API_*（Vercel Storage 链接时自动生成）
  if (process.env.qhdlv_KV_REST_API_URL && process.env.qhdlv_KV_REST_API_TOKEN) {
    return { url: process.env.qhdlv_KV_REST_API_URL, token: process.env.qhdlv_KV_REST_API_TOKEN };
  }
  // 旧版 Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  }
  return null;
}

/** 北京日期 YYYY-MM-DD —— 运行时是 UTC,直接用本地日期会差一天 */
function cnDate(offsetDays = 0) {
  return new Date(Date.now() + 8 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
}

/** Upstash 的 pipeline:一次请求发多条命令 */
async function pipeline(url, token, commands) {
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

/** HGETALL 回来的是扁平数组 [字段, 值, 字段, 值…] */
function toObj(arr) {
  const o = {};
  for (let i = 0; i + 1 < (arr || []).length; i += 2) o[arr[i]] = parseInt(arr[i + 1], 10) || 0;
  return o;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  const isList = url.searchParams.get('list') === '1';
  const isIncrement = req.method === 'POST';

  const redis = getRedisConfig();

  // Redis 未配置时兜底（不影响页面渲染）
  if (!redis) {
    return new Response(JSON.stringify({
      error: 'REDIS_NOT_CONFIGURED',
      message: '请在 Vercel 项目 Storage 中创建 Upstash Redis 并链接到项目',
      count: 0,
    }), { headers: CORS, status: 200 });
  }

  const { url: REDIS_URL, token: REDIS_TOKEN } = redis;

  try {
    /* 按时间段读取:?trend=30 返回最近 N 天,每天的总量 + 这段时间内每页的量。
       一次 pipeline 把 N 天的 hash 全取回来,不按页循环。 */
    const trend = parseInt(url.searchParams.get('trend'), 10);
    if (trend > 0) {
      const n = Math.min(trend, 90);
      const dates = [];
      for (let i = n - 1; i >= 0; i--) dates.push(cnDate(-i));

      const out = await pipeline(REDIS_URL, REDIS_TOKEN,
        dates.map((d) => ['HGETALL', `views:d:${d}`]));

      const days = [];
      const counts = {};
      dates.forEach((d, i) => {
        const obj = toObj(out?.[i]?.result);
        let sum = 0;
        for (const k in obj) {
          if (k.indexOf('event-') === 0) continue;     // 转化事件不算浏览量
          sum += obj[k];
          counts[k] = (counts[k] || 0) + obj[k];
        }
        days.push({ date: d, total: sum });
      });

      return new Response(JSON.stringify({
        days, counts, total: days.reduce((t, x) => t + x.total, 0), since: dates[0],
      }), { headers: { ...CORS, 'Cache-Control': 'public, max-age=120' } });
    }

    // 批量读取所有页面计数（列表页与后台用）
    // 注意:统计范围已从博客扩到全站(约 250 个 slug),这里必须一次 MGET 取回,
    // 逐个 GET 会产生几百次串行请求,函数执行时间直接爆掉。
    if (isList) {
      const keysRes = await fetch(`${REDIS_URL}/keys/views:*`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      });
      const keysData = await keysRes.json();
      const keys = (keysData.result || []).slice(0, 1000);

      const counts = {};
      if (keys.length) {
        const mgetRes = await fetch(`${REDIS_URL}/pipeline`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([['MGET', ...keys]]),
        });
        const mgetData = await mgetRes.json();
        const values = mgetData?.[0]?.result || [];
        keys.forEach((key, i) => {
          counts[key.replace('views:', '')] = parseInt(values[i], 10) || 0;
        });
      }

      return new Response(JSON.stringify({ counts, total: Object.keys(counts).length }), {
        headers: { ...CORS, 'Cache-Control': 'public, max-age=300' },
      });
    }

    if (!slug) {
      return new Response(JSON.stringify({ error: 'MISSING_SLUG' }), {
        headers: CORS, status: 400,
      });
    }

    const key = 'views:' + slug;

    if (isIncrement) {
      // 累计值 + 当天的分页面计数,一次 pipeline 发出去。
      // 按天的数据存成「一天一个 hash」:读 30 天只要 30 条 HGETALL,
      // 换成一页一键的写法就是几千条,免费额度扛不住。
      const day = cnDate();
      const out = await pipeline(REDIS_URL, REDIS_TOKEN, [
        ['INCR', key],
        ['HINCRBY', `views:d:${day}`, slug, '1'],
        ['EXPIRE', `views:d:${day}`, String(400 * 86400)],
      ]);
      const count = parseInt(out?.[0]?.result, 10) || 1;
      return new Response(JSON.stringify({ slug, count }), {
        headers: { ...CORS, 'Cache-Control': 'no-store' },
      });
    } else {
      // 只读取
      const getRes = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      });
      const getData = await getRes.json();
      const count = parseInt(getData.result, 10) || 0;
      return new Response(JSON.stringify({ slug, count }), {
        headers: { ...CORS, 'Cache-Control': 'public, max-age=60' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'REDIS_ERROR', message: err.message, count: 0 }), {
      headers: CORS, status: 500,
    });
  }
}
