#!/usr/bin/env node
/**
 * SEO / GEO 规范化(可重复执行,进 npm run all,排在 fix-seo-meta.js 之后)。
 *
 * 2026-10 全站体检查出来的问题,大多是早期不同脚本、不同来源生成的页面各写各的:
 *  1. og:image / twitter:image 用相对地址 —— 微信、微博抓分享图时取不到
 *  2. 结构化数据里的 image / url / logo / item 用相对地址 —— 搜索引擎按绝对地址理解
 *  3. Article / BlogPosting 缺 dateModified —— 搜索引擎和 AI 判断新旧主要看它,补成 datePublished
 *  4. 从别的网站抓来的文章,头部残留「网络整理」作者、关键词里的「>>>」、
 *     og:description 里的「您现在的位置是:首页>…」
 *  5. description 为空或太短(<40 字)就从正文第一段取;太长(>160)在句号处截断
 *  6. canonical 与页面实际地址不符时改正
 *
 * 只改能确定改对的东西,不改正文。
 *
 * 用法: node scripts/fix-seo-geo.js [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.divdu.com';
const DRY = process.argv.includes('--dry');
const SKIP = new Set(['admin', 'dashboard', 'xhs', '404', 'favorites']);
const JUNK = /您现在的位置|当前位置[:：]|admin\d{4}年/;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function list(dir) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.html')).map((f) => (dir ? `${dir}/${f}` : f));
}
const pages = [...list(''), ...list('blog'), ...list('attraction'), ...list('en'), ...list('en/attraction')]
  .filter((rel) => !(rel.indexOf('/') < 0 && SKIP.has(rel.replace(/\.html$/, ''))));

function pageUrl(rel) {
  let u = '/' + rel.replace(/\.html$/, '');
  if (u === '/index') return `${SITE}/`;
  if (u.endsWith('/index')) u = u.slice(0, -6);
  return SITE + u;
}

/** 相对地址 → 绝对地址(相对当前页面) */
function absolute(u, rel) {
  if (!u || /^(https?:|data:|mailto:|#)/.test(u)) return u;
  if (u.startsWith('//')) return 'https:' + u;
  const base = path.posix.dirname('/' + rel);
  const p = u.startsWith('/') ? u : path.posix.normalize(path.posix.join(base, u));
  return SITE + p;
}

/** 正文开头像样的文字,作为描述;一段太短就接着拼下一段,凑够 60 字 */
function firstParagraph(h) {
  const body = h.slice(h.indexOf('</head>'));
  const area = (body.match(/class="article-body"[\s\S]*/) || [body])[0];
  let out = '';
  for (const m of area.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const t = unesc(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (t.length < 15 || JUNK.test(t)) continue;
    out = out ? out + t : t;
    if (out.length >= 60) break;
  }
  return out.length >= 30 ? out : '';
}

/** 文件第一次 / 最近一次提交的日期(YYYY-MM-DD) */
const { execFileSync } = require('child_process');
function gitDate(rel, first) {
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'log', ...(first ? ['--diff-filter=A'] : ['-1']), '--format=%ad', '--date=short', '--', rel],
      { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    return first ? out[out.length - 1] : out[0];
  } catch (e) { return ''; }
}
const metaDesc = (h) => unesc((h.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/) || [])[1] || '').trim();

/** 截到 max 字以内,尽量在句号处断 */
function clip(t, max) {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const i = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('！'), cut.lastIndexOf('？'));
  return i >= max * 0.5 ? cut.slice(0, i + 1) : cut.slice(0, max - 1) + '…';
}

const stat = { og: 0, ld: 0, modified: 0, junk: 0, desc: 0, canon: 0, files: 0 };

