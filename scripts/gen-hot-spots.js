#!/usr/bin/env node
/**
 * 批量生成 2026 年秦皇岛新热点攻略页（blog/*.html）
 * 含 4 个新景点攻略 + 夜游专题 + 海上运动专题
 * 用法: node scripts/gen-hot-spots.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TODAY = '2026-09-17';
const TODAY_CN = '2026年9月17日';

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
    <span class="card-tag">${g.tag || '景点攻略'}</span>
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
<script src="../js/blog-related.js" defer></script>
</body>
</html>`;
}

// ============ 6 篇新热点攻略数据 ============
const guides = [];

guides.push({
  slug: 'changli-sand-slide-guide',
  title: '昌黎国际沙滑中心全攻略 | 门票·滑沙·黄金海岸（2026最新）',
  desc: '昌黎国际沙滑中心是国家4A景区，坐拥黄金海岸40米天然沙丘，滑沙项目素有"天下第一滑"之称。本文详解门票价格、滑沙玩法、开放时间、交通路线和避坑提醒，一篇讲透怎么玩。',
  keywords: '昌黎国际沙滑中心,秦皇岛滑沙,黄金海岸滑沙,昌黎滑沙门票,秦皇岛滑沙中心,南戴河滑沙,天下第一滑',
  ogDesc: '黄金海岸40米天然沙丘滑沙，4A景区"天下第一滑"，亲子海滨乐园。',
  cover: '../images/beidaihe-beach.webp',
  coverAlt: '昌黎黄金海岸沙滩',
  breadcrumbName: '昌黎国际沙滑中心全攻略',
  shareName: '昌黎国际沙滑中心',
  readTime: '5 分钟阅读',
  tags: ['#滑沙', '#黄金海岸', '#亲子游', '#昌黎'],
  body: `
    <p>想在海边玩点刺激的，<strong>昌黎国际沙滑中心</strong>是个宝藏去处。它藏在黄金海岸的天然沙丘里，滑沙项目从1987年就开始做，有"<strong>天下第一滑</strong>"的美誉。40米高的天然沙丘往下滑，一边是海一边是沙，比普通游乐场的滑沙爽太多。这篇攻略把门票、玩法、交通一次讲透。</p>

    <h2>一、昌黎国际沙滑中心是什么？</h2>
    <p>昌黎国际沙滑中心位于昌黎县黄金海岸，是<strong>国家4A级景区</strong>，占地600余亩，三面环林、一面向海。这里的沙丘受潮汐和季风影响形成，高达<strong>40米</strong>，是全国罕见的天然滑沙资源。1987年，这里研制出中国第一块单人手扶式长型滑沙板，从此"滑沙"火遍全国。</p>
    <p>除了滑沙，园区还有<strong>滑草、卡丁车、客运索道、管轨式滑道、高空速降</strong>等娱乐项目，以及沙雕世界、森林氧吧和一片专属海滩，是个能玩一整天的海滨乐园。</p>

    <h2>二、门票与开放时间</h2>
    <p>门票成人约<strong>60-80元</strong>（不同平台价格略有差异，儿童、学生、老人有优惠），门票通常已包含滑沙、滑草、卡丁车等基础项目各体验一次，部分项目（如游艇、骑马等）需额外付费。园区<strong>开放时间约8:00-16:30</strong>，每年4月至10月开放，冬季闭园。</p>
    <blockquote>💡 <strong>小提示：</strong>门票建议提前在携程/美团查询购买，价格比现场更划算；带孩子的话确认下身高对应的免票/优惠票政策。</blockquote>

    <h2>三、核心玩法（这样玩才值）</h2>
    <h3>1. 天然滑沙（必玩）</h3>
    <p>坐客运索道到沙山顶，再踩着滑沙板从40米沙丘滑下来，耳边是风声、眼前是大海，刺激又出片。滑沙板有安全设计，大人小孩都能玩。</p>
    <h3>2. 管轨式滑道与滑草</h3>
    <p>管轨式滑道穿行在沙山和森林之间，夏天也能感受林间清凉；滑草是滑沙的"绿色版"，同样好玩。</p>
    <h3>3. 森林氧吧 + 专属海滩</h3>
    <p>园区65%被森林覆盖，负氧离子含量高达每立方厘米2万多个，是"天然氧吧"。玩累了到专属海滩踩踩沙、泡泡海，人少干净。</p>

    <h2>四、交通方式</h2>
    <ul>
      <li><strong>自驾：</strong>导航"昌黎国际滑沙中心"（黄金海岸沿海路15号），京哈高速昌黎/北戴河出口下，沿黄金海岸方向即可到达。</li>
      <li><strong>打车：</strong>从昌黎火车站打车约40元；从北戴河海滨打车约30分钟。</li>
      <li><strong>公交：</strong>旺季有旅游专线可达黄金海岸，建议出发前查询最新班次。</li>
    </ul>

    <h2>五、避坑指南</h2>
    <h3>坑1：旺季正午去，又晒又排队</h3>
    <p>滑沙区几乎无遮阴，正午暴晒且热门项目排队久。<strong>建议上午或傍晚去</strong>，避开最晒时段。</p>
    <h3>坑2：以为门票包含所有项目</h3>
    <p>门票一般含基础项目<strong>各一次</strong>，重复玩或游艇、骑马等需另外付费，入园前问清套餐。</p>
    <h3>坑3：穿拖鞋去滑沙</h3>
    <p>沙地走路、上索道都不方便，<strong>建议穿运动鞋或防滑凉鞋</strong>，拖鞋容易陷沙、还容易掉。</p>

    <h2>写在最后</h2>
    <p>昌黎国际沙滑中心最大的魅力，是把"滑沙"这种别处玩不到的体验，和黄金海岸的沙滩、森林氧吧打包在一起。带娃的家庭、想找点刺激的年轻人，都能在这里玩得尽兴。想看更多秦皇岛海滨玩法，欢迎看我们的<a href="../blog/qhd-family-travel">秦皇岛亲子游攻略</a>。</p>`
});

guides.push({
  slug: 'beidaihe-art-town-guide',
  title: '北戴河不同艺术小镇全攻略 | 门票·展览·拍照打卡（2026最新）',
  desc: '北戴河不同艺术小镇是2026年最火的多巴胺艺术打卡地，占地120亩，集当代艺术、潮玩街区、研学工坊、夜间水火秀于一体。本文详解门票（免费入园）、七大展览、拍照机位、交通和避坑提醒。',
  keywords: '北戴河不同艺术小镇,北戴河艺术小镇,秦皇岛艺术打卡,不同艺术小镇门票,北戴河拍照,北戴河研学,秦皇岛网红打卡',
  ogDesc: '占地120亩的多巴胺艺术小镇，免费入园，当代艺术+潮玩+研学，拍照超出片。',
  cover: '../images/aranya-library.webp',
  coverAlt: '北戴河不同艺术小镇艺术空间',
  breadcrumbName: '北戴河不同艺术小镇全攻略',
  shareName: '北戴河不同艺术小镇',
  readTime: '6 分钟阅读',
  tags: ['#艺术打卡', '#不同艺术小镇', '#拍照', '#北戴河'],
  body: `
    <p>如果你喜欢拍照、逛展、做手作，那<strong>北戴河不同艺术小镇</strong>一定不能错过。它主打"艺术即娱乐、娱乐即场景"的理念，把当代艺术、潮玩闯关、研学工坊、夜间演艺塞进一个120亩的园区，多巴胺配色随手一拍都是大片。这篇攻略把门票、玩法、机位一次讲透。</p>

    <h2>一、不同艺术小镇是什么？</h2>
    <p>北戴河不同艺术小镇位于北戴河区联峰路118号（怪楼产业园内），占地约120亩，总建筑面积6万余平方米，2024年8月运营，2026年五一全新升级。园区包含<strong>不同CIRCLE当代艺术中心、童话艺术街、不同潮玩街区、狂欢艺术广场</strong>等多个分散式场景，还有"盲盒天下"近万平潮玩空间和"又不同"艺术研学空间。</p>

    <h2>二、门票与开放时间</h2>
    <p>小镇<strong>公共艺术街区及部分户外场景免费开放</strong>，但内部特展、沉浸式体验、研学工坊等项目<strong>单项收费</strong>。参考价格：当代艺术中心特展约80-120元，盲盒天下闯关约100-150元/2小时，研学工坊单项约60-120元，具体以现场公示为准。</p>
    <p><strong>营业时间：10:00-21:00（20:00停止入园）</strong>，咨询电话 0335-4017008 / 0335-4017009。</p>
    <blockquote>💡 <strong>省钱小提示：</strong>节假日常推"艺术中心+盲盒天下+研学工坊"联票，比单买便宜约两三成，出发前关注官方公众号或小程序。</blockquote>

    <h2>三、核心玩法（这样逛才值）</h2>
    <h3>1. 逛七大主题展览</h3>
    <p>园区有多个常设/特展，包括《世界因你不同·超级水果英雄》《云上伊甸：泡泡乐园》《美术馆奇妙夜—隐秘同盟》《翻个白眼，内耗退散》《新海错图》等，从潮流艺术到环保纪实，走走停停能逛大半天。</p>
    <h3>2. 盲盒天下闯关</h3>
    <p>近万平的潮玩空间里，几十款闯关游戏涵盖投掷、技巧、运动、桌游、限时等类型，玩"开盒—闯关—攒币—兑盒"，适合亲子或朋友组队。</p>
    <h3>3. 研学工坊动手做</h3>
    <p>"又不同"艺术研学空间开设景德镇陶瓷拉坯、威尼斯面具彩绘、土耳其湿拓画等工坊，专业老师带全程，作品可当场带走或邮寄。</p>
    <h3>4. 看夜间水火秀</h3>
    <p>小镇有全天候多国风情演艺和夜间水火秀，具体场次随季节调整，建议当天午后向游客中心确认时间，提前占位。</p>

    <h2>四、拍照机位建议</h2>
    <ul>
      <li><strong>童话艺术街 + 潮玩街区：</strong>免费开放，色彩浓郁的墙绘和装置最出片，早9点前人少光线柔和。</li>
      <li><strong>狂欢艺术广场：</strong>傍晚黄金光线适合拍户外装置。</li>
      <li><strong>艺术中心室内：</strong>正午避强光时进室内展，边看边拍。</li>
    </ul>

    <h2>五、交通与避坑</h2>
    <ul>
      <li><strong>自驾：</strong>导航"北戴河区怪楼产业园内不同艺术馆"，北京出发约3小时、天津约2.5小时。</li>
      <li><strong>打车：</strong>从北戴河海滨打车约10分钟。</li>
    </ul>
    <h3>坑1：以为"免费"就是全都免费</h3>
    <p>免费的是公共街区和部分户外场景，特展、盲盒、工坊都要单独收费，入园前问清免费范围。</p>
    <h3>坑2：路边黄牛票</h3>
    <p>各项目均现场扫码入场，黄牛票可能无法使用或加价，<strong>不要买路边黄牛票</strong>。</p>

    <h2>写在最后</h2>
    <p>不同艺术小镇把"看展、拍照、动手、闯关"揉进一个园区，是全年龄都能找到乐子的地方。逛累了还能在园区的不同时光酒店歇脚。想看更多秦皇岛文艺玩法，欢迎看我们的<a href="../blog/aranya-complete-guide-2026">阿那亚全攻略</a>。</p>`
});

guides.push({
  slug: 'yudu-1-fishing-platform-guide',
  title: '渔渡一号海东青海上平台攻略 | 海钓·海上观光（2026最新）',
  desc: '渔渡一号海东青是秦皇岛离岸5海里的多功能海上平台，可容纳150人休闲垂钓，2026年海钓火爆出圈。本文详解门票价格、海钓体验、怎么去、适合人群和避坑提醒。',
  keywords: '渔渡一号,海东青海上平台,秦皇岛海钓,秦皇岛出海,海上平台,秦皇岛海钓攻略,渔渡一号门票',
  ogDesc: '离岸5海里的海上平台，深海海钓+海上观光+星空住宿，秦皇岛新玩法。',
  cover: '../images/qhd-panorama.webp',
  coverAlt: '秦皇岛海上风光',
  breadcrumbName: '渔渡一号海东青海上平台攻略',
  shareName: '渔渡一号海上平台',
  readTime: '5 分钟阅读',
  tags: ['#海钓', '#海上平台', '#出海', '#秦皇岛新玩法'],
  body: `
    <p>今年秦皇岛最出圈的新玩法，<strong>渔渡一号海东青海上平台</strong>绝对算一个。它是一座立在离岸约5海里海面上的钢铁浮岛，能钓鱼、能观光、还能在海上住一晚。以前海钓是专业钓友的小众爱好，现在普通游客、零基础新手也能轻松体验。这篇攻略把它一次讲透。</p>

    <h2>一、渔渡一号是什么？</h2>
    <p>渔渡一号海东青是秦皇岛打造的多功能休闲渔业平台，采用<strong>自升式钢制结构</strong>，稳固安全、不易晕船。主体甲板800多平方米，<strong>可同时容纳150人休闲垂钓</strong>，集海水养殖、海上观光、休闲垂钓、潜水体验、星空住宿于一体。平台离岸约5海里，脚下是镂空钢网和玻璃栈道，能直接看到海里游动的鱼。</p>

    <h2>二、门票与价格</h2>
    <p>渔渡一号的消费分几档：单纯<strong>海上游轮观光</strong>票约48-140元（不同渠道、时段价格不同）；<strong>海钓体验</strong>单人约三四百元，含鱼竿、鱼饵租赁等，价格相对亲民。平台通常在<strong>每年4月至11月</strong>常规运营，游轮开放时间约早7:00-晚19:00。</p>
    <blockquote>💡 <strong>小提示：</strong>平台往返需乘快艇，受天气影响较大，出行前务必确认当天是否正常发船，避免白跑。</blockquote>

    <h2>三、核心玩法（这样玩才值）</h2>
    <h3>1. 深海海钓（主打）</h3>
    <p>这是平台的核心项目。就算零基础也没关系，平台提供鱼竿、鱼饵租赁和基础指导，能钓到黑鲷等海鱼。今年平台还推出<strong>体验式捕捞</strong>，游客能亲手参与海鲜捕捞，钓上来的渔获还能现场加工，很有成就感。</p>
    <h3>2. 海上观光与拍照</h3>
    <p>站在海上平台看360度海景，脚下玻璃栈道看鱼群游弋，是陆地上拍不到的画面，出片率极高。</p>
    <h3>3. 星空住宿（特色）</h3>
    <p>平台还有星空住宿体验，在海上过夜看星空、听海浪，是很特别的度假方式（需提前预订）。</p>

    <h2>四、怎么去</h2>
    <ul>
      <li><strong>登船码头：</strong>秦皇岛海港区东港路海东青码头。</li>
      <li><strong>自驾/打车：</strong>导航"海东青码头"，市区打车约20分钟。</li>
      <li><strong>预订：</strong>建议提前在携程、美团或通过旅行社预订船票/海钓套餐，确认发船时间。</li>
    </ul>

    <h2>五、适合谁 & 避坑</h2>
    <h3>适合：家庭亲子、情侣、想体验海钓的新手、团建</h3>
    <p>平台不晃、门槛低，比传统租船出海更适合普通游客。</p>
    <h3>坑1：不查天气就出发</h3>
    <p>海上项目受风浪影响大，<strong>恶劣天气会停航</strong>，出发前一定确认当天发船情况。</p>
    <h3>坑2：晕船体质没准备</h3>
    <p>平台本身较稳，但往返快艇和海上活动仍可能让人不适，晕船体质建议提前备好晕船药。</p>
    <h3>坑3：把观光票当成海钓票</h3>
    <p>观光和海钓是不同套餐，价格差不少，<strong>下单前看清套餐内容</strong>。</p>

    <h2>写在最后</h2>
    <p>渔渡一号把"出海"这件事的门槛拉低了，让普通游客也能体验深海海钓和海上生活，是秦皇岛"从看海到玩海"的代表。想看更多秦皇岛海上玩法，欢迎看我们的<a href="../blog/qhd-sea-sports-guide">秦皇岛海上运动全攻略</a>。</p>`
});

guides.push({
  slug: 'huanyu-island-night-guide',
  title: '欢屿岛魔幻之旅全攻略 | 金字塔星空剧场·打铁花·夜游（2026最新）',
  desc: '欢屿岛魔幻之旅是2026年北戴河新区新开的夜游地标，金字塔星空剧场驻演百老汇魔术音乐剧《魔登时代》，配非遗打铁花。本文详解演出时间、门票、怎么去和避坑提醒。',
  keywords: '欢屿岛,欢屿岛魔幻之旅,秦皇岛夜游,北戴河夜游,魔登时代,秦皇岛打铁花,金字塔星空剧场',
  ogDesc: '金字塔星空剧场+百老汇魔术音乐剧+非遗打铁花，北戴河夜游新地标。',
  cover: '../images/biluota.webp',
  coverAlt: '北戴河夜间演艺',
  breadcrumbName: '欢屿岛魔幻之旅全攻略',
  shareName: '欢屿岛魔幻之旅',
  readTime: '5 分钟阅读',
  tags: ['#夜游', '#欢屿岛', '#魔术', '#打铁花'],
  body: `
    <p>北戴河的夜晚今年多了一个必打卡的地标——<strong>欢屿岛魔幻之旅</strong>。它以户外金字塔星空剧场为核心，把百老汇魔术音乐剧和非遗打铁花搬上海边，是京津冀亲子遛娃、情侣约会、短途夜游的新选择。这篇攻略把时间、看点、交通一次讲透。</p>

    <h2>一、欢屿岛魔幻之旅是什么？</h2>
    <p>欢屿岛位于北戴河新区，2026年7月18日开园，主打"潮玩夜生活"。核心是<strong>金字塔星空剧场</strong>，可容纳约1000人同场观演，以星空为幕、灯火为景，全景无遮挡。园区集合了驻场演艺、非遗打铁花、乐队现场、魔法NPC巡游、萌宠互动、美食市集、亲子游乐与露营等8类夜游内容。</p>

    <h2>二、演出时间与门票</h2>
    <p><strong>运营时间：7月18日-10月7日</strong>，每晚<strong>19:30-21:00</strong>演出，19:00开始检票入场（10月7日后可能停演，出行前请确认最新安排）。门票价格以官方小程序、抖音、美团、携程等平台公示为准，官方宣传为"不用高价门票"。</p>
    <blockquote>💡 <strong>小提示：</strong>演出是夜场限时活动，去之前务必确认当天是否正常演出（雨天可能有调整），并提前购票。</blockquote>

    <h2>三、核心看点（这样看才值）</h2>
    <h3>1. 《魔登时代》百老汇魔术音乐剧（主打）</h3>
    <p>这台60分钟的驻演大秀，由国际赛事大满贯魔术师李粤领衔，把23个魔术节目串进"追逐梦想"的完整叙事里，是魔术与音乐剧的跨界。央视春晚人气班底加持，大型幻术、舞台魔术、心灵魔术轮番上演，全龄适配。</p>
    <h3>2. 非遗打铁花（压轴彩蛋）</h3>
    <p>魔术秀落幕后的终极彩蛋——<strong>百米巨幅铁花凌空绽放</strong>，漫天星火铺满金字塔剧场夜空，配合多项传统火类绝活，肉眼可见的震撼，是整晚的高光时刻。</p>
    <h3>3. 户外live + 魔法NPC巡游</h3>
    <p>现场还有潮流金曲live、魔法NPC全城出没、非遗特技和潮流街舞，一步一景、夜夜新潮。</p>
    <h3>4. 亲子游乐与美食市集</h3>
    <p>园内设有旋转木马、章鱼滑梯等游乐项目，还有烤串、海鲜、本地小吃，边看边吃很惬意。</p>

    <h2>四、怎么去</h2>
    <ul>
      <li><strong>自驾：</strong>导航"欢屿岛"，位于北戴河新区，京津冀自驾都很方便。</li>
      <li><strong>打车：</strong>从北戴河海滨打车约20-30分钟。</li>
    </ul>

    <h2>五、避坑指南</h2>
    <h3>坑1：没确认演出时间就白跑</h3>
    <p>这是限时夜游活动（至10月7日），且雨天可能调整，<strong>出发前务必确认当天是否开演</strong>。</p>
    <h3>坑2：卡点进场错过开场</h3>
    <p>演出19:30开始，建议<strong>19:00左右到场</strong>，既能占到好位置，也不错过开场。</p>
    <h3>坑3：以为只有一场魔术秀</h3>
    <p>欢屿岛是复合夜游，除了《魔登时代》，打铁花、live、巡游都值得看，<strong>别看完魔术就走</strong>。</p>

    <h2>写在最后</h2>
    <p>欢屿岛把北戴河的夜从"看完海就回酒店"变成了"看完海接着玩"，是今年滨海夜游的代表作。想看更多秦皇岛夜间好去处，欢迎看我们的<a href="../blog/qhd-night-tour-guide">秦皇岛夜游全攻略</a>。</p>`
});

guides.push({
  slug: 'qhd-night-tour-guide',
  title: '秦皇岛夜游全攻略 | 10个夜间好去处（2026最新）',
  desc: '秦皇岛夏季夜游全攻略：欢屿岛魔幻之旅、渔岛螭吻九九、秦皇·山海情、碧螺塔电音、渔田明星合唱夜、夜游山海关等10个夜间好去处，越夜越精彩。',
  keywords: '秦皇岛夜游,北戴河夜游,秦皇岛晚上去哪玩,秦皇岛夜生活,秦皇岛夜游攻略,碧螺塔酒吧,渔岛夜游,秦皇山海情',
  ogDesc: '从魔术秀、光影演艺到夜市烟火，秦皇岛10个夜间好去处一次收齐。',
  cover: '../images/biluota.webp',
  coverAlt: '秦皇岛滨海夜景',
  breadcrumbName: '秦皇岛夜游全攻略',
  shareName: '秦皇岛夜游',
  readTime: '7 分钟阅读',
  tag: '出行指南',
  tags: ['#夜游', '#秦皇岛夜生活', '#北戴河', '#出行指南'],
  body: `
    <p>很多人对秦皇岛的印象还停留在"白天看海、晚上回酒店"。其实这几年秦皇岛的夜，比白天还热闹——魔术秀、光影演艺、非遗打铁花、海上电音、夜市烟火全都有。这篇攻略把2026年最值得去的<strong>10个夜间好去处</strong>一次收齐，晚上照着玩就行。</p>

    <h2>一、看演出类（沉浸式夜游）</h2>
    <h3>1. 欢屿岛魔幻之旅</h3>
    <p>金字塔星空剧场驻演百老汇魔术音乐剧《魔登时代》，压轴是非遗打铁花，7月18日-10月7日每晚19:30-21:00。想看详情看我们的<a href="../blog/huanyu-island-night-guide">欢屿岛魔幻之旅攻略</a>。</p>
    <h3>2. 《秦皇·山海情》沉浸式光影舞台剧</h3>
    <p>依托全息投影、3D威亚与环绕音响，串联大禹治水、秦皇东巡、长城文化等本土文脉，读懂港城千年底蕴，观演人数持续刷新纪录。</p>
    <h3>3. 渔岛"螭吻九九"幻夜宇宙</h3>
    <p>国潮仙侠街区"九子天街"+机甲与光影史诗"九九龙秀"，依托20000㎡水域，激光、全息、水火交织，东方赛博美学拉满。适合全年龄。</p>

    <h2>二、海边狂欢类</h2>
    <h3>4. 碧螺塔海上酒吧公园·电子音乐LIVE</h3>
    <p>7月1日-9月30日，海上电音LIVE秀强势开燥，还有废土美学落日派对、NPC互动、灯光秀火焰秀，从白天嗨到深夜。</p>
    <h3>5. 渔田七里海·明星合唱夜</h3>
    <p>6月27日-8月15日，明星歌手轮番登台，万人合唱的浪漫之夜，还有《点亮渔田》实景演艺和"星梦奇幻夜"。</p>
    <h3>6. 金梦海湾音乐美食季</h3>
    <p>7、8月每周二至周日19:30-21:30，市级主场，无门槛向市民游客开放，共唱金曲、共品非遗海鲜。</p>

    <h2>三、文化夜游类</h2>
    <h3>7. 夜游山海关</h3>
    <p>古风美人、传统醒狮大型巡游，独竹漂、水上扁带等非遗演出，王牌实景演艺《身向榆关那畔行》震撼升级，一站式解锁国风表演。</p>
    <h3>8. 集发"千灯渔火节"</h3>
    <p>戴河畔1.2公里光影长廊，近50组自贡非遗花灯，五层楼高的戴河女神花灯、22米巨型鳌鱼祈福花灯巡游，传统渔文化与新潮夜游融合。</p>

    <h2>四、水乐园夜场类</h2>
    <h3>9. 南戴河国际娱乐中心</h3>
    <p>2.8万㎡缤纷水乐园延长夜场，千人造浪池水上浪光电音秀；海岸边雄狮剧场夜间实景大秀《海陆共生》。</p>

    <h2>五、艺术夜游类</h2>
    <h3>10. 北戴河不同艺术小镇</h3>
    <p>全天候多国风情演艺+夜间水火秀，配合潮流艺术展和研学工坊，白天逛展、晚上看秀。详情看<a href="../blog/beidaihe-art-town-guide">不同艺术小镇攻略</a>。</p>

    <h2>夜游小贴士</h2>
    <ul>
      <li><strong>时间：</strong>多数夜游项目集中在6-10月，出行前确认当天是否开放，雨天部分户外项目可能取消。</li>
      <li><strong>交通：</strong>夜场结束较晚，自驾最方便；打车注意晚高峰后的叫车时间。</li>
      <li><strong>穿衣：</strong>海边晚上凉，尤其9-10月，带件薄外套。</li>
    </ul>

    <h2>写在最后</h2>
    <p>秦皇岛的夜已经从"睡前的空白"变成了"另一场旅行"。挑一两个感兴趣的夜游项目，把行程从一天拉长到"白天+夜晚"，才算真正玩透了这片海。想规划完整行程，欢迎看我们的<a href="../itinerary">行程规划</a>。</p>`
});

guides.push({
  slug: 'qhd-sea-sports-guide',
  title: '秦皇岛海上运动全攻略 | 帆船·海钓·潜水（2026最新）',
  desc: '秦皇岛从"看海"升级到"玩海"：帆船、深海海钓、游艇出海、潜水、海上平台。本文详解各大海上运动怎么玩、多少钱、适合谁，帮你解锁秦皇岛新玩法。',
  keywords: '秦皇岛海上运动,秦皇岛帆船,秦皇岛海钓,秦皇岛游艇,秦皇岛潜水,蔚蓝海岸帆船,秦皇岛出海',
  ogDesc: '帆船、海钓、游艇、潜水，秦皇岛海上运动一站式攻略，从看海到玩海。',
  cover: '../images/beidaihe-beach.webp',
  coverAlt: '秦皇岛海上运动',
  breadcrumbName: '秦皇岛海上运动全攻略',
  shareName: '秦皇岛海上运动',
  readTime: '7 分钟阅读',
  tag: '出行指南',
  tags: ['#海上运动', '#帆船', '#海钓', '#秦皇岛新玩法'],
  body: `
    <p>来秦皇岛如果只是"看看海、踩踩沙"，那你就亏了。这两年秦皇岛正在从"卖景观"转向"卖体验"，<strong>帆船、海钓、游艇、潜水</strong>这些海上运动越来越火，普通游客也能轻松上手。这篇攻略把最值得玩的几个海上项目一次讲清。</p>

    <h2>一、帆船（最出片的海上运动）</h2>
    <p>秦皇岛是中国帆船运动的重要基地，<strong>蔚蓝海岸</strong>是ILCA亚洲帆船训练中心所在地，中帆协北方总部基地也在这里。西港国际航海中心还能体验帆船出海看日落（约100-200元/人）。</p>
    <ul>
      <li><strong>适合：</strong>想拍照、想体验"御风而行"的年轻人、亲子家庭。</li>
      <li><strong>地点：</strong>北戴河新区蔚蓝海岸、西港花园游艇帆船港。</li>
      <li><strong>建议：</strong>零基础选体验式帆船（有教练带），别一上来就挑战独自操控。</li>
    </ul>

    <h2>二、深海海钓（今年最火的新玩法）</h2>
    <p>海钓今年从小众爱好火成大众话题，主角就是<strong>渔渡一号海东青海上平台</strong>——离岸5海里的钢铁浮岛，能容纳150人休闲垂钓，零基础也能玩，单人约三四百元含渔具租赁，钓上来的鱼还能现场加工。详情看<a href="../blog/yudu-1-fishing-platform-guide">渔渡一号海钓攻略</a>。</p>
    <ul>
      <li><strong>适合：</strong>家庭、情侣、想体验海钓的新手、团建。</li>
      <li><strong>注意：</strong>受天气影响大，出发前确认当天是否发船。</li>
    </ul>

    <h2>三、游艇出海观光</h2>
    <p>想轻松点，可以坐游艇/游船出海观光，饱览秦皇岛北戴河山海关的海岸线风光。北戴河有浪淘沙长城号、寻仙2号、公主号等多艘游船可选，票价约75-140元。</p>
    <ul>
      <li><strong>适合：</strong>不想湿身、带老人孩子的游客。</li>
      <li><strong>登船点：</strong>北戴河欢乐湾游船码头、海港区东山浴场等。</li>
    </ul>

    <h2>四、潜水体验</h2>
    <p>渔渡一号平台及部分海滨提供潜水体验，在专业教练带领下，近距离看海底世界。适合想解锁"水下视角"的年轻人。</p>

    <h2>五、海上运动实用贴士</h2>
    <ul>
      <li><strong>时间：</strong>海上项目大多集中在4-11月，7-8月最旺，提前预订更稳。</li>
      <li><strong>安全：</strong>务必穿救生衣、听教练指挥，别擅自离队。</li>
      <li><strong>防晒：</strong>海上紫外线强，防晒霜+防晒衣+墨镜备齐。</li>
      <li><strong>晕船：</strong>易晕船体质提前备晕船药，别空腹上船。</li>
    </ul>

    <h2>写在最后</h2>
    <p>秦皇岛的海，早就不是"看两眼就走"的海了。从帆船到海钓，从游艇到潜水，总有一种玩法能让你重新认识这片渤海。想规划完整的秦皇岛行程，欢迎看我们的<a href="../itinerary">行程规划</a>或<a href="../routes">主题行程模板</a>。</p>`
});

guides.push({
  slug: 'aranya-events-guide',
  title: '阿那亚活动全攻略 | 戏剧节·音乐节·新店打卡（2026最新）',
  desc: '阿那亚戏剧节、虾米音乐节、谷响音乐节、泡泡玛特POP BAKERY全国首店……本文详解阿那亚2026全年活动和网红新店，附活动票怎么约、怎么进社区，一次讲透阿那亚玩什么。',
  keywords: '阿那亚戏剧节,阿那亚音乐节,阿那亚活动,泡泡玛特阿那亚,阿那亚新店,阿那亚怎么进,孤独图书馆,阿那亚打卡',
  ogDesc: '戏剧节、音乐节、泡泡玛特POP BAKERY首店，阿那亚2026全年活动和新店一次收齐。',
  cover: '../images/aranya-library.webp',
  coverAlt: '阿那亚孤独图书馆',
  breadcrumbName: '阿那亚活动全攻略',
  shareName: '阿那亚',
  readTime: '7 分钟阅读',
  tag: '出行指南',
  tags: ['#阿那亚', '#戏剧节', '#音乐节', '#泡泡玛特'],
  body: `
    <p>阿那亚是秦皇岛现在最火的文艺地标，2026年它的活动密度又上了一个台阶——戏剧节、音乐节、泡泡玛特全国首店轮番上阵，几乎全年不断档。这篇攻略把阿那亚<strong>全年的活动和网红新店</strong>一次讲清，去之前看这篇就够了。</p>

    <h2>一、阿那亚戏剧节（全年最大活动）</h2>
    <p>2026年阿那亚戏剧节于<strong>6月17日至28日</strong>举行，主题"凝望和孤往"，汇聚14个国家和地区的<strong>34部剧目、39位导演、16个剧场、137场演出</strong>。开幕大戏是陈明昊执导、段奕宏与周冬雨出演的《文城》；孟京辉执导、黄湘丽主演的独角戏《时时刻刻》在<strong>凌晨3:30的海边日出剧场</strong>上演，是戏剧节的标志性体验；崔健首部戏剧作品《魔A戏》也在此首演。</p>
    <p>戏剧节同期还有<strong>候鸟300</strong>（300位创作者海边共同创作300小时）、未来戏剧SHOWCASE、37°2环境戏剧朗读、海边对话等公共艺术活动，即使不看戏，海边逛逛也很有氛围。</p>
    <blockquote>💡 <strong>小提示：</strong>戏剧节剧目一般提前1-2个月在大麦等平台开票，热门剧目秒空，想去的话提前关注"阿那亚"官方公众号蹲开票。</blockquote>

    <h2>二、音乐节（夏天的另一场狂欢）</h2>
    <h3>1. 虾米音乐节</h3>
    <p>每年8月在阿那亚举办，是海边音乐节里人气最旺的之一，2026年现场更是话题不断。</p>
    <h3>2. 谷响音乐节（阿那亚·金山岭）</h3>
    <p>8月21日至24日在金山岭山谷音乐厅举办，汇聚国内外演奏家，带来20余场音乐会、讲座、工作坊，主打"远离城市、让身心慢下来"的室内乐体验。</p>

    <h2>三、泡泡玛特 POP BAKERY 全国首店</h2>
    <p>2026年6月19日，泡泡玛特旗下甜品品牌<strong>POP BAKERY 全国首店</strong>在阿那亚开业，以"星星人的云端剧场"为设计灵感，是<strong>华北最大的泡泡玛特门店</strong>（位于六期文创街区北站东侧）。首月营业额就达到1800万，门前的<strong>星星人小船装置</strong>成为海边新晋网红打卡点。这里既能买盲盒，也能吃星星人主题甜品，还有只属于阿那亚的限定款。</p>

    <h2>四、新店潮牌扎堆</h2>
    <p>阿那亚近年引入大量品牌首店和潮牌：白敬亭的潮牌<strong>Goodbai</strong>、宠物集合店<strong>PAW HUB</strong>、复古电玩城、韩系自拍馆、TWOI、MADEINAM等，逛街打卡两不误。</p>

    <h2>五、经典网红打卡（初次必去）</h2>
    <ul>
      <li><strong>孤独图书馆：</strong>阿那亚出圈的起点，落地窗看海，需提前在"阿那亚"公众号预约。</li>
      <li><strong>阿那亚礼堂：</strong>清晨日出时分的剪影最出片，住客可独享清晨空镜。</li>
      <li><strong>UCCA沙丘美术馆：</strong>藏在沙丘下的美术馆，洞穴天窗的光柱是经典机位。</li>
      <li><strong>苏卡酒店深夜食堂：</strong>一碗网红泡面排队2小时，成了2026年的"排队名场面"。</li>
    </ul>

    <h2>六、活动票怎么约、怎么进社区</h2>
    <p>阿那亚是封闭管理的度假社区，<strong>不住宿的游客需要预约才能进入</strong>。主要方式：</p>
    <ul>
      <li><strong>订活动票/演出票：</strong>凭戏剧节、音乐节等活动票可直接进入社区，这是最省心的方式。</li>
      <li><strong>预约孤独图书馆/沙丘美术馆：</strong>约20元/人，凭预约码进入，旺季需提前3-5天抢。</li>
      <li><strong>订社区内住宿：</strong>住客有优先预约权，旺季（7-8月、国庆）务必提前订。</li>
    </ul>
    <p>进入方式、住宿、拍照机位等更详细的信息，看我们的<a href="../blog/aranya-complete-guide-2026">阿那亚全攻略</a>。</p>

    <h2>写在最后</h2>
    <p>阿那亚早已不只是"孤独图书馆"一个打卡点，而是一个全年有戏、有音乐、有潮玩的生活方式社区。挑一个戏剧节或音乐节的时段来，白天的海、晚上的戏，能拼出一趟很完整的文艺之旅。想看秦皇岛更多夜间好去处，欢迎看我们的<a href="../blog/qhd-night-tour-guide">秦皇岛夜游全攻略</a>。</p>`
});

// ============ 生成 ============
let count = 0;
for (const g of guides) {
  const dest = path.join(ROOT, 'blog', g.slug + '.html');
  fs.writeFileSync(dest, renderGuide(g));
  console.log('✅ ' + g.slug + '.html');
  count++;
}
console.log(`\n共生成 ${count} 篇新攻略页`);
