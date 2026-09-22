#!/usr/bin/env node
/**
 * 把统计脚本统一铺到全站(可重复执行)。
 *
 * 背景:两段统计代码原先是内嵌在每个页面里的,而且覆盖不一致 ——
 * Google 156 个页面,百度只有 61 个。这站是冲百度搜索做的,关键词数据
 * 只覆盖两成页面,等于最该看的那份数据基本是瞎的。
 *
 * 做法:先把页面里原有的内嵌代码块全部摘掉(不摘就会双重计数,
 * 浏览量直接翻倍),再统一加一行对 js/analytics.min.js 的引用。
 *
 * 不统计:后台(admin/dashboard)、收藏夹 —— 都是自己人用的页面。
 * 404 保留统计,能看出哪些死链还在被访问。
 *
 * 用法: node scripts/apply-analytics.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const SKIP = new Set(['admin.html', 'dashboard.html', 'favorites.html', 'xhs.html']);

/* 原有的内嵌写法有好几个变体(带空格的、压缩成一行的),逐个摘干净 */
const STRIP = [
  // <script async src="…googletagmanager…"></script>
  /\n?[ \t]*<script[^>]*googletagmanager\.com[^>]*>\s*<\/script>/g,
  // 紧跟其后的 gtag 配置块
  /\n?[ \t]*<script>\s*window\.dataLayer\s*=[\s\S]*?gtag\(\s*['"]config['"][\s\S]*?<\/script>/g,
  // 百度统计的自注入块
  /\n?[ \t]*<script>\s*var\s+_hmt[\s\S]*?hm\.baidu\.com[\s\S]*?<\/script>/g,
];

const dirs = ['.', 'attraction', 'blog', 'en', 'en/attraction'];
const pages = dirs.flatMap((d) => {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.html')).map((f) => (d === '.' ? f : `${d}/${f}`));
});

const stat = { stripped: 0, added: 0, skipped: 0, files: 0 };

for (const rel of pages) {
  const skip = SKIP.has(path.basename(rel));
  const abs = path.join(ROOT, rel);
  const before = fs.readFileSync(abs, 'utf8');
  let html = before;

  // 内嵌代码一律摘掉,连不统计的页面也摘 ——
  // 后台和收藏夹本来就不该进统计,留着只会把自己人的访问算进去
  for (const rx of STRIP) {
    const n = (html.match(rx) || []).length;
    if (n) { html = html.replace(rx, ''); stat.stripped += n; }
  }

  if (skip) {
    stat.skipped++;
    if (html !== before) {
      if (!DRY) fs.writeFileSync(abs, html, 'utf8');
      stat.files++;
    }
    continue;
  }

  // 必须匹配真正的标签:注释里也可能出现这个路径
  if (!/<script[^>]+js\/analytics(\.min)?\.js/.test(html)) {
    const depth = rel.includes('/') ? '../'.repeat(rel.split('/').length - 1) : '';
    const tag = `<script src="${depth}js/analytics.min.js" defer></script>`;
    if (html.includes('</head>')) html = html.replace('</head>', `${tag}\n</head>`);
    else if (html.includes('</body>')) html = html.replace('</body>', `${tag}\n</body>`);
    else html += `\n${tag}\n`;
    stat.added++;
  }

  if (html !== before) {
    if (!DRY) fs.writeFileSync(abs, html, 'utf8');
    stat.files++;
  }
}

console.log(
  `${DRY ? '[dry-run] ' : ''}✅ 统计脚本:摘掉内嵌代码 ${stat.stripped} 处,新增引用 ${stat.added} 页,` +
  `不统计 ${stat.skipped} 页(共改动 ${stat.files} 个文件)`
);
