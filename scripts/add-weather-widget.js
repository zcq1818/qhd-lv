#!/usr/bin/env node
/**
 * 在所有 HTML 页面中添加天气小部件脚本
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WIDGET_SCRIPT = '<script src="js/weather-widget.js" defer></script>';

let updated = 0;

function processDir(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      processDir(fullPath);
    } else if (entry.name.endsWith('.html')) {
      let html = fs.readFileSync(fullPath, 'utf8');
      // 跳过已有天气小部件的页面
      if (html.includes('weather-widget.js')) return;
      // 在 </body> 前插入
      html = html.replace(/<\/body>/, WIDGET_SCRIPT + '\n</body>');
      fs.writeFileSync(fullPath, html);
      console.log(`OK: ${path.relative(ROOT, fullPath)}`);
      updated++;
    }
  });
}

processDir(ROOT);
console.log(`\nDone: ${updated} files updated`);
