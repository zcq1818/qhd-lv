/**
 * 站点自检的各项检查。
 *
 * 抽成模块是因为有两个调用方:npm run check(只看压缩产物)和
 * 提交钩子(全量)。两边复制一份逻辑,迟早只改了一边。
 *
 * 每个检查返回 { name, problems: [ {msg, fix} ] },problems 为空即通过。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const PAGE_DIRS = ['.', 'attraction', 'blog', 'en', 'en/attraction'];

function allPages() {
  return PAGE_DIRS.flatMap((d) => {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) return [];
    return fs.readdirSync(abs).filter((f) => f.endsWith('.html')).map((f) => (d === '.' ? f : `${d}/${f}`));
  });
}

function retiredSlugs() {
  try {
    return new Set((JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'retired-posts.json'), 'utf8')).posts || [])
      .map((p) => p.slug));
  } catch (e) { return new Set(); }
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ---------------- 1. 压缩产物是否过期 ---------------- */
function checkArtifacts() {
  const sources = [
    ...fs.readdirSync(path.join(ROOT, 'css')).filter((f) => f.endsWith('.css') && !f.endsWith('.min.css')).map((f) => `css/${f}`),
    ...fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js') && !f.endsWith('.min.js')).map((f) => `js/${f}`),
    'style.css',
  ];
  const problems = [];
  for (const src of sources) {
    const min = src.replace(/\.(css|js)$/, '.min.$1');
    const a = path.join(ROOT, src), b = path.join(ROOT, min);
    if (!fs.existsSync(b)) { problems.push({ msg: `缺少压缩文件 ${min}`, fix: 'npm run optimize' }); continue; }
    if (fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs + 1000) {
      problems.push({ msg: `${min} 已过期(源文件 ${src} 更新)`, fix: 'npm run optimize' });
    }
  }
  return { name: `压缩产物(${sources.length} 个)`, problems };
}

/* ---------------- 2. 页面是否引用了未压缩文件 ----------------
   必须兼容不带引号的写法:曾经有 9 个页面写的是
   <script src=js/accessibility.js defer>,只认双引号的正则完全看不见它。 */
const ASSET_RE = /\b(?:src|href)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'>]+))/g;

