#!/usr/bin/env node
/**
 * 把门票价格表预先写进 tickets.html(可重复执行)。
 *
 * 起因:这一页的价格表原来是浏览器拉 data/spots.json 后用 JS 填的,
 * HTML 里只有一个空的 <tbody>。不跑 JS 的爬虫看到的就是一张空表 ——
 * 页面正文只有 349 个字,可它偏偏是全站在涨的页面之一。
 *
 * 现在构建时把同样的行写进 HTML,另外补一段能被收录的概要文字。
 * 页面里的 JS 保留,用于搜索和按区域筛选;数据取不到时不再把表清空。
 *
 * 行的写法必须和 tickets.html 里 renderTable() 一致,否则 JS 接管后
 * 表格会闪一下变样。
 *
 * 用法: node scripts/gen-tickets-table.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'tickets.html');

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'spots.json'), 'utf8'));
const master = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'attractions.json'), 'utf8'));
const spots = data.spots || [];
const areas = data.areas || [];
const cats = data.categories || {};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const areaName = (id) => (areas.find((a) => a.id === id) || {}).name || '';

/* ---------- 行:与页面 JS 的 renderTable() 保持同一写法 ---------- */
const rows = spots.map((s) => {
  const cat = cats[s.cat] || { name: s.cat, color: '#1a73e8' };
  const isFree = !s.priceNum || s.priceNum === 0;
  const levelCls = s.level === '5A' ? 'tk-level-5A' : s.level === '4A' ? 'tk-level-4A' : s.level === '3A' ? 'tk-level-3A' : '';
  return '<tr>' +
    `<td class="name"><a href="attraction/${esc(s.id)}">${esc(s.name)}</a></td>` +
    `<td><span class="tk-cat" style="background:${cat.color}18;color:${cat.color};">${esc(cat.name)}</span></td>` +
    `<td>${esc(areaName(s.area))}</td>` +
    `<td><span class="tk-level ${levelCls}">${esc(s.level || '—')}</span></td>` +
    `<td class="tk-price ${isFree ? 'free' : ''}">${esc(s.price)}</td>` +
    `<td>${esc(s.openTime || '—')}</td>` +
    `<td class="tk-stars">★ ${esc(s.rating)}</td>` +
    '</tr>';
}).join('\n      ');

/* ---------- 概要:给搜索引擎和第一眼扫过来的人 ---------- */
// 「免费」按价格文字判断:priceNum 为 0 的里面还有「预约制」(比如阿那亚),不能算免费
const free = spots.filter((s) => /免费/.test(String(s.price)));
const paid = spots.filter((s) => s.priceNum > 0).sort((a, b) => b.priceNum - a.priceNum);
const asOf = [...new Set((master.spots || master).map((x) => x.asOf).filter(Boolean))].sort().pop() || '';
const asOfText = asOf ? `${asOf.slice(0, 4)}年${+asOf.slice(5, 7)}月` : '';

const summary = `<div class="tk-summary" id="tkSummary">
  <p>共收录 <b>${spots.length}</b> 个秦皇岛景区。其中标为免费的 <b>${free.length}</b> 个,` +
  `如${free.slice(0, 4).map((s) => esc(s.name)).join('、')}等;` +
  `收费景区里门票最高的是${paid.slice(0, 3).map((s) => `${esc(s.name)}(${s.priceNum} 元)`).join('、')}。</p>
  <p>表中价格为成人全价票${asOfText ? `,核对于 ${asOfText}` : ''}。景区票价会随季节和政策调整,` +
  `老人、学生、儿童多有优惠,出发前以景区当日公示为准。点景点名称可看开放时间、交通和避坑提醒。</p>
</div>`;

/* ---------- 结构化问答 ----------
   「山海关门票多少钱」是 AI 搜索最常被问到的一类问题。表格要渲染才看得懂,
   一问一答的 FAQPage 机器直接能读,每条都带上核对时间和「以当日公示为准」,
   被引用时不会把过期价格说成定论。 */
const note = `${asOfText ? `核对于 ${asOfText},` : ''}以景区当日公示为准。`;
const faq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '秦皇岛哪些景点免费?',
      acceptedAnswer: { '@type': 'Answer', text: `本站收录的 ${spots.length} 个景区里,标为免费的有 ${free.length} 个:${free.map((s) => s.name).join('、')}。${note}` },
    },
    ...spots.filter((s) => s.price).map((s) => ({
      '@type': 'Question',
      name: `${s.name}门票多少钱?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${s.name}成人全价票:${s.price}${s.openTime ? `;开放时间:${s.openTime}` : ''}。${note}详见 https://www.divdu.com/attraction/${s.id}`,
      },
    })),
  ],
};
const faqTag = `<script type="application/ld+json" id="tkFaq">${JSON.stringify(faq).replace(/</g, '\\u003c')}</script>`;

/* ---------- 写回页面 ---------- */
let html = fs.readFileSync(FILE, 'utf8');
const before = html;

if (/<script type="application\/ld\+json" id="tkFaq">[\s\S]*?<\/script>/.test(html)) {
  html = html.replace(/<script type="application\/ld\+json" id="tkFaq">[\s\S]*?<\/script>/, faqTag);
} else {
  html = html.replace('</head>', faqTag + '\n</head>');
}

html = html.replace(/<tbody id="tkTbody">[\s\S]*?<\/tbody>/,
  `<tbody id="tkTbody">\n      ${rows}\n    </tbody>`);

if (/<div class="tk-summary" id="tkSummary">[\s\S]*?<\/div>/.test(html)) {
  html = html.replace(/<div class="tk-summary" id="tkSummary">[\s\S]*?<\/div>/, summary);
} else {
  // 第一次:插在搜索框上方
  html = html.replace('<div class="tk-tools">', summary + '\n\n<div class="tk-tools">');
}

// 概要的样式只加一次
if (!html.includes('.tk-summary{')) {
  html = html.replace('</head>',
    '<style>.tk-summary{max-width:1100px;margin:22px auto 0;padding:0 24px;color:#475569;font-size:.92rem;line-height:1.85}' +
    '.tk-summary p{margin:0 0 6px}.tk-summary b{color:#0f172a}</style>\n</head>');
}

if (html !== before) fs.writeFileSync(FILE, html, 'utf8');
console.log(`✅ tickets.html:预渲染 ${spots.length} 行,免费 ${free.length} 个${html === before ? '(无变化)' : ''}`);
