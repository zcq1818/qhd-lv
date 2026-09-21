#!/usr/bin/env node
/**
 * 动态生成 sitemap.xml：读取根目录 / attraction / blog 的实际 HTML 文件，
 * 自动生成完整的网站地图，避免硬编码导致的「新文章漏收录 / 已删文章残留死链」。
 * 用法: node scripts/generate-sitemap.js
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://www.divdu.com';
const root = path.join(__dirname, '..');

// 根目录页面的优先级/频率覆盖（未列出的走默认值）
const ROOT_META = {
  attractions: { priority: '0.9', changefreq: 'weekly' },
  'must-play': { priority: '0.9', changefreq: 'weekly' },
  'pitfall-guide': { priority: '0.9', changefreq: 'weekly' },
  weather: { priority: '0.8', changefreq: 'daily' },
  tide: { priority: '0.8', changefreq: 'daily' },
  blog: { priority: '0.8', changefreq: 'daily' },
  about: { priority: '0.5', changefreq: 'monthly' },
};
const DEFAULT_ROOT_META = { priority: '0.8', changefreq: 'weekly' };
const ATTRACTION_META = { priority: '0.7', changefreq: 'weekly' };
const BLOG_META = { priority: '0.6', changefreq: 'weekly' };

// 不收录的功能/系统页
const EXCLUDE_ROOT = new Set(['index.html', '404.html', 'admin.html', 'favorites.html']);

// 已合并/退役的博客（data/retired-posts.json），不再收录，避免重定向 URL 进入 sitemap
let RETIRED = new Set();
try {
  const rp = JSON.parse(fs.readFileSync(path.join(root, 'data', 'retired-posts.json'), 'utf8'));
  RETIRED = new Set((rp.posts || []).map((x) => x.slug));
} catch (e) { /* 文件不存在则不过滤 */ }


function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function readSlugs(dir) {
  return fs.readdirSync(path.join(root, dir))
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))
    .sort();
}

const rootPages = fs.readdirSync(root)
  .filter((f) => f.endsWith('.html') && !EXCLUDE_ROOT.has(f))
  .map((f) => f.replace(/\.html$/, ''))
  .sort();

const attractions = readSlugs('attraction');
const enPages = fs.existsSync(path.join(root, 'en')) ? readSlugs('en') : [];
const enAttractions = fs.existsSync(path.join(root, 'en', 'attraction')) ? readSlugs('en/attraction') : [];
const blogs = readSlugs('blog').filter((s) => !RETIRED.has(s));

// 页面最后修改时间:优先取 git 最近一次提交时间,没有则取文件 mtime
const { execSync } = require('child_process');
function lastmod(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return null;
  try {
    const out = execSync(`git log -1 --format=%cI -- "${file}"`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (out) return out.slice(0, 10);
  } catch (e) { /* 非 git 环境 */ }
  return fs.statSync(abs).mtime.toISOString().slice(0, 10);
}

function url(loc, meta, file) {
  const lm = file ? lastmod(file) : null;
  return `  <url><loc>${esc(SITE + loc)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}<priority>${meta.priority}</priority><changefreq>${meta.changefreq}</changefreq></url>`;
}

const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  url('/', { priority: '1.0', changefreq: 'daily' }, 'index.html'),
  ...rootPages.map((p) => url(`/${p}`, ROOT_META[p] || DEFAULT_ROOT_META, `${p}.html`)),
  ...enPages.map((s) => url(s === 'index' ? '/en' : `/en/${s}`, { priority: '0.7', changefreq: 'monthly' }, `en/${s}.html`)),
  ...enAttractions.map((s) => url(`/en/attraction/${s}`, { priority: '0.6', changefreq: 'monthly' }, `en/attraction/${s}.html`)),
  ...attractions.map((s) => url(`/attraction/${s}`, ATTRACTION_META, `attraction/${s}.html`)),
  ...blogs.map((s) => url(`/blog/${s}`, BLOG_META, `blog/${s}.html`)),
  '</urlset>',
];

fs.writeFileSync(path.join(root, 'sitemap.xml'), lines.join('\n') + '\n', 'utf8');

const count = lines.length - 2; // 去掉 xml 声明和 urlset 首尾标签
console.log(`✅ sitemap.xml 已生成：${count} 个 URL`);
console.log(`   首页 1 + 根目录 ${rootPages.length} + 英文 ${enPages.length + enAttractions.length} + 景点 ${attractions.length} + 博客 ${blogs.length}`);