function checkMinRefs(pages) {
  const bad = new Map();
  for (const rel of pages) {
    for (const m of read(rel).matchAll(ASSET_RE)) {
      const raw = (m[1] || m[2] || m[3] || '').split('?')[0];
      if (/^(https?:)?\/\//.test(raw) || raw.startsWith('data:')) continue;
      if (!/\.(css|js)$/.test(raw) || /\.min\.(css|js)$/.test(raw)) continue;
      if (raw.includes('/vendor/')) continue;
      const file = raw.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
      if (!fs.existsSync(path.join(ROOT, file.replace(/\.(css|js)$/, '.min.$1')))) continue;
      if (!bad.has(file)) bad.set(file, []);
      bad.get(file).push(rel);
    }
  }
  return {
    name: `页面引用压缩版(${pages.length} 页)`,
    problems: [...bad].map(([f, where]) => ({
      msg: `仍在引用未压缩的 ${f}(${where.length} 页,例如 ${where[0]})`,
      fix: 'npm run optimize',
    })),
  };
}

/* ---------------- 3. 统计脚本覆盖 ---------------- */
const NO_ANALYTICS = new Set(['admin.html', 'dashboard.html', 'favorites.html']);

function checkAnalytics(pages) {
  const missing = [], inlined = [];
  for (const rel of pages) {
    const html = read(rel);
    const base = path.basename(rel);
    const hasFile = /<script[^>]+js\/analytics(\.min)?\.js/.test(html);
    const hasInline = /googletagmanager\.com|hm\.baidu\.com/.test(html);

    if (hasInline) inlined.push(rel);                       // 内嵌 + 文件 = 双重计数
    if (!NO_ANALYTICS.has(base) && !hasFile) missing.push(rel);
    if (NO_ANALYTICS.has(base) && hasFile) inlined.push(`${rel}(不该统计的页面)`);
  }
  const problems = [];
  if (missing.length) problems.push({ msg: `${missing.length} 页缺统计脚本(例如 ${missing[0]})`, fix: 'npm run analytics' });
  if (inlined.length) problems.push({ msg: `${inlined.length} 页有内嵌统计代码,会双重计数(例如 ${inlined[0]})`, fix: 'npm run analytics' });
  return { name: '统计脚本覆盖', problems };
}

/* ---------------- 4. 浏览量统计覆盖 ---------------- */
const NO_COUNTER = new Set(['admin.html', 'dashboard.html', '404.html', 'favorites.html']);

function checkViewCounter(pages, retired) {
  const missing = pages.filter((rel) => {
    const base = path.basename(rel);
    if (NO_COUNTER.has(base)) return false;
    if (rel.startsWith('blog/') && retired.has(base.replace(/\.html$/, ''))) return false;
    return !/js\/view-counter(\.min)?\.js/.test(read(rel));
  });
  return {
    name: '浏览量统计覆盖',
    problems: missing.length
      ? [{ msg: `${missing.length} 页缺浏览量统计(例如 ${missing[0]})`, fix: 'npm run views' }]
      : [],
  };
}

/* ---------------- 5. 本地引用的图片/资源是否存在 ---------------- */
function checkAssets(pages) {
  const missing = new Map();
  for (const rel of pages) {
    const dir = path.dirname(rel);
    const html = read(rel);
    const srcs = [
      ...[...html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*"([^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/content="(https:\/\/www\.divdu\.com\/images\/[^"]+)"/g)].map((m) => m[1]),
    ];
    for (const s of srcs) {
      if (s.startsWith('data:') || s.startsWith('//') || s.includes("' +") || s.includes('${')) continue;
      const rooted = s.startsWith('https://www.divdu.com/') || s.startsWith('/');
      const f = s.split('?')[0].split('#')[0].replace('https://www.divdu.com/', '').replace(/^\//, '');
      if (/^https?:/.test(f)) continue;
      const cand = rooted ? f : path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, f));
      if (!fs.existsSync(path.join(ROOT, cand))) {
        if (!missing.has(cand)) missing.set(cand, []);
        missing.get(cand).push(rel);
      }
    }
  }
  return {
    name: '图片引用',
    problems: [...missing].slice(0, 5).map(([f, where]) => ({
      msg: `图片不存在:${f}(${where.length} 页,例如 ${where[0]})`,
      fix: '检查文件名或补上图片',
    })),
  };
}

/* ---------------- 6. sitemap 与 RSS 是否跟得上 ---------------- */
function checkSitemapRss(pages, retired) {
  const problems = [];

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    problems.push({ msg: 'sitemap.xml 不存在', fix: 'npm run sitemap' });
  } else {
    const sm = fs.readFileSync(sitemapPath, 'utf8');
    const should = pages.filter((rel) => {
      const base = path.basename(rel);
      if (['admin.html', 'dashboard.html', '404.html', 'favorites.html'].includes(base)) return false;
      if (rel.startsWith('blog/') && retired.has(base.replace(/\.html$/, ''))) return false;
      return true;
    });
    const missing = should.filter((rel) => {
      // 目录首页在 sitemap 里是目录本身:en/index.html → /en,index.html → /
      const slug = rel.replace(/\.html$/, '').replace(/(^|\/)index$/, '');
      if (!slug) return !/<loc>https:\/\/www\.divdu\.com\/<\/loc>/.test(sm);
      return !sm.includes(`/${encodeURI(slug)}<`) && !sm.includes(`/${slug}<`);
    });
    if (missing.length) {
      problems.push({ msg: `sitemap 缺 ${missing.length} 个页面(例如 ${missing[0]})`, fix: 'npm run sitemap' });
    }
  }

  const rssPath = path.join(ROOT, 'rss.xml');
  if (fs.existsSync(rssPath)) {
    const rss = fs.readFileSync(rssPath, 'utf8');
    const links = [...rss.matchAll(/<link>https:\/\/www\.divdu\.com\/blog\/([^<]+)<\/link>/g)]
      .map((m) => decodeURIComponent(m[1]));
    const dead = links.filter((s) => !fs.existsSync(path.join(ROOT, 'blog', `${s}.html`)) || retired.has(s));
    if (dead.length) {
      problems.push({ msg: `RSS 里有 ${dead.length} 条指向不存在或已退役的文章`, fix: 'npm run rss' });
    }
  }

  return { name: 'sitemap 与 RSS', problems };
}

/* ---------------- 7. 不该提交的东西 ---------------- */
function checkForbidden(stagedFiles) {
  const banned = [/^\.env$/, /^Claude outputs\//, /^\.claude\//];
  const hits = (stagedFiles || []).filter((f) => banned.some((rx) => rx.test(f)));
  return {
    name: '敏感文件',
    problems: hits.map((f) => ({ msg: `不该提交:${f}`, fix: 'git restore --staged 该文件' })),
  };
}

module.exports = {
  ROOT, allPages, retiredSlugs,
  checkArtifacts, checkMinRefs, checkAnalytics, checkViewCounter,
  checkAssets, checkSitemapRss, checkForbidden,
};
