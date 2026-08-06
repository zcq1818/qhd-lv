// 博客阅读量统计 API (Vercel Edge Function + KV)
// POST /api/view-counter?slug=xxx   → 阅读量+1 并返回新计数
// GET  /api/view-counter?slug=xxx   → 只读取当前计数（不+1）
// GET  /api/view-counter?list=1     → 批量读取所有文章计数（列表页用）

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  const isList = url.searchParams.get('list') === '1';
  const isIncrement = req.method === 'POST';

  // KV 未配置时兜底
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return new Response(JSON.stringify({ error: 'KV_NOT_CONFIGURED', count: 0 }), {
      headers: CORS, status: 200,
    });
  }

  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  try {
    // 批量读取所有文章计数（列表页用）
    if (isList) {
      const keysRes = await fetch(`${KV_URL}/keys/views:*?limit=200`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      });
      const keysData = await keysRes.json();
      const keys = keysData.result || [];
      const counts = {};
      for (const key of keys) {
        const slugName = key.replace('views:', '');
        const getRes = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${KV_TOKEN}` },
        });
        const getData = await getRes.json();
        counts[slugName] = parseInt(getData.result, 10) || 0;
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
    const getRes = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    const getData = await getRes.json();
    let count = parseInt(getData.result, 10) || 0;

    if (isIncrement) {
      count += 1;
      await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${count}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      });
    }

    return new Response(JSON.stringify({ slug, count }), {
      headers: { ...CORS, 'Cache-Control': isIncrement ? 'no-store' : 'public, max-age=60' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'KV_ERROR', message: err.message, count: 0 }), {
      headers: CORS, status: 500,
    });
  }
}
