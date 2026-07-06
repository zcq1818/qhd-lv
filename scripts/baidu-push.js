#!/usr/bin/env node
/**
 * 百度 URL 主动推送脚本
 * 用法: node scripts/baidu-push.js
 */

const SITE = "https://www.divdu.com";
const PUSH_URL = "http://data.zz.baidu.com/urls?site=https://www.divdu.com&token=cPgQP32Tem2D7Xla";

const attractions = [
  "aranya", "banchangyu", "baozigou", "beidaihe", "biluota", "bingtangyu",
  "changshoushan", "daihe_park", "dongwuyuan", "gangkou", "geziwo", "guailou",
  "hongxing_industrial", "huangjin", "huaxiazhuangyuan", "jiaoshan", "jieshishan",
  "jifa", "jinshi_wine", "laohushi", "laojunding", "laolongtou", "ledao",
  "liangfengshan", "liuhe_shanzhuang", "liuhe_xigu", "longyungu", "mengjiangnv",
  "nanent", "putagogou", "qipanshan", "qiuxian", "shanhaiguan", "shanhaiguan_gucheng",
  "shenglan", "shidi", "tianmahu", "tianmashan", "wangjiadayuan", "weilanhaian",
];

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
  SITE + "/",
  ...attractions.map(s => `${SITE}/attraction/${s}`),
  ...blogs.map(s => `${SITE}/blog/${s}`),
];

async function push() {
  console.log(`📤 百度推送: ${urls.length} 个 URL...`);
  try {
    const res = await fetch(PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: urls.join("\n"),
    });
    const data = await res.json();
    console.log("✅ 结果:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ 失败:", err.message);
  }
}

push();
