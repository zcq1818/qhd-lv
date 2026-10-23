#!/usr/bin/env node
/**
 * 把在线文章补进博客列表页 blog.html(可重复执行)。
 *
 * 起因:blog.html 的卡片是手写的,发新文章时没人记得加。到 2026-10 已经有
 * 19 篇在线文章不在列表上,包括最近发的全部 7 篇和流量靠前的交通、自驾攻略。
 * 站内搜索的索引又是从这一页抓标题的,于是这些文章在站内也搜不到。
 *
 * 规则:
 * - 「在线文章」以 data/blog-index.json 为准(gen-blog-index.js 生成,已排除退役文章)
 * - 已在列表上的不动;只补缺的
 * - 30 天内首次提交的插到最前面(新的在上),更早的补到末尾
 * - 卡片写法与页面里现有的一致
 *
 * 用法: node scripts/sync-blog-list.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'blog.html');
const DRY = process.argv.includes('--dry');
const FRESH_DAYS = 30;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 文章第一次提交的日期;还没提交的算今天 */
function firstCommit(slug) {
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'log', '--diff-filter=A', '--format=%aI', '--', `blog/${slug}.html`],
      { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    return out.length ? new Date(out[out.length - 1]) : new Date();
  } catch (e) {
    return new Date();
  }
}

/** 标签:按主题归类,和现有卡片的叫法保持一致 */
function tagFor(p) {
  const s = p.slug;
  const rules = [
    [/aranya/, '阿那亚'], [/ganhai/, '赶海'], [/bird/, '观鸟'], [/hot-spring|wenquan/, '温泉'],
    [/new-year|national-day|holiday/, '节假日'], [/sunrise/, '日出'], [/transport|self-driving/, '交通'],
    [/photo/, '拍照'], [/couple/, '情侣游'], [/elderly/, '带老人'], [/pitfall/, '避坑'],
    [/ticket/, '门票'], [/winery|wine/, '酒庄'], [/one-day/, '行程'], [/review/, '口碑'],
  ];
  for (const [re, tag] of rules) if (re.test(s)) return tag;
  return '攻略';
}

function card(p) {
  const html = fs.readFileSync(path.join(ROOT, 'blog', `${p.slug}.html`), 'utf8');
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const plain = desc.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const excerpt = plain.length > 90 ? plain.slice(0, 88) + '…' : plain;
  return `      <a class="card blog-card reveal" href="blog/${esc(p.slug)}">
        <div class="card-body">
          <h3>${esc(p.title)}</h3>
          <p class="blog-card-excerpt">${esc(excerpt)}</p>
          <div class="blog-card-meta">
            <span class="card-tag card-tag--blue">${esc(tagFor(p))}</span>
          </div>
        </div>
      </a>
`;
}

const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'blog-index.json'), 'utf8')).posts || [];
let html = fs.readFileSync(FILE, 'utf8');

const listed = new Set([...html.matchAll(/href="blog\/([^"]+)"/g)].map((m) => decodeURIComponent(m[1])));
const missing = posts.filter((p) => !listed.has(p.slug) && fs.existsSync(path.join(ROOT, 'blog', `${p.slug}.html`)));

const now = Date.now();
const dated = missing.map((p) => ({ p, d: firstCommit(p.slug) }));
const fresh = dated.filter((x) => now - x.d.getTime() <= FRESH_DAYS * 86400e3).sort((a, b) => b.d - a.d);
const old = dated.filter((x) => !fresh.includes(x)).sort((a, b) => b.d - a.d);

const GRID = '<div class="blog-grid">\n';
const gi = html.indexOf(GRID);
if (gi < 0) {
  console.error('❌ blog.html 里找不到 <div class="blog-grid">,没有改动');
  process.exit(1);
}

if (fresh.length) {
  const at = gi + GRID.length;
  html = html.slice(0, at) + fresh.map((x) => card(x.p)).join('') + html.slice(at);
}
if (old.length) {
  // 末尾:blog-grid 里最后一张卡片之后
  const start = html.indexOf(GRID);
  const lastCard = html.lastIndexOf('</a>\n', html.indexOf('</div>\n  </div>\n</section>', start));
  const at = lastCard >= 0 ? lastCard + '</a>\n'.length : -1;
  if (at > 0) html = html.slice(0, at) + old.map((x) => card(x.p)).join('') + html.slice(at);
  else console.warn('⚠️ 没找到列表末尾,较早的文章没有补上');
}

/* 早期手写的卡片里,有的摘要是从别的网站抓来的残留(「您现在的位置是:首页>…」),
   换成文章自己的 description */
const JUNK = /您现在的位置|当前位置[:：]|admin\d{4}年/;
let cleaned = 0;
html = html.replace(/(<a class="card blog-card[^"]*" href="blog\/([^"]+)">[\s\S]*?<p class="blog-card-excerpt">)([\s\S]*?)(<\/p>)/g, (m, a, slug, ex, b) => {
  if (!JUNK.test(ex)) return m;
  const f = path.join(ROOT, 'blog', `${decodeURIComponent(slug)}.html`);
  if (!fs.existsSync(f)) return m;
  const d = (fs.readFileSync(f, 'utf8').match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!d || JUNK.test(d)) return m;
  cleaned++;
  return a + d + b;
});

if ((missing.length || cleaned) && !DRY) fs.writeFileSync(FILE, html, 'utf8');
console.log(`✅ 博客列表:补上 ${missing.length} 篇(新文章置顶 ${fresh.length},较早的补到末尾 ${old.length})` +
  `${cleaned ? `,清理残留摘要 ${cleaned} 张` : ''}${DRY ? ' --dry 未写入' : ''}`);
