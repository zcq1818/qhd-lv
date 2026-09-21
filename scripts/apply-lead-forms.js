#!/usr/bin/env node
/**
 * 把咨询入口铺到高意向页面(可重复执行)。
 *
 * 背景:第一阶段只有当地向导页一个地方能留资料,但访客真正犹豫的时刻
 * 不在那一页 —— 是在看完某个景点、排不明白行程、不知道住哪一片的时候。
 * 这里在三类页面的「读完了、正准备走」的位置放一个咨询卡片:
 *   景点详情页  相关推荐之前(FAQ 与周边都看完了)
 *   行程规划页  AI 行程之后、入群二维码之前
 *   住宿页      正文结尾
 *
 * 卡片本身由 js/lead-form.js 渲染,HTML 里只留占位与一行兜底联系方式,
 * 以后改文案只改一个 JS 文件,不用再回来改 50 个页面。
 *
 * 用法: node scripts/apply-lead-forms.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const MAIL = 'zhaochenqi@163.com';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** 占位元素:JS 起不来时,访客看到的就是这一段 */
function placeholder({ source, service, title, sub, indent = '' }) {
  const attrs = [
    'data-lead-form',
    `data-source="${esc(source)}"`,
    service ? `data-service="${esc(service)}"` : '',
    `data-title="${esc(title)}"`,
    sub ? `data-sub="${esc(sub)}"` : '',
  ].filter(Boolean).join(' ');

  return [
    `${indent}<!-- 咨询入口(由 js/lead-form.js 渲染) -->`,
    `${indent}<div class="lead-card" ${attrs}>`,
    `${indent}  <h3>${esc(title)}</h3>`,
    `${indent}  <p class="lead-card-sub">留个联系方式,我们按你的情况给一份具体建议。也可以直接加微信,或发邮件到 <a href="mailto:${MAIL}">${MAIL}</a>。</p>`,
    `${indent}</div>`,
    '',
  ].join('\n');
}

/**
 * 确保页面引用了组件的样式与脚本。
 * 注意:这里必须匹配到真正的标签 —— 占位块里的注释也含 "js/lead-form.js",
 * 只按路径字符串判断会把自己骗过去,脚本就永远插不进来。
 */
function ensureAssets(html, depth) {
  const prefix = '../'.repeat(depth);
  let out = html;

  if (!/<link[^>]+css\/lead-form(\.min)?\.css/.test(out)) {
    const tag = `<link rel="stylesheet" href="${prefix}css/lead-form.min.css">`;
    out = out.replace('</head>', `${tag}\n</head>`);
  }
  if (!/<script[^>]+js\/lead-form(\.min)?\.js/.test(out)) {
    const tag = `<script src="${prefix}js/lead-form.min.js" defer></script>`;
    if (out.includes('</body>')) out = out.replace('</body>', `${tag}\n</body>`);
    else out += `\n${tag}\n`;
  }
  return out;
}

const stat = { spots: 0, pages: 0, skipped: 0 };

/* ---------------- 1. 景点详情页 ---------------- */
const spotDir = path.join(ROOT, 'attraction');
for (const file of fs.readdirSync(spotDir).filter((f) => f.endsWith('.html'))) {
  const abs = path.join(spotDir, file);
  const before = fs.readFileSync(abs, 'utf8');
  let html = before;

  const id = file.replace(/\.html$/, '');
  const name = ((html.match(/<h1[^>]*>([^<]*)</) || [])[1] || '').trim() || '这里';

  // 相关推荐之前 —— FAQ、周边都看完了,正是会犹豫「要不要问一下」的位置
  const anchor = '  <!-- Related -->';
  if (!html.includes('data-lead-form')) {
    if (!html.includes(anchor)) { stat.skipped++; continue; }
    html = html.replace(anchor, placeholder({
      source: `spot-${id}`,
      service: `景点咨询:${name}`,
      title: `去${name}之前,有什么拿不准的?`,
      sub: '几点去人少、怎么坐车最省事、带老人小孩合不合适 —— 说说你的情况,我们按你的时间和人数回一份具体建议。不收费。',
      indent: '  ',
    }) + anchor);
  }

  // 样式与脚本单独判断:占位可能已经存在,但引用还缺
  html = ensureAssets(html, 1);
  if (html === before) { stat.skipped++; continue; }
  if (!DRY) fs.writeFileSync(abs, html, 'utf8');
  stat.spots++;
}

/* ---------------- 2. 根目录高意向页 ---------------- */
const rootPages = [
  {
    file: 'itinerary.html',
    anchor: '<!-- 加入旅行群 -->',
    source: 'itinerary',
    service: '行程定制',
    title: '几天合适、先去哪后去哪,拿不准?',
    sub: '把你的出行日期、人数和想看的东西说一下,我们给一份能直接照着走的行程,不收费。',
  },
  {
    file: 'accommodation.html',
    anchor: '</main>',
    source: 'accommodation',
    service: '住宿咨询',
    title: '不知道住哪一片合适?',
    sub: '带老人孩子、想走路到海边、还是图便宜 —— 需求不一样,该住的区完全不同。说说情况,我们给几个具体建议。',
  },
];

for (const cfg of rootPages) {
  const abs = path.join(ROOT, cfg.file);
  if (!fs.existsSync(abs)) { stat.skipped++; continue; }
  const before = fs.readFileSync(abs, 'utf8');
  let html = before;

  if (!html.includes('data-lead-form')) {
    if (!html.includes(cfg.anchor)) {
      console.warn(`   (${cfg.file} 找不到插入位置 ${cfg.anchor},跳过)`);
      stat.skipped++;
      continue;
    }
    // 这两页没有自带宽度约束的容器,包一层
    const block = `<div class="lead-wrap">\n${placeholder({ ...cfg, indent: '  ' })}</div>\n\n`;
    html = html.replace(cfg.anchor, block + cfg.anchor);
  }

  html = ensureAssets(html, 0);
  if (html === before) { stat.skipped++; continue; }
  if (!DRY) fs.writeFileSync(abs, html, 'utf8');
  stat.pages++;
}

console.log(`${DRY ? '[dry-run] ' : ''}✅ 咨询入口:景点页 ${stat.spots} 个,栏目页 ${stat.pages} 个,跳过 ${stat.skipped} 个(已有或无插入位置)`);
