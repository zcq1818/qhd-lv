#!/usr/bin/env node
/**
 * 生成英文版核心页面(数据驱动,可重复执行):
 *   en/index.html        Home: why visit, top spots, getting there, when to go
 *   en/attractions.html  All attractions by area (nameEn / descEn / price / hours)
 *   en/practical.html    Practical info: transport, money, connectivity, food, safety
 * 数据来自 data/attractions.json 的 nameEn / descEn / highlightsEn 字段(缺失时回退中文名)。
 * 同时给中文首页与景点大全页写入 hreflang。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.divdu.com';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'attractions.json'), 'utf8'));
const spots = data.spots.filter((s) => s.visible !== false);

const AREA_EN = { beidaihe: 'Beidaihe', shanhaiguan: 'Shanhaiguan', haigang: 'Haigang (City Centre)', nandaihe: 'Nandaihe & Changli', funing: 'Funing & Qinglong', lulong: 'Lulong' };
const AREA_BLURB = {
  beidaihe: 'The classic seaside resort: long sandy beaches, sunrise at Pigeon Nest, and a relaxed holiday town.',
  shanhaiguan: 'Where the Great Wall meets the sea. A walled Ming-dynasty town with the famous "First Pass Under Heaven".',
  haigang: 'The modern city centre with the port, aquarium and the Emperor Qin monument.',
  nandaihe: 'The arty coast south of the city: Aranya, golden-sand beaches, hot springs and vineyards.',
  funing: 'Mountains, gorges and remote sections of the Great Wall inland from the coast.',
  lulong: 'Countryside, orchards and small-scale scenic valleys west of the city.'
};
const CAT_EN = { beach: 'Beach & Coast', history: 'History & Culture', nature: 'Nature', family: 'Family Fun', culture: 'Art & Lifestyle' };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nameOf = (s) => s.nameEn || s.name;
const priceEn = (s) => {
  if (!s.price || /免费|free/i.test(s.price) || s.priceNum === 0) return 'Free';
  if (/预约/.test(s.price)) return 'Reservation required';
  const n = typeof s.priceNum === 'number' ? s.priceNum : parseInt(s.price, 10);
  return isNaN(n) ? 'Ticketed' : `¥${n}`;
};
const hoursEn = (s) => {
  const t = s.openTime || '';
  if (!t || /全天/.test(t)) return 'Open all day';
  const m = t.match(/\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/);
  return m ? m[0].replace(/\s/g, '') : 'See official hours';
};
const imgOf = (s) => {
  const en = `images/cover/en/${s.id}.webp`;
  if (!String(s.img || '').startsWith('images/real/') && fs.existsSync(path.join(ROOT, en))) return '/' + en;
  return '/' + (s.img || `images/cover/${s.id}.webp`).replace(/^\//, '');
};

function layout({ title, description, canonical, active, body, extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">
<link rel="alternate" hreflang="en" href="${SITE}${canonical}">
<link rel="alternate" hreflang="zh-CN" href="${SITE}${canonical === '/en' ? '/' : canonical === '/en/attractions' ? '/attractions' : '/guide'}">
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/images/qhd-panorama.webp">
<meta property="og:locale" content="en_US">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/style.min.css">
<link rel="stylesheet" href="/css/page-common.min.css">
<style>
.en-nav .nav-links a{font-size:.9rem}
.en-hero{background:linear-gradient(135deg,#0b1f3a 0%,#123c6e 55%,#1a73e8 100%);color:#fff;padding:calc(var(--nav-height,64px) + 72px) 24px 72px;text-align:center;position:relative;overflow:hidden}
.en-hero::after{content:"";position:absolute;inset:0;background:url(/images/qhd-panorama.webp) center/cover;opacity:.18;pointer-events:none}
.en-hero > *{position:relative;z-index:1}
.en-hero h1{font-size:clamp(2rem,5vw,3.4rem);font-weight:900;margin:0 0 14px;letter-spacing:-.01em}
.en-hero p{max-width:720px;margin:0 auto 26px;font-size:1.1rem;opacity:.9;line-height:1.6}
.en-hero .btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.en-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:999px;font-weight:800;text-decoration:none;font-size:15px;transition:transform .2s}
.en-btn:hover{transform:translateY(-2px)}
.en-btn.pri{background:#fff;color:#0b1f3a}.en-btn.sec{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.4)}
.en-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.en-section{padding:64px 0}.en-section.alt{background:#f6f8fb}
.en-section h2{font-size:1.9rem;font-weight:900;margin:0 0 8px;color:#0f172a}
.en-section .lead{color:#64748b;margin:0 0 30px;font-size:1.02rem;max-width:760px}
.en-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
.en-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 2px 10px rgba(0,0,0,.04);transition:transform .25s,box-shadow .25s}
.en-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.09)}
.en-card img{width:100%;aspect-ratio:3/2;object-fit:cover;background:#dbeafe}
.en-card .b{padding:16px 18px 18px;display:flex;flex-direction:column;gap:8px;flex:1}
.en-card .tag{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1a73e8}
.en-card h3{margin:0;font-size:1.12rem;font-weight:800;color:#0f172a;line-height:1.3}
.en-card h3 small{display:block;font-weight:500;color:#94a3b8;font-size:.82rem;margin-top:2px}
.en-card p{margin:0;color:#475569;font-size:.9rem;line-height:1.6;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.en-card .meta{display:flex;gap:14px;flex-wrap:wrap;font-size:.82rem;color:#64748b;margin-top:auto;padding-top:6px}
.en-card .meta b{color:#E37400}
.en-card .links{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.en-card .links a{font-size:.8rem;font-weight:700;color:#1a73e8;text-decoration:none;padding:5px 10px;border:1px solid #cfe0fb;border-radius:999px}
.en-card .links a.pri{background:#1a73e8;color:#fff;border-color:#1a73e8}
.en-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.en-box{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px}
.en-box h3{margin:0 0 10px;font-size:1.1rem;font-weight:800;color:#0f172a}
.en-box p,.en-box li{color:#475569;font-size:.93rem;line-height:1.7}
.en-box ul{margin:0;padding-left:1.15em}
.en-area{margin-bottom:46px}.en-area h3{font-size:1.4rem;font-weight:900;margin:0 0 4px;color:#0f172a}.en-area .blurb{color:#64748b;margin:0 0 18px}
.en-footer{background:#0f172a;color:#94a3b8;padding:40px 24px;text-align:center;font-size:.88rem}
.en-footer a{color:#cbd5e1;margin:0 8px}
.lang-switch{font-weight:800!important;color:#1a73e8!important}
.cn-mark{display:inline-block;margin-left:4px;padding:1px 5px;border-radius:4px;background:#e2e8f0;color:#64748b;font-size:.62rem;font-weight:800;vertical-align:1px;letter-spacing:.04em}
@media(max-width:768px){.en-section{padding:44px 0}.en-hero{padding-top:calc(var(--nav-height,64px) + 44px)}}
</style>
${extraHead}
</head>
<body>
<nav class="navbar en-nav" id="navbar" style="background:rgba(255,255,255,.96);backdrop-filter:blur(10px);box-shadow:var(--shadow-sm)">
  <div class="nav-inner">
    <a href="/en" class="nav-logo">
      <svg class="nav-logo-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" fill="#1a73e8"/><path d="M8 18 Q11 10 14 8 Q17 10 20 18" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      Qinhuangdao Travel
    </a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/en"${active === 'home' ? ' class="active"' : ''}>Home</a></li>
      <li><a href="/en/attractions"${active === 'attractions' ? ' class="active"' : ''}>Attractions</a></li>
      <li><a href="/en/practical"${active === 'practical' ? ' class="active"' : ''}>Practical info</a></li>
      <li><a href="/gallery3d" hreflang="zh-CN" title="Photo gallery, Chinese interface">3D Gallery <span class="cn-mark">CN</span></a></li>
      <li><a href="/map" hreflang="zh-CN" title="Interactive map, Chinese interface">Map <span class="cn-mark">CN</span></a></li>
      <li><a href="/" class="lang-switch" lang="zh-CN">中文</a></li>
    </ul>
    <a href="/en/attractions" class="nav-cta">Plan your visit <span class="nav-cta-arrow">→</span></a>
    <button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
  </div>
</nav>
${body}
<footer class="en-footer">
  <p>Qinhuangdao Travel Guide · independent, locally maintained · <a href="/en">Home</a><a href="/en/attractions">Attractions</a><a href="/en/practical">Practical info</a><a href="/" lang="zh-CN">中文版</a></p>
  <p style="margin-top:8px;opacity:.7">Ticket prices and opening hours change seasonally. Always check the venue's official notice on the day.</p>
</footer>
<script>document.getElementById('hamburger').addEventListener('click',function(){document.getElementById('navLinks').classList.toggle('open')});</script>
</body>
</html>
`;
}

function card(s, { showArea = false } = {}) {
  const hl = (s.highlightsEn || []).slice(0, 3).join(' · ');
  return `<article class="en-card" id="${s.id}">
  <img src="${imgOf(s)}" alt="${esc(nameOf(s))}" loading="lazy" onerror="this.onerror=null;this.src='/images/qhd-panorama.webp'">
  <div class="b">
    <span class="tag">${esc(CAT_EN[s.cat] || 'Attraction')}${showArea ? ' · ' + esc(AREA_EN[s.area] || '') : ''}</span>
    <h3>${esc(nameOf(s))}${s.nameEn ? `<small lang="zh-CN">${esc(s.name)}</small>` : ''}</h3>
    ${s.descEn ? `<p>${esc(s.descEn)}</p>` : hl ? `<p>${esc(hl)}</p>` : ''}
    <div class="meta"><span>🎫 <b>${esc(priceEn(s))}</b></span><span>🕒 ${esc(hoursEn(s))}</span>${s.rating ? `<span>⭐ ${esc(s.rating)}</span>` : ''}</div>
    <div class="links"><a class="pri" href="/en/attraction/${s.id}">Details</a><a href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" target="_blank" rel="noopener">Map</a><a href="/attraction/${s.id}" lang="zh-CN" hreflang="zh-CN">中文</a></div>
  </div>
</article>`;
}

/* ---------------- Home ---------------- */
const top = spots.filter((s) => s.isTop).sort((a, b) => (a.topRank || 99) - (b.topRank || 99)).slice(0, 10);
const topFill = top.length < 10 ? spots.filter((s) => !s.isTop).sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0)).slice(0, 10 - top.length) : [];
const home = layout({
  title: 'Qinhuangdao Travel Guide | Beidaihe, Shanhaiguan & the Great Wall by the Sea',
  description: 'English guide to Qinhuangdao, China: Beidaihe beaches, Shanhaiguan and the Old Dragon\'s Head where the Great Wall meets the sea, Aranya, tickets, hours and how to get there from Beijing.',
  canonical: '/en', active: 'home',
  extraHead: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Qinhuangdao Travel Guide', url: SITE + '/en', inLanguage: 'en' })}</script>`,
  body: `
<header class="en-hero" id="main-content">
  <h1>Qinhuangdao: where the Great Wall meets the sea</h1>
  <p>Two hours from Beijing by high-speed rail. Sandy beaches at Beidaihe, the Ming-dynasty fortress town of Shanhaiguan, the Old Dragon's Head where the Wall runs into the Bohai Sea, and the arty seaside community of Aranya.</p>
  <div class="btns"><a class="en-btn pri" href="/en/attractions">Browse all ${spots.length} attractions</a><a class="en-btn sec" href="/en/practical">How to get there</a></div>
</header>

<section class="en-section">
  <div class="en-wrap">
    <h2>Why visit</h2>
    <p class="lead">Qinhuangdao is a coastal city in Hebei province, northeast of Beijing. Chinese travellers know it as a summer beach escape; for international visitors the draw is the combination of sea, the eastern end of the Great Wall and an easy day-trip distance from the capital.</p>
    <div class="en-cols">
      <div class="en-box"><h3>🏯 The Great Wall's eastern end</h3><p>Shanhaiguan's "First Pass Under Heaven" gate, the Jiaoshan section climbing the first mountain, and the Old Dragon's Head where the Wall literally enters the sea. All within a few kilometres of each other.</p></div>
      <div class="en-box"><h3>🏖 Beidaihe beaches</h3><p>A 20 km stretch of sand and a historic resort town. Sunrise at Pigeon Nest Park is the classic experience; Tiger Rock beach is the busiest swimming spot in summer.</p></div>
      <div class="en-box"><h3>🎨 Aranya and the south coast</h3><p>Aranya is a design-led seaside community famous for its "Lonely Library" and chapel on the beach. Further south are golden-sand dunes, hot springs and Changli's vineyards.</p></div>
    </div>
  </div>
</section>

<section class="en-section alt">
  <div class="en-wrap">
    <h2>Top places to see</h2>
    <p class="lead">Our pick of the ten attractions most worth your time. Prices are adult tickets in Chinese yuan; children, students and seniors usually get discounts.</p>
    <div class="en-grid">${top.concat(topFill).map((s) => card(s, { showArea: true })).join('\n')}</div>
    <p style="margin-top:26px"><a class="en-btn pri" style="background:#1a73e8;color:#fff" href="/en/attractions">See all attractions by area →</a></p>
  </div>
</section>

<section class="en-section">
  <div class="en-wrap">
    <h2>Getting there</h2>
    <p class="lead">High-speed trains from Beijing take about two hours. Which station you choose depends on where you are staying.</p>
    <div class="en-cols">
      <div class="en-box"><h3>🚄 Beidaihe Station</h3><p>Best for the beaches and most hotels. About 10 minutes by taxi to the seafront. Trains from Beijing South and Beijing Chaoyang stations, roughly 1 h 50 min to 2 h 20 min.</p></div>
      <div class="en-box"><h3>🚄 Shanhaiguan Station</h3><p>Walking distance to the old walled town. Ideal if the Great Wall is your priority; the Old Dragon's Head is a short taxi ride away.</p></div>
      <div class="en-box"><h3>🚄 Qinhuangdao Station</h3><p>The city-centre station, convenient for the port area, the aquarium and buses to both Beidaihe and Shanhaiguan (bus 34 to Beidaihe takes about 40 minutes).</p></div>
    </div>
  </div>
</section>

<section class="en-section alt">
  <div class="en-wrap">
    <h2>When to go</h2>
    <div class="en-cols">
      <div class="en-box"><h3>May to early June, September</h3><p>The sweet spot: warm, dry, far fewer people than the school holidays, and the sea is still swimmable in September.</p></div>
      <div class="en-box"><h3>July and August</h3><p>Peak season. The beaches are lively, the water is warmest, but hotels double in price and Beidaihe gets crowded. Book ahead.</p></div>
      <div class="en-box"><h3>October to April</h3><p>Cold and windy on the coast, but the Great Wall sites are atmospheric and empty. Some seaside attractions run reduced hours or close.</p></div>
    </div>
    <p style="margin-top:22px"><a class="en-btn sec" style="background:#0b1f3a;color:#fff" href="/en/practical">Practical information: money, SIM cards, food, safety →</a></p>
  </div>
</section>
` });

