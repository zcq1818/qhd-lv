#!/usr/bin/env node
/**
 * 为尚无实景照片的景点在 Wikimedia Commons 全文检索候选照片,结果写入 data/photo-candidates.json 供人工筛选。
 * 只收 CC0 / CC BY / CC BY-SA / Public domain,且宽度 ≥ 900、非地图/图表/徽标。
 * 用法: node scripts/search-commons.js [景点id...]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const UA = 'qhd-lv-site/1.0 (https://www.divdu.com; site maintainer)';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'attractions.json'), 'utf8'));
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const QUERIES = {
  geziwo: ['鸽子窝公园', 'Pigeon Nest Park Beidaihe', '鹰角石 北戴河'],
  laohushi: ['老虎石 北戴河', 'Tiger Rock Beidaihe beach'],
  liangfengshan: ['联峰山 北戴河', 'Lianfengshan park'],
  biluota: ['碧螺塔 北戴河', 'Biluota Beidaihe'],
  guailou: ['怪楼奇园 北戴河'],
  jifa: ['集发 秦皇岛', 'Jifa agricultural park'],
  shidi: ['北戴河湿地', 'Beidaihe wetland birds'],
  mengjiangnv: ['孟姜女庙 山海关', 'Mengjiangnu Temple'],
  ledao: ['乐岛 山海关', 'Ledao ocean park'],
  changshoushan: ['长寿山 山海关', 'Changshoushan Shanhaiguan'],
  yansaihu: ['燕塞湖 山海关', 'Yansai lake'],
  qiuxian: ['秦皇求仙入海处', 'Emperor Qin statue Qinhuangdao'],
  xinao: ['新澳海底世界', 'Xinao underwater world'],
  gangkou: ['秦皇岛港', 'Qinhuangdao port museum', 'Qinhuangdao harbour'],
  daihe_park: ['戴河 秦皇岛'],
  aranya: ['阿那亚', 'Aranya Hebei', 'Aranya library'],
  yudao: ['渔岛 南戴河', 'Yudao hot spring'],
  shenglan: ['圣蓝海洋公园', 'Shenglan ocean park'],
  jieshishan: ['碣石山 昌黎', 'Jieshi mountain Changli Hebei'],
  weilanhaian: ['蔚蓝海岸 秦皇岛'],
  xianluodao: ['仙螺岛', 'Xianluo island Nandaihe'],
  nanent: ['南戴河国际娱乐中心', 'Nandaihe amusement'],
  zushan: ['祖山 青龙', 'Zushan Hebei mountain'],
  bingtangyu: ['冰塘峪', 'Bingtangyu canyon'],
  tianmahu: ['天马湖 抚宁'],
  putagogou: ['昌黎葡萄沟', 'Changli grape valley'],
  huaxiazhuangyuan: ['华夏庄园 昌黎', 'Huaxia winery Changli'],
  laojunding: ['老君顶 秦皇岛'],
  jinshi_wine: ['金士葡萄酒庄', 'Chateau Kings Changli'],
  hongxing_industrial: ['宏兴 昌黎'],
  longyungu: ['龙云谷 抚宁'],
  qipanshan: ['棋盘山 卢龙'],
  wufengshan: ['五峰山 昌黎', 'Wufengshan Li Dazhao'],
  tianmashan: ['天马山 抚宁'],
  baozigou: ['鲍子沟 昌黎'],
  liuhe_xigu: ['柳河 卢龙'],
  liuhe_shanzhuang: ['柳河山庄 卢龙'],
  wangjiadayuan: ['王家大院 山海关', 'Wang family courtyard Shanhaiguan'],
  yutian_qilihai: ['七里海 昌黎', 'Qilihai lagoon Hebei'],
};

const OK_LICENSE = /^(CC0|CC BY|Public domain|PD)/i;
const GOOD_EXT = /\.(jpe?g|png|webp)$/i;
const BAD_TITLE = /map|locator|logo|flag|seal|coat.of.arms|chart|diagram|地图|位置图|徽|CADAL|四庫|叢刊|Sibu|djvu/i;
const BAD_DESC = /古籍|刻本|卷[一二三四五六七八九十]|書名據|djvu/i;

const curl = (url) => execFileSync('curl', ['-sS', '--max-time', '30', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
const strip = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();

function search(q) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=' +
    encodeURIComponent(q) + '&prop=imageinfo&iiprop=url|size|extmetadata';
  let body;
  try { body = JSON.parse(curl(url)); } catch (e) { return []; }
  return Object.values(body?.query?.pages || {}).map((p) => {
    const ii = (p.imageinfo || [])[0]; if (!ii) return null;
    const em = ii.extmetadata || {};
    return {
      title: p.title, imageUrl: ii.url, pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      width: ii.width, height: ii.height,
      license: strip((em.LicenseShortName || {}).value),
      author: strip((em.Artist || {}).value).slice(0, 60),
      desc: strip((em.ImageDescription || {}).value).slice(0, 120),
    };
  }).filter(Boolean);
}

const targets = data.spots.filter((s) => (!only.length || only.includes(s.id)) && !(s.img || '').startsWith('images/real/'));
const out = {};
for (const s of targets) {
  const qs = QUERIES[s.id] || [s.name];
  const seen = new Set(); const hits = [];
  for (const q of qs) {
    for (const h of search(q)) {
      if (seen.has(h.title)) continue; seen.add(h.title);
      if (!OK_LICENSE.test(h.license)) continue;
      if (!GOOD_EXT.test(h.title)) continue;
      if (BAD_TITLE.test(h.title) || BAD_DESC.test(h.desc)) continue;
      if ((h.width || 0) < 900) continue;
      hits.push({ ...h, query: q });
    }
  }
  hits.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  out[s.id] = hits.slice(0, 6);
  console.log(`${s.id.padEnd(20)} ${String(hits.length).padStart(2)} 个候选`);
  for (const h of hits.slice(0, 3)) console.log(`   ${h.width}x${h.height} ${h.license.padEnd(14)} ${h.title.replace('File:', '').slice(0, 60)} | ${h.desc.slice(0, 45)}`);
}
fs.writeFileSync(path.join(ROOT, 'data', 'photo-candidates.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
console.log(`\n候选已写入 data/photo-candidates.json(${Object.values(out).filter((v) => v.length).length}/${targets.length} 个景点有候选)`);
