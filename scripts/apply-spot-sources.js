#!/usr/bin/env node
/**
 * 景点页:显示信息来源与核对日期,并去掉没有依据的评分结构化数据(可重复执行)。
 *
 * 为什么做:
 * - AI 搜索(豆包、Kimi、文心、ChatGPT、Perplexity 等)更愿意引用能核实的内容。
 *   景点主数据里本来就有 sources 与 asOf,但一直没显示在页面上。
 * - 景点页的 JSON-LD 里写着 aggregateRating ratingCount 100 —— 站内并没有
 *   这 100 条评价,是生成脚本写死的。谷歌把这类标记当作违规,AI 引擎核实后也会
 *   降低对整站的信任。页面上显示的星级保留(那是展示),只去掉「有 100 人评过」
 *   这个不实声明。
 *
 * 用法: node scripts/apply-spot-sources.js [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const START = '<!-- spot-sources -->';
const END = '<!-- /spot-sources -->';
const ANCHORS = ['  <!-- 咨询入口(由 js/lead-form.js 渲染) -->', '</main>'];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function host(u) {
  try {
    return new URL(u).hostname.replace(/^(www|m|touch)\./, '');
  } catch (e) {
    return '';
  }
}

/** "2026-09" → "2026 年 9 月" */
function month(asOf) {
  const m = /^(\d{4})-(\d{1,2})/.exec(asOf || '');
  return m ? `${m[1]} 年 ${parseInt(m[2], 10)} 月` : '';
}

function block(spot) {
  const when = month(spot.asOf);
  const links = (spot.sources || [])
    .map((u) => [u, host(u)])
    .filter(([, h]) => h)
    .map(([u, h]) => `<a href="${esc(u)}" rel="nofollow noopener" target="_blank" style="color:#64748b">${esc(h)}</a>`);
  if (!when && !links.length) return '';
  return `${START}
  <section class="spot-sources" style="max-width:var(--max-width,1200px);margin:24px auto 0;padding:0 var(--s6,24px);font-size:.85rem;line-height:1.8;color:#64748b">
    <h2 style="margin:0 0 4px;font-size:1rem;color:#334155">信息来源</h2>
    <p style="margin:0">本页门票、开放时间等信息${when ? `核对于 ${when}` : '整理自公开资料'},以景区当天公告为准。${links.length ? `参考:${links.join('、')}` : ''}</p>
  </section>
  ${END}\n\n`;
}

const spots = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'attractions.json'), 'utf8')).spots;
let changed = 0;
let ratings = 0;

for (const s of spots) {
  const file = path.join(ROOT, 'attraction', `${s.id}.html`);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  let h = before;

  // 1) 去掉写死的评分声明(可能在对象中间,也可能在开头)
  const stripped = h
    .replace(/,\s*"aggregateRating"\s*:\s*\{[^{}]*\}/g, '')
    .replace(/"aggregateRating"\s*:\s*\{[^{}]*\}\s*,/g, '');
  if (stripped !== h) ratings++;
  h = stripped;

  // 2) 来源块:先摘掉旧的,再插到咨询卡前
  const i = h.indexOf(START);
  if (i >= 0) {
    const j = h.indexOf(END, i);
    h = h.slice(0, i) + h.slice(j + END.length).replace(/^\s*\n/, '');
  }
  const b = block(s);
  if (b) {
    const anchor = ANCHORS.find((a) => h.includes(a));
    if (anchor) h = h.replace(anchor, b + anchor);
  }

  if (h !== before) {
    changed++;
    if (!DRY) fs.writeFileSync(file, h, 'utf8');
  }
}

console.log(`✅ 景点页信息来源:改动 ${changed} 页,去掉评分声明 ${ratings} 页${DRY ? '(--dry,未写入)' : ''}`);
