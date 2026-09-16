#!/usr/bin/env node
/**
 * 生成站内搜索索引 js/search-index.js
 * 从 blog.html 提取博客标题 + 根目录攻略页，供 js/search.js 使用
 * 用法: node scripts/gen-search-index.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// 根目录攻略页（稳定，手动维护友好名）
const PAGES = [
  { slug: 'attractions', title: '景点大全' },
  { slug: 'must-play', title: '必玩景点 TOP10' },
  { slug: 'map', title: '景点地图' },
  { slug: 'itinerary', title: '行程规划' },
  { slug: 'routes', title: '主题行程模板' },
  { slug: 'food', title: '美食攻略' },
  { slug: 'seafood', title: '秋季海鲜季' },
  { slug: 'guide', title: '旅游攻略' },
  { slug: 'weather', title: '天气查询' },
  { slug: 'tide', title: '潮汐查询' },
  { slug: 'sunrise', title: '日出日落时间' },
  { slug: 'tickets', title: '门票价格总览' },
  { slug: 'checklist', title: '行前准备清单' },
  { slug: 'ganhai', title: '赶海地点推荐' },
  { slug: 'accommodation', title: '住宿攻略' },
  { slug: 'family-travel', title: '亲子游攻略' },
  { slug: 'summer', title: '夏季避暑攻略' },
  { slug: 'escape-heat', title: '避暑指南' },
  { slug: 'pitfall-guide', title: '避坑指南' },
  { slug: 'about', title: '关于我们' },
  { slug: 'blog', title: '旅游博客' }
];

// 提取博客卡片标题
const blogHtml = fs.readFileSync(path.join(root, 'blog.html'), 'utf8');
const blogs = [];
const re = /href="blog\/([^"]+)"[\s\S]*?<h3>(.*?)<\/h3>/g;
let m;
while ((m = re.exec(blogHtml))) {
  const title = m[2].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
  if (title) blogs.push({ slug: 'blog/' + m[1], title });
}

const index = [
  ...PAGES.map(p => ({ title: p.title, url: '/' + p.slug, type: '攻略' })),
  ...blogs.map(b => ({ title: b.title, url: '/' + b.slug, type: '博客' }))
];

const js = 'window.SEARCH_INDEX = ' + JSON.stringify(index, null, 2) + ';\n';
fs.writeFileSync(path.join(root, 'js', 'search-index.js'), js, 'utf8');

console.log('✅ 生成 js/search-index.js：攻略 ' + PAGES.length + ' 篇 + 博客 ' + blogs.length + ' 篇 = 共 ' + index.length + ' 条');
