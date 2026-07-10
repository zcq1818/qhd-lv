#!/usr/bin/env node
/**
 * 在所有 HTML 页面的 <head> 后添加 Google Analytics 代码
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const GA_TAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QNGJC2KRK0"></script>
<script>
 window.dataLayer = window.dataLayer || [];
 function gtag(){dataLayer.push(arguments);}
 gtag('js', new Date());
 gtag('config', 'G-QNGJC2KRK0');
</script>`;

let updated = 0;

function processDir(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      processDir(fullPath);
    } else if (entry.name.endsWith('.html')) {
      let html = fs.readFileSync(fullPath, 'utf8');
      // 跳过已有 GA 代码的页面
      if (html.includes('G-QNGJC2KRK0')) return;
      // 在 <head> 后插入
      html = html.replace(/<head>/, '<head>\n' + GA_TAG);
      fs.writeFileSync(fullPath, html);
      console.log(`OK: ${path.relative(ROOT, fullPath)}`);
      updated++;
    }
  });
}

processDir(ROOT);
console.log(`\nDone: ${updated} files updated`);
