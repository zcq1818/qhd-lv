#!/usr/bin/env node
/**
 * 生成景点关联攻略 data/related-guides.json
 * 关键词匹配博客标题 + 分类兜底，供详情页「相关攻略」区块使用
 * 用法: node scripts/gen-related-guides.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// 1. 提取博客标题
const blogHtml = fs.readFileSync(path.join(root, 'blog.html'), 'utf8');
const blogs = [];
const re = /href="blog\/([^"]+)"[\s\S]*?<h3>(.*?)<\/h3>/g;
let m;
while ((m = re.exec(blogHtml))) {
  const title = m[2].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
  if (title) blogs.push({ title, url: '/blog/' + m[1] });
}

// 2. 读景点
const attractions = JSON.parse(fs.readFileSync(path.join(root, 'data', 'attractions.json'), 'utf8'));
const spots = attractions.spots || [];

// 3. 关键词映射（景点 id -> 匹配博客标题的关键词）
const KEYWORDS = {
  beidaihe: ['北戴河海滨', '北戴河旅游', '北戴河攻略', '北戴河2天'],
  geziwo: ['鸽子窝'],
  laohushi: ['老虎石'],
  liangfengshan: ['联峰山'],
  biluota: ['碧螺塔'],
  guailou: ['怪楼'],
  dongwuyuan: ['野生动物园'],
  jifa: ['集发'],
  shidi: ['北戴河湿地', '湿地'],
  shanhaiguan: ['山海关', '第一关'],
  laolongtou: ['老龙头'],
  jiaoshan: ['角山'],
  mengjiangnv: ['孟姜女'],
  ledao: ['乐岛', '水上乐园'],
  changshoushan: ['长寿山'],
  yansaihu: ['燕塞湖'],
  shanhaiguan_gucheng: ['山海关古城', '山海关'],
  qiuxian: ['求仙', '入海'],
  xinao: ['海底世界', '新澳'],
  gangkou: ['西港', '港口'],
  daihe_park: ['戴河公园', '戴河'],
  aranya: ['阿那亚'],
  huangjin: ['黄金海岸'],
  yudao: ['渔岛'],
  shenglan: ['圣蓝'],
  jieshishan: ['碣石'],
  weilanhaian: ['蔚蓝海岸'],
  xianluodao: ['仙螺岛'],
  nanent: ['南戴河国际', '南戴河'],
  zushan: ['祖山'],
  bingtangyu: ['冰塘峪'],
  banchangyu: ['板厂峪'],
  tianmahu: ['天马湖'],
  putagogou: ['葡萄沟', '葡萄'],
  huaxiazhuangyuan: ['华夏庄园'],
  laojunding: ['老君顶'],
  jinshi_wine: ['金士', '葡萄酒'],
  hongxing_industrial: ['红星'],
  longyungu: ['龙云谷'],
  qipanshan: ['棋盘山'],
  wufengshan: ['五峰山'],
  tianmashan: ['天马山'],
  baozigou: ['鲍子沟'],
  liuhe_xigu: ['柳河溪谷', '柳河'],
  liuhe_shanzhuang: ['柳河山庄', '柳河'],
  wangjiadayuan: ['王家大院'],
  yutian_qilihai: ['渔田', '七里海']
};

// 4. 分类兜底（无精确匹配时，按 cat 补充通用攻略）
const CATEGORY_FALLBACK = {
  beach: [
    { title: '北戴河旅游攻略 | 景区分布·票价', url: '/blog/2026年北戴河旅游攻略-2026年-北戴河欢迎您-景区分布和简介-票价' },
    { title: '北戴河2天1夜周末游攻略', url: '/blog/beidaihe-2days-weekend' },
    { title: '北戴河赶海攻略', url: '/blog/qhd-ganhai-guide' }
  ],
  history: [
    { title: '山海关长城攻略', url: '/blog/shanhaiguan-great-wall' },
    { title: '山海关一日游路线', url: '/blog/shanhaiguan-one-day' },
    { title: '秦皇岛一日游攻略', url: '/blog/qhd-one-day-trip' }
  ],
  nature: [
    { title: '秦皇岛爬山攻略', url: '/blog/qhd-hiking' },
    { title: '秦皇岛一日游攻略', url: '/blog/qhd-one-day-trip' },
    { title: '秦皇岛旅行攻略', url: '/blog/秦皇岛旅行攻略' }
  ],
  family: [
    { title: '秦皇岛亲子游攻略', url: '/blog/qhd-family-travel' },
    { title: '北戴河带娃攻略', url: '/blog/beidaihe-kids-play' },
    { title: '北戴河暑假亲子游', url: '/blog/beidaihe-summer-2026-guide' }
  ],
  art: [
    { title: '北戴河网红打卡地', url: '/blog/beidaihe-instagram' },
    { title: '秦皇岛拍照打卡地', url: '/blog/qhd-photography-spots' },
    { title: '阿那亚打卡攻略', url: '/blog/阿那亚超全打卡清单-景点-美食-住宿一站式攻略-解锁海边理想生活' }
  ],
  culture: [
    { title: '秦皇岛水果采摘 | 葡萄·樱桃·草莓', url: '/blog/qhd-fruit-picking' },
    { title: '秦皇岛一日游攻略', url: '/blog/qhd-one-day-trip' },
    { title: '秦皇岛旅行攻略', url: '/blog/秦皇岛旅行攻略' }
  ]
};

function pick(spot) {
  const kws = KEYWORDS[spot.id] || [];
  const matched = [];
  kws.forEach(function (kw) {
    blogs.forEach(function (b) {
      if (b.title.indexOf(kw) >= 0 && !matched.some(function (x) { return x.url === b.url; })) {
        matched.push(b);
      }
    });
  });
  // 分类兜底补足到 3 篇
  const fallback = CATEGORY_FALLBACK[spot.cat] || [];
  fallback.forEach(function (fb) {
    if (matched.length >= 3) return;
    if (!matched.some(function (x) { return x.url === fb.url; })) matched.push(fb);
  });
  return matched.slice(0, 3).map(function (b) { return { title: b.title, url: b.url }; });
}

const result = {};
let total = 0;
spots.forEach(function (spot) {
  const guides = pick(spot);
  result[spot.id] = guides;
  total += guides.length;
});

fs.writeFileSync(path.join(root, 'data', 'related-guides.json'), JSON.stringify(result, null, 2), 'utf8');

// 输出无匹配（纯兜底）的景点，便于检查
const empty = spots.filter(function (s) { return (KEYWORDS[s.id] || []).length === 0 || result[s.id].length === 0; });
console.log('✅ 生成 data/related-guides.json：' + spots.length + ' 个景点，共 ' + total + ' 条关联');
console.log('⚠️ 以下景点仅靠兜底（无精确关键词匹配）：');
empty.forEach(function (s) { console.log('   - ' + s.id + ' (' + s.name + ')'); });
