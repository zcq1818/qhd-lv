#!/usr/bin/env node
/**
 * 给景点打分级(tier),写入 data/attractions.json:
 *   1 核心 —— 首页、必玩、3D 画廊、行程推荐优先
 *   2 常规 —— 景点大全正常展示,行程推荐可选
 *   3 小众 —— 景点大全底部「小众与周边」折叠区,不进行程自动推荐池
 * 分级依据:站内被提及/内链次数 + 景区等级 + 评分 + 是否正常营业,
 * 人工覆盖写在 OVERRIDE 里。可重复执行。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const dataPath = path.join(ROOT, 'data', 'attractions.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 人工判定优先于自动打分
const OVERRIDE = {
  shanhaiguan: 1, laolongtou: 1, geziwo: 1, beidaihe: 1, shanhaiguan_gucheng: 1, aranya: 1,
  tianmahu: 3,              // 暂停营业
  hongxing_industrial: 3,   // 仅团队预约的工业园区
  gangkou: 3,               // 已改为工作日团队预约
  wangjiadayuan: 3,         // 山海关古城内小院,行程并入古城
  jinshi_wine: 3, liuhe_shanzhuang: 3,   // 小酒庄,内容重合
  huaxiazhuangyuan: 2, banchangyu: 2, longyungu: 2, laojunding: 2,  // 有实际游玩项目,只是站内内容少
  qipanshan: 3, baozigou: 3, liuhe_xigu: 3, tianmashan: 3, wufengshan: 3,  // 卢龙抚宁小山谷
  yutian_qilihai: 1,        // 新开 4A、4.8 分,昌黎热门,站内暂无内容属内容缺口
};

/* 统计站内提及与内链次数 */
const files = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !['admin.html', 'attractions.html', '404.html'].includes(f)),
  ...fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html')).map((f) => `blog/${f}`),
];
const texts = files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'));

function score(s) {
  const short = s.name.replace(/[（(].*/, '').replace(/(景区|公园|风景区)$/, '');
  let mentions = 0, links = 0;
  for (const t of texts) {
    if (t.includes(`attraction/${s.id}`)) links++;
    if (short.length >= 2 && t.includes(short)) mentions++;
  }
  return { mentions, links, weight: mentions + links * 2 };
}

const report = { 1: [], 2: [], 3: [] };
for (const s of data.spots) {
  const { mentions, links, weight } = score(s);
  s.mentions = mentions; s.inlinks = links;
  let tier = OVERRIDE[s.id];
  if (!tier) {
    const lv = /^5A/.test(s.level || '') ? 3 : /^4A/.test(s.level || '') ? 2 : /^3A/.test(s.level || '') ? 1 : 0;
    const r = parseFloat(s.rating) || 0;
    if (weight >= 14 || (weight >= 8 && lv >= 2 && r >= 4.5)) tier = 1;
    else if (weight >= 4 || (lv >= 2 && r >= 4.3)) tier = 2;
    else tier = 3;
  }
  s.tier = tier;
  // 分级高但站内无内容 → 标记内容缺口
  if (tier <= 2 && mentions === 0 && links === 0) s.contentGap = true; else delete s.contentGap;
  report[tier].push(`${s.name}(${s.level || '-'} ${s.rating} 提及${mentions}/链接${links})${s.contentGap ? '  ← 待补内容' : ''}`);
}

data.meta = data.meta || {};
data.meta.tierUpdated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

for (const t of [1, 2, 3]) {
  const label = { 1: '核心', 2: '常规', 3: '小众与周边' }[t];
  console.log(`\n【${t} ${label}】${report[t].length} 个`);
  report[t].forEach((x) => console.log('   ' + x));
}
