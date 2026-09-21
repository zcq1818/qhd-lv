#!/usr/bin/env node
/**
 * 把页面里写死的景点信息(门票、评分、时长、等级)同步成 data/attractions.json 的当前值。
 * 页面上用 data-spot-* 属性标出锚点,本脚本只改这些元素的文本,不动版式:
 *   data-spot-price="<id>"     门票,如「🎫 35元」「60元」「免费」
 *   data-spot-rating="<id>"    评分,如「⭐ 4.8分」
 *   data-spot-duration="<id>"  建议时长,如「⏰ 建议2-3小时」
 *   data-spot-level="<id>"     等级,如「4A」(无等级时隐藏)
 *   data-spot-meta="<id>"      一行摘要里的「🎫 xx元」片段,其余文字保留
 * 用法: node scripts/sync-spot-meta.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'attractions.json'), 'utf8'));
const byId = Object.fromEntries(data.spots.map((s) => [s.id, s]));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 门票短标签:列表/卡片用,去掉括号说明
const shortPrice = (s) => String(s.price || '免费').split(/[;；,，(（]/)[0].trim();

const FIELDS = {
  price: (s) => `🎫 ${shortPrice(s)}`,
  rating: (s) => `⭐ ${s.rating || '—'}分`,
  duration: (s) => `⏰ 建议${s.duration || '2-3小时'}`,
  level: (s) => s.level || '',
};

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let changed = 0, edits = 0, warnings = [];

for (const file of pages) {
  const p = path.join(ROOT, file);
  let html = fs.readFileSync(p, 'utf8');
  const before = html;

  // 单值锚点:整段文本替换
  for (const [field, render] of Object.entries(FIELDS)) {
    const re = new RegExp(`(<(\\w+)[^>]*\\bdata-spot-${field}="([a-z_]+)"[^>]*>)([\\s\\S]*?)(</\\2>)`, 'g');
    html = html.replace(re, (m, open, tag, id, inner, close) => {
      const s = byId[id];
      if (!s) { warnings.push(`${file}: 未知景点 ${id}`); return m; }
      let val = render(s);
      // price 锚点可能不带 🎫 前缀(如卡片角标),按原文是否含 🎫 决定
      if (field === 'price' && !/🎫/.test(inner)) val = shortPrice(s);
      if (field === 'level' && !val) return '';                 // 无等级则整块移除
      if (inner.trim() === val) return m;
      edits++;
      return `${open}${esc(val)}${close}`;
    });
  }

  // 摘要行:只替换其中的「🎫 xxx」片段,保留后面的描述
  html = html.replace(/(<(\w+)[^>]*\bdata-spot-meta="([a-z_]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, id, inner, close) => {
    const s = byId[id];
    if (!s) { warnings.push(`${file}: 未知景点 ${id}`); return m; }
    const next = inner.replace(/🎫\s*[^·]*/, `🎫 ${shortPrice(s)} `);
    if (next === inner) return m;
    edits++;
    return `${open}${next}${close}`;
  });

  if (html !== before) { if (!DRY) fs.writeFileSync(p, html, 'utf8'); changed++; }
}

console.log(`${DRY ? '[dry-run] ' : ''}✅ 同步 ${edits} 处景点信息,涉及 ${changed} 个页面`);
if (warnings.length) console.log('提示:\n  ' + [...new Set(warnings)].join('\n  '));
