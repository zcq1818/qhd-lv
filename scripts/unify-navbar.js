#!/usr/bin/env node
/**
 * 统一导航栏脚本：把全站每个页面的 <nav> 规范成同一套标准导航栏。
 *
 * 标准导航栏（完整版 9 项菜单）：
 *   首页 · 必玩景点 · 景点大全 · 地图 · 行程规划 · 美食 · 旅游攻略 · 博客 · 关于我们
 * 外加 logo 图标 + 「免费规划行程」CTA 按钮 + 手机端汉堡菜单（含点击切换 JS）。
 *
 * 用法: node scripts/unify-navbar.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'images', 'css', 'js', 'assets', 'ppt-temp', 'scripts']);

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(f)) continue;
      files.push(...walk(full));
    } else if (f.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const LINKS = [
  { href: '/', label: '首页', key: 'home' },
  { href: '/must-play', label: '必玩景点', key: 'must-play' },
  { href: '/attractions', label: '景点大全', key: 'attractions' },
  { href: '/map', label: '地图', key: 'map' },
  { href: '/itinerary', label: '行程规划', key: 'itinerary' },
  { href: '/food', label: '美食', key: 'food' },
  { href: '/guide', label: '旅游攻略', key: 'guide' },
  { href: '/blog', label: '博客', key: 'blog' },
  { href: '/about', label: '关于我们', key: 'about' },
];

function getActiveKey(rel) {
  const p = rel.replace(/\\/g, '/');
  if (p === 'index.html') return 'home';
  if (p === 'must-play.html') return 'must-play';
  if (p === 'attractions.html') return 'attractions';
  if (p.startsWith('attraction/')) return 'attractions';
  if (p === 'gallery3d.html') return 'attractions';
  if (p === 'map.html') return 'map';
  if (p === 'itinerary.html') return 'itinerary';
  if (p === 'food.html') return 'food';
  if (p === 'guide.html') return 'guide';
  if (p === 'blog.html') return 'blog';
  if (p.startsWith('blog/')) return 'blog';
  if (p === 'about.html') return 'about';
  return null;
}

function buildNav(activeKey) {
  const lis = LINKS.map((l) => {
    const cls = l.key === activeKey ? ' class="active"' : '';
    return `      <li><a href="${l.href}"${cls}>${l.label}</a></li>`;
  }).join('\n');

  return [
    '<nav class="navbar" id="navbar">',
    '  <div class="nav-inner">',
    '    <a href="/" class="nav-logo">',
    '      <svg class="nav-logo-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" fill="#1a73e8"/><path d="M8 18 Q11 10 14 8 Q17 10 20 18" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    '      秦皇岛旅游官网',
    '    </a>',
    '    <ul class="nav-links" id="navLinks">',
    lis,
    '    </ul>',
    '    <a href="/en" class="nav-lang" hreflang="en" lang="en" title="English version">EN</a>',
    '    <a href="/itinerary" class="nav-cta">免费规划行程 <span class="nav-cta-arrow">→</span></a>',
    '    <button class="hamburger" id="hamburger" aria-label="菜单"><span></span><span></span><span></span></button>',
    '  </div>',
    '</nav>',
  ].join('\n');
}

const NAV_RE = /<nav class="navbar"[^>]*>[\s\S]*?<\/nav>/;

let total = 0;
let navChanged = 0;
let jsInjected = 0;
let noNav = 0;

for (const file of walk(root)) {
  total++;
  let content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

  if (!NAV_RE.test(content)) {
    noNav++;
    continue;
  }

  const nav = buildNav(getActiveKey(rel));
  const before = content;
  content = content.replace(NAV_RE, nav);
  if (content !== before) navChanged++;

  // 补齐导航交互 JS（汉堡菜单切换 / 滚动吸顶样式）
  let extra = '';
  if (!/getElementById\(['"]hamburger['"]\)/.test(content)) {
    extra += `document.getElementById('hamburger').addEventListener('click', function() {\n  document.getElementById('navLinks').classList.toggle('open');\n});\n`;
  }
  if (!/classList\.toggle\(['"]scrolled['"]/.test(content)) {
    extra += `window.addEventListener('scroll', function() {\n  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);\n});\n`;
  }
  if (extra) {
    const script = `<script>\n${extra}</script>\n`;
    if (content.includes('</body>')) {
      content = content.replace('</body>', script + '</body>');
    } else if (content.includes('</html>')) {
      content = content.replace('</html>', script + '</html>');
    } else {
      content += script;
    }
    jsInjected++;
  }

  fs.writeFileSync(file, content, 'utf8');
}

console.log(`✅ 处理完成：共扫描 ${total} 个页面`);
console.log(`   · 替换导航栏 ${navChanged} 个`);
console.log(`   · 补齐导航 JS ${jsInjected} 个`);
console.log(`   · 未找到导航栏 ${noNav} 个（跳过）`);
