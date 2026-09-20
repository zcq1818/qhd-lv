#!/usr/bin/env node
/**
 * 给全站接入「加入行程」:
 *  - 需要的页面注入 <script src="js/trip.min.js" defer>
 *  - attraction/<id>.html 头图区加「加入行程」按钮
 *  - must-play.html 的景点卡片加按钮(按卡片内指向 attraction/<id> 的链接识别)
 * 可重复执行。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const PAGES = ['index.html', 'attractions.html', 'must-play.html', 'gallery3d.html', 'itinerary.html', 'map.html', 'family-travel.html', 'summer.html', 'escape-heat.html', 'sunrise.html', 'ganhai.html', 'routes.html'];
let injected = 0, heroBtns = 0, cardBtns = 0;

function injectScript(file, rel) {
  let html = fs.readFileSync(file, 'utf8');
  if (/js\/trip(\.min)?\.js/.test(html)) return html;
  const tag = `<script src="${rel}js/trip.min.js" defer></script>\n`;
  html = html.includes('</body>') ? html.replace('</body>', tag + '</body>') : html + tag;
  injected++;
  return html;
}

// 根目录页面
for (const p of PAGES) {
  const file = path.join(ROOT, p);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  let html = injectScript(file, '');
  if (p === 'must-play.html') {
    // 卡片:在 spot-card-body 内第一个指向 attraction/<id> 的链接之后追加按钮
    html = html.replace(/(<div class="spot-card-body">)([\s\S]*?)(<\/div>\s*<\/div>)/g, (m, a, body, c) => {
      if (body.includes('data-trip-add')) return m;
      const id = (body.match(/href="\/?attraction\/([a-z_]+)(?:\.html)?"/) || [])[1];
      if (!id) return m;
      cardBtns++;
      return `${a}${body.replace(/\s*$/, '')}\n        <div style="margin-top:12px"><button class="trip-btn sm" data-trip-add="${id}">加入行程</button></div>\n      ${c}`;
    });
  }
  if (html !== before) fs.writeFileSync(file, html, 'utf8');
}

// 景点详情页
const dir = path.join(ROOT, 'attraction');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
  const file = path.join(dir, f), id = f.replace(/\.html$/, '');
  const before = fs.readFileSync(file, 'utf8');
  let html = injectScript(file, '../');
  if (!html.includes('data-trip-add')) {
    html = html.replace(/(<div class="detail-hero-meta">[\s\S]*?<\/div>)/, (m) => `${m}\n    <div class="detail-hero-actions" style="margin-top:14px"><button class="trip-btn dark" data-trip-add="${id}">加入行程</button></div>`);
    if (html.includes('data-trip-add')) heroBtns++;
  }
  if (html !== before) fs.writeFileSync(file, html, 'utf8');
}

console.log(`✅ 注入脚本 ${injected} 页,详情页按钮 ${heroBtns} 个,必玩页卡片按钮 ${cardBtns} 个`);
