#!/usr/bin/env node
/**
 * 把「今天几点赶海」的入口链到赶海相关页面(可重复执行)。
 *
 * 这些文章和栏目页本身有流量(赶海系列四篇加起来两百多次浏览),
 * 但它们讲的是通用规律,读者真正要的是「我这几天几点去」。
 * 把实时查询挂在正文开头,读者不用自己翻潮汐表。
 *
 * 用法: node scripts/link-ganhai-time.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const CALLOUT = (depth) => {
  const href = depth ? '../ganhai-time' : 'ganhai-time';
  return `<div class="gh-callout">
  <b>不想自己算?</b>
  <a href="${href}">查今天和未来 5 天的赶海时间 →</a>
  <span>按海域选站点,自动标出低潮时刻、建议进场窗口和大潮小潮。</span>
</div>
`;
};

/* 样式挂在 page-common.css 里,所有页面都已经引用了它 */
const CSS = `
/* 赶海实时查询的入口卡片 */
.gh-callout{margin:22px 0;padding:16px 18px;border:1px solid #bfdbfe;border-radius:12px;
  background:linear-gradient(135deg,#eff6ff,#dbeafe)}
.gh-callout b{display:block;font-size:.95rem;color:#0f172a;margin-bottom:6px}
.gh-callout a{display:inline-block;font-weight:700;color:#1a73e8;text-decoration:none;font-size:1.02rem}
.gh-callout a:hover{text-decoration:underline}
.gh-callout span{display:block;margin-top:6px;font-size:.85rem;color:#475569;line-height:1.7}
`;

/* 页面 → 插入锚点(找到的第一个) */
const TARGETS = [
  { file: 'ganhai.html', depth: 0, anchors: ['<main', '<section class="section'] },
  { file: 'blog/qhd-ganhai-schedule-2026.html', depth: 1, anchors: ['<div class="article-body">'] },
  { file: 'blog/qhd-ganhai-tools-list.html', depth: 1, anchors: ['<div class="article-body">'] },
  { file: 'blog/beidaihe-ganhai-experience.html', depth: 1, anchors: ['<div class="article-body">'] },
  { file: 'blog/ganhai-seafood-cooking.html', depth: 1, anchors: ['<div class="article-body">'] },
];

/* 样式补进 page-common.css */
const cssPath = path.join(ROOT, 'css', 'page-common.css');
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  if (!css.includes('.gh-callout')) {
    if (!DRY) fs.writeFileSync(cssPath, css + CSS, 'utf8');
    console.log('   样式已补进 css/page-common.css');
  }
}

let n = 0, skipped = 0;
for (const t of TARGETS) {
  const abs = path.join(ROOT, t.file);
  if (!fs.existsSync(abs)) { console.warn(`   (找不到 ${t.file})`); skipped++; continue; }

  const before = fs.readFileSync(abs, 'utf8');
  if (before.includes('gh-callout')) { skipped++; continue; }

  const anchor = t.anchors.find((a) => before.includes(a));
  if (!anchor) { console.warn(`   (${t.file} 找不到插入位置)`); skipped++; continue; }

  // 插在锚点标签之后,而不是之前 —— 之前会跑到容器外面
  const at = before.indexOf(anchor);
  const close = before.indexOf('>', at);
  const html = before.slice(0, close + 1) + '\n' + CALLOUT(t.depth) + before.slice(close + 1);

  if (!DRY) fs.writeFileSync(abs, html, 'utf8');
  n++;
}

console.log(`${DRY ? '[dry-run] ' : ''}✅ 赶海实时查询入口:新增 ${n} 处,跳过 ${skipped} 处`);
