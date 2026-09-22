#!/usr/bin/env node
/**
 * 重建 rss.xml。
 *
 * 为什么要重写:仓库里那份 rss.xml 是个陈旧产物,没有生成脚本。27 条里
 * 18 条指向早已不存在的文件,description 大多是抓取时连页面导航一起
 * 扒下来的网易菜单文字(「网易首页 应用 网易新闻 网易公开课…」),
 * 还缺 pubDate/guid。这个源被每个页面用 <link rel="alternate"> 声明,
 * 订阅者和 AI 爬虫拿到的就是这些东西。
 *
 * 现在只收在线文章,标题取博客索引里整理过的那版,摘要取页面的
 * meta description(缺失时退回正文首段),日期优先取结构化数据里的
 * datePublished,没有就退回该文件被加进仓库那次提交的日期。
 *
 * 用法: node scripts/generate-rss.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.divdu.com';
const LIMIT = 40;

const retired = new Set(
  (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'retired-posts.json'), 'utf8')).posts || [])
    .map((p) => p.slug)
);
const rawIndex = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'blog-index.json'), 'utf8'));
// 这个文件历史上换过结构,数组和 {posts:[…]} 两种都兼容
const index = new Map(
  (Array.isArray(rawIndex) ? rawIndex : (rawIndex.posts || rawIndex.items || []))
    .map((p) => [p.slug, p])
);

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * 该文件「被加进仓库」那次提交的日期 —— 也就是发布日。
 * 不能用最近一次提交:批量改一遍标题,所有文章的日期就会挤成同一天,
 * 订阅源按时间排序就彻底失去意义。
 */
const firstCommit = (() => {
  const cache = new Map();
  return (rel) => {
    if (cache.has(rel)) return cache.get(rel);
    let v = null;
    try {
      const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%cI', '--follow', '--', rel],
        { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
      v = out[out.length - 1] || null;
    } catch (e) { /* 没有 git 历史就算了 */ }
    cache.set(rel, v);
    return v;
  };
})();

/** meta description 缺失时,退回正文第一段 */
function firstParagraph(html) {
  const body = (html.match(/<div class="article-body"[\s\S]*?<\/article>/) || [html])[0];
  for (const m of body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const t = m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (t.length >= 30) return t.slice(0, 160);
  }
  return '';
}

const items = [];
for (const file of fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html'))) {
  const slug = file.replace(/\.html$/, '');
  if (retired.has(slug)) continue;

  const rel = `blog/${file}`;
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');

  // 标题优先用博客索引里整理过的那版,h1 是兜底
  const title = (index.get(slug) || {}).title
    || ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]*>/g, '').trim()
    || slug;

  const desc = (html.match(/name="description" content="([^"]*)"/) || [])[1] || firstParagraph(html);

  const iso = (html.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1] || firstCommit(rel);
  const date = iso ? new Date(iso) : null;

  items.push({
    slug,
    title,
    desc,
    url: `${SITE}/blog/${encodeURI(slug)}`,
    date: date && !isNaN(date) ? date : new Date(0),
  });
}

items.sort((a, b) => b.date - a.date);
const picked = items.slice(0, LIMIT);

const rfc822 = (d) => d.toUTCString();
const now = new Date();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>秦皇岛旅游博客</title>
  <link>${SITE}/blog</link>
  <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
  <description>秦皇岛、北戴河、山海关的旅游攻略与实用信息</description>
  <language>zh-CN</language>
  <lastBuildDate>${rfc822(now)}</lastBuildDate>
${picked.map((it) => `  <item>
    <title>${esc(it.title)}</title>
    <link>${esc(it.url)}</link>
    <guid isPermaLink="true">${esc(it.url)}</guid>
    <pubDate>${rfc822(it.date)}</pubDate>
    <description>${esc(it.desc)}</description>
  </item>`).join('\n')}
</channel>
</rss>
`;

fs.writeFileSync(path.join(ROOT, 'rss.xml'), xml, 'utf8');
const noDesc = picked.filter((i) => !i.desc).length;
console.log(`✅ rss.xml 已重建:${picked.length} 条(在线文章共 ${items.length} 篇)${noDesc ? `,其中 ${noDesc} 条缺摘要` : ''}`);
