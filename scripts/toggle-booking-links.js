#!/usr/bin/env node
/**
 * 开关第三方预订平台(携程 / 美团 / 大众点评 / 去哪儿等)的外链。
 *
 * 背景:这些链接没有带推广标识,点出去的成交算不到站点头上,等于白送流量。
 * 在拿到联盟推广位之前先关掉;拿到之后把标识填进 data/booking-config.json,
 * 再运行 `node scripts/toggle-booking-links.js on` 即可带参数恢复。
 *
 * 用法:
 *   node scripts/toggle-booking-links.js off   移除页面上的平台外链(默认)
 *   node scripts/toggle-booking-links.js on    按 booking-config.json 带推广参数恢复
 *   node scripts/toggle-booking-links.js --dry 只看会改什么
 *
 * 数据保留在 data/attractions.json 的 booking 字段,不删除。
 * 12306(官方购票)与景区官网不受影响。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const mode = process.argv.includes('on') ? 'on' : 'off';
const DRY = process.argv.includes('--dry');

// 需要关闭的平台;12306 与景区官网不在其列
const PLATFORM = /(^|\.)(ctrip|trip|meituan|dianping|qunar|fliggy|tuniu|lvmama|mafengwo)\.(com|cn)/i;
const isPlatform = (url) => { try { return PLATFORM.test(new URL(url).hostname); } catch (e) { return false; } };

const cfgPath = path.join(ROOT, 'data', 'booking-config.json');
const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : { enabled: false, affiliates: {} };

/** 恢复时给链接补推广参数 */
function withAffiliate(url) {
  try {
    const u = new URL(url);
    const key = Object.keys(cfg.affiliates || {}).find((k) => u.hostname.includes(k));
    if (!key) return url;
    for (const [p, v] of Object.entries(cfg.affiliates[key])) u.searchParams.set(p, v);
    return u.toString();
  } catch (e) { return url; }
}

const pages = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...fs.readdirSync(path.join(ROOT, 'attraction')).map((f) => `attraction/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html')).map((f) => `blog/${f}`),
];

let files = 0, removed = 0, restored = 0, emptiedBlocks = 0;

for (const rel of pages) {
  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  if (mode === 'off') {
    // 1) 移除单个平台链接(保留 12306 等非平台链接)
    html = html.replace(/<a\s[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*/g, (m, url) => {
      if (!isPlatform(url)) return m;
      removed++;
      return '';
    });
    // 2) 预订区块若已空,整块移除
    html = html.replace(/\s*<div class="detail-section">\s*<h2 class="section-title">[\s\S]{0,400}?立即预订\s*<\/h2>\s*<div class="booking-buttons">\s*<\/div>\s*<\/div>/g, () => { emptiedBlocks++; return ''; });
    html = html.replace(/\s*<div class="ad-booking"[^>]*>\s*<\/div>/g, () => { emptiedBlocks++; return ''; });
    html = html.replace(/\s*<div class="ad-card">\s*([^<]*)\s*<div class="ad-booking">\s*<\/div>\s*<\/div>/g, () => { emptiedBlocks++; return ''; });
  } else {
    html = html.replace(/(<a\s[^>]*href=")([^"]+)("[^>]*>)/g, (m, a, url, b) => {
      if (!isPlatform(url)) return m;
      restored++;
      return a + withAffiliate(url) + b;
    });
  }

  if (html !== before) { if (!DRY) fs.writeFileSync(file, html, 'utf8'); files++; }
}

// 数据里标记状态(booking 字段本身保留)
if (!DRY) {
  const dataPath = path.join(ROOT, 'data', 'attractions.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  data.meta = data.meta || {};
  data.meta.bookingLinksEnabled = mode === 'on';
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  if (!fs.existsSync(cfgPath)) {
    fs.writeFileSync(cfgPath, JSON.stringify({
      enabled: false,
      note: '拿到联盟推广标识后填入 affiliates,然后运行 node scripts/toggle-booking-links.js on',
      affiliates: {
        'ctrip.com': { allianceid: '', sid: '', ouid: '' },
        'meituan.com': { utm_source: '', utm_medium: '', utm_campaign: '' },
      },
    }, null, 2) + '\n', 'utf8');
    console.log('已创建 data/booking-config.json,拿到推广标识后填进去');
  }
}

console.log(`${DRY ? '[dry-run] ' : ''}${mode === 'off' ? '关闭' : '恢复'}第三方预订外链:改动 ${files} 个页面`);
if (mode === 'off') console.log(`   移除链接 ${removed} 条,清空区块 ${emptiedBlocks} 个(数据仍保留在 attractions.json)`);
else console.log(`   带参数恢复 ${restored} 条`);
