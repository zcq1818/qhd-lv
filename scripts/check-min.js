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
if (stale) { console.log(`\n共 ${stale} 个问题,请运行: npm run optimize`); process.exit(1); }
console.log(`✅ ${sources.length} 个压缩文件均为最新`);
