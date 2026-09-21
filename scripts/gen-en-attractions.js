#!/usr/bin/env node
/**
 * 生成英文版景点详情页 en/attraction/<id>.html(数据驱动,可重复执行)。
 *
 * 目的:英文页上的景点链接此前只能跳回中文详情页,对不读中文的访客是断点。
 * 有了这批页面,英文版从 3 页扩到 50 页,站内英文闭环,也是可被单独收录的长尾内容。
 *
 * 英文字段来自 data/attractions.json:nameEn / descEn / highlightsEn 以及
 * scripts/merge-en-translations.js 合并进来的 bestSeasonEn / suitableForEn /
 * ticketNotesEn / openTimeNotesEn / transportEn / tipsEn / faqEn。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.divdu.com';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'attractions.json'), 'utf8'));
const spots = data.spots.filter((s) => s.visible !== false);

const AREA_EN = { beidaihe: 'Beidaihe', shanhaiguan: 'Shanhaiguan', haigang: 'Haigang (City Centre)', nandaihe: 'Nandaihe & Changli', funing: 'Funing & Qinglong', lulong: 'Lulong' };
const CAT_EN = { beach: 'Beach & Coast', history: 'History & Culture', nature: 'Nature', family: 'Family Fun', culture: 'Art & Lifestyle' };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nameOf = (s) => s.nameEn || s.name;

const priceEn = (s) => {
  if (/暂停/.test(s.price || '')) return 'Temporarily closed';
  if (!s.price || /免费|free/i.test(s.price) || s.priceNum === 0) return 'Free';
  if (/预约/.test(s.price)) return 'Reservation required';
  const n = typeof s.priceNum === 'number' ? s.priceNum : parseInt(s.price, 10);
  return isNaN(n) ? 'Ticketed' : `¥${n}${/起/.test(s.price) ? ' and up' : ''}`;
};
const hoursEn = (s) => {
  const t = s.openTime || '';
  if (/暂停/.test(t)) return 'Temporarily closed';
  if (!t || /全天/.test(t)) return 'Open all day';
  const m = t.match(/\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/);
  return m ? m[0].replace(/\s/g, '') : 'See official hours';
};
const durationEn = (s) => {
  const d = s.duration || '';
  const m = d.match(/([\d.]+)\s*-\s*([\d.]+)\s*小时/);
  if (m) return `${m[1]}–${m[2]} hours`;
  if (/一整天|整天/.test(d)) return 'A full day';
  if (/半天到一天/.test(d)) return 'Half a day to a full day';
  if (/半天/.test(d)) return 'Half a day';
  const h = d.match(/([\d.]+)\s*小时/);
  return h ? `About ${h[1]} hours` : '2–3 hours';
};

function page(s) {
  const url = `${SITE}/en/attraction/${s.id}`;
  const zhUrl = `${SITE}/attraction/${s.id}`;
  // 品牌封面有英文版,实景照片两边共用
  const enCover = `images/cover/en/${s.id}.webp`;
  const useEn = fs.existsSync(path.join(ROOT, enCover)) && !String(s.img || '').startsWith('images/real/');
  const img = '/' + (useEn ? enCover : String(s.img || `images/cover/${s.id}.webp`).replace(/^\//, ''));
  const area = AREA_EN[s.area] || '';
  const cat = CAT_EN[s.cat] || 'Attraction';
  const title = `${nameOf(s)} | tickets, opening hours & how to get there`;
  const desc = (s.descEn || '').slice(0, 155) || `${nameOf(s)} in Qinhuangdao: tickets, opening hours, highlights and how to get there.`;

  const facts = [
    ['Tickets', priceEn(s)],
    ['Opening hours', hoursEn(s)],
    ['Time needed', durationEn(s)],
    s.bestSeasonEn ? ['Best season', s.bestSeasonEn] : null,
    s.suitableForEn ? ['Good for', s.suitableForEn] : null,
    s.level && s.level !== '无' ? ['Rating', `${s.level} national scenic area`] : null,
  ].filter(Boolean);

  const t = s.transportEn || {};
  const transportRows = [
    t.publicTransit ? ['By train & bus', t.publicTransit] : null,
    t.driving ? ['By car', t.driving] : null,
    t.parking ? ['Parking', t.parking] : null,
  ].filter(Boolean);

  const nearby = spots
    .filter((x) => x.id !== s.id && x.area === s.area)
    .sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0))
    .slice(0, 4);

  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'TouristAttraction',
      name: nameOf(s), alternateName: s.name, description: s.descEn || '', url,
      image: `${SITE}${img}`,
      address: { '@type': 'PostalAddress', addressLocality: 'Qinhuangdao', addressRegion: 'Hebei', addressCountry: 'CN' },
      geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
      ...(s.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: s.rating, bestRating: '5', ratingCount: 100 } } : {}),
      ...(s.phone ? { telephone: s.phone } : {}),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/en` },
        { '@type': 'ListItem', position: 2, name: 'Attractions', item: `${SITE}/en/attractions` },
        { '@type': 'ListItem', position: 3, name: nameOf(s), item: url },
      ],
    },
    ...(s.faqEn?.length ? [{
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: s.faqEn.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    }] : []),
  ].map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${url}">
<link rel="alternate" hreflang="zh-CN" href="${zhUrl}">
<link rel="alternate" hreflang="x-default" href="${zhUrl}">
<meta property="og:title" content="${esc(nameOf(s))}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}${img}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="en_US">
<meta property="og:site_name" content="Qinhuangdao Travel Guide">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}${img}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/style.min.css">
<link rel="stylesheet" href="/css/page-common.min.css">
<link rel="stylesheet" href="/css/en-attraction.min.css">
${ld}
</head>
<body>

<nav class="navbar en-nav" id="navbar">
  <div class="nav-inner">
    <a href="/en" class="nav-logo">
      <svg class="nav-logo-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" fill="#1a73e8"/><path d="M8 18 Q11 10 14 8 Q17 10 20 18" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      Qinhuangdao Travel
    </a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/en">Home</a></li>
      <li><a href="/en/attractions" class="active">Attractions</a></li>
      <li><a href="/en/practical">Practical info</a></li>
      <li><a href="/" class="lang-switch" lang="zh-CN" hreflang="zh-CN">中文</a></li>
    </ul>
    <a href="/en/attractions" class="nav-cta">All attractions <span class="nav-cta-arrow">→</span></a>
    <button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
  </div>
</nav>

<main id="main-content">
  <nav class="ena-crumb" aria-label="Breadcrumb">
    <a href="/en">Home</a> <span>›</span> <a href="/en/attractions">Attractions</a> <span>›</span> <b>${esc(nameOf(s))}</b>
  </nav>

  <header class="ena-hero">
    <img src="${img}" alt="${esc(nameOf(s))}" width="1200" height="800" loading="eager">
    <div class="ena-hero-text">
      <span class="ena-kicker">${esc(area)} · ${esc(cat)}</span>
      <h1>${esc(nameOf(s))}</h1>
      <p class="ena-zh" lang="zh-CN">${esc(s.name)}</p>
    </div>
  </header>

  <div class="ena-wrap">
    <section class="ena-facts" aria-label="Key facts">
      ${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n      ')}
    </section>

    ${s.descEn ? `<section class="ena-block">
      <h2>About</h2>
      <p>${esc(s.descEn)}</p>
    </section>` : ''}

    ${s.highlightsEn?.length ? `<section class="ena-block">
      <h2>Highlights</h2>
      <ul class="ena-list">${s.highlightsEn.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    </section>` : ''}

    ${transportRows.length ? `<section class="ena-block">
      <h2>Getting there</h2>
      <dl class="ena-transport">${transportRows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <p class="ena-map"><a href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" target="_blank" rel="noopener">Open in Google Maps</a><a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${encodeURIComponent(s.name)}" target="_blank" rel="noopener">Open in Amap (works in China)</a></p>
      ${s.address ? `<p class="ena-addr"><b>Address</b> <span lang="zh-CN">${esc(s.address)}</span>${s.phone ? ` · <b>Tel</b> ${esc(s.phone)}` : ''}<br><small>Show the Chinese address to your driver.</small></p>` : ''}
    </section>` : ''}

    ${s.tipsEn?.length ? `<section class="ena-block">
      <h2>Before you go</h2>
      <ul class="ena-list">${s.tipsEn.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${s.ticketNotesEn ? `<p class="ena-note"><b>Tickets</b> ${esc(s.ticketNotesEn)}</p>` : ''}
      ${s.openTimeNotesEn ? `<p class="ena-note"><b>Hours</b> ${esc(s.openTimeNotesEn)}</p>` : ''}
    </section>` : ''}

    ${s.faqEn?.length ? `<section class="ena-block">
      <h2>Frequently asked</h2>
      ${s.faqEn.map((f) => `<details class="ena-faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n      ')}
    </section>` : ''}

    ${nearby.length ? `<section class="ena-block">
      <h2>Nearby in ${esc(area)}</h2>
      <div class="ena-nearby">${nearby.map((n) => `<a href="/en/attraction/${n.id}"><span>${esc(nameOf(n))}</span><small>${esc(priceEn(n))} · ${esc(durationEn(n))}</small></a>`).join('')}</div>
    </section>` : ''}

    <p class="ena-zhlink"><a href="/attraction/${s.id}" lang="zh-CN" hreflang="zh-CN">查看中文详情页 · Read this page in Chinese</a></p>
  </div>
</main>

<footer class="en-footer">
  <p>Qinhuangdao Travel Guide · <a href="/en">Home</a><a href="/en/attractions">Attractions</a><a href="/en/practical">Practical info</a><a href="/" lang="zh-CN">中文版</a></p>
  <p style="margin-top:8px;opacity:.7">Ticket prices and opening hours change seasonally. Always check the venue's official notice on the day.</p>
</footer>

<script>document.getElementById('hamburger').addEventListener('click',function(){document.getElementById('navLinks').classList.toggle('open')});</script>
</body>
</html>
`;
}

const outDir = path.join(ROOT, 'en', 'attraction');
fs.mkdirSync(outDir, { recursive: true });
let n = 0, thin = [];
for (const s of spots) {
  fs.writeFileSync(path.join(outDir, `${s.id}.html`), page(s), 'utf8');
  n++;
  const words = [(s.descEn || ''), ...(s.highlightsEn || []), ...(s.tipsEn || []), ...(s.faqEn || []).map((f) => f.q + ' ' + f.a)].join(' ').split(/\s+/).filter(Boolean).length;
  if (words < 180) thin.push(`${s.id}(${words})`);
}
// 中文景点页补 hreflang,双向声明语言对应关系
let zh = 0;
for (const s of spots) {
  const f = path.join(ROOT, 'attraction', `${s.id}.html`);
  if (!fs.existsSync(f)) continue;
  let h = fs.readFileSync(f, 'utf8');
  // 只看 head 里的 link 标签,导航栏那个 EN 按钮也带 hreflang,不能算
  if (/<link rel="alternate" hreflang="en"/.test(h)) continue;
  const tags = `<link rel="alternate" hreflang="zh-CN" href="${SITE}/attraction/${s.id}">
`
    + `<link rel="alternate" hreflang="en" href="${SITE}/en/attraction/${s.id}">
`
    + `<link rel="alternate" hreflang="x-default" href="${SITE}/attraction/${s.id}">
`;
  fs.writeFileSync(f, h.replace('</head>', tags + '</head>'), 'utf8');
  zh++;
}
console.log(`✅ 生成 ${n} 个英文景点页 → en/attraction/(中文页补 hreflang ${zh} 个)`);
if (thin.length) console.log(`   英文内容偏少(<180 词),建议补充:${thin.join(', ')}`);
