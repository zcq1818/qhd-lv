#!/usr/bin/env node
/**
 * 生成博客索引数据 data/blog-index.json
 * 扫描 blog/ 目录所有 html，提取 slug/title/keywords，供 js/blog-related.js 做相关阅读内链
 * 用法: node scripts/gen-blog-index.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');

// 无区分度的通用词，从 keywords 中剔除，避免所有博客都"相关"
const STOPWORDS = new Set([
  '秦皇岛', '秦皇岛旅游', '秦皇岛旅游攻略', '秦皇岛旅游官网',
  '秦皇岛攻略', '秦皇岛游记', '秦皇岛景点', '秦皇岛旅行', '秦皇岛自由行', '秦皇岛自助游',
  '北戴河', '北戴河旅游', '北戴河攻略', '北戴河游记', '海边旅游', '海滨旅游',
  '旅游', '攻略', '旅行', '游记', '自由行', '自助游',
  '最新', '本地人', '推荐', '必去', '必玩', '必吃', '必看', '必打卡',
  '怎么玩', '怎么去', '怎么样', '哪里', '哪些', '多少钱', '多少钱一张',
  '2026', '2025', '2024', '2023', '2022', '2021', '年', '月', '日',
  '指南', '大全', '景点', '景点大全', '旅游景点', '景区',
]);

function esc(s) { return String(s || ''); }

function cleanTitle(t) {
  // 去掉站点名后缀
  return t
    .replace(/\s*[|—\-–|]\s*(秦皇岛旅游官网|秦皇岛旅游博客|秦皇岛|北戴河).*$/u, '')
    .replace(/\s*—\s*秦皇岛旅游博客.*$/u, '')
    .replace(/\s+$/u, '')
    .trim();
}

function extractKeywords(html) {
  const m = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']keywords["']/i);
  if (!m) return [];
  return m[1]
    .split(/[,，、]/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(k => !STOPWORDS.has(k) && k.length >= 2)
    // 去重
    .filter((k, i, arr) => arr.indexOf(k) === i);
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? cleanTitle(m[1]) : '';
}

function loadRetired() {
  try {
    const rp = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'retired-posts.json'), 'utf8'));
    return new Set((rp.posts || []).map(x => x.slug));
  } catch (e) { return new Set(); }
}

function main() {
  const retired = loadRetired();
  const files = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html'))
    .filter(f => !retired.has(f.replace(/\.html$/, '')))
    .sort();

  const posts = [];
  for (const f of files) {
    const slug = f.replace(/\.html$/, '');
    const html = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
    const title = extractTitle(html);
    const kw = extractKeywords(html);
    if (title) {
      posts.push({ slug, title, kw });
    }
  }

  const out = { generated: new Date().toISOString().slice(0, 10), count: posts.length, posts };
  const dest = path.join(ROOT, 'data', 'blog-index.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`✅ 生成 blog-index.json：${posts.length} 篇博客`);
}

main();
