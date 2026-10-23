#!/usr/bin/env node
/**
 * 从强页面链到新文章:按 data/see-also.json 插入「接着看」(可重复执行)。
 *
 * 新文章没有外链、也没被收录时,最快被看到的办法是从流量好的老文章链过去。
 * 以前用临时脚本插,临时目录一清就没了,文章重新生成后链接也跟着丢 —— 所以
 * 改成数据驱动、进 npm run all:清单在仓库里,每次构建都会补回来。
 *
 * - 页面已有「接着看」块(data-see-also)就往里追加,没有就插在咨询卡前
 * - 已经出现过的链接不重复加;目标文章不存在的跳过
 *
 * 用法: node scripts/apply-see-also.js [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const MARK = 'data-see-also';
const ANCHOR = '<!-- 咨询入口(由 js/lead-form.js 渲染) -->';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const conf = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'see-also.json'), 'utf8')).links || {};

let pages = 0;
let added = 0;
const skipped = [];

for (const [rel, links] of Object.entries(conf)) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { skipped.push(rel); continue; }
  let h = fs.readFileSync(file, 'utf8');
  const todo = links.filter(([href]) =>
    !h.includes(`href="${href}"`) && fs.existsSync(path.join(ROOT, href.replace(/^\//, '') + '.html')));
  if (!todo.length) continue;

  const items = todo.map(([href, text]) => `<li><a href="${esc(href)}">${esc(text)}</a></li>`).join('');
  if (h.includes(MARK)) {
    const start = h.indexOf(MARK);
    const end = h.indexOf('</ul>', start);
    h = h.slice(0, end) + items + h.slice(end);
  } else if (h.includes(ANCHOR)) {
    const block = `<div ${MARK} style="margin:28px 0 8px;padding:14px 18px;background:#f6f8fb;` +
      'border:1px solid #e5e7eb;border-radius:12px">' +
      '<b style="display:block;margin-bottom:6px;color:#0f172a">接着看</b>' +
      `<ul style="margin:0;padding-left:1.2em;line-height:1.9">${items}</ul></div>\n  `;
    h = h.replace(ANCHOR, block + ANCHOR);
  } else {
    skipped.push(rel);
    continue;
  }
  pages++;
  added += todo.length;
  if (!DRY) fs.writeFileSync(file, h, 'utf8');
}

console.log(`✅ 接着看:${pages} 页新增 ${added} 条链接${skipped.length ? `,跳过 ${skipped.length} 页(不存在或没有插入位置)` : ''}${DRY ? '(--dry,未写入)' : ''}`);
