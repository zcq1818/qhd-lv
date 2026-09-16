#!/usr/bin/env node
/**
 * 批量更新版权年份脚本
 * 用法: node scripts/update-copyright.js 2027
 * （不传参数则使用当前年份）
 */
const fs = require('fs');
const path = require('path');

const targetYear = process.argv[2] || String(new Date().getFullYear());
const root = path.join(__dirname, '..');

// 跳过无需处理的目录
const SKIP_DIRS = new Set(['node_modules', '.git', 'images', 'css', 'js', 'assets', 'ppt-temp']);

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(f)) continue;
      files.push(...walk(full));
    } else if (f.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

let count = 0;
for (const file of walk(root)) {
  const content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(/©\s*20\d\d/g, `© ${targetYear}`);
  if (updated !== content) {
    fs.writeFileSync(file, updated, 'utf8');
    count++;
  }
}

console.log(`✅ 已更新 ${count} 个文件的版权年份为 © ${targetYear}`);
