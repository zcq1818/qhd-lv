#!/usr/bin/env node
/**
 * 提取博客页重复内联CSS → 外部文件
 * 处理两种类型：旧版（展开CSS）和新版（压缩CSS）
 */
const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'blog');
const CSS_LINK = '<link rel="stylesheet" href="../css/blog-article.css">';

const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));
let updatedOld = 0, updatedNew = 0, skipped = 0;

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  let html = fs.readFileSync(filePath, 'utf8');
  
  // 类型1：旧版博客 - 两个 <style> 块（article styles + nav search styles）
  if (html.includes('.article-wrap { max-width')) {
    // 替换第一个 <style>...</style> 块（文章样式）
    html = html.replace(
      /<style>\s*\.article-wrap \{ max-width[\s\S]*?<\/style>\s*<style>/,
      CSS_LINK + '\n<style>'
    );
    // 替换第二个 <style> 块中的 nav-search-trigger 和 breadcrumb（如果存在）
    if (html.includes('.nav-search-trigger')) {
      html = html.replace(
        /<style>\s*\.nav-search-trigger[\s\S]*?<\/style>/,
        ''
      );
    }
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`OK (old): ${file}`);
    updatedOld++;
    continue;
  }
  
  // 类型2：新版博客 - 单个压缩 <style> 块
  if (html.includes('.article-wrap{max-width')) {
    // 替换压缩的 <style>...</style> 块
    html = html.replace(
      /<style>\.article-wrap\{max-width[\s\S]*?<\/style>/,
      CSS_LINK
    );
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`OK (new): ${file}`);
    updatedNew++;
    continue;
  }
  
  console.log(`SKIP: ${file}`);
  skipped++;
}

console.log(`\nDone: ${updatedOld} old + ${updatedNew} new updated, ${skipped} skipped`);
