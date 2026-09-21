#!/usr/bin/env node
/**
 * 把 images/cover/<id>.webp 品牌封面接入全站,替换掉与景点无关的随机素材图。
 *
 * 背景:未做实拍的景点此前共用几张来路不明的图库图(瑞士雪山、抽象油画、卫生间等),
 * 一张图被十几个景点共用,既误导游客也不利于站点可信度。在拿到实拍之前改用
 * 按景点信息生成的品牌封面,诚实且版面统一。有实景照片(images/real/)的不动。
 *
 * 用法: node scripts/apply-cover-images.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const dataPath = path.join(ROOT, 'data', 'attractions.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 需要替换的景点:无实景照片,且已生成品牌封面
const targets = data.spots.filter((s) => !String(s.img || '').startsWith('images/real/')
  && fs.existsSync(path.join(ROOT, 'images', 'cover', `${s.id}.webp`)));

// 旧图 → 新图 的候选路径(含各种历史写法)
const MAP = {};
for (const s of targets) {
  const olds = new Set([
    s.img,
    `images/attraction-${s.id}.jpg`, `images/attraction-${s.id}.webp`,
    `images/webp/attraction-${s.id}.webp`, `images/${s.id}.webp`, `images/${s.id}.jpg`,
  ].filter(Boolean));
  MAP[s.id] = { news: `images/cover/${s.id}.webp`, olds: [...olds] };
}

const pages = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...fs.readdirSync(path.join(ROOT, 'attraction')).map((f) => `attraction/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html')).map((f) => `blog/${f}`),
];

let files = 0, hits = 0;
for (const rel of pages) {
  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const depth = rel.includes('/') ? '../' : '';
  for (const { news, olds } of Object.values(MAP)) {
    for (const old of olds) {
      for (const form of [old, depth + old, '/' + old]) {
        if (!html.includes(form)) continue;
        // 引号包裹的引用 + og:image 绝对地址
        const target = form.startsWith('/') ? '/' + news : (form.startsWith('../') ? depth + news : news);
        html = html.split(`"${form}"`).join(`"${target}"`).split(`'${form}'`).join(`'${target}'`);
        html = html.split(`https://www.divdu.com/${old}`).join(`https://www.divdu.com/${news}`);
        hits++;
      }
    }
  }
  if (html !== before) { if (!DRY) fs.writeFileSync(file, html, 'utf8'); files++; }
}

// 数据里的 img 指向新封面,并标明不是实景
if (!DRY) {
  for (const s of targets) { s.img = `images/cover/${s.id}.webp`; s.imgIsPlaceholder = true; }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

console.log(`${DRY ? '[dry-run] ' : ''}✅ 品牌封面接入 ${targets.length} 个景点,改动 ${files} 个页面(${hits} 处引用)`);
console.log(`   仍为实景照片:${data.spots.length - targets.length} 个`);
