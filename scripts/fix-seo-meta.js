#!/usr/bin/env node
/**
 * SEO 元信息补齐(可重复执行):
 *  1. 缺 og:image / og:title / og:description / twitter card 的页面按标题与描述补上
 *  2. 缺 <img> width/height 的图片按实际文件尺寸补上(减少布局抖动,属页面体验指标)
 *  3. 缺 loading 属性的非首屏图片补 lazy
 *  4. 缺面包屑结构化数据的页面按目录层级补 BreadcrumbList
 * 后台页(admin)与 404 跳过。
 *
 * 用法: node scripts/fix-seo-meta.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.divdu.com';
const DRY = process.argv.includes('--dry');
const SKIP = new Set(['admin.html', '404.html', 'dashboard.html', 'xhs.html']);

/* 图片尺寸:一次性用 python 读出所有图片的宽高 */
function imageSizes() {
  try {
    const out = execFileSync('python', ['-c', `
import os, json
from PIL import Image
res = {}
for root, dirs, files in os.walk('images'):
    for f in files:
        if f.lower().endswith(('.webp', '.jpg', '.jpeg', '.png')):
            p = os.path.join(root, f).replace('\\\\', '/')
            try:
                with Image.open(p) as im: res[p] = im.size
            except Exception: pass
print(json.dumps(res))`], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 }).toString('utf8');
    return JSON.parse(out);
  } catch (e) { console.warn('   (读取图片尺寸失败,跳过宽高补齐):', e.message.split('\n')[0]); return {}; }
}
const SIZES = imageSizes();

const pages = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...fs.readdirSync(path.join(ROOT, 'attraction')).map((f) => `attraction/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html')).map((f) => `blog/${f}`),
];
const retired = new Set((JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'retired-posts.json'), 'utf8')).posts || []).map((p) => p.slug));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stat = { og: 0, dim: 0, lazy: 0, bread: 0, files: 0 };

for (const rel of pages) {
  const base = path.basename(rel);
  if (SKIP.has(base)) continue;
  if (rel.startsWith('blog/') && retired.has(base.replace(/\.html$/, ''))) continue;

  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const dir = path.dirname(rel);

  /* ---------- 1. Open Graph ---------- */
  if (!/property="og:image"/.test(html)) {
    const title = (html.match(/<title>([^<]*)</) || [])[1] || '秦皇岛旅游官网';
    const desc = (html.match(/name="description" content="([^"]*)"/) || [])[1] || '';
    const canon = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1] || '';
    // 优先用页面里第一张本地图片作为分享图,没有就用站点全景图
    let img = '';
    const m = html.match(/<img[^>]+src="([^"]+\.(?:webp|jpg|jpeg|png))"/);
    if (m && !/^https?:|^data:/.test(m[1])) {
      let p = m[1].replace(/^\.\.\//, '').replace(/^\//, '');
      if (fs.existsSync(path.join(ROOT, p))) img = `${SITE}/${p}`;
    }
    if (!img) img = `${SITE}/images/qhd-panorama.webp`;

    const tags = [
      !/property="og:title"/.test(html) ? `<meta property="og:title" content="${esc(title)}">` : '',
      !/property="og:description"/.test(html) && desc ? `<meta property="og:description" content="${esc(desc)}">` : '',
      `<meta property="og:image" content="${img}">`,
      !/property="og:type"/.test(html) ? `<meta property="og:type" content="website">` : '',
      !/property="og:url"/.test(html) && canon ? `<meta property="og:url" content="${canon}">` : '',
      !/property="og:site_name"/.test(html) ? `<meta property="og:site_name" content="秦皇岛旅游官网">` : '',
      !/name="twitter:card"/.test(html) ? `<meta name="twitter:card" content="summary_large_image">` : '',
      !/name="twitter:image"/.test(html) ? `<meta name="twitter:image" content="${img}">` : '',
    ].filter(Boolean).join('\n');
    html = html.replace('</head>', tags + '\n</head>');
    stat.og++;
  }

  /* ---------- 2. 图片宽高 + 懒加载 ---------- */
  let imgIndex = 0;
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    imgIndex++;
    const src = (tag.match(/src="([^"]+)"/) || [])[1];
    if (!src || /^https?:|^data:/.test(src)) return tag;
    let out = tag;
    if (!/\bwidth=/.test(tag) && !/\bheight=/.test(tag)) {
      const key = path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, src)).replace(/^\.\//, '');
      const size = SIZES[key] || SIZES[src.replace(/^\.\.\//, '')] || SIZES[src.replace(/^\//, '')];
      if (size) { out = out.replace(/<img\b/, `<img width="${size[0]}" height="${size[1]}"`); stat.dim++; }
    }
    if (!/\bloading=/.test(out) && imgIndex > 1) { out = out.replace(/<img\b/, '<img loading="lazy"'); stat.lazy++; }
    return out;
  });

  /* ---------- 3. 面包屑结构化数据 ---------- */
  if (!/BreadcrumbList/.test(html)) {
    const title = ((html.match(/<h1[^>]*>([^<]*)/) || [])[1] || (html.match(/<title>([^<|]*)/) || [])[1] || '').trim();
    const canon = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1] || `${SITE}/${rel.replace(/\.html$/, '')}`;
    const items = [{ name: '首页', item: `${SITE}/` }];
    if (rel.startsWith('attraction/')) items.push({ name: '景点大全', item: `${SITE}/attractions` });
    else if (rel.startsWith('blog/')) items.push({ name: '旅游博客', item: `${SITE}/blog` });
    if (title) items.push({ name: title, item: canon });
    if (items.length > 1) {
      const ld = {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.item })),
      };
      html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`);
      stat.bread++;
    }
  }

  if (html !== before) { if (!DRY) fs.writeFileSync(file, html, 'utf8'); stat.files++; }
}

console.log(`${DRY ? '[dry-run] ' : ''}✅ 补 Open Graph ${stat.og} 页,图片宽高 ${stat.dim} 处,懒加载 ${stat.lazy} 处,面包屑 ${stat.bread} 页(共改动 ${stat.files} 个文件)`);
