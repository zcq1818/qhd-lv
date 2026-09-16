#!/usr/bin/env node
/**
 * 给全站页面引入站内搜索（search-index.js + search.js）
 * 用法: node scripts/add-search.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'images', 'css', 'js', 'assets', 'ppt-temp', 'scripts', 'data']);

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

let added = 0;
for (const file of walk(root)) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('search-index.js')) continue;
  const rel = path.relative(root, file);
  const prefix = rel.includes(path.sep) ? '../js/' : 'js/';
  const script = '<script src="' + prefix + 'search-index.js" defer></script>\n<script src="' + prefix + 'search.js" defer></script>\n';
  if (content.includes('</body>')) {
    content = content.replace('</body>', script + '</body>');
    fs.writeFileSync(file, content, 'utf8');
    added++;
  }
}

console.log('✅ 已给 ' + added + ' 个页面引入站内搜索');
