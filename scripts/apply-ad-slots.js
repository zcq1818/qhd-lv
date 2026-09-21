#!/usr/bin/env node
/**
 * 把页面里灰底虚线的「广告位」占位框,换成正经的招商位。
 *
 * 运营判断:一个详情页排三个写着「广告位」的灰框,既挤占正文,也给访客
 * 「没人投所以空着」的印象。改为:标记保留(随时可填真实广告),但未售出时
 * 同一页只显示第一个,并把它做成指向 /advertise 的招商入口,说明这是广告位、
 * 面向什么人、去哪谈。样式在 css/advertise.css 里,第二个之后由 CSS 隐藏。
 *
 * 用法: node scripts/apply-ad-slots.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const INVITE = `<a class="ad-invite" href="/advertise">
  <span class="ad-invite-tag">广告位</span>
  <span class="ad-invite-text"><b>这个位置正在招商</b><span>面向正在搜索秦皇岛旅游的用户 · 民宿、餐饮、包车、景区均可投放</span></span>
  <span class="ad-invite-go">了解合作 →</span>
</a>`;

const pages = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...fs.readdirSync(path.join(ROOT, 'attraction')).map((f) => `attraction/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html')).map((f) => `blog/${f}`),
];

// 旧占位框:<div class="ad-slot ..." style="...">...广告位...</div>
const OLD = /<div class="ad-slot([^"]*)"[^>]*>[\s\S]{0,300}?<\/div>/g;

let files = 0, slots = 0, linked = 0, cssAdded = 0;
for (const rel of pages) {
  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const depth = rel.includes('/') ? '../' : '';

  html = html.replace(OLD, (m, extra) => {
    if (m.includes('ad-invite')) return m;          // 已经是新版
    slots++;
    return `<div class="ad-slot${extra}">\n  ${INVITE}\n</div>`;
  });

  // 用到招商位样式的页面需要引入样式表
  if (/class="ad-slot/.test(html) && !/css\/advertise(\.min)?\.css/.test(html)) {
    const link = `<link rel="stylesheet" href="${depth}css/advertise.min.css">`;
    if (/<link rel="stylesheet"[^>]*>/.test(html)) {
      html = html.replace(/(<link rel="stylesheet"[^>]*>)(?![\s\S]*<link rel="stylesheet")/, `$1\n${link}`);
    } else {
      html = html.replace('</head>', `${link}\n</head>`);
    }
    cssAdded++;
  }

  // 页脚补「广告合作」入口:页脚结构有几种,按标题列依次尝试
  // 注意:招商位本身就含 /advertise 链接,判断要用页脚那条链接的文字
  if (html.includes('<footer class="footer">') && !html.includes('>广告合作</a>')) {
    for (const h of ['关于我们', '实用工具', '旅游攻略', '热门页面']) {
      const marker = '<h4>' + h + '</h4>';
      const at = html.indexOf(marker);
      if (at < 0) continue;
      const insertAt = at + marker.length;
      html = html.slice(0, insertAt) + '\n        <a href="' + depth + 'advertise">广告合作</a>' + html.slice(insertAt);
      linked++;
      break;
    }
  }

  if (html !== before) { if (!DRY) fs.writeFileSync(file, html, 'utf8'); files++; }
}

console.log(`${DRY ? '[dry-run] ' : ''}✅ 招商位:改写 ${slots} 处,引入样式 ${cssAdded} 页,页脚加合作入口 ${linked} 页(共改动 ${files} 个文件)`);
console.log('   同一页面只显示第一个招商位,其余由 CSS 隐藏,售出后填入真实广告即可显示');