for (const rel of pages) {
  const file = path.join(ROOT, rel);
  const before = fs.readFileSync(file, 'utf8');
  let h = before;
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(h) && rel.indexOf('/') < 0) continue;

  // 1) 分享图绝对地址
  h = h.replace(/(<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["'])([^"']+)(["'])/g, (m, a, u, b) => {
    const abs = absolute(u, rel);
    if (abs !== u) stat.og++;
    return a + abs + b;
  });

  // 2)(3) 结构化数据
  h = h.replace(/(<script type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (m, open, json, close) => {
    let j;
    try { j = JSON.parse(json); } catch (e) { return m; }
    let changed = false;
    const walk = (o) => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== 'object') return;
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (['image', 'url', 'logo', 'item', '@id'].includes(k) && typeof v === 'string' && /^(\.\.?\/|\/(?!\/))/.test(v)) {
          o[k] = absolute(v, rel); changed = true; stat.ld++;
        } else walk(v);
      }
      if (o['@type'] === 'Article' || o['@type'] === 'BlogPosting') {
        // 连发布日期都没有的(早期抓来的文章),按 git 记录补:首次提交=发布,最近提交=更新
        if (!o.datePublished) { const d = gitDate(rel, true); if (d) { o.datePublished = d; changed = true; stat.modified++; } }
        if (!o.dateModified) { const d = gitDate(rel, false) || o.datePublished; if (d) { o.dateModified = d; changed = true; stat.modified++; } }
        // 结构化数据里的描述带 Markdown 符号或抓取残留时,换成页面描述
        const md = metaDesc(h);
        if (typeof o.description === 'string' && (/\*\*|^#|\n#/.test(o.description) || JUNK.test(o.description)) &&
            md && md !== o.description && !JUNK.test(md) && !/\*\*/.test(md)) {
          o.description = md; changed = true; stat.junk++;
        }
      }
    };
    walk(j);
    if (!changed) return m;
    const pretty = /\n/.test(json.trim());
    return open + (pretty ? '\n' + JSON.stringify(j, null, 2) + '\n' : JSON.stringify(j)) + close;
  });

  // 4) 抓取残留
  h = h.replace(/(<meta\s+name=["']author["']\s+content=["'])网络整理(["'])/, (m, a, b) => { stat.junk++; return a + '秦皇岛旅游官网编辑团队' + b; });
  h = h.replace(/(<meta\s+name=["']keywords["']\s+content=["'][^"']*?)(?:&gt;|>)+(["'])/, (m, a, b) => { stat.junk++; return a + b; });
  // 原文是 <meta … content="…">>> ,标签自己的 > 要留下,只去掉多出来的(哪个 meta 都可能有)
  h = h.replace(/(<meta\s[^>]*?["'])(?:&gt;|>){2,}/g, (m, a) => { stat.junk++; return a + '>'; });

  // 5) 描述(Markdown 的 ** 是早期抓取/生成时带进来的)
  const dm = h.match(/(<meta\s+name=["']description["']\s+content=["'])([^"']*)(["'])/);
  const original = dm ? unesc(dm[2]).trim() : null;
  let desc = original === null ? null : original.replace(/\*\*/g, '').trim();
  if (dm) {
    let next = desc;
    if (!desc || desc.length < 40 || JUNK.test(desc)) {
      const p = firstParagraph(h);
      if (p) next = clip(p, 120);
    } else if (esc(desc).length > 160) {
      // 按页面源码里的长度算(&quot; 之类的实体也占字数),搜索结果里显示的就是这么长
      next = clip(desc, Math.min(150, desc.length - (esc(desc).length - 150)));
    } else if (desc.length >= 60 && /[一-龥，、]$/.test(desc)) {
      // 早期生成时就截断了的半句话(比如以「并」结尾),截到最后一个完整句子
      const i = Math.max(desc.lastIndexOf('。'), desc.lastIndexOf('；'), desc.lastIndexOf('！'), desc.lastIndexOf('？'));
      if (i >= 40) next = desc.slice(0, i + 1);
    }
    if (next && next !== original) {
      h = h.replace(dm[0], dm[1] + esc(next) + dm[3]);
      stat.desc++;
    }
    desc = next;
  }
  // og:description 是抓取残留或为空时,用 description
  if (desc) {
    h = h.replace(/(<meta\s+property=["']og:description["']\s+content=["'])([^"']*)(["'])/, (m, a, v, b) => {
      const t = unesc(v).trim();
      if (t && !JUNK.test(t)) return m;
      stat.junk++;
      return a + esc(desc) + b;
    });
  }

  // 6) canonical
  const want = pageUrl(rel);
  h = h.replace(/(<link\s+rel=["']canonical["']\s+href=["'])([^"']+)(["'])/, (m, a, v, b) => {
    let cur; try { cur = decodeURI(v); } catch (e) { cur = v; }
    if (cur === want || cur === encodeURI(want) || v === encodeURI(want)) return m;
    stat.canon++;
    return a + want + b;
  });

  if (h !== before) {
    stat.files++;
    if (!DRY) fs.writeFileSync(file, h, 'utf8');
  }
}

console.log(`✅ SEO/GEO 规范化:改动 ${stat.files} 个页面 —— 分享图 ${stat.og}、结构化数据地址 ${stat.ld}、` +
  `补 dateModified ${stat.modified}、抓取残留 ${stat.junk}、描述 ${stat.desc}、canonical ${stat.canon}${DRY ? '(--dry,未写入)' : ''}`);
