#!/usr/bin/env node
/**
 * 博客标题清理(可重复执行):
 *  1. h1 里去掉「— 秦皇岛旅游博客 / 官网」这类站点后缀 ——
 *     站点名放 <title> 就够了,h1 里再重复一遍对排名没好处,
 *     手机上还白白占掉两三行。
 *  2. 关键词堆砌的 h1 换成已经整理过的 <title> —— 有两篇的 h1 还是抓来的
 *     原版,一行里把地名塞三遍,而 title 早就人工整理好了。
 *  3. 一篇文章只留一个 h1。三篇转载来的文章在正文里又嵌了一个
 *     <h1 class="news-title-h1">,内容和外层完全一样,直接删掉。
 *
 * 只处理在线文章,退役的会 301 跳走,不动。
 * 用法: node scripts/fix-blog-headings.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const retired = new Set(
  (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'retired-posts.json'), 'utf8')).posts || [])
    .map((p) => p.slug)
);

// 站点名 + 它前面的分隔符,出现在哪儿都剥掉(有一篇后缀跑到了标题中间)
const SUFFIX = /\s*[—|｜-]\s*秦皇岛旅游(博客|官网)\s*/g;
const H1 = /<h1([^>]*)>([\s\S]*?)<\/h1>/g;
const text = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const stat = { suffix: 0, dupRemoved: 0, rewritten: 0, files: 0 };
const notes = [];

for (const file of fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html'))) {
  if (retired.has(file.replace(/\.html$/, ''))) continue;

  const abs = path.join(ROOT, 'blog', file);
  const before = fs.readFileSync(abs, 'utf8');
  let html = before;

  /* ---- 1. 剥站点后缀 ---- */
  html = html.replace(H1, (whole, attrs, inner) => {
    if (!SUFFIX.test(inner)) return whole;
    SUFFIX.lastIndex = 0;
    stat.suffix++;
    return `<h1${attrs}>${inner.replace(SUFFIX, '')}</h1>`;
  });

  /* ---- 2. 去掉重复的 h1 ---- */
  const all = [...html.matchAll(H1)];
  if (all.length > 1) {
    const first = text(all[0][2]);
    // 从后往前删,避免前面的改动让后面的位置失效
    for (let i = all.length - 1; i >= 1; i--) {
      const m = all[i];
      if (text(m[2]) !== first) {
        notes.push(`   ${file}:第 ${i + 1} 个 h1 内容与首个不同,没动 —— ${text(m[2]).slice(0, 40)}`);
        continue;
      }
      html = html.slice(0, m.index) + html.slice(m.index + m[0].length);
      stat.dupRemoved++;
    }
  }

  /* ---- 3. 关键词堆砌的 h1 换成整理过的标题 ----
     <title> 早先已经被人工整理过了,h1 却还是抓来的原版,
     像「2026北戴河碧螺塔海上酒吧公园门票,秦皇岛北戴河碧螺塔海上酒吧公园游玩攻略,…」
     这种一行塞三遍地名的。差得离谱才动,免得误伤正常的长标题。 */
  const titleRaw = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const title = titleRaw.replace(/\s*[—|｜-]\s*秦皇岛[^—|｜]*$/, '').trim();
  const h1m = html.match(H1);
  if (title && h1m) {
    H1.lastIndex = 0;
    const one = H1.exec(html);
    H1.lastIndex = 0;
    const h1text = text(one[2]);
    if (h1text.length > title.length + 12) {
      html = html.slice(0, one.index) + `<h1${one[1]}>${title}</h1>` + html.slice(one.index + one[0].length);
      stat.rewritten++;
      notes.push(`   ${file}\n     原 h1:${h1text}\n     改为:${title}`);
    }
  }

  if (html !== before) {
    if (!DRY) fs.writeFileSync(abs, html, 'utf8');
    stat.files++;
  }
}

notes.forEach((n) => console.log(n));
console.log(
  `${DRY ? '[dry-run] ' : ''}✅ 博客标题:剥站点后缀 ${stat.suffix} 处,删重复 h1 ${stat.dupRemoved} 个,重写堆砌标题 ${stat.rewritten} 个(共改动 ${stat.files} 个文件)`
);
