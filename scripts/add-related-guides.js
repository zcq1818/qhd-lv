#!/usr/bin/env node
/**
 * 给景点详情页（attraction/*.html）引入 related-guides.js
 * 用法: node scripts/add-related-guides.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'attraction');

let added = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.html')) continue;
  const file = path.join(dir, f);
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('related-guides.js')) continue;
  const script = '<script src="../js/related-guides.js" defer></script>\n';
  if (content.includes('</body>')) {
    content = content.replace('</body>', script + '</body>');
    fs.writeFileSync(file, content, 'utf8');
    added++;
  }
}

console.log('✅ 已给 ' + added + ' 个景点详情页引入 related-guides.js');
