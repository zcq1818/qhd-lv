#!/usr/bin/env node
/**
 * 从 data/attractions.json(完整主数据)生成 data/spots.json(浏览器加载的精简数据)。
 *
 * 主数据里补全的英文简介、来源、FAQ、贴士、交通分段等只用于生成静态页面,
 * 不需要下发到浏览器;下发的这份只保留列表、地图、画廊、行程、搜索真正用到的字段,
 * 并去掉缩进,体积约为主数据的 1/6。
 *
 * 用法: node scripts/build-runtime-data.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// 运行时真正会用到的字段(见 attractions/map/gallery3d/itinerary/tickets/favorites/search 等)
const SPOT_FIELDS = [
  'id', 'name', 'area', 'cat', 'level', 'rating',
  'price', 'priceNum', 'openTime', 'duration', 'bestSeason', 'suitableFor',
  'lat', 'lng', 'img', 'desc', 'highlights', 'address',
  'isTop', 'topRank', 'visible', 'tier',
];

const full = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'attractions.json'), 'utf8'));

const out = {
  meta: { version: full.meta?.version, lastUpdated: full.meta?.lastUpdated, totalCount: full.spots.length, note: '运行时精简数据,由 scripts/build-runtime-data.js 从 attractions.json 生成,请勿手改' },
  areas: full.areas,
  categories: full.categories,
  top5: full.top5,
  spots: full.spots.map((s) => {
    const o = {};
    for (const k of SPOT_FIELDS) {
      const v = s[k];
      if (v === undefined || v === null) continue;
      if (Array.isArray(v) && !v.length) continue;
      if (k === 'visible' && v === true) continue;          // 默认可见,省掉
      o[k] = v;
    }
    // 简介截断:列表卡片最多显示三行,详情页有完整版
    if (typeof o.desc === 'string' && o.desc.length > 88) o.desc = o.desc.slice(0, 86).replace(/[,,、;；]$/, '') + '…';
    if (Array.isArray(o.highlights)) o.highlights = o.highlights.slice(0, 4);
    return o;
  }),
};

const target = path.join(ROOT, 'data', 'spots.json');
fs.writeFileSync(target, JSON.stringify(out), 'utf8');

const fullSize = fs.statSync(path.join(ROOT, 'data', 'attractions.json')).size;
const slimSize = fs.statSync(target).size;
console.log(`✅ data/spots.json 已生成:${(slimSize / 1024).toFixed(1)} KB(主数据 ${(fullSize / 1024).toFixed(1)} KB,减少 ${(100 - slimSize / fullSize * 100).toFixed(0)}%)`);
