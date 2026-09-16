#!/usr/bin/env node
/**
 * IndexNow 即时推送脚本（动态读取 attraction/blog 目录）
 * 支持 Bing / Yandex 即时发现新页面
 * 用法: node scripts/indexnow.js
 */
const fs = require('fs');
const path = require('path');

const SITE = "https://www.divdu.com";
const INDEXNOW_KEY = "divdu-qhd-2026-indexnow-key";

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
