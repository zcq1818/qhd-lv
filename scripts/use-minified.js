#!/usr/bin/env node
/**
 * 将 HTML 中的 CSS/JS 引用替换为 .min 版本
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function processFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;
  const relPath = path.relative(ROOT, filePath);
  const depth = relPath.split(path.sep).length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : '';
  
  // 替换 CSS 引用（只替换 css/ 目录下的文件）
  html = html.replace(
    /href="(css\/[^"]+)\.css"/g,
    (match, p1) => `href="${p1}.min.css"`
  );
  
  // 替换 JS 引用（只替换 js/ 目录下的文件）
  html = html.replace(
    /src="(js\/[^"]+)\.js"/g,
    (match, p1) => `src="${p1}.min.js"`
  );
  
  // 处理相对路径的 CSS 引用
  html = html.replace(
    /href="\.\.\/(css\/[^"]+)\.css"/g,
    (match, p1) => `href="../${p1}.min.css"`
  );
  
  // 处理相对路径的 JS 引用
  html = html.replace(
    /src="\.\.\/(js\/[^"]+)\.js"/g,
    (match, p1) => `src="../${p1}.min.js"`
  );
  
  if (html !== original) {
    fs.writeFileSync(filePath, html);
    return true;
  }
  return false;
}

// 处理所有 HTML 文件
let updated = 0;
function processDir(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      processDir(fullPath);
    } else if (entry.name.endsWith('.html')) {
      if (processFile(fullPath)) {
        console.log(`Updated: ${path.relative(ROOT, fullPath)}`);
        updated++;
      }
    }
  });
}

processDir(ROOT);
console.log(`\nTotal updated: ${updated} files`);
