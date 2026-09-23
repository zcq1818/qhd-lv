#!/usr/bin/env node
/**
 * 生成 data/page-titles.json:浏览量 slug → 可读标题。
 *
 * 起因:后台的热度排行显示的是原始 slug,像
 *   2026北戴河碧螺塔海上酒吧公园门票-秦皇岛北戴河碧螺塔海上酒吧公园游玩攻略-…
 * 六十多个字塞在一列里,撑成十几行,而且根本认不出是哪篇。
 *
 * 为什么单独生成一个文件而不是让后台去读 blog-index 和 spots:
 * 那两个加起来 70KB,而且都不含栏目页的标题。这里只存 slug 和标题,
 * 一个文件覆盖全部五类 slug。
 *
 * slug 的构成规则见 js/view-counter.js 的 getSlug()。
 *
 * 用法: node scripts/gen-page-titles.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const titleOf = (html) => {
  const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  // 去掉站点后缀,后台里只要文章/页面本身的名字;顺带把实体解回字符
  return t.replace(/\s*[—|｜-]\s*秦皇岛[^—|｜]*$/, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '\"').replace(/&#39;/g, "'").trim();
};

const map = { home: '首页' };

/* ---- 博客:用索引里整理过的标题 ---- */
const rawIndex = JSON.parse(read('data/blog-index.json'));
const posts = Array.isArray(rawIndex) ? rawIndex : (rawIndex.posts || rawIndex.items || []);
for (const p of posts) if (p.slug && p.title) map[p.slug] = p.title;

/* ---- 景点:spot-<id> / en-spot-<id> ---- */
const rawSpots = JSON.parse(read('data/spots.json'));
const spots = rawSpots.spots || rawSpots;
for (const s of spots) {
  if (!s.id) continue;
  if (s.name) map[`spot-${s.id}`] = s.name;
  map[`en-spot-${s.id}`] = (s.name || s.id) + '(英文页)';
}

/* ---- 根目录栏目页:page-<名字> ---- */
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
  const name = f.replace(/\.html$/, '');
  if (['index', 'admin', 'dashboard', '404', 'favorites', 'xhs'].includes(name)) continue;
  const t = titleOf(read(f));
  if (t) map[`page-${name}`] = t;
}

/* ---- 英文总览页:en-<名字> ---- */
const enDir = path.join(ROOT, 'en');
if (fs.existsSync(enDir)) {
  for (const f of fs.readdirSync(enDir).filter((x) => x.endsWith('.html'))) {
    const name = f.replace(/\.html$/, '');
    const t = titleOf(read(`en/${f}`));
    if (t) map[name === 'index' ? 'en-index' : `en-${name}`] = t;
  }
}

const out = { generated: new Date().toISOString().slice(0, 10), count: Object.keys(map).length, titles: map };
fs.writeFileSync(path.join(ROOT, 'data', 'page-titles.json'),
  JSON.stringify(out, null, 0) + '\n', 'utf8');

const kb = (fs.statSync(path.join(ROOT, 'data', 'page-titles.json')).size / 1024).toFixed(1);
console.log(`✅ data/page-titles.json 已生成:${out.count} 条,${kb} KB`);
