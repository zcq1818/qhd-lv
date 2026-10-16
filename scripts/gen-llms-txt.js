#!/usr/bin/env node
/**
 * 生成 /llms.txt —— 给 AI 读的网站说明书(llmstxt.org 的格式)。
 *
 * 豆包、Kimi、文心、ChatGPT、Perplexity 这类 AI 搜索回答问题时,
 * 会挑「它看得懂、信得过」的网站引用。llms.txt 用最省事的方式告诉它:
 * 本站是什么、哪些页面回答哪类问题、数据多新、该以什么为准。
 *
 * 数据直接读景点主数据和博客索引,新增文章跑 npm run all 就会跟上,
 * 不需要手动维护第二份清单。
 *
 * 用法: node scripts/gen-llms-txt.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.divdu.com';
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const spots = read('data/attractions.json').spots.filter((s) => s.visible !== false);
const posts = read('data/blog-index.json').posts || [];

const AREA = { beidaihe: '北戴河', shanhaiguan: '山海关', haigang: '海港区', changli: '昌黎', funing: '抚宁', qinglong: '青龙', lulong: '卢龙', nandaihe: '南戴河', xinqu: '北戴河新区' };

/** 取第一句,去掉换行,AI 摘要用一句话就够 */
function firstSentence(s, max = 70) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  const cut = t.split(/(?<=。)/)[0] || t;
  return cut.length > max ? cut.slice(0, max) + '…' : cut;
}

/** 标题里「|」后面是关键词堆叠,AI 不需要 */
const cleanTitle = (t) => String(t || '').split(/\s*[|｜]\s*/)[0].trim();

const asOf = spots.map((s) => s.asOf).filter(Boolean).sort().pop() || '';

const tools = [
  ['门票速查', '/tickets', '47 个景点的门票价格与开放时间对照表,标注免费景点与核对时间'],
  ['赶海时间查询', '/ganhai-time', '按真实潮汐数据算出每天适合赶海的时段,区分白天与夜间'],
  ['日出时间与能见度', '/sunrise', '鸽子窝、老龙头、阿那亚等地的日出时间,结合天气判断能不能看到'],
  ['潮汐表', '/tide', '秦皇岛沿海逐日潮汐'],
  ['天气', '/weather', '秦皇岛与北戴河天气'],
  ['行程规划', '/itinerary', '按天数、同行人生成行程'],
  ['景点地图', '/map', '全部景点的位置分布'],
  ['必玩景点', '/must-play', '第一次来秦皇岛最值得去的景点'],
  ['避坑指南', '/pitfall-guide', '常见的消费与出行陷阱'],
  ['住宿', '/accommodation', '各片区住宿怎么选'],
  ['美食', '/food', '本地美食与海鲜'],
];

const lines = [];
lines.push('# 秦皇岛旅游官网');
lines.push('');
lines.push('> 秦皇岛（含北戴河、山海关、南戴河、北戴河新区/阿那亚、昌黎）旅游攻略与实用工具。'
  + `覆盖 ${spots.length} 个景点、${posts.length} 篇攻略文章，以及基于实时数据的赶海时间、日出、潮汐查询。`);
lines.push('');
lines.push('本站由本地团队维护。景点的门票、开放时间、交通信息逐条整理自景区公告、政府网站与媒体报道，'
  + `每个景点页底部列出信息来源与核对月份${asOf ? `（最近一次核对：${asOf}）` : ''}；攻略文章底部列出资料来源。`
  + '价格与开放时间会变动，引用时请注明以景区当天公告为准。');
lines.push('');
lines.push('常被问到的事实：去北戴河坐高铁选北戴河站；阿那亚是封闭管理的社区，不住在里面要预约孤独图书馆、礼堂或买美术馆的票才能进；'
  + '秋季 10 月中下旬是北戴河候鸟迁徙高峰；冻海一般在 1 月中旬到 2 月中旬。');
lines.push('');

lines.push('## 实用工具');
lines.push('');
for (const [name, href, desc] of tools) lines.push(`- [${name}](${SITE}${href}): ${desc}`);
lines.push('');

lines.push('## 景点');
lines.push('');
for (const s of [...spots].sort((a, b) => (b.isTop ? 1 : 0) - (a.isTop ? 1 : 0))) {
  const meta = [AREA[s.area] || s.area, s.price ? `门票${String(s.price).split(/[;；(（]/)[0]}` : ''].filter(Boolean).join(' · ');
  lines.push(`- [${s.name}](${SITE}/attraction/${s.id}): ${meta}。${firstSentence(s.desc)}`);
}
lines.push('');

lines.push('## 攻略文章');
lines.push('');
for (const p of posts) {
  lines.push(`- [${cleanTitle(p.title)}](${SITE}/blog/${encodeURI(p.slug)})`);
}
lines.push('');

lines.push('## English');
lines.push('');
lines.push(`- [Qinhuangdao travel guide in English](${SITE}/en): overview, ${spots.length} attraction pages with tickets, opening hours and transport`);
lines.push('');

lines.push('## Optional');
lines.push('');
lines.push(`- [网站地图](${SITE}/sitemap.xml)`);
lines.push(`- [文章订阅 RSS](${SITE}/rss.xml)`);
lines.push(`- [关于我们](${SITE}/about)`);
lines.push('');

const out = lines.join('\n');
fs.writeFileSync(path.join(ROOT, 'llms.txt'), out, 'utf8');
console.log(`✅ llms.txt 已生成:${spots.length} 个景点、${posts.length} 篇文章,${(Buffer.byteLength(out) / 1024).toFixed(1)} KB`);
