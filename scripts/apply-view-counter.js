#!/usr/bin/env node
/**
 * 把浏览量统计脚本铺到全站。
 *
 * 背景:此前只有 46 篇博客装了,47 个景点页一个都没有,英文页也没有。
 * 结果是不知道哪个景点最受关注 —— 而这恰恰是招商时最有说服力的数据
 * (「鸽子窝这一页上个月多少人看」比「全站多少访问」值钱得多)。
 *
 * 排除:admin(后台)、404、favorites(纯本地功能页)。
 * 用法: node scripts/apply-view-counter.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const SKIP = new Set(['admin.html', '404.html', 'favorites.html', 'dashboard.html']);

// 退役博客不统计(它们会 301 跳走)
const retired = new Set((JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'retired-posts.json'), 'utf8')).posts || []).map((p) => p.slug));

const dirs = ['.', 'attraction', 'blog', 'en', 'en/attraction'];
const pages = dirs.flatMap((d) => {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.html')).map((f) => (d === '.' ? f : `${d}/${f}`));
});

let added = 0, skipped = 0;
for (const rel of pages) {
  const base = path.basename(rel);
  if (SKIP.has(base)) { skipped++; continue; }
  if (rel.startsWith('blog/') && retired.has(base.replace(/\.html$/, ''))) { skipped++; continue; }

  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8');
  if (/js\/view-counter(\.min)?\.js/.test(html)) { skipped++; continue; }

  const depth = rel.includes('/') ? '../'.repeat(rel.split('/').length - 1) : '';
  const tag = `<script src="${depth}js/view-counter.min.js" defer></script>\n`;
  if (html.includes('</body>')) html = html.replace('</body>', tag + '</body>');
  else if (html.includes('</html>')) html = html.replace('</html>', tag + '</html>');
  else html += tag;

  if (!DRY) fs.writeFileSync(file, html, 'utf8');
  added++;
}

console.log(`${DRY ? '[dry-run] ' : ''}✅ 浏览量统计:新增 ${added} 页,跳过 ${skipped} 页(已有或不统计)`);
