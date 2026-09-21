#!/usr/bin/env node
/**
 * 把 data/attractions.json 里已下载的实景照片(images/real/*.webp + photoCredit)接入页面:
 *  - attraction/<id>.html:头图 src 换成实景图,并在头图下方加一行摄影署名
 *  - 其他页面(index/must-play/attractions/family-travel/…)里指向该景点旧图的引用一并替换
 * 可重复执行。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'attractions.json'), 'utf8'));
const withPhoto = data.spots.filter((s) => s.photoCredit && s.img && s.img.startsWith('images/real/') && fs.existsSync(path.join(ROOT, s.img)));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CREDIT_CSS = `<style id="photo-credit-css">.photo-credit{margin:0;padding:6px 16px;font-size:11.5px;color:#94a3b8;text-align:right;background:#fff}.photo-credit a{color:#94a3b8;text-decoration:underline}</style>`;

let heroCount = 0, refCount = 0, filesTouched = new Set();

/* 1. 详情页头图 + 署名 */
for (const s of withPhoto) {
  const file = path.join(ROOT, 'attraction', `${s.id}.html`);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const rel = '../' + s.img;
  html = html.replace(/(<img class="detail-hero-bg" src=")[^"]*(")/, `$1${rel}$2`);
  const c = s.photoCredit;
  const credit = `<p class="photo-credit">照片:${esc(c.author || '佚名')} / ${esc(c.license)} · <a href="${esc(c.source)}" target="_blank" rel="noopener nofollow">Wikimedia Commons</a></p>`;
  if (/<p class="photo-credit">/.test(html)) html = html.replace(/<p class="photo-credit">[\s\S]*?<\/p>/, credit);
  else html = html.replace(/(<\/section>\s*)(<div class="ad-slot ad-detail-banner")/, `$1${credit}\n$2`);
  if (!html.includes('id="photo-credit-css"')) html = html.replace('</head>', CREDIT_CSS + '\n</head>');
  if (html !== before) { fs.writeFileSync(file, html, 'utf8'); heroCount++; filesTouched.add(`attraction/${s.id}.html`); }
}

/* 2. 全站旧图引用替换 */
const OLD_OF = {};
for (const s of withPhoto) {
  const base = `attraction-${s.id}`;
  OLD_OF[s.id] = [`images/${base}.jpg`, `images/${base}.webp`, `images/webp/${base}.webp`, `images/${s.id}.webp`, `images/${s.id}.jpg`];
}
const EXTRA = { beidaihe: ['images/beidaihe-beach.webp'], shanhaiguan: ['images/shanhaiguan.webp'], laolongtou: ['images/laolongtou.webp'] };
for (const [id, list] of Object.entries(EXTRA)) if (OLD_OF[id]) OLD_OF[id].push(...list);

const pages = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => f),
  ...fs.readdirSync(path.join(ROOT, 'attraction')).map((f) => `attraction/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html')).map((f) => `blog/${f}`),
];
for (const rel of pages) {
  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const depth = rel.includes('/') ? '../' : '';
  for (const s of withPhoto) {
    const target = depth + s.img;
    for (const old of OLD_OF[s.id]) {
      for (const p of [old, '/' + old, '../' + old]) {
        if (!html.includes(p)) continue;
        // 只替换 src/href/content 中的图片引用,保留 og:image 的绝对地址前缀
        html = html.split(`"${p}"`).join(`"${target}"`);
        html = html.split(`'${p}'`).join(`'${target}'`);
        html = html.split(`https://www.divdu.com/${old}`).join(`https://www.divdu.com/${s.img}`);
      }
    }
  }
  if (html !== before) { fs.writeFileSync(file, html, 'utf8'); refCount++; filesTouched.add(rel); }
}

console.log(`✅ 实景照片接入:详情页头图 ${heroCount} 个,含旧图引用的页面 ${refCount} 个`);
console.log(`   涉及景点:${withPhoto.map((s) => s.id).join(', ')}`);
