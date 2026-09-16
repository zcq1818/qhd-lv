#!/usr/bin/env node
/**
 * 百度 URL 主动推送脚本（动态读取 attraction/blog 目录）
 * 用法: node scripts/baidu-push.js
 */
const fs = require('fs');
const path = require('path');

const SITE = "https://www.divdu.com";
const PUSH_URL = "http://data.zz.baidu.com/urls?site=https://www.divdu.com&token=cPgQP32Tem2D7Xla";

// 顶级页面（动态读取根目录 html，排除 index/404）
const rootHtml = fs.readdirSync(path.join(__dirname, '..'))
  .filter(f => f.endsWith('.html') && f !== 'index.html' && f !== '404.html')
  .map(f => f.replace(/\.html$/, ''));

// 景点与博客 slug（动态读取目录）
const readSlugs = (dir) => fs.readdirSync(path.join(__dirname, '..', dir))
  .filter(f => f.endsWith('.html'))
  .map(f => f.replace(/\.html$/, ''));

const attractions = readSlugs('attraction');
const blogs = readSlugs('blog');

const urls = [
  SITE + "/",
  ...rootHtml.map(p => `${SITE}/${encodeURIComponent(p)}`),
  ...attractions.map(s => `${SITE}/attraction/${encodeURIComponent(s)}`),
  ...blogs.map(s => `${SITE}/blog/${encodeURIComponent(s)}`),
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
