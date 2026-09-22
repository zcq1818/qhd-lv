#!/usr/bin/env node
/**
 * 把合作商家推荐位铺到相关页面(可重复执行)。
 *
 * 位置是按「访客在这一页正好在做什么决定」挑的:看住宿页的人正在决定住哪,
 * 看海鲜页的人正在决定去哪吃 —— 这时候出现一个具体商家才有说服力。
 * 放在跟内容无关的地方就退化成横幅广告了,那是 .ad-slot 的活。
 *
 * 现在 data/partners.json 里还没有商家,页面会显示招商位。
 * 那块位置本身就是销售材料:跟民宿谈的时候可以直接指着说
 * 「你的信息会出现在这里」。
 *
 * 用法: node scripts/apply-partners.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* 页面 → 放什么类型的商家、限定哪个片区、标题 */
const TARGETS = [
  {
    file: 'accommodation.html', depth: 0, type: 'stay', area: '',
    title: '住宿合作商家', anchors: ['</main>', '<footer class="footer">'],
  },
  {
    file: 'blog/beidaihe-where-to-stay.html', depth: 1, type: 'stay', area: 'beidaihe',
    title: '北戴河的住宿合作商家',
    anchors: ['  <!-- 作者署名 + 最后更新 -->', '  <div class="article-footer">', '</article>'],
  },
  {
    file: 'seafood.html', depth: 0, type: 'food', area: '',
    title: '海鲜合作商家', anchors: ['</main>', '<footer class="footer">'],
  },
  {
    file: 'food.html', depth: 0, type: 'food', area: '',
    title: '餐饮合作商家', anchors: ['</main>', '<footer class="footer">'],
  },
  {
    file: 'ganhai-time.html', depth: 0, type: 'food', area: '',
    title: '赶海回来,海鲜加工合作商家', anchors: ['</main>', '<footer class="footer">'],
  },
];

function block({ type, area, title, depth }) {
  const wrap = depth === 0;
  const inner = `<div data-partners="${esc(type)}"${area ? ` data-area="${esc(area)}"` : ''} data-title="${esc(title)}"></div>`;
  // 根目录那几页在插入点没有带宽度约束的容器,包一层
  return wrap
    ? `<div class="lead-wrap">\n  <!-- 合作商家推荐位(由 js/partners.js 渲染) -->\n  ${inner}\n</div>\n\n`
    : `  <!-- 合作商家推荐位(由 js/partners.js 渲染) -->\n  ${inner}\n\n`;
}

/** 样式与脚本:必须匹配真正的标签,注释里也含这个路径 */
function ensureAssets(html, depth) {
  const prefix = '../'.repeat(depth);
  let out = html;
  if (!/<link[^>]+css\/partners(\.min)?\.css/.test(out)) {
    out = out.replace('</head>', `<link rel="stylesheet" href="${prefix}css/partners.min.css">\n</head>`);
  }
  if (!/<script[^>]+js\/partners(\.min)?\.js/.test(out)) {
    const tag = `<script src="${prefix}js/partners.min.js" defer></script>`;
    if (out.includes('</body>')) out = out.replace('</body>', `${tag}\n</body>`);
    else out += `\n${tag}\n`;
  }
  return out;
}

let added = 0, skipped = 0;
for (const t of TARGETS) {
  const abs = path.join(ROOT, t.file);
  if (!fs.existsSync(abs)) { console.warn(`   (找不到 ${t.file})`); skipped++; continue; }

  const before = fs.readFileSync(abs, 'utf8');
  let html = before;

  if (!html.includes('data-partners')) {
    const anchor = t.anchors.find((a) => html.includes(a));
    if (!anchor) { console.warn(`   (${t.file} 找不到插入位置)`); skipped++; continue; }
    html = html.replace(anchor, block(t) + anchor);
  }

  html = ensureAssets(html, t.depth);
  if (html === before) { skipped++; continue; }
  if (!DRY) fs.writeFileSync(abs, html, 'utf8');
  added++;
}

console.log(`${DRY ? '[dry-run] ' : ''}✅ 合作商家推荐位:新增 ${added} 处,跳过 ${skipped} 处`);
