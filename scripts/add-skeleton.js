#!/usr/bin/env node
/**
 * 全站注入骨架屏加载（顶部进度条 + 图片 shimmer 骨架）
 * 1. 把骨架屏 CSS 追加到 style.css / style.min.css（幂等）
 * 2. 给所有 HTML 页面在 </body> 前引入 js/skeleton.min.js（幂等）
 *
 * 用法: node scripts/add-skeleton.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const CSS = `
/* ===== 骨架屏加载（全站通用） ===== */
.qhd-loadbar{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,#1a73e8,#4a9af5,#7cc3ff);box-shadow:0 0 10px rgba(26,115,232,.45);z-index:99999;border-radius:0 3px 3px 0;transition:width .25s ease,opacity .4s ease;opacity:1}
.qhd-loadbar.qhd-loadbar-done{width:100%!important;opacity:0}
.qhd-skel-img{background:#eef2f6}
.qhd-skel-img:not(.qhd-img-loaded){background-image:linear-gradient(110deg,#eef2f6 8%,#f7fafc 18%,#eef2f6 33%);background-size:200% 100%;animation:qhd-shimmer 1.6s linear infinite}
.qhd-skel-img.qhd-img-loaded{animation:none;background:none}
@keyframes qhd-shimmer{to{background-position:-200% 0}}
.qhd-skeleton{position:relative;overflow:hidden;border-radius:8px;background:#eef2f6}
.qhd-skeleton:after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 8%,rgba(255,255,255,.6) 18%,transparent 33%);background-size:200% 100%;animation:qhd-shimmer 1.4s linear infinite}
`;

// 1. 追加 CSS 到主样式表（幂等）
function appendCss(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  let content = fs.readFileSync(full, 'utf8');
  if (content.includes('qhd-loadbar')) {
    console.log('CSS 已存在，跳过: ' + file);
    return;
  }
  fs.appendFileSync(full, (content.endsWith('\n') ? '' : '\n') + CSS);
  console.log('CSS 追加成功: ' + file);
}
appendCss('style.css');
appendCss('style.min.css');

// 2. 给所有 HTML 注入 skeleton.min.js
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
  if (content.includes('skeleton.min.js')) continue;
  const rel = path.relative(root, file);
  const prefix = rel.includes(path.sep) ? '../js/' : 'js/';
  const script = '<script src="' + prefix + 'skeleton.min.js" defer></script>\n';
  if (content.includes('</body>')) {
    content = content.replace('</body>', script + '</body>');
    fs.writeFileSync(file, content, 'utf8');
    added++;
  }
}

console.log('✅ 已给 ' + added + ' 个页面注入骨架屏');
