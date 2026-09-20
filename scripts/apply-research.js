#!/usr/bin/env node
/**
 * 把联网研究结果(research/<id>.json)合并进 data/attractions.json,并就地更新 attraction/<id>.html 的内容区块。
 * 不重新生成整页,保证其他脚本注入的内容(骨架屏、相关攻略、统计、导航等)不受影响。
 *
 * 用法: node scripts/apply-research.js <research目录> [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const dir = process.argv[2];
const DRY = process.argv.includes('--dry');
if (!dir || !fs.existsSync(dir)) { console.error('用法: node scripts/apply-research.js <research目录> [--dry]'); process.exit(1); }

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clean = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : s);
const nonEmpty = (v) => v !== null && v !== undefined && !(typeof v === 'string' && !v.trim()) && !(Array.isArray(v) && !v.length);

const dataPath = path.join(ROOT, 'data', 'attractions.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const byId = Object.fromEntries(data.spots.map((s) => [s.id, s]));

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const report = { merged: [], pagesUpdated: [], skipped: [], warnings: [] };

for (const f of files) {
  let r;
  try { r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { report.warnings.push(`${f}: JSON 解析失败`); continue; }
  const spot = byId[r.id];
  if (!spot) { report.skipped.push(`${f}: 数据中无 id=${r.id}`); continue; }

  /* ---------- 1. 合并数据 ---------- */
  const set = (k, v) => { if (nonEmpty(v)) spot[k] = v; };
  set('desc', clean(r.desc));
  if (Array.isArray(r.highlights) && r.highlights.length >= 3) spot.highlights = r.highlights.map(clean);
  set('openTime', clean(r.openTime));
  set('price', clean(r.price));
  if (typeof r.priceNum === 'number') spot.priceNum = r.priceNum;
  set('ticketNotes', clean(r.ticketNotes));
  set('address', clean(r.address));
  set('phone', clean(r.phone));
  set('website', clean(r.website));
  set('bestSeason', clean(r.bestSeason));
  set('duration', clean(r.duration));
  set('suitableFor', clean(r.suitableFor));
  if (nonEmpty(r.level) && !spot.level) spot.level = r.level;
  // 交通:对象保留在 transportDetail,同时拼成字符串供旧消费方使用
  if (r.transport && typeof r.transport === 'object') {
    const t = r.transport;
    const parts = [];
    if (nonEmpty(t.publicTransit)) parts.push('公共交通:' + clean(t.publicTransit));
    if (nonEmpty(t.driving)) parts.push('自驾:' + clean(t.driving));
    if (nonEmpty(t.parking)) parts.push('停车:' + clean(t.parking));
    if (parts.length) { spot.transportDetail = { publicTransit: clean(t.publicTransit) || null, driving: clean(t.driving) || null, parking: clean(t.parking) || null }; spot.transport = parts.join(' '); }
  } else if (nonEmpty(r.transport)) set('transport', clean(r.transport));
  // 贴士:数组保留在 tipsList,字符串供旧消费方使用
  if (Array.isArray(r.tips) && r.tips.length) { spot.tipsList = r.tips.map(clean); spot.tips = spot.tipsList.join(' '); }
  else if (nonEmpty(r.tips)) set('tips', clean(r.tips));
  // 英文
  set('nameEn', clean(r.nameEn));
  set('descEn', clean(r.descEn));
  if (Array.isArray(r.highlightsEn) && r.highlightsEn.length) spot.highlightsEn = r.highlightsEn.map(clean);
  // FAQ / 来源 / 照片候选
  if (Array.isArray(r.faq) && r.faq.length) spot.faq = r.faq.filter((x) => x && x.q && x.a).map((x) => ({ q: clean(x.q), a: clean(x.a) }));
  if (Array.isArray(r.sources) && r.sources.length) spot.sources = r.sources;
  if (Array.isArray(r.photos) && r.photos.length) spot.photoCandidates = r.photos;
  spot.asOf = r.asOf || '2026-09';
  report.merged.push(r.id);

  /* ---------- 2. 就地更新详情页 ---------- */
  const page = path.join(ROOT, 'attraction', `${r.id}.html`);
  if (!fs.existsSync(page)) { report.warnings.push(`${r.id}: 无详情页`); continue; }
  let html = fs.readFileSync(page, 'utf8');
  const before = html;
  const rep = (re, fn, label) => { if (!re.test(html)) { report.warnings.push(`${r.id}: 未找到 ${label}`); return; } html = html.replace(re, fn); };

  // meta description / og:description
  const metaDesc = esc(spot.desc.slice(0, 150));
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${metaDesc}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${metaDesc}$2`);

  // 简介
  rep(/(<div class="detail-desc">)[\s\S]*?(<\/div>)/, (_, a, b) => `${a}\n    ${esc(spot.desc)}\n  ${b}`, '简介区块');

  // 信息卡(按顺序:开放时间、最佳季节、建议时长、适合人群)
  const cards = [spot.openTime || '全天开放', spot.bestSeason || '全年皆宜', spot.duration || '2-3小时', spot.suitableFor || '全家出游'];
  let ci = 0;
  rep(/<div class="info-card-value">[\s\S]*?<\/div>/g, () => `<div class="info-card-value">${esc(cards[ci++] ?? '')}</div>`, '信息卡');

  // 地址栏(含电话)
  rep(/(<div class="address-bar">[\s\S]*?<\/svg>\s*)([^<]+)/, (_, a) => `${a}${esc(spot.address)}${spot.phone ? ` · ☎ ${esc(spot.phone)}` : ''}\n  `, '地址栏');

  // 头图价格标签
  const priceShort = String(spot.price || '免费').split(/[;；,，(（]/)[0].trim();
  html = html.replace(/(<span class="hero-tag" style="color:#E37400;[^"]*font-weight:700;">)[^<]*(<\/span>)/, `$1${esc(priceShort)}$2`);

  // 核心亮点
  if (spot.highlights?.length) rep(/(<ul class="highlights-list">)[\s\S]*?(<\/ul>)/, (_, a, b) => `${a}\n        ${spot.highlights.map((h) => `<li>${esc(h)}</li>`).join('\n        ')}\n      ${b}`, '亮点列表');

  // 实用贴士 → 列表
  if (spot.tipsList?.length) rep(/(实用贴士\s*<\/h2>\s*)(<p>[\s\S]*?<\/p>|<ul class="tips-list">[\s\S]*?<\/ul>)/, (_, a) => `${a}<ul class="tips-list">\n        ${spot.tipsList.map((t) => `<li>${esc(t)}</li>`).join('\n        ')}\n      </ul>${spot.ticketNotes ? `\n      <p class="ticket-notes">🎫 ${esc(spot.ticketNotes)}</p>` : ''}`, '贴士区块');

  // 交通指南 → 三段
  if (spot.transportDetail) {
    const t = spot.transportDetail;
    const rows = [['🚌 公共交通', t.publicTransit], ['🚗 自驾', t.driving], ['🅿️ 停车', t.parking]].filter((x) => x[1]);
    rep(/(交通指南\s*<\/h2>\s*)(<p>[\s\S]*?<\/p>|<div class="transport-list">[\s\S]*?<\/div>\s*<\/div>)/, (_, a) => `${a}<div class="transport-list">\n        ${rows.map(([k, v]) => `<div class="transport-row"><span class="transport-k">${k}</span><span>${esc(v)}</span></div>`).join('\n        ')}\n      </div>`, '交通区块');
  }

  // 常见问题(可见区块 + 结构化数据)
  if (spot.faq?.length) {
    const faqHtml = `<section class="faq-section detail-section">
      <h2 class="section-title">❓ 常见问题</h2>
      ${spot.faq.map((x) => `<details class="faq-item"><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('\n      ')}
    </section>\n\n  `;
    if (/<section class="faq-section/.test(html)) html = html.replace(/<section class="faq-section[\s\S]*?<\/section>\s*/, faqHtml);
    else rep(/(<section class="nearby-section">)/, (_, a) => faqHtml + a, '附近景点区块(用于插入FAQ)');
    const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: spot.faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) };
    const ldRe = /<script type="application\/ld\+json">\s*\{[^<]*"FAQPage"[\s\S]*?<\/script>/;
    if (ldRe.test(html)) html = html.replace(ldRe, `<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
    else html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`);
  }

  // 样式(一次性注入)
  if (!html.includes('id="enrich-css"')) {
    html = html.replace('</head>', `<style id="enrich-css">
.tips-list{margin:0;padding-left:1.2em;display:grid;gap:8px}.tips-list li{line-height:1.7}.ticket-notes{margin:14px 0 0;padding:10px 14px;background:#fff7ed;border-left:3px solid #E37400;border-radius:6px;font-size:.92rem;color:#7c2d12}
.transport-list{display:grid;gap:10px}.transport-row{display:grid;grid-template-columns:110px 1fr;gap:12px;align-items:start;line-height:1.7}.transport-k{font-weight:700;color:#1E293B;white-space:nowrap}@media(max-width:600px){.transport-row{grid-template-columns:1fr;gap:2px}}
.faq-item{border-bottom:1px solid #e5e7eb;padding:6px 0}.faq-item summary{cursor:pointer;font-weight:700;padding:10px 0;list-style:none;display:flex;justify-content:space-between;gap:12px}.faq-item summary::after{content:"+";color:#1a73e8;font-weight:800}.faq-item[open] summary::after{content:"−"}.faq-item p{margin:0 0 12px;color:#475569;line-height:1.75}
</style>\n</head>`);
  }

  if (html !== before) { if (!DRY) fs.writeFileSync(page, html, 'utf8'); report.pagesUpdated.push(r.id); }
}

if (!DRY) {
  data.meta = data.meta || {}; data.meta.lastUpdated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log(`${DRY ? '[dry-run] ' : ''}合并 ${report.merged.length} 个景点,更新 ${report.pagesUpdated.length} 个详情页`);
if (report.skipped.length) console.log('跳过:', report.skipped.join('; '));
if (report.warnings.length) console.log('提示:\n  ' + report.warnings.join('\n  '));
