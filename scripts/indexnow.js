#!/usr/bin/env node
/**
 * IndexNow 即时推送脚本
 * 支持 Bing / Yandex 即时发现新页面
 * 用法: node scripts/indexnow.js
 */

const SITE = "https://www.divdu.com";
const INDEXNOW_KEY = "divdu-qhd-2026-indexnow-key";

// 所有页面 URL
const pages = [
  "/", "/attractions", "/map", "/itinerary", "/food", "/guide", "/blog", "/about",
];

// 景点
const attractions = [
  "aranya", "banchangyu", "baozigou", "beidaihe", "biluota", "bingtangyu",
  "changshoushan", "daihe_park", "dongwuyuan", "gangkou", "geziwo", "guailou",
  "hongxing_industrial", "huangjin", "huaxiazhuangyuan", "jiaoshan", "jieshishan",
  "jifa", "jinshi_wine", "laohushi", "laojunding", "laolongtou", "ledao",
  "liangfengshan", "liuhe_shanzhuang", "liuhe_xigu", "longyungu", "mengjiangnv",
  "nanent", "putagogou", "qipanshan", "qiuxian", "shanhaiguan", "shanhaiguan_gucheng",
  "shenglan", "shidi", "tianmahu", "tianmashan", "wangjiadayuan", "weilanhaian",
];

// 博客
const blogs = [
  "beidaihe-autumn", "beidaihe-banana-boat", "beidaihe-breakfast", "beidaihe-camping",
  "beidaihe-diving", "beidaihe-fishing", "beidaihe-hiking", "beidaihe-island-hop",
  "beidaihe-kayak", "beidaihe-kite", "beidaihe-lost-child", "beidaihe-motorcycle",
  "beidaihe-parasailing", "beidaihe-rainy-day", "beidaihe-rock-climbing",
  "beidaihe-sand-sculpture", "beidaihe-shell-collecting", "beidaihe-sunrise",
  "beidaihe-sunset", "beidaihe-swimsuit", "beidaihe-water-sports", "beidaihe-yacht",
  "qhd-beach-volleyball", "qhd-diving", "qhd-fishing-boat", "qhd-jet-ski",
  "qhd-kite-surfing", "qhd-sand-castle", "qhd-sea-gull", "qhd-sunscreen-review",
  "qhd-water-park", "qhd-beach-safety",
];

const urls = [
  ...pages.map(p => SITE + p),
  ...attractions.map(s => `${SITE}/attraction/${s}`),
  ...blogs.map(s => `${SITE}/blog/${s}`),
];

async function submit() {
  console.log(`📤 IndexNow: 推送 ${urls.length} 个 URL...`);
  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "www.divdu.com",
        key: INDEXNOW_KEY,
        urlList: urls,
      }),
    });
    console.log(`✅ 状态: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error("❌ 失败:", err.message);
  }
}

submit();
