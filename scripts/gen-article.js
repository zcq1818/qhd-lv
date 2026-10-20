#!/usr/bin/env node
/**
 * 由 JSON 稿件生成博客攻略页,套用站内既有的 blog 文章模板
 * (导航、样式、结构化数据、分享、相关攻略、统计脚本保持一致)。
 *
 * 用法: node scripts/gen-article.js <稿件.json> [...]
 * 稿件放在 content/articles/<slug>.json,结构参照该目录里已有的稿件。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.divdu.com';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// 正文里的 **强调** 与 [文字](链接)
const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

const spots = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'attractions.json'), 'utf8')).spots;
const today = new Date().toISOString().slice(0, 10);

function build(a) {
  const spot = spots.find((s) => s.id === a.spotId) || {};
  const url = `${SITE}/blog/${a.slug}`;
  const cover = a.cover && fs.existsSync(path.join(ROOT, a.cover)) ? a.cover : 'images/qhd-panorama.webp';

  const toc = a.sections.filter((s) => s.id).map((s) => `<li><a href="#${s.id}">${esc(s.h2)}</a></li>`).join('');
  const bodyHtml = a.sections.map((s) => {
    const paras = s.body.map((p) => `<p>${inline(p)}</p>`).join('\n      ');
    const call = s.callout
      ? `\n      <div class="article-callout ${s.callout.type === 'warn' ? 'warn' : 'tip'}"><strong>${s.callout.type === 'warn' ? '注意' : '提示'}</strong>${inline(s.callout.text)}</div>`
      : '';
    // 有些内容天生是表格(比如按天列潮汐),拆成段落反而读不下去。
    // 窄屏上外层可横向滚动,不会把版面撑破。
    const table = s.table
      ? `\n      <div class="article-table-wrap"><table class="article-table">` +
        `<thead><tr>${s.table.head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>` +
        `<tbody>${s.table.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>` +
        `</table></div><p class="article-table-hint">← 左右滑动看完整表格 →</p>`
      : '';
    return `    <h2${s.id ? ` id="${s.id}"` : ''}>${esc(s.h2)}</h2>\n      ${paras}${table}${call}`;
  }).join('\n\n');

  const faqHtml = a.faq.map((f) => `<details class="article-faq-item"><summary>${esc(f.q)}</summary><p>${inline(f.a)}</p></details>`).join('\n      ');
  const relatedHtml = (a.related || []).map((r) => `<a href="${esc(r.href)}">${esc(r.text)}</a>`).join('\n      ');

  // 重新生成不能把发布日期改成今天 —— 那等于对搜索引擎谎报「新文章」
  const published = a.published || today;
  const checked = a.checked || today;

  /* 要点速览:AI 搜索(豆包、Kimi、文心、ChatGPT 等)引用的往往就是开头那几句
     能单独成立的结论。把答案放在最前面,人也受益。 */
  const tldrHtml = (a.tldr || []).length
    ? `<section class="article-tldr" aria-label="要点速览"><b>要点速览</b><ul>${a.tldr.map((t) => `<li>${inline(t)}</li>`).join('')}</ul></section>`
    : '';

  /* 资料来源:写明信息从哪来、哪天核对的。可核实的内容才会被当成可信来源引用 */
  const sources = a.sources || [];
  const sourcesHtml = sources.length
    ? `<section class="article-sources">
      <h2>资料来源</h2>
      <p>本文信息核对于 ${esc(checked)}。门票、开放时间、价格会变动,以官方当天公布为准。</p>
      <ol>${sources.map((s) => `<li><a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.name)}</a></li>`).join('')}</ol>
    </section>`
    : '';

  const ld = [
    { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, description: a.desc, url, image: `${SITE}/${cover}`, datePublished: published, dateModified: today, author: { '@type': 'Organization', name: '秦皇岛旅游官网' }, publisher: { '@type': 'Organization', name: '秦皇岛旅游官网', url: `${SITE}/` }, mainEntityOfPage: { '@type': 'WebPage', '@id': url }, ...(sources.length ? { citation: sources.map((s) => s.url) } : {}) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '首页', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: '旅游博客', item: `${SITE}/blog` }, { '@type': 'ListItem', position: 3, name: a.title, item: url }] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ].map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n');

  const meta = [
    spot.price ? `<span>🎫 ${esc(String(spot.price).split(/[;；,，(（]/)[0])}</span>` : '',
    spot.duration ? `<span>⏰ ${esc(spot.duration)}</span>` : '',
    spot.rating ? `<span>⭐ ${esc(spot.rating)}</span>` : '',
    spot.level && spot.level !== '无' ? `<span>🏅 ${esc(spot.level)}</span>` : '',
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(a.titleFull)}</title>
<meta name="description" content="${esc(a.desc)}">
<meta name="keywords" content="${esc(a.keywords)}">
<meta name="author" content="编辑团队">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(a.desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/${cover}">
<meta property="og:site_name" content="秦皇岛旅游官网">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/${cover}">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="stylesheet" href="../style.min.css">
<link rel="stylesheet" href="../css/share.min.css">
<link rel="stylesheet" href="../css/blog-article.min.css">
<style>
.article-toc{background:#f6f8fb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin:0 0 28px}
.article-toc b{display:block;font-size:.9rem;color:#0f172a;margin-bottom:8px}
.article-toc ol{margin:0;padding-left:1.2em;display:grid;gap:5px}
.article-toc a{color:#1a73e8;text-decoration:none;font-size:.92rem}
.article-toc a:hover{text-decoration:underline}
.article-callout{margin:14px 0;padding:12px 16px;border-radius:10px;font-size:.92rem;line-height:1.75}
.article-callout strong{display:block;margin-bottom:4px}
.article-callout.tip{background:#f0fdf4;color:#166534}
.article-callout.warn{background:#fffbeb;color:#92400e}
.article-table-wrap{overflow-x:auto;margin:16px 0;-webkit-overflow-scrolling:touch}
.article-table{width:100%;min-width:420px;border-collapse:collapse;font-size:.9rem}
.article-table th,.article-table td{padding:9px 12px;text-align:left;border-bottom:1px solid #e5e7eb;white-space:nowrap}
.article-table th{background:#f6f8fb;font-weight:700;color:#0f172a;font-size:.85rem}
.article-table td{color:#334155}
.article-table tr:last-child td{border-bottom:0}
.article-table-hint{display:none;margin:-8px 0 16px;font-size:.78rem;color:#94a3b8;text-align:center}
@media(max-width:640px){.article-table-hint{display:block}}
.article-facts{display:flex;flex-wrap:wrap;gap:8px 16px;margin:0 0 20px;font-size:.88rem;color:#475569}
.article-faq{margin-top:36px;padding-top:24px;border-top:2px solid #e5e7eb}
.article-faq-item{border-bottom:1px solid #e5e7eb;padding:4px 0}
.article-faq-item summary{cursor:pointer;font-weight:700;padding:10px 0;list-style:none;display:flex;justify-content:space-between;gap:12px}
.article-faq-item summary::after{content:"+";color:#1a73e8;font-weight:800}
.article-faq-item[open] summary::after{content:"−"}
.article-faq-item p{margin:0 0 12px;color:#475569;line-height:1.75}
.article-related{margin-top:32px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.article-related a{padding:12px 14px;background:#f6f8fb;border:1px solid #e5e7eb;border-radius:10px;text-decoration:none;color:#1E293B;font-weight:700;font-size:.9rem}
.article-related a:hover{border-color:#8ab4f8;background:#fff}
.article-tldr{margin:0 0 20px;padding:14px 18px;border-left:4px solid #1a73e8;background:#f0f6ff;border-radius:0 12px 12px 0}
.article-tldr b{display:block;margin-bottom:6px;color:#0f172a;font-size:.95rem}
.article-tldr ul{margin:0;padding-left:1.2em;display:grid;gap:4px;line-height:1.75;color:#1e293b;font-size:.94rem}
.article-sources{margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.86rem;color:#64748b}
.article-sources h2{font-size:1rem;margin:0 0 6px}
.article-sources p{margin:0 0 6px}
.article-sources ol{margin:0;padding-left:1.4em;line-height:1.8}
.article-sources a{color:#64748b;word-break:break-all}
</style>
${ld}
</head>
<body>

<nav class="navbar" id="navbar">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <svg class="nav-logo-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" fill="#1a73e8"/><path d="M8 18 Q11 10 14 8 Q17 10 20 18" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      秦皇岛旅游官网
    </a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/">首页</a></li>
      <li><a href="/must-play">必玩景点</a></li>
      <li><a href="/attractions">景点大全</a></li>
      <li><a href="/map">地图</a></li>
      <li><a href="/itinerary">行程规划</a></li>
      <li><a href="/food">美食</a></li>
      <li><a href="/guide">旅游攻略</a></li>
      <li><a href="/blog" class="active">博客</a></li>
      <li><a href="/about">关于我们</a></li>
    </ul>
    <a href="/itinerary" class="nav-cta">免费规划行程 <span class="nav-cta-arrow">→</span></a>
    <button class="hamburger" id="hamburger" aria-label="菜单"><span></span><span></span><span></span></button>
  </div>
</nav>

<main class="article-wrap" id="main-content">
  <h1>${esc(a.title)}</h1>
  <div class="article-meta">
    <span>秦皇岛旅游官网</span> · <time datetime="${published}">${published}</time>${today !== published ? ` · 更新于 <time datetime="${today}">${today}</time>` : ''}
  </div>
  <img class="article-cover" src="../${cover}" alt="${esc(a.coverAlt || a.title)}" loading="eager">
  ${meta ? `<div class="article-facts">${meta}</div>` : ''}
  ${tldrHtml}

  <nav class="article-toc" aria-label="本文目录">
    <b>本文目录</b>
    <ol>${toc}</ol>
  </nav>

  <article class="article-body">
${bodyHtml}

    <section class="article-faq">
      <h2>常见问题</h2>
      ${faqHtml}
    </section>
    ${sourcesHtml}

    <nav class="article-related" aria-label="相关内容">
      ${relatedHtml}
    </nav>
  </article>
</main>

<footer class="footer">
  <div class="footer-inner">
    <p style="text-align:center;color:#94a3b8;font-size:.85rem;margin:0">
      © 2026 秦皇岛旅游官网 · <a href="/" style="color:#cbd5e1">首页</a> · <a href="/blog" style="color:#cbd5e1">更多攻略</a> · 门票与开放时间以景区当日公示为准
    </p>
  </div>
</footer>

<script>
document.getElementById('hamburger').addEventListener('click', function(){ document.getElementById('navLinks').classList.toggle('open'); });
window.addEventListener('scroll', function(){ document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20); });
</script>
<script src="../js/analytics.min.js" defer></script>
<script src="../js/share.min.js" defer></script>
<script src="../js/blog-related.min.js" defer></script>
<script src="../js/trip.min.js" defer></script>
<script src="../js/view-counter.min.js" defer></script>
</body>
</html>
`;
}

const files = process.argv.slice(2);
if (!files.length) { console.error('用法: node scripts/gen-article.js <稿件.json> [...]'); process.exit(1); }
for (const f of files) {
  const a = JSON.parse(fs.readFileSync(f, 'utf8'));
  const out = path.join(ROOT, 'blog', `${a.slug}.html`);
  fs.writeFileSync(out, build(a), 'utf8');
  console.log(`✅ blog/${a.slug}.html  (${a.sections.length} 节 · ${a.faq.length} 条问答)`);
}
