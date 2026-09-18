#!/usr/bin/env node
/**
 * 批量注入转化埋点脚本 js/conversion-track.js
 * 仅对含 OTA 按钮(booking-btn) 或 入群入口(showQr) 的页面注入，路径按目录层级自动适配
 * 用法: node scripts/inject-conversion-track.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (name.endsWith('.html')) {
      out.push(full);
    }
  }
}

const files = [];
walk(ROOT, files);

let injected = 0, skipped = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('conversion-track.js')) { skipped++; continue; }
  if (html.indexOf('booking-btn') < 0 && html.indexOf('showQr') < 0) continue;
  if (html.indexOf('</body>') < 0) continue;

  // 相对根目录的层级决定脚本前缀
  const rel = path.relative(ROOT, file);
  const depth = rel.split(path.sep).length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : '';
  const tag = `<script src="${prefix}js/conversion-track.js" defer></script>`;

  html = html.replace('</body>', tag + '\n</body>');
  fs.writeFileSync(file, html);
  injected++;
}

console.log(`✅ 完成：注入 ${injected} 个页面，跳过（已存在）${skipped} 个`);
