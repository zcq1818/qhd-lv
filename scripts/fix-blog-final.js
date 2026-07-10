#!/usr/bin/env node
/**
 * 修复最后两个遗漏的博客页
 */
const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'blog');
const CSS_LINK = '<link rel="stylesheet" href="../css/blog-article.css">';

const filesToFix = ['beidaihe-july-tips.html', 'shanhaiguan-one-day.html'];

for (const file of filesToFix) {
  const filePath = path.join(BLOG_DIR, file);
  let html = fs.readFileSync(filePath, 'utf8');
  
  // 替换整个 <style>...</style> 块
  html = html.replace(/<style>[\s\S]*?<\/style>/, CSS_LINK);
  
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`FIXED: ${file}`);
}

console.log('Done!');
