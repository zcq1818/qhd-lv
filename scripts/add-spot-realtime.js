#!/usr/bin/env node
/**
 * 给所有景点详情页引入 spot-realtime.js（实时数据关联）
 * 用法: node scripts/add-spot-realtime.js
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'attraction');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let added = 0;
for (const f of files) {
  const file = path.join(dir, f);
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('spot-realtime.js')) continue;
  if (content.includes('</body>')) {
    content = content.replace('</body>', '<script src="../js/spot-realtime.js" defer></script>\n</body>');
    fs.writeFileSync(file, content, 'utf8');
    added++;
  }
}

console.log(`✅ 已给 ${added} 个详情页引入 spot-realtime.js`);
