#!/usr/bin/env node
/**
 * 批量注入浮动加群按钮脚本 js/community-float.js
 * 仅对含 #communityFloat 的页面注入；</body> 或 </html> 前插入，已存在则跳过
 * 用法: node scripts/inject-community-float.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
}

const files = [];
walk(ROOT, files);

let injected = 0, skipped = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('community-float.js')) { skipped++; continue; }
  if (html.indexOf('communityFloat') < 0) continue;

  const rel = path.relative(ROOT, file);
  const depth = rel.split(path.sep).length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : '';
  const tag = `<script src="${prefix}js/community-float.js" defer></script>`;

  if (html.indexOf('</body>') >= 0) {
    html = html.replace('</body>', tag + '\n</body>');
  } else if (html.indexOf('</html>') >= 0) {
    html = html.replace('</html>', tag + '\n</html>');
  } else {
    console.log(`⚠️  跳过（无闭合标签）: ${rel}`);
    continue;
  }

  fs.writeFileSync(file, html);
  injected++;
}

console.log(`✅ 完成：注入 ${injected} 个页面，跳过（已存在）${skipped} 个`);