/* ---------------- Attractions ---------------- */
const areaOrder = ['beidaihe', 'shanhaiguan', 'haigang', 'nandaihe', 'funing', 'lulong'];
const attractions = layout({
  title: `All ${spots.length} Qinhuangdao attractions by area | tickets, hours, maps`,
  description: 'Every major attraction in Qinhuangdao, Beidaihe, Shanhaiguan and Nandaihe with English descriptions, ticket prices, opening hours and map links.',
  canonical: '/en/attractions', active: 'attractions',
  extraHead: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Qinhuangdao attractions', itemListElement: spots.slice(0, 20).map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: nameOf(s), url: `${SITE}/en/attractions#${s.id}` })) })}</script>`,
  body: `
<header class="en-hero" id="main-content" style="padding-bottom:48px">
  <h1>Attractions by area</h1>
  <p>${spots.length} places across six districts. Use the map links to navigate; taxis and ride-hailing (DiDi) are cheap and plentiful.</p>
  <div class="btns">${areaOrder.map((a) => `<a class="en-btn sec" href="#area-${a}">${esc(AREA_EN[a])}</a>`).join('')}</div>
</header>
<section class="en-section">
  <div class="en-wrap">
  ${areaOrder.map((a) => {
    const list = spots.filter((s) => s.area === a).sort((x, y) => parseFloat(y.rating || 0) - parseFloat(x.rating || 0));
    if (!list.length) return '';
    return `<div class="en-area" id="area-${a}"><h3>${esc(AREA_EN[a])}</h3><p class="blurb">${esc(AREA_BLURB[a] || '')}</p><div class="en-grid">${list.map((s) => card(s)).join('\n')}</div></div>`;
  }).join('\n')}
  </div>
</section>
` });

