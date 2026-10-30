#!/usr/bin/env node
/**
 * 把一篇博客的正文抽成纯文本(标题 + 段落),核对内容、写要点速览时用。只读,不改文件。
 *
 * 用法: node scripts/article-text.js <slug> [最多字数,默认 4000]
 */
const fs = require('fs');
const path = require('path');

const [, , slug, max = '4000'] = process.argv;
if (!slug) { console.error('用法: node scripts/article-text.js <slug> [maxChars]'); process.exit(1); }
let h = fs.readFileSync(path.join(__dirname, '..', 'blog', `${slug}.html`), 'utf8');
h = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<nav[\s\S]*?<\/nav>/g, '').replace(/<footer[\s\S]*?<\/footer>/g, '');
const main = (h.match(/<(article|main)[\s\S]*<\/(article|main)>/) || [h])[0];
const text = main
  .replace(/<h([1-3])[^>]*>/g, '\n\n## ').replace(/<\/h[1-3]>/g, '\n')
  .replace(/<(p|li|tr|div)[^>]*>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
console.log(`### ${slug}  (${text.length} 字)\n` + text.slice(0, +max));
