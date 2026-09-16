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
const blogs = readSlugs('blog');

function url(loc, meta) {
  return `  <url><loc>${esc(SITE + loc)}</loc><priority>${meta.priority}</priority><changefreq>${meta.changefreq}</changefreq></url>`;
}

const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  url('/', { priority: '1.0', changefreq: 'daily' }),
  ...rootPages.map((p) => url(`/${p}`, ROOT_META[p] || DEFAULT_ROOT_META)),
  ...attractions.map((s) => url(`/attraction/${s}`, ATTRACTION_META)),
  ...blogs.map((s) => url(`/blog/${s}`, BLOG_META)),
  '</urlset>',
];

fs.writeFileSync(path.join(root, 'sitemap.xml'), lines.join('\n') + '\n', 'utf8');

const count = lines.length - 2; // 去掉 xml 声明和 urlset 首尾标签
console.log(`✅ sitemap.xml 已生成：${count} 个 URL`);
console.log(`   首页 1 + 根目录 ${rootPages.length} + 景点 ${attractions.length} + 博客 ${blogs.length}`);
