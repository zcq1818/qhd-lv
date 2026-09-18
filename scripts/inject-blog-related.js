#!/usr/bin/env node
/**
 * 批量给 blog/*.html 注入「相关阅读」脚本引用
 * 在 </body> 前插入 <script src="../js/blog-related.js" defer></script>（已存在则跳过）
 * 用法: node scripts/inject-blog-related.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const TAG = '<script src="../js/blog-related.js" defer></script>';

const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));
let injected = 0, skipped = 0;

for (const f of files) {
  const file = path.join(BLOG_DIR, f);
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('blog-related.js')) {
    skipped++;
    continue;
  }
  if (!html.includes('</body>')) {
    console.log(`⚠️  跳过（无 </body>）: ${f}`);
    continue;
  }
  html = html.replace('</body>', TAG + '\n</body>');
  fs.writeFileSync(file, html);
  injected++;
}

console.log(`✅ 完成：注入 ${injected} 篇，跳过（已存在）${skipped} 篇`);