/* ---------------- Practical ---------------- */
const practical = layout({
  title: 'Qinhuangdao practical information | transport, money, SIM, food, safety',
  description: 'Everything international visitors need for Qinhuangdao and Beidaihe: trains from Beijing, local buses and taxis, payments without a Chinese bank, internet access, food and safety.',
  canonical: '/en/practical', active: 'practical',
  body: `
<header class="en-hero" id="main-content" style="padding-bottom:48px">
  <h1>Practical information</h1>
  <p>The unglamorous but useful part: how to move around, pay, stay connected and eat well.</p>
</header>
<section class="en-section">
  <div class="en-wrap">
    <div class="en-cols">
      <div class="en-box"><h3>🚄 Trains from Beijing</h3><ul>
        <li>Book on the official 12306 app or site (English version available) or via Trip.com. Passport number is your ticket; scan it at the gate.</li>
        <li>Choose Beidaihe Station for beaches, Shanhaiguan Station for the Great Wall, Qinhuangdao Station for the city centre. All are about 2 hours from Beijing.</li>
        <li>Summer weekends sell out days ahead. Off-season you can usually buy on the day.</li></ul></div>
      <div class="en-box"><h3>🚕 Getting around</h3><ul>
        <li>DiDi (ride-hailing) works with an international card and English interface. Taxis are metered and cheap; show the Chinese name of your destination.</li>
        <li>Bus 34 links Qinhuangdao Station and Beidaihe; buses 25 and 33 run inside Shanhaiguan. Pay ¥1–2 with cash, Alipay or WeChat Pay.</li>
        <li>Shared bikes are everywhere in Beidaihe and pleasant along the seafront.</li></ul></div>
      <div class="en-box"><h3>💳 Money</h3><ul>
        <li>China is mostly cashless. Alipay and WeChat Pay both accept foreign Visa/Mastercard now; set them up before you arrive.</li>
        <li>Keep some cash (¥200–500) for small stalls and the odd bus. ATMs at Bank of China and ICBC accept foreign cards.</li>
        <li>Attraction tickets are usually bought at the gate or via the venue's WeChat mini-program; some sites require ID.</li></ul></div>
      <div class="en-box"><h3>📶 Internet and apps</h3><ul>
        <li>Buy an eSIM or a China Unicom/China Mobile SIM at the airport. Google, WhatsApp and Instagram need a VPN installed before arrival.</li>
        <li>Useful apps: Amap or Baidu Maps (navigation with English labels on Amap), DiDi, Alipay (also translates menus), Trip.com for hotels and trains.</li></ul></div>
      <div class="en-box"><h3>🦀 Food</h3><ul>
        <li>Seafood is the point: buy at Shitang Road market in Beidaihe and have a nearby restaurant cook it for a small fee, or eat at the seafood stalls by the beach.</li>
        <li>Shanhaiguan specialities: Sitiao baozi (steamed buns from a century-old shop), hunzi (a savoury starch dish) and hele noodles.</li>
        <li>Vegetarians: ask for "sù" (素) dishes; tofu and vegetable options are common in any restaurant.</li></ul></div>
      <div class="en-box"><h3>🛟 Safety and etiquette</h3><ul>
        <li>Qinhuangdao is safe. Swim only at lifeguarded beaches (Tiger Rock, Middle Beach) and respect the flags; rip currents occur in August.</li>
        <li>Emergency numbers: police 110, ambulance 120, fire 119. The tourist complaint hotline is 12345.</li>
        <li>Registering at your hotel is automatic; if you stay in a private rental, the host must register you with the police within 24 hours.</li></ul></div>
    </div>
    <p style="margin-top:30px"><a class="en-btn pri" style="background:#1a73e8;color:#fff" href="/en/attractions">Browse attractions →</a></p>
  </div>
</section>
` });

fs.mkdirSync(path.join(ROOT, 'en'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'en', 'index.html'), home, 'utf8');
fs.writeFileSync(path.join(ROOT, 'en', 'attractions.html'), attractions, 'utf8');
fs.writeFileSync(path.join(ROOT, 'en', 'practical.html'), practical, 'utf8');

// 中文页 hreflang
for (const [file, en] of [['index.html', '/en/'], ['attractions.html', '/en/attractions'], ['guide.html', '/en/practical']]) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) continue;
  let html = fs.readFileSync(p, 'utf8');
  if (html.includes('hreflang="en"')) continue;
  const zh = file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '');
  html = html.replace('</head>', `<link rel="alternate" hreflang="en" href="${SITE}${en}">\n<link rel="alternate" hreflang="zh-CN" href="${SITE}${zh}">\n<link rel="alternate" hreflang="x-default" href="${SITE}${zh}">\n</head>`);
  fs.writeFileSync(p, html, 'utf8');
}
const withEn = spots.filter((s) => s.nameEn).length;
console.log(`✅ en/index.html, en/attractions.html, en/practical.html 已生成(${withEn}/${spots.length} 个景点有英文名)`);
