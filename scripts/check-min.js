#!/usr/bin/env node
/**
 * 检查压缩产物是否过期:任何源文件(css/*.css、style.css、js/*.js)比对应 .min 新,即报错。
 * 用法: node scripts/check-min.js   (npm run check)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const sources = [
  ...fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css') && !f.endsWith('.min.css')).map(f => `css/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && !f.endsWith('.min.js')).map(f => `js/${f}`),
  'style.css',
];
let stale = 0;
for (const src of sources) {
  const min = src.replace(/\.(css|js)$/, '.min.$1');
  const a = path.join(ROOT, src), b = path.join(ROOT, min);
  if (!fs.existsSync(b)) { console.log(`❌ 缺少压缩文件: ${min}`); stale++; continue; }
  if (fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs + 1000) { console.log(`❌ 已过期: ${min} (源文件 ${src} 更新)`); stale++; }
}
/**
 * 第二层:页面到底引用了哪个。
 *
 * 上面只比了源文件和压缩文件的时间戳 —— accessibility.min.js 一直存在、
 * 也一直是最新的,但 9 个页面写的是 `<script src=js/accessibility.js defer>`,
 * 属性没加引号,use-minified 的正则(只认 src="…")看不见它,这里也看不见,
 * 于是那 9 个页面一直在下载未压缩的版本。所以这一层按「引用」查,
 * 并且刻意兼容不带引号的写法。
 */
const pageDirs = ['.', 'attraction', 'blog', 'en', 'en/attraction'];
const pages = pageDirs.flatMap((d) => {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.html')).map((f) => (d === '.' ? f : `${d}/${f}`));
});

// src / href 的值:带双引号、带单引号、或干脆没引号
const ASSET = /\b(?:src|href)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'>]+))/g;
const unmin = new Map();

for (const rel of pages) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const m of html.matchAll(ASSET)) {
    const raw = (m[1] || m[2] || m[3] || '').split('?')[0];
    if (/^(https?:)?\/\//.test(raw) || raw.startsWith('data:')) continue;
    if (!/\.(css|js)$/.test(raw) || /\.min\.(css|js)$/.test(raw)) continue;
    if (raw.includes('/vendor/')) continue;              // 第三方库按原样托管
    const file = raw.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
    if (!fs.existsSync(path.join(ROOT, file.replace(/\.(css|js)$/, '.min.$1')))) continue; // 没有压缩版就不算问题
    if (!unmin.has(file)) unmin.set(file, []);
    unmin.get(file).push(rel);
  }
}

for (const [file, where] of unmin) {
  console.log(`❌ 仍在引用未压缩文件: ${file}(${where.length} 个页面,例如 ${where[0]})`);
  stale++;
}

if (stale) { console.log(`\n共 ${stale} 个问题,请运行: npm run optimize`); process.exit(1); }
console.log(`✅ ${sources.length} 个压缩文件均为最新,${pages.length} 个页面均引用压缩版`);
