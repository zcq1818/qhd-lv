#!/usr/bin/env node
/**
 * 批量生成 10 个景点的独立 SEO 攻略页（blog/*-guide.html）
 * 复用 geziwo-park-guide.html 的模板结构，正文为原创攻略
 * 用法: node scripts/gen-spot-guides.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TODAY = '2026-09-16';
const TODAY_CN = '2026年9月16日';

function esc(s) { return String(s); }

function renderGuide(g) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QNGJC2KRK0"></script>
<script>
 window.dataLayer = window.dataLayer || [];
 function gtag(){dataLayer.push(arguments);}
 gtag('js', new Date());
 gtag('config', 'G-QNGJC2KRK0');
</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${g.title}</title>
<meta name="description" content="${g.desc}">
<meta name="keywords" content="${g.keywords}">
<meta name="author" content="秦皇岛旅游官网 · 编辑团队">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="https://www.divdu.com/blog/${g.slug}">
<meta property="og:title" content="${g.title}— 秦皇岛旅游博客">
<meta property="og:description" content="${g.ogDesc}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://www.divdu.com/blog/${g.slug}">
<meta property="og:image" content="${g.cover}">
<meta property="og:site_name" content="秦皇岛旅游官网">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${g.title}">
<meta name="twitter:description" content="${g.ogDesc}">
<meta name="twitter:image" content="${g.cover}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${g.title}— 秦皇岛旅游博客",
  "description": "${g.desc}",
  "image": "${g.cover}",
  "datePublished": "${TODAY}",
  "dateModified": "${TODAY}",
  "inLanguage": "zh-CN",
  "author": { "@type": "Organization", "name": "秦皇岛旅游官网 · 编辑团队" },
  "publisher": { "@type": "Organization", "name": "秦皇岛旅游官网", "url": "https://www.divdu.com/" },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://www.divdu.com/blog/${g.slug}" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "首页", "item": "https://www.divdu.com/" },
    { "@type": "ListItem", "position": 2, "name": "博客", "item": "https://www.divdu.com/blog" },
    { "@type": "ListItem", "position": 3, "name": "${g.breadcrumbName}", "item": "https://www.divdu.com/blog/${g.slug}" }
  ]
}
</script>
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="stylesheet" href="../style.min.css">
<link rel="stylesheet" href="../css/search.min.css">
<link rel="stylesheet" href="../css/share.min.css">
<link rel="stylesheet" href="../css/blog-article.min.css">
<script>
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?7b1ee61e8afe12d737233bf307fc7648";
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();
</script>
<link rel="apple-touch-icon" href="../assets/favicon.svg">
<link rel="alternate" hreflang="zh-CN" href="https://www.divdu.com/">
</head>
<body>

<!-- ====== 导航栏 ====== -->
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

<!-- ====== 面包屑 ====== -->
<div class="breadcrumb"><a href="../">首页</a> <span class="sep">/</span> <a href="../blog">博客</a> <span class="sep">/</span> ${g.breadcrumbName}</div>

<!-- ====== 文章 ====== -->
<article class="article-wrap">
  <header class="article-header">
    <span class="card-tag">景点攻略</span>
    <h1>${g.title}</h1>
    <div class="article-meta">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <span>${TODAY_CN}</span>
      <span class="sep">·</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>${g.readTime}</span>
      <span class="sep">·</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      <span><span data-view-count>0</span> 次阅读</span>
    </div>
    <div class="article-tags">
      ${g.tags.map(t => '<span>' + t + '</span>').join('')}
    </div>
  </header>

  <img class="article-cover" src="${g.cover}" alt="${g.coverAlt}" loading="lazy" width="600" height="400">

  <div class="article-body">
${g.body}
  </div>

  <!-- 分享按钮区域 -->
  <div class="article-share">
    <p>觉得这篇攻略有用？分享给准备去${g.shareName}的朋友吧</p>
    <div class="article-share-buttons">
      <button class="share-pill" data-share-platform="wechat">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 4C4.36 4 1 6.69 1 10c0 1.89 1.08 3.56 2.78 4.66L3 17l2.5-1.5c.96.27 1.96.42 3 .42.26 0 .51-.01.77-.03C9.05 15.36 9 15.43 9 15.5c0 2.76 2.91 5 6.5 5 .83 0 1.62-.13 2.36-.36L20 21l-.7-2.2C20.94 17.96 22 16.32 22 14.5c0-2.76-2.91-5-6.5-5-3.59 0-6.5 2.24-6.5 5 0 .07-.05.14-.05.21L8.5 14c-1.05 0-2.05-.15-3-.42L3 15l.78-2.34C2.08 11.56 1 9.89 1 8c0-3.31 3.36-6 7.5-6 4.14 0 7.5 2.69 7.5 6 0 .17-.02.33-.04.5H14c0-2.21-2.46-4-5.5-4z"/></svg>
        微信
      </button>
      <button class="share-pill" data-share-platform="weibo">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.1 13.4c-3.4 0-6.1 2.1-6.1 4.7 0 2.6 2.7 4.7 6.1 4.7s6.1-2.1 6.1-4.7c0-2.6-2.7-4.7-6.1-4.7z"/></svg>
        微博
      </button>
      <button class="share-pill" data-share-platform="copy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        复制链接
      </button>
      <button class="share-pill" data-share-platform="card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
        分享卡片
      </button>
    </div>
  </div>

  <!-- 作者署名 + 最后更新 -->
  <div class="article-footer">
    <p class="article-author">秦皇岛旅游官网 · 编辑团队</p>
    <p>最后更新：2026年9月</p>
    <a class="article-back" href="../blog">← 返回博客列表</a>
  </div>
</article>

<!-- ====== 页脚 ====== -->
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>秦皇岛旅游官网</h3>
        <p>致力于为每一位来秦皇岛的游客，提供最实用、最全面的旅游攻略。</p>
      </div>
      <div class="footer-col">
        <h4>热门页面</h4>
        <a href="/">首页</a>
        <a href="../attractions">景点推荐</a>
        <a href="../itinerary">行程规划</a>
        <a href="../food">美食推荐</a>
        <a href="../blog">旅游博客</a>
      </div>
      <div class="footer-col">
        <h4>旅游攻略</h4>
        <a href="../guide">出行指南</a>
        <a href="../map">旅游地图</a>
        <a href="../blog">旅游博客</a>
      </div>
      <div class="footer-col">
        <h4>关于我们</h4>
        <a href="../about">关于官网</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 秦皇岛旅游官网</span>
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;">冀ICP备16026346号-2</a>
      <div><a href="../sitemap.xml">网站地图</a></div>
    </div>
  </div>
</footer>

<script>
window.addEventListener('scroll', function () {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});
document.getElementById('hamburger').addEventListener('click', function () {
  document.getElementById('navLinks').classList.toggle('open');
});
var _navLinksEl = document.getElementById('navLinks');
if (_navLinksEl) {
  _navLinksEl.addEventListener('click', function (e) {
    if (e.target.tagName === 'A' || e.target.closest('a')) {
      this.classList.remove('open');
    }
  });
}
document.querySelector('.article-share-buttons').addEventListener('click', function (e) {
  var btn = e.target.closest('.share-pill');
  if (!btn) return;
  var platform = btn.getAttribute('data-share-platform');
  var target = document.querySelector('.qhd-share-btn[data-platform="' + platform + '"]');
  if (target) target.click();
});
</script>
<script src="../js/search.min.js" defer></script>
<script src="../js/share.min.js" defer></script>
<script src="../js/view-counter.js" defer></script>
<script src="../js/weather-widget.js" defer></script>
<script src="../js/search-index.js" defer></script>
<script src="../js/search.js" defer></script>
</body>
</html>`;
}

// ============ 10 个景点攻略数据 ============
const guides = [];
guides.push({
  slug: 'laohushi-guide',
  title: '老虎石海上公园全攻略 | 门票·开放时间·日落·赶海（2026最新）',
  desc: '老虎石海上公园是北戴河最经典的免费海滨公园，因海边形似老虎的巨石得名。本文详解老虎石门票（免费）、开放时间、最美日落观赏点、沙滩游泳、礁石赶海、交通路线和避坑提醒，一篇讲透老虎石怎么玩。',
  keywords: '老虎石海上公园,老虎石攻略,老虎石门票,北戴河老虎石,北戴河日落,老虎石赶海,北戴河免费景点',
  ogDesc: '北戴河最经典的免费海滨公园，最美日落观赏点，门票免费。',
  cover: '../images/laohushi.webp',
  coverAlt: '北戴河老虎石海上公园日落景观',
  breadcrumbName: '老虎石海上公园全攻略',
  shareName: '老虎石',
  readTime: '6 分钟阅读',
  tags: ['#老虎石', '#北戴河日落', '#免费景点', '#赶海'],
  body: `
    <p>如果想不花钱就看北戴河最经典的"海"，那答案一定是<strong>老虎石海上公园</strong>。它免费、全天开放、就在北戴河海滨的核心地段，海边那块形似老虎的巨石，是无数游客合影的北戴河标志。这篇攻略把门票、开放时间、日落机位、游泳赶海一次讲透，帮你用最少的钱玩出最地道的北戴河。</p>

    <h2>一、老虎石海上公园是什么？为什么叫"老虎石"</h2>
    <p>老虎石海上公园位于北戴河中海滩路，是北戴河开发最早、最经典的海滨浴场之一。名字的由来很有画面感：海边散落着一组巨大的礁石，其中最大的一块<strong>形似俯卧的老虎</strong>，涨潮时海水拍打礁石，远远望去就像老虎戏水，故得名"老虎石"。</p>
    <p>这里是北戴河海滨的核心区域，沙滩平缓细腻、沙质金黄，是游泳、玩沙、踏浪的好地方。相比周边收费的海滨，老虎石<strong>免费开放</strong>，性价比极高。</p>

    <h2>二、门票与开放时间</h2>
    <p>老虎石海上公园<strong>门票免费，全天开放</strong>，没有固定闭园时间，随时可以进出。不过要提醒一句：免费的是海滨沙滩和礁石区域，周边部分配套（如更衣、淋浴、寄存、沙滩椅等）是收费项目，按需消费即可。</p>
    <blockquote>💡 <strong>小提示：</strong>夏季游泳、玩水注意安全，务必在浴场划定的安全区域内活动，看护好孩子，别离岸太远。</blockquote>

    <h2>三、核心玩法（来了玩什么）</h2>
    <h3>1. 看一场北戴河最美日落（重点）</h3>
    <p>老虎石是公认的<strong>北戴河最美日落观赏点</strong>之一。傍晚时分，夕阳西沉，金色余晖洒在老虎巨石和沙滩上，礁石与人的剪影极出片。最佳观赏时段是<strong>下午4点到6点</strong>，建议日落前1小时到场占好位置。</p>
    <h3>2. 沙滩游泳与踏浪</h3>
    <p>夏季（6-9月）可以下水游泳，沙滩平缓、水质尚可，适合家庭戏水。不下水也可以光脚踩沙、追浪，孩子玩沙能玩一下午。</p>
    <h3>3. 礁石区赶海</h3>
    <p>退潮后，老虎石周边的礁石区会露出滩涂，可以捡贝壳、抓小螃蟹、捞小海螺，是免费的亲子乐趣。赶海前记得查好潮汐时间，带小桶、小铲子和防滑鞋。</p>

    <h2>四、交通方式</h2>
    <ul>
      <li><strong>公交：</strong>乘34路、5路到"老虎石"站下车即到。</li>
      <li><strong>自驾/打车：</strong>导航"老虎石海上公园"，北戴河站打车约10分钟。旺季海边停车紧张，建议早到或停在周边停车场。</li>
      <li><strong>骑行：</strong>沿海滨栈道骑行，一路海景，是北戴河很舒服的打开方式。</li>
    </ul>

    <h2>五、周边怎么玩（串成一天）</h2>
    <p>老虎石位于北戴河海滨核心，周边景点密集，很适合串成一天：</p>
    <ul>
      <li><strong>清晨：</strong>鸽子窝看日出（门票35元，看我们<a href="../blog/geziwo-park-guide">鸽子窝公园全攻略</a>）</li>
      <li><strong>上午：</strong>沿北戴河海滨栈道散步，来老虎石玩沙踏浪</li>
      <li><strong>下午：</strong>联峰山俯瞰北戴河全景</li>
      <li><strong>傍晚：</strong>回老虎石看日落（本攻略重点）</li>
    </ul>
    <p>想完整规划北戴河行程，看我们的<a href="../blog/beidaihe-2days-weekend">北戴河2天1夜周末游攻略</a>。</p>

    <h2>六、避坑指南</h2>
    <h3>坑1：把老虎石当成收费景点，绕路去买票</h3>
    <p>老虎石本身是免费的，没有大门和门票。如果遇到有人拦着收费，多半是周边私人的停车或服务收费，别误以为是景区门票。</p>
    <h3>坑2：夏天正午去，又晒又热</h3>
    <p>老虎石几乎无遮阴，正午暴晒体验很差。<strong>建议清晨或傍晚去</strong>，尤其是傍晚看日落，才是老虎石的正确打开方式。</p>
    <h3>坑3：礁石区光脚踩，容易划伤</h3>
    <p>礁石湿滑且有藤壶、牡蛎壳，光脚容易被划伤。<strong>赶海务必穿防滑鞋或旧运动鞋</strong>。</p>

    <h2>写在最后</h2>
    <p>老虎石海上公园最大的魅力，是它用<strong>免费</strong>的方式，把北戴河最经典的海滨、礁石、日落打包送给你。不用门票、不用预约，挑个傍晚，在老虎石边看一场日落，赶赶海、踩踩沙，就是最地道的北戴河玩法。想看更多北戴河免费玩法，欢迎关注我们的<a href="../blog">博客</a>，或看<a href="../blog/beidaihe-free-attractions">北戴河免费景点攻略</a>。</p>`
});

guides.push({
  slug: 'dongwuyuan-guide',
  title: '秦皇岛野生动物园全攻略 | 门票·自驾路线·投喂·开放时间（2026最新）',
  desc: '秦皇岛野生动物园是华北最大野生动物园之一，可自驾穿越猛兽区近距离看老虎狮子。本文详解门票价格、自驾入园路线、长颈鹿投喂、开放时间、交通和避坑提醒，一篇讲透带娃逛动物园的正确姿势。',
  keywords: '秦皇岛野生动物园,秦皇岛动物园攻略,野生动物园门票,秦皇岛野生动物园自驾,北戴河动物园,秦皇岛亲子游',
  ogDesc: '华北最大野生动物园，自驾穿越猛兽区，近距离喂长颈鹿，亲子必去。',
  cover: '../images/attraction-dongwuyuan.webp',
  coverAlt: '秦皇岛野生动物园自驾观赏动物',
  breadcrumbName: '秦皇岛野生动物园全攻略',
  shareName: '秦皇岛野生动物园',
  readTime: '7 分钟阅读',
  tags: ['#野生动物园', '#秦皇岛亲子游', '#自驾游', '#北戴河'],
  body: `
    <p>带孩子来秦皇岛，<strong>秦皇岛野生动物园</strong>是绕不开的一站。这里是华北规模靠前的野生动物园之一，最大的卖点就是——<strong>可以自驾穿越猛兽区</strong>，在车里近距离看老虎、狮子、黑熊从车旁走过，那种震撼是普通动物园给不了的。这篇攻略把门票、自驾路线、投喂、开放时间一次讲透。</p>

    <h2>一、秦皇岛野生动物园是什么？值不值得去</h2>
    <p>秦皇岛野生动物园位于北戴河滨海大道，占地5000余亩，是集动物观赏、科普教育、休闲度假于一体的大型野生动物园。园区分为<strong>猛兽区（自驾/小火车观赏）</strong>和<strong>温顺区（可步行投喂）</strong>两大块，动物种类丰富，老虎、狮子、黑熊、长颈鹿、羊驼、大熊猫等都能看到。</p>
    <p>如果你是亲子家庭、或者喜欢动物，这里<strong>非常值得去</strong>——尤其是自驾穿越猛兽区的体验，是很多城市动物园没有的。</p>

    <h2>二、门票与开放时间</h2>
    <p>秦皇岛野生动物园<strong>门票约80元</strong>（网上预订常到100元上下，具体以购票平台为准），儿童、学生、老人有优惠。园区<strong>开放时间约08:30-17:00</strong>，建议上午前往，动物比较活跃。自驾入园通常需要额外购买<strong>车辆票</strong>，具体价格建议提前在携程/美团查询。</p>
    <blockquote>💡 <strong>小提示：</strong>门票建议提前网购，比现场买便宜；自驾的话记得给爱车也买张票，别到了门口才发现要补车辆票。</blockquote>

    <h2>三、核心玩法（这样玩才值）</h2>
    <h3>1. 自驾穿越猛兽区（必体验）</h3>
    <p>这是野生动物园的灵魂项目。开着车缓缓驶入猛兽区，老虎、狮子、黑熊就在车外几米处活动。<strong>切记全程关好车窗、不要下车、不要投喂</strong>，猛兽区有隔离设施，但安全第一。想看动物离得近，车速放慢、别鸣笛。</p>
    <h3>2. 温顺区投喂长颈鹿、羊驼</h3>
    <p>逛完猛兽区，到温顺区可以步行，在指定区域买饲料投喂长颈鹿、羊驼等温顺动物，这是孩子最喜欢的互动环节。长颈鹿低头吃树叶的样子特别治愈，记得拍照。</p>
    <h3>3. 看大熊猫（2026年新增）</h3>
    <p>园区近年新增大熊猫馆，能近距离看国宝。大熊猫上午比较活跃，建议早点去看。</p>

    <h2>四、自驾 vs 坐小火车，怎么选</h2>
    <p>园区提供两种猛兽区观赏方式：<strong>自驾</strong>和<strong>乘坐园区小火车</strong>。自驾自由度更高、想看多久看多久；坐小火车省心、不用开车，但时间相对固定。没有自驾条件或不想开车的，坐小火车也能看到大部分动物。带老人孩子的，自驾更从容。</p>

    <h2>五、交通方式</h2>
    <ul>
      <li><strong>公交：</strong>乘34路到"野生动物园"站下车。</li>
      <li><strong>自驾：</strong>导航"秦皇岛野生动物园"，沿滨海大道即可到达，园区有停车场。</li>
      <li><strong>打车：</strong>从北戴河海滨打车约10-15分钟。</li>
    </ul>

    <h2>六、游玩建议与避坑</h2>
    <h3>建议1：上午去，动物更活跃</h3>
    <p>动物和人一样，上午精神头足、下午容易犯懒。尤其是夏天，中午炎热动物都躲阴凉处，<strong>建议一开门（8:30）就入园</strong>。</p>
    <h3>坑1：自驾开窗拍照，危险</h3>
    <p>猛兽区千万不要开窗、不要下车、不要把手伸出窗外。有些游客为了拍照开窗，非常危险，<strong>安全永远第一位</strong>。</p>
    <h3>坑2：自带食物投喂动物</h3>
    <p>园区动物有科学配餐，随意投喂人类食物可能伤害动物健康，还可能被园区工作人员制止。想投喂，去温顺区买园区专用饲料。</p>
    <h3>坑3：夏天下午去，热且动物懒</h3>
    <p>动物园几乎没有大片遮阴，夏天下午暴晒，动物也躲起来。<strong>避开正午，选上午或傍晚</strong>。</p>

    <h2>写在最后</h2>
    <p>秦皇岛野生动物园最打动人的，是它让人在车里、在近距离里，感受到野生动物的真实与力量。尤其是自驾穿越猛兽区的那一刻，孩子趴在车窗边惊呼的样子，会是一家人很长一段时间的美好记忆。想看更多秦皇岛亲子玩法，欢迎看我们的<a href="../blog/qhd-family-travel">秦皇岛亲子游攻略</a>。</p>`
});

guides.push({
  slug: 'jifa-guide',
  title: '集发农业梦想王国全攻略 | 门票·开放时间·亲子研学（2026最新）',
  desc: '集发农业梦想王国是北戴河的农业主题乐园，温室花园+萌宠+游乐设施，亲子研学首选。本文详解集发门票、开放时间、热带植物温室、萌宠互动、农业科普馆、交通和避坑提醒，一篇讲透怎么带娃玩。',
  keywords: '集发农业梦想王国,集发攻略,集发门票,北戴河亲子乐园,集发梦想王国开放时间,秦皇岛亲子游,集发农业',
  ogDesc: '农业主题乐园，温室花园+萌宠+游乐，北戴河亲子研学首选。',
  cover: '../images/attraction-jifa.jpg',
  coverAlt: '集发农业梦想王国热带植物温室',
  breadcrumbName: '集发农业梦想王国全攻略',
  shareName: '集发农业梦想王国',
  readTime: '6 分钟阅读',
  tags: ['#集发', '#秦皇岛亲子游', '#农业研学', '#北戴河'],
  body: `
    <p>在北戴河，想找一个<strong>既能玩、又能学、还不怕风吹日晒</strong>的亲子去处，<strong>集发农业梦想王国</strong>是个被低估的好选择。它不像普通游乐园那么喧嚣，却用热带植物温室、萌宠互动和农业科普，给孩子一份"寓教于乐"的独特体验。这篇攻略把门票、开放时间、玩法一次讲透。</p>

    <h2>一、集发农业梦想王国是什么？</h2>
    <p>集发农业梦想王国位于北戴河海北路，是一座<strong>农业主题乐园</strong>，主打"农业+旅游+研学"。园内有大片热带植物温室、农业科普展示区、儿童游乐设施和萌宠互动区，把农业知识融进游乐里，特别适合带小学阶段的孩子边玩边学。</p>
    <p>和传统游乐场比，集发的节奏更慢、更"安静"，适合不想赶景点、想让孩子亲近自然的家庭。</p>

    <h2>二、门票与开放时间</h2>
    <p>集发农业梦想王国<strong>门票约30元</strong>，开放时间约<strong>08:30-17:30</strong>。门票价格相对亲民，提前在携程/美团买常有折扣。<strong>全年皆宜</strong>，尤其是夏天，室内温室反而是个避雨避晒的好去处。</p>
    <blockquote>💡 <strong>小提示：</strong>温室里温度较高、湿度大，记得给孩子多补水，穿轻薄透气的衣服。</blockquote>

    <h2>三、核心玩法（带孩子玩什么）</h2>
    <h3>1. 热带植物温室（招牌）</h3>
    <p>这是集发最有特色的部分。温室里种满了各种热带、亚热带植物，香蕉树、棕榈、奇花异草，还有无土栽培、立体种植等农业科技展示，孩子会看得目不转睛，也是拍照的好地方。</p>
    <h3>2. 萌宠互动区</h3>
    <p>园区有兔子、羊驼、小香猪等温顺动物，可以近距离互动、投喂，是低龄孩子的最爱。</p>
    <h3>3. 农业科普馆</h3>
    <p>通过实物和展板，让孩子了解农作物从种子到餐桌的过程，是难得的"田间课堂"。</p>
    <h3>4. 儿童游乐设施</h3>
    <p>园区还有滑梯、秋千等儿童游乐设施，玩累了温室里坐坐、游乐区跑跑，半天时间很充实。</p>

    <h2>四、交通方式</h2>
    <ul>
      <li><strong>公交：</strong>乘5路到"集发"站下车。</li>
      <li><strong>自驾/打车：</strong>导航"集发农业梦想王国"，从北戴河海滨打车约15分钟。</li>
    </ul>

    <h2>五、游玩建议与避坑</h2>
    <h3>建议1：作为亲子行程的"缓冲"项目</h3>
    <p>集发节奏慢，适合安排在行程中间，作为赶景点之间的"休息站"，尤其适合天太热或下雨的日子。</p>
    <h3>建议2：提前网购折扣票</h3>
    <p>门票本身不贵，但提前在携程/美团买折扣票更划算，现场买可能没有优惠。</p>
    <h3>坑1：期望值过高，以为是大游乐场</h3>
    <p>集发不是欢乐谷那种大型游乐场，主打的是"农业科普+亲子互动"，游乐设施偏温和。想玩刺激过山车的别来，想让孩子亲近自然、学点东西的会很喜欢。</p>
    <h3>坑2：忽略温室温差</h3>
    <p>温室内外温差大，夏天进去热、出来凉，容易感冒。<strong>给孩子备件薄外套，及时增减衣物</strong>。</p>

    <h2>写在最后</h2>
    <p>集发农业梦想王国的价值，在于它给了亲子游一种"慢下来"的选择——不必赶场、不必排队，让孩子在植物和动物里发现乐趣。如果想在北戴河安排一天轻松的亲子时光，集发值得放进清单。更多亲子玩法，看我们的<a href="../blog/qhd-family-travel">秦皇岛亲子游攻略</a>和<a href="../blog/beidaihe-kids-play">北戴河带娃攻略</a>。</p>`
});

guides.push({
  slug: 'jiaoshan-guide',
  title: '角山长城全攻略 | 门票·缆车·登山路线·红叶（2026最新）',
  desc: '角山长城是"万里长城第一山"，长城沿山脊蜿蜒，登顶可远眺山海关和渤海湾。本文详解角山门票、缆车、登山路线、秋季红叶、开放时间、交通和避坑提醒，一篇讲透角山怎么爬。',
  keywords: '角山长城,角山攻略,角山门票,山海关角山,角山长城缆车,角山红叶,山海关长城',
  ogDesc: '万里长城第一山，登顶远眺山海关和渤海湾，秋季红叶最美。',
  cover: '../images/attraction-jiaoshan.jpg',
  coverAlt: '角山长城沿山脊蜿蜒而上',
  breadcrumbName: '角山长城全攻略',
  shareName: '角山长城',
  readTime: '6 分钟阅读',
  tags: ['#角山长城', '#山海关', '#登长城', '#红叶'],
  body: `
    <p>来山海关看长城，很多人只知道"天下第一关"和"老龙头"，却容易错过<strong>角山长城</strong>——这座"万里长城第一山"，才是真正能让你<strong>爬上长城、回望山海</strong>的地方。这篇攻略把门票、缆车、登山路线、红叶一次讲透。</p>

    <h2>一、角山长城是什么？为什么值得爬</h2>
    <p>角山位于山海关城北，是万里长城翻越的第一座山，素有<strong>"万里长城第一山"</strong>之称。长城沿角山山脊蜿蜒而上，像一条灰色的巨龙盘踞山间。登顶后，山海关古城、广袤田野和远处的渤海湾尽收眼底，是山海关最震撼的观景点之一。</p>
    <p>当地有句很形象的话：从角山回望，长城"像一条灰色的脊梁，从山脊蜿蜒而下，穿过田野，直插大海——从山到海，一条龙"。这种"山海相连"的壮阔，是别处长城看不到的。</p>

    <h2>二、门票与开放时间</h2>
    <p>角山长城<strong>门票约30元</strong>（网上预订常到40元上下，以平台为准），开放时间约<strong>08:00-17:00</strong>。体力一般的游客可以选择<strong>坐缆车</strong>上山，节省体力。</p>
    <blockquote>💡 <strong>小提示：</strong>角山登山有一定坡度，穿防滑的运动鞋；秋季（9-10月）红叶最美，是摄影旺季。</blockquote>

    <h2>三、核心玩法（这样爬才值）</h2>
    <h3>1. 登顶远眺山海相连</h3>
    <p>角山的核心体验就是<strong>登顶后的视野</strong>。天气好的时候，能清楚看到长城从山脊一路延伸到海边，山、城、海同框的画面，是山海关的标志性景观，务必在观景台多待一会儿。</p>
    <h3>2. 走一段原汁原味的长城</h3>
    <p>角山段长城保留了不少原始风貌，走在城墙上，脚下是数百年历史的砖石，两侧是险峻的山势，很有"爬真长城"的感觉。</p>
    <h3>3. 秋季看红叶</h3>
    <p>每年9-10月，角山层林尽染，红叶映衬着灰色长城，是摄影爱好者的最爱。</p>

    <h2>四、登山 vs 坐缆车，怎么选</h2>
    <p>角山有两种上山方式：<strong>步行登山</strong>和<strong>坐缆车</strong>。体力好、想体验爬山乐趣的可以步行（约1-2小时到顶）；带老人孩子、或想省体力的，坐缆车上山、步行下山更轻松。缆车单程约60元（以景区公示为准）。</p>

    <h2>五、交通方式</h2>
    <ul>
      <li><strong>自驾/打车：</strong>导航"角山长城"，从山海关古城打车约15分钟。</li>
      <li><strong>公交：</strong>山海关城区有公交可达，具体线路可查询实时公交。</li>
    </ul>

    <h2>六、周边怎么玩（山海关串线）</h2>
    <p>角山是山海关长城游的重要一环，可以和这些景点串成一天：</p>
    <ul>
      <li><strong>上午：</strong>山海关古城+天下第一关</li>
      <li><strong>下午：</strong>角山长城（本攻略）+ 老龙头看长城入海</li>
    </ul>
    <p>完整路线看我们的<a href="../blog/shanhaiguan-great-wall">山海关长城攻略</a>和<a href="../blog/laolongtou-guide">老龙头全攻略</a>。</p>

    <h2>七、避坑指南</h2>
    <h3>坑1：穿皮鞋/凉鞋爬山</h3>
    <p>角山台阶多、坡度陡，皮鞋凉鞋容易打滑、崴脚。<strong>务必穿防滑运动鞋</strong>。</p>
    <h3>坑2：以为角山=天下第一关，找错地方</h3>
    <p>角山长城和"天下第一关"是两个地方。天下第一关在古城里（平地关楼），角山在城北的山上（登山长城）。想爬长城、看山海全景，来角山没错。</p>
    <h3>坑3：夏天正午爬，暴晒又累</h3>
    <p>角山台阶暴露在阳光下，正午爬山又晒又累。<strong>建议上午或下午3点后上山</strong>，或选春秋两季。</p>

    <h2>写在最后</h2>
    <p>如果说"天下第一关"是山海关的门面，那<strong>角山长城</strong>就是山海关的脊梁。爬上一次角山，回望长城从山奔向海，你才会真正读懂山海关"山海雄关"的含义。想看更多秦皇岛爬山路线，欢迎看我们的<a href="../blog/qhd-hiking">秦皇岛爬山攻略</a>。</p>`
});

guides.push({
  slug: 'ledao-guide',
  title: '乐岛海洋王国全攻略 | 门票·海豚表演·水上乐园·开放时间（2026最新）',
  desc: '乐岛海洋王国是华北最大海洋主题乐园之一，海豚海狮白鲸表演+夏季水上乐园。本文详解乐岛门票、表演时间表、水上乐园、开放时间、交通和避坑提醒，一篇讲透乐岛怎么玩一整天。',
  keywords: '乐岛海洋王国,乐岛攻略,乐岛门票,山海关乐岛,乐岛海豚表演,乐岛水上乐园,秦皇岛水上乐园',
  ogDesc: '海洋动物表演+水上乐园，华北最大海洋主题乐园，家庭出游首选。',
  cover: '../images/attraction-ledao.jpg',
  coverAlt: '乐岛海洋王国海豚表演',
  breadcrumbName: '乐岛海洋王国全攻略',
  shareName: '乐岛海洋王国',
  readTime: '7 分钟阅读',
  tags: ['#乐岛', '#秦皇岛亲子游', '#水上乐园', '#海豚表演'],
  body: `
    <p>想找一个<strong>大人孩子都能玩一整天</strong>的地方，<strong>乐岛海洋王国</strong>是秦皇岛亲子游的顶配选择。这里既有海豚、海狮、白鲸的精彩表演，又有夏天开放的水上乐园，一天根本玩不完。这篇攻略把门票、表演、水上乐园一次讲透。</p>

    <h2>一、乐岛海洋王国是什么？</h2>
    <p>乐岛海洋王国位于山海关龙海大道，是<strong>华北地区最大的海洋主题乐园之一</strong>，集海洋动物表演、水上乐园、游乐设施于一体。海豚、海狮、白鲸的表演是招牌，夏季开放的水上乐园是最大亮点，特别适合亲子家庭和情侣。</p>

    <h2>二、门票与开放时间</h2>
    <p>乐岛海洋王国<strong>门票约100元</strong>（以购票平台为准），开放时间约<strong>09:00-17:30</strong>。门票偏贵，但内容丰富，<strong>强烈建议提前在携程/美团买折扣票</strong>，能省不少。</p>
    <blockquote>💡 <strong>小提示：</strong>夏季去务必带泳衣！水上乐园是乐岛的半壁江山，不带泳衣就亏大了。</blockquote>

    <h2>三、核心玩法（这样玩才值回票价）</h2>
    <h3>1. 看海洋动物表演（先看时间表）</h3>
    <p>海豚、海狮、白鲸表演是乐岛的招牌，每天多场。但<strong>表演场次有限、座位也有限</strong>，入园后第一件事就是看好演出时间表，规划好路线，别错过心仪的场次。</p>
    <h3>2. 夏季玩水上乐园（最大亮点）</h3>
    <p>夏天（6-8月）水上乐园开放，是乐岛最受欢迎的部分。各种滑道、造浪池、儿童水寨，大人孩子都能玩嗨。带好泳衣、防晒、防水手机袋。</p>
    <h3>3. 白鲸互动</h3>
    <p>白鲸温顺可爱，和人的互动感很强，是很多游客的心头好，拍照也特别出片。</p>

    <h2>四、交通方式</h2>
    <ul>
      <li><strong>公交：</strong>乘25路、35路到"乐岛"站下车。</li>
      <li><strong>自驾/打车：</strong>导航"乐岛海洋王国"，从山海关城区打车约15-20分钟。</li>
    </ul>

    <h2>五、游玩建议与避坑</h2>
    <h3>建议1：留足一整天</h3>
    <p>乐岛内容丰富，海洋馆+水上乐园+游乐设施，<strong>至少要一整天</strong>才能玩得尽兴，别只安排半天。</p>
    <h3>建议2：早入园、先玩水上项目</h3>
    <p>夏天水上乐园人多，热门滑道要排队。<strong>早入园先玩水上项目</strong>，下午再看表演、逛海洋馆，避开人流高峰。</p>
    <h3>坑1：现场买票，贵</h3>
    <p>乐岛门票现场价通常比网上贵，<strong>务必提前网购</strong>。</p>
    <h3>坑2：忘记带泳衣/防晒</h3>
    <p>夏天去没带泳衣，等于错过最大亮点；没涂防晒，海边暴晒一天容易晒伤。</p>
    <h3>坑3：错过表演场次</h3>
    <p>表演有固定场次，不看时间表很容易错过。<strong>入园先拿/拍时间表</strong>。</p>

    <h2>写在最后</h2>
    <p>乐岛海洋王国的价值，在于它把"看动物"和"玩水"结合在一起，让一家人都能找到乐子。孩子的惊呼、海豚的跃起、水花里的尖叫，凑成秦皇岛夏天最热闹的一天。想看更多水上玩法，欢迎看我们的<a href="../blog/qhd-water-park">秦皇岛水上乐园攻略</a>。</p>`
});

guides.push({
  slug: 'yansaihu-guide',
  title: '燕塞湖全攻略 | 门票·游船·鸟语林·开放时间（2026最新）',
  desc: '燕塞湖被誉为"北方小桂林"，青山环抱碧水，可乘船游湖看鸟语林百余种珍禽。本文详解燕塞湖门票、游船体验、鸟语林、开放时间、交通和避坑提醒，一篇讲透燕塞湖怎么玩。',
  keywords: '燕塞湖,燕塞湖攻略,燕塞湖门票,山海关燕塞湖,燕塞湖游船,燕塞湖鸟语林,北方小桂林',
  ogDesc: '北方小桂林，青山碧水，乘船游湖看珍禽，山海关的山水画卷。',
  cover: '../images/attraction-yansaihu.jpg',
  coverAlt: '燕塞湖青山碧水游船',
  breadcrumbName: '燕塞湖全攻略',
  shareName: '燕塞湖',
  readTime: '5 分钟阅读',
  tags: ['#燕塞湖', '#山海关', '#游湖', '#自然风光'],
  body: `
    <p>在遍地都是长城和海的山海关，<strong>燕塞湖</strong>是一抹难得的山水绿意。这座被誉为<strong>"北方小桂林"</strong>的湖，青山环抱、碧水如镜，还能乘船游湖、看珍禽，是山海关行程里最"松弛"的一站。这篇攻略把门票、游船、鸟语林一次讲透。</p>

    <h2>一、燕塞湖是什么？为什么叫"北方小桂林"</h2>
    <p>燕塞湖位于山海关区石河水库，因地处燕山要塞、又兼具塞北风光而得名。湖水清澈碧绿，两岸奇峰怪石倒映水中，颇有几分桂林山水的意境，故有"北方小桂林"的美誉。这里是北方少见的山水画卷，和山海关的"雄关"气质形成鲜明对比。</p>

    <h2>二、门票与开放时间</h2>
    <p>燕塞湖<strong>门票约90元</strong>，开放时间约<strong>08:00-17:00</strong>。门票通常已含游船，具体以购票平台说明为准，建议提前在携程/美团查询并购票。</p>
    <blockquote>💡 <strong>小提示：</strong>游船是燕塞湖的核心体验，买票前确认是否含船票，别漏了重点。</blockquote>

    <h2>三、核心玩法（来了玩什么）</h2>
    <h3>1. 乘船游湖（核心体验）</h3>
    <p>乘船游湖约40分钟，是燕塞湖的灵魂项目。船行碧波上，两岸青山奇石缓缓后退，倒影随波荡漾，是拍照和放空的好时光。建议选靠窗/靠边的位置，视野更好。</p>
    <h3>2. 逛鸟语林（带孩子认鸟）</h3>
    <p>湖中有鸟语林，栖息着百余种珍禽，可以近距离观赏各种鸟类，很适合带孩子认识自然。鸟鸣声声，别有一番趣味。</p>
    <h3>3. 看奇峰怪石</h3>
    <p>湖区周边的奇峰怪石形态各异，船游过程中可以留意，配合讲解更有意思。</p>

    <h2>四、交通方式</h2>
    <ul>
      <li><strong>自驾/打车：</strong>导航"燕塞湖"，从山海关城区打车约20分钟。</li>
    </ul>

    <h2>五、周边怎么玩（山海关串线）</h2>
    <p>燕塞湖可以和山海关的其他景点串成一条"山水+雄关"的线路：</p>
    <ul>
      <li><strong>上午：</strong>山海关古城+天下第一关</li>
      <li><strong>下午：</strong>燕塞湖游湖（本攻略）+ 老龙头看海</li>
    </ul>
    <p>更多山海关玩法，看我们的<a href="../blog/shanhaiguan-one-day">山海关一日游路线</a>。</p>

    <h2>六、避坑指南</h2>
    <h3>坑1：只逛门口，不坐船</h3>
    <p>燕塞湖的美在湖上，不坐船等于白来。<strong>游船是核心体验，一定别省</strong>。</p>
    <h3>坑2：正午去，光线硬、拍照差</h3>
    <p>山水风光拍照讲究光线，<strong>上午光线柔和、倒影清晰</strong>，比正午更适合拍照。</p>
    <h3>坑3：忽略季节，冬天空船可能停航</h3>
    <p>冬季部分时段游船可能停航，去之前建议电话确认，避免白跑。</p>

    <h2>写在最后</h2>
    <p>燕塞湖给山海关行程补上了一块"水"的拼图——看完长城的雄浑，再来看看湖的温柔，这一趟才算完整。想看更多秦皇岛自然风光，欢迎看我们的<a href="../blog/qhd-hiking">秦皇岛爬山攻略</a>。</p>`
});

guides.push({
  slug: 'xinao-guide',
  title: '新澳海底世界全攻略 | 门票·海底隧道·表演·开放时间（2026最新）',
  desc: '新澳海底世界拥有亚洲最长海底观光隧道之一（80米），鲨鱼鳐鱼海龟从头顶游过，还有美人鱼和海狮表演。本文详解新澳海底世界门票、海底隧道、表演时间、开放时间、交通和避坑提醒。',
  keywords: '新澳海底世界,新澳海底世界攻略,新澳海底世界门票,秦皇岛海底世界,秦皇岛海洋馆,新澳海底隧道,秦皇岛亲子',
  ogDesc: '80米海底隧道，鲨鱼海龟头顶游过，室内景点雨天最佳选择。',
  cover: '../images/attraction-xinao.jpg',
  coverAlt: '新澳海底世界80米海底观光隧道',
  breadcrumbName: '新澳海底世界全攻略',
  shareName: '新澳海底世界',
  readTime: '5 分钟阅读',
  tags: ['#新澳海底世界', '#秦皇岛亲子', '#海洋馆', '#室内景点'],
  body: `
    <p>去海边遇到下雨天怎么办？秦皇岛人给你的答案很可能是——<strong>新澳海底世界</strong>。这座全室内的海洋馆，有亚洲最长的海底观光隧道之一，鲨鱼、鳐鱼、海龟从你头顶缓缓游过，还有美人鱼和海狮表演，是雨天、暴晒天的绝佳去处。这篇攻略把门票、隧道、表演一次讲透。</p>

    <h2>一、新澳海底世界是什么？</h2>
    <p>新澳海底世界位于秦皇岛海港区河滨路，是一座集观赏、科普、娱乐于一体的室内海洋馆。核心是一条<strong>全长80米的海底观光隧道</strong>，游客站在传送带上，鲨鱼、鳐鱼、海龟等大型海洋生物从头顶和四周游过，仿佛置身海底。此外还有海豹、企鹅等极地动物馆。</p>
    <p>因为<strong>全室内、有空调</strong>，它是秦皇岛少数不受天气影响的景点，雨天、暴晒天、冬季都很合适。</p>

    <h2>二、门票与开放时间</h2>
    <p>新澳海底世界<strong>门票约60元</strong>，开放时间约<strong>09:00-17:30</strong>。每天有美人鱼表演和海狮表演，场次有限，建议提前购票并关注演出时间。</p>
    <blockquote>💡 <strong>小提示：</strong>海底隧道拍照建议用视频模式，动态的画面比静态照片更能体现"鱼从头顶游过"的震撼。</blockquote>

    <h2>三、核心玩法（来了看什么）</h2>
    <h3>1. 走80米海底隧道（招牌）</h3>
    <p>这是新澳的灵魂项目。站在自动传送带上，看着鲨鱼、鳐鱼从头顶滑过，孩子会兴奋得尖叫。隧道里光线偏暗，拍照注意稳住手机，用视频记录更好。</p>
    <h3>2. 看美人鱼表演</h3>
    <p>美人鱼表演是新澳的特色节目，演员在水中和鱼群共舞，观赏性很强，尤其受孩子欢迎。</p>
    <h3>3. 看海狮表演</h3>
    <p>海狮顶球、鼓掌等互动表演，趣味十足，是亲子游的保留项目。</p>
    <h3>4. 看企鹅馆</h3>
    <p>憨态可掬的企鹅是孩子们的心头好，尤其是小企鹅摇摇摆摆的样子，特别治愈。</p>

    <h2>四、交通方式</h2>
    <ul>
      <li><strong>公交：</strong>乘19路、32路到"新澳海底世界"站下车。</li>
      <li><strong>自驾/打车：</strong>导航"新澳海底世界"，位于海港区，从市中心打车约15分钟。</li>
    </ul>

    <h2>五、游玩建议与避坑</h2>
    <h3>建议1：雨天/暴晒天的首选</h3>
    <p>遇到下雨或高温暴晒，海边玩不了，新澳是全室内的绝佳替代方案，也是行程里的"备胎"首选。</p>
    <h3>建议2：入园先看表演时间表</h3>
    <p>美人鱼和海狮表演有固定场次，入园先看时间表，规划好观赏顺序，别错过。</p>
    <h3>坑1：把它当成大型海洋馆，期望过高</h3>
    <p>新澳规模中等，比不上一线城市的大型海洋馆。它更适合作为半天的亲子科普项目，而不是"一天游"的核心。</p>
    <h3>坑2：隧道人多时被挤</h3>
    <p>海底隧道是必打卡点，旺季人多。想拍好照片，可以等一两批人流过去，或选非高峰时段。</p>

    <h2>写在最后</h2>
    <p>新澳海底世界的价值，在于它给秦皇岛行程提供了一个"全天候"的选择——无论天气如何，都能让孩子在海底隧道里收获惊喜。想看更多亲子玩法，欢迎看我们的<a href="../blog/qhd-family-travel">秦皇岛亲子游攻略</a>。</p>`
});

guides.push({
  slug: 'yudao-guide',
  title: '渔岛海洋温泉景区全攻略 | 门票·温泉·水上乐园·薰衣草（2026最新）',
  desc: '渔岛海洋温泉景区集温泉、水上乐园、海洋娱乐于一体，室内外温泉池数十个，夏玩水冬泡汤，6-8月薰衣草庄园美如普罗旺斯。本文详解渔岛门票、温泉、水上乐园、薰衣草花期、开放时间和交通。',
  keywords: '渔岛海洋温泉,渔岛攻略,渔岛门票,秦皇岛温泉,渔岛水上乐园,渔岛薰衣草,秦皇岛度假',
  ogDesc: '温泉+水上乐园+薰衣草庄园，秦皇岛一站式度假，四季皆宜。',
  cover: '../images/attraction-yudao.jpg',
  coverAlt: '渔岛海洋温泉景区温泉池与薰衣草庄园',
  breadcrumbName: '渔岛海洋温泉景区全攻略',
  shareName: '渔岛',
  readTime: '6 分钟阅读',
  tags: ['#渔岛', '#秦皇岛温泉', '#水上乐园', '#薰衣草'],
  body: `
    <p>如果只选一个<strong>"夏天能玩水、冬天能泡汤"</strong>的秦皇岛度假地，<strong>渔岛海洋温泉景区</strong>几乎是最优解。它把海水温泉、水上乐园、薰衣草庄园装进一个景区，四季都能玩出花样。这篇攻略把门票、温泉、薰衣草一次讲透。</p>

    <h2>一、渔岛海洋温泉景区是什么？</h2>
    <p>渔岛位于北戴河新区黄金海岸中部，是一座<strong>集温泉、水上乐园、海洋娱乐于一体的大型综合度假区</strong>。景区内有室内外温泉池数十个，温泉水富含多种矿物质；夏季开放水上乐园；还有一片薰衣草庄园，6-8月花期美如普罗旺斯。</p>
    <p>这里是"一站式度假"的代表——住下来、泡个汤、玩个水、看片薰衣草，不用赶场就能消磨一整天。</p>

    <h2>二、门票与开放时间</h2>
    <p>渔岛海洋温泉景区<strong>门票约135元</strong>，开放时间约<strong>09:00-20:00</strong>。门票偏贵，但包含项目多，<strong>建议提前网购折扣票</strong>。夏季玩水、冬季泡温泉，全年皆宜。</p>
    <blockquote>💡 <strong>小提示：</strong>夏季带泳衣，冬季也可泡室外温泉（别有一番滋味）；薰衣草花期6-8月最美，适合拍照。</blockquote>

    <h2>三、核心玩法（这样玩才值）</h2>
    <h3>1. 泡海水温泉（招牌）</h3>
    <p>渔岛最大的特色是<strong>海水温泉</strong>，温泉水含多种矿物质，对皮肤和放松都很好。室内外温泉池数十个，冬季泡室外温泉尤其有氛围。</p>
    <h3>2. 夏季玩水上乐园</h3>
    <p>夏天开放水上乐园，滑道、造浪池等设施齐全，是家庭和年轻人的最爱。</p>
    <h3>3. 薰衣草庄园拍照（6-8月）</h3>
    <p>每年6-8月，薰衣草庄园盛放，紫色花海美如普罗旺斯，是拍照打卡的绝佳背景，情侣和闺蜜尤其喜欢。</p>
    <h3>4. 体验滑沙</h3>
    <p>渔岛还有滑沙项目，从沙坡上滑下，刺激又有趣，值得一试。</p>

    <h2>四、交通方式</h2>
    <ul>
      <li><strong>自驾/打车：</strong>导航"渔岛海洋温泉景区"，从北戴河站打车约40分钟。</li>
      <li><strong>公交：</strong>有旅游专线可达，具体线路建议查询实时信息。</li>
    </ul>

    <h2>五、游玩建议与避坑</h2>
    <h3>建议1：留足一整天，最好住一晚</h3>
    <p>渔岛内容多、位置相对独立，<strong>建议安排一整天</strong>，如果预算允许，住景区附近或景区内酒店，泡温泉更从容。</p>
    <h3>建议2：夏季早到先玩水</h3>
    <p>夏天水上乐园人多，早到先玩热门项目，下午再泡温泉、看薰衣草，节奏更舒服。</p>
    <h3>坑1：现场买票贵</h3>
    <p>渔岛门票现场价偏高，<strong>务必提前网购折扣票</strong>。</p>
    <h3>坑2：忽略薰衣草花期</h3>
    <p>想看薰衣草花海，6-8月去；其他季节薰衣草已凋谢，别冲着花海去结果扑空。</p>
    <h3>坑3：以为只是温泉，错过水上乐园</h3>
    <p>夏天渔岛的水上乐园同样精彩，只泡温泉就亏了。带好泳衣，温泉和水上乐园都能玩。</p>

    <h2>写在最后</h2>
    <p>渔岛海洋温泉景区的魅力，在于它把"度假"这件事变得简单——泡汤、玩水、看花，一站式搞定。想看更多秦皇岛温泉和度假玩法，欢迎看我们的<a href="../blog/beidaihe-winter-hot-spring">北戴河冬季温泉攻略</a>。</p>`
});

guides.push({
  slug: 'weilanhaian-guide',
  title: '蔚蓝海岸全攻略 | 猫的天空之城·海边秋千·冲浪（2026最新）',
  desc: '蔚蓝海岸是秦皇岛新兴文艺海岸社区，猫的天空之城书店+海边秋千+冲浪，人少沙滩净，比北戴河更安静。本文详解蔚蓝海岸免费玩法、猫空书店、海边秋千、冲浪、交通和避坑提醒。',
  keywords: '蔚蓝海岸,蔚蓝海岸攻略,秦皇岛蔚蓝海岸,猫的天空之城,北戴河新区,秦皇岛网红打卡,蔚蓝海岸冲浪',
  ogDesc: '猫的天空之城书店+海边秋千+冲浪，秦皇岛新兴文艺海岸，人少景美。',
  cover: '../images/attraction-weilanhaian.jpg',
  coverAlt: '蔚蓝海岸海边秋千与沙滩',
  breadcrumbName: '蔚蓝海岸全攻略',
  shareName: '蔚蓝海岸',
  readTime: '5 分钟阅读',
  tags: ['#蔚蓝海岸', '#猫的天空之城', '#网红打卡', '#秦皇岛'],
  body: `
    <p>如果你觉得北戴河人太多、太热闹，那<strong>蔚蓝海岸</strong>会是你的"白月光"。这片新兴的文艺海岸，有猫的天空之城书店、海边的秋千、可以冲浪的沙滩，人少、干净、安静，是近年秦皇岛的网红打卡地。这篇攻略把免费玩法一次讲透。</p>

    <h2>一、蔚蓝海岸是什么？</h2>
    <p>蔚蓝海岸位于北戴河新区，是一个新兴的<strong>文艺海岸社区</strong>。这里既有度假社区的氛围，又保留了干净的海岸线，最出名的是一间海边书店——<strong>猫的天空之城</strong>，以及海边标志性的秋千。相比北戴河主景区，这里人更少、更安静，适合休闲度假和文艺拍照。</p>

    <h2>二、门票与开放时间</h2>
    <p>蔚蓝海岸<strong>免费开放、全天可逛</strong>，不需要门票。核心的沙滩、海边秋千都是免费公共区域。猫的天空之城书店可自由进出，消费自愿。</p>
    <blockquote>💡 <strong>小提示：</strong>海边秋千拍照很出片，建议黄昏时分去，光线柔和、氛围感拉满。</blockquote>

    <h2>三、核心玩法（来了玩什么）</h2>
    <h3>1. 逛猫的天空之城书店（招牌）</h3>
    <p>猫的天空之城是蔚蓝海岸的灵魂。这家海边书店氛围感十足，可以看书、喝咖啡，还能<strong>寄明信片给未来的自己</strong>。挑一张明信片、盖个邮戳，写一段给未来自己的话，是很有仪式感的体验。</p>
    <h3>2. 海边秋千拍照</h3>
    <p>海边标志性的秋千是必打卡点，坐在秋千上、面朝大海，随手一拍就是文艺大片。黄昏时分光线最美。</p>
    <h3>3. 冲浪体验</h3>
    <p>蔚蓝海岸是秦皇岛少数可以体验冲浪的地方之一，有专业冲浪俱乐部，新手也能在教练带领下体验一把。</p>
    <h3>4. 安静踏浪、看海</h3>
    <p>这里沙滩干净、人少，光脚踩沙、安静看海，是逃离喧嚣的好地方。</p>

    <h2>四、交通方式</h2>
    <ul>
      <li><strong>自驾/打车：</strong>导航"蔚蓝海岸"，从北戴河站打车约20分钟。</li>
      <li><strong>公交：</strong>有公交可达北戴河新区，具体线路建议查询实时信息。</li>
    </ul>

    <h2>五、周边怎么玩</h2>
    <p>蔚蓝海岸位于北戴河新区，附近还有渔岛、渔田七里海、仙螺岛等，可以串成南戴河一日游。想了解附近的网红景点，看我们的<a href="../blog/yutian-qilihai-guide-2026">渔田七里海攻略</a>和<a href="../blog/xianluo-island-guide-2026">仙螺岛攻略</a>。</p>

    <h2>六、避坑指南</h2>
    <h3>坑1：把它当成大型景区，期望过高</h3>
    <p>蔚蓝海岸是<strong>社区+海岸</strong>，不是传统景区，没有大门、没有游乐设施。它的卖点是"文艺、安静、好拍照"，想玩刺激项目的不适合这里。</p>
    <h3>坑2：正午去，晒且不出片</h3>
    <p>海边无遮阴，正午暴晒。海边秋千和书店拍照，<strong>黄昏或清晨光线最佳</strong>。</p>
    <h3>坑3：以为只能自驾去</h3>
    <p>蔚蓝海岸虽然位置略偏，但打车、公交都能到，不一定非要自驾。</p>

    <h2>写在最后</h2>
    <p>蔚蓝海岸给秦皇岛的海，加了一层"文艺滤镜"。在这里，海不只是游泳踏浪，还可以是一本书、一架秋千、一封寄给未来的明信片。想看更多秦皇岛网红打卡地，欢迎看我们的<a href="../blog/beidaihe-instagram">北戴河网红打卡地攻略</a>。</p>`
});

guides.push({
  slug: 'zushan-guide',
  title: '祖山风景区全攻略 | 门票·缆车·云海日出·红叶（2026最新）',
  desc: '祖山是"北方群山之祖"，主峰天女峰海拔1428米，原始森林覆盖率达96%。本文详解祖山门票、缆车、云海日出、十里画廊、秋季红叶、开放时间、交通和避坑提醒，一篇讲透祖山怎么玩。',
  keywords: '祖山,祖山攻略,祖山门票,秦皇岛祖山,祖山云海,祖山红叶,祖山缆车,秦皇岛爬山',
  ogDesc: '北方群山之祖，主峰1428米，云海日出、十里画廊、秋季红叶。',
  cover: '../images/attraction-zushan.jpg',
  coverAlt: '祖山风景区云海与主峰',
  breadcrumbName: '祖山风景区全攻略',
  shareName: '祖山',
  readTime: '7 分钟阅读',
  tags: ['#祖山', '#秦皇岛爬山', '#云海日出', '#红叶'],
  body: `
    <p>如果你以为秦皇岛只有海，那一定要来<strong>祖山</strong>看看。这座"北方群山之祖"，主峰天女峰海拔1428米，原始森林覆盖率高达96%，负氧离子浓度极高。春天杜鹃、夏天避暑、秋天红叶、冬天雾凇，还有堪称一绝的云海日出。这篇攻略把门票、缆车、云海一次讲透。</p>

    <h2>一、祖山是什么？为什么是"群山之祖"</h2>
    <p>祖山位于秦皇岛青龙满族自治县，素有<strong>"北方群山之祖"</strong>之称，是燕山山脉的重要支脉。主峰天女峰海拔1428米，森林覆盖率高达96%，负氧离子浓度极高，是天然的"森林氧吧"。相比秦皇岛的海，祖山提供的是另一种壮阔——山、林、云、雾。</p>

    <h2>二、门票与开放时间</h2>
    <p>祖山<strong>门票约65元</strong>，开放时间约<strong>08:00-17:00</strong>。体力一般的游客可以<strong>坐缆车上山</strong>（单程约60元），步行下山。想看云海日出需前一天住山脚民宿，凌晨出发。</p>
    <blockquote>💡 <strong>小提示：</strong>想看云海日出，需前一天住山脚民宿，凌晨4点左右出发登顶；秋季（9-10月）红叶最美，是摄影旺季。</blockquote>

    <h2>三、核心玩法（这样玩才值）</h2>
    <h3>1. 登天女峰看云海日出（招牌）</h3>
    <p>天女峰是祖山主峰，云海日出堪称一绝。清晨时分，云海在山谷间翻涌，朝阳从云层后升起，是摄影爱好者的终极追求。想看云海，需提前住山脚、凌晨出发，且要碰运气（晴好天气+合适湿度才有云海）。</p>
    <h3>2. 走十里画廊、画廊谷</h3>
    <p>十里画廊和画廊谷是祖山的精华徒步线路，沿途奇峰、怪石、瀑布、古木相映成趣，一步一景。</p>
    <h3>3. 秋季赏红叶</h3>
    <p>每年9-10月，祖山层林尽染，红叶满山，是华北地区著名的赏秋地之一。</p>
    <h3>4. 夏季避暑纳凉</h3>
    <p>祖山森林覆盖率高、海拔高，夏季气温比市区低不少，是天然的避暑地。</p>

    <h2>四、登山 vs 坐缆车，怎么选</h2>
    <p>祖山海拔高、登山强度较大。体力好的可以全程步行；带老人孩子、或想省体力的，<strong>坐缆车上山、步行下山</strong>是更轻松的选择。缆车单程约60元，以景区公示为准。</p>

    <h2>五、交通方式</h2>
    <ul>
      <li><strong>自驾/打车：</strong>导航"祖山风景区"，从秦皇岛市区打车约1小时。</li>
      <li><strong>公共交通：</strong>有旅游专线或客运可达，建议提前查询。</li>
    </ul>

    <h2>六、避坑指南</h2>
    <h3>坑1：想当天往返看云海日出</h3>
    <p>云海日出在凌晨，当天从市区出发根本赶不上。<strong>想看日出，必须前一天住山脚民宿</strong>。</p>
    <h3>坑2：穿普通鞋爬山</h3>
    <p>祖山登山强度大、台阶多，务必穿防滑运动鞋，带足水和干粮。</p>
    <h3>坑3：忽略天气，白跑一趟</h3>
    <p>云海日出极度依赖天气，阴雨天看不到。出发前务必查天气，选择晴好天气前往。</p>

    <h2>写在最后</h2>
    <p>祖山让秦皇岛不再只有海。当你站在天女峰顶，看云海翻涌、看红叶满山，会明白"北方群山之祖"绝非虚名。想看更多秦皇岛登山路线，欢迎看我们的<a href="../blog/qhd-hiking">秦皇岛爬山攻略</a>。</p>`
});

// ============ 生成 ============
const blogDir = path.join(ROOT, 'blog');
let count = 0;
guides.forEach(function (g) {
  const file = path.join(blogDir, g.slug + '.html');
  fs.writeFileSync(file, renderGuide(g), 'utf8');
  count++;
});
console.log('✅ 已生成 ' + count + ' 个景点攻略页：');
guides.forEach(function (g) { console.log('   - blog/' + g.slug + '.html'); });
