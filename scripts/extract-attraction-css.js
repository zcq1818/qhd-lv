#!/usr/bin/env node
/**
 * 提取景点页重复内联CSS → 外部文件
 * 将 attraction/*.html 中的 <style>...</style> 替换为 <link rel="stylesheet" href="../css/attraction-detail.css">
 */
const fs = require('fs');
const path = require('path');

const ATTRACTION_DIR = path.join(__dirname, '..', 'attraction');
const CSS_LINK = '<link rel="stylesheet" href="../css/attraction-detail.css">';

const files = fs.readdirSync(ATTRACTION_DIR).filter(f => f.endsWith('.html'));
let updated = 0;
let skipped = 0;

for (const file of files) {
  const filePath = path.join(ATTRACTION_DIR, file);
  let html = fs.readFileSync(filePath, 'utf8');
  
  // 检查是否已有内联 style（景点详情页的CSS）
  const styleMatch = html.match(/<style>\s*\/\* ===== Design Tokens/);
  if (!styleMatch) {
    console.log(`SKIP (no matching inline style): ${file}`);
    skipped++;
    continue;
  }
  
  // 替换 <style>...</style> 为 <link>
  // 匹配从 <style> 开始到 </style> 结束的整个块
  const styleRegex = /<style>\s*\/\* ===== Design Tokens[\s\S]*?<\/style>/;
  html = html.replace(styleRegex, CSS_LINK);
  
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`OK: ${file}`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
