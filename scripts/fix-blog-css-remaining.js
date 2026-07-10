#!/usr/bin/env node
/**
 * 修复遗漏的博客页 - 只有一个 <style> 块的页面
 */
const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'blog');
const CSS_LINK = '<link rel="stylesheet" href="../css/blog-article.css">';

const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));
let fixed = 0;

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  let html = fs.readFileSync(filePath, 'utf8');
  
  // 跳过已处理的页面
  if (html.includes('blog-article.css')) continue;
  
  // 检查是否有文章样式内联CSS
  if (!html.includes('.article-wrap')) continue;
  
  // 单个 <style> 块的情况
  const styleCount = (html.match(/<style>/g) || []).length;
  if (styleCount === 1) {
    html = html.replace(
      /<style>\s*\.article-wrap[\s\S]*?<\/style>/,
      CSS_LINK
    );
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`FIXED (single style): ${file}`);
    fixed++;
    continue;
  }
  
  console.log(`SKIP: ${file} (${styleCount} style blocks)`);
}

console.log(`\nFixed: ${fixed} pages`);
