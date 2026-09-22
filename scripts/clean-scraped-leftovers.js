#!/usr/bin/env node
/**
 * 清掉转载文章里别人留下的东西(可重复执行):
 *
 *  1. 别家平台的品牌尾巴。有一篇的标题一路带着「-【去哪儿攻略】」,
 *     h1、title、og:title、图片 alt 里全是 —— 等于在自己的页面上、
 *     在搜索结果里替对家打广告。
 *
 *  2. 别人的招揽。两篇里留着「购票咨询或定制旅游,微信客服:」
 *     「公司团建|旅游定制|私人海钓|包船出海打渔 咨询电话/微信:」,
 *     微信号本身早被抹掉了,剩下一句没头没尾的推销,紧挨着我们自己的
 *     咨询表单,既不体面也会分流。
 *
 * 这里只做「删掉不属于自己的东西」,不改写正文。
 * 用法: node scripts/clean-scraped-leftovers.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

/* ---------- 1. 平台品牌尾巴(全博客目录扫) ---------- */
// 形如「-【去哪儿攻略】」「 — 【携程攻略】」,只认方括号里带平台名的
const BRAND = /\s*[-—–]\s*【\s*(去哪儿|携程|美团|飞猪|同程|马蜂窝|驴妈妈|途牛|大众点评)[^】]{0,8}】/g;

/* ---------- 2. 招揽残留(精确到块,不做泛化正则) ---------- */
const SOLICITATIONS = [
  {
    file: '2026年北戴河旅游攻略-2026年-北戴河欢迎您-景区分布和简介-票价.html',
    // 整段里只有后半句是推销,前半句是正常介绍,保留前半句
    from: '<p><span><span>多种北</span></span><span><span>戴河旅游有40多个景区、景点，给您介绍下基本情况和选择建议。购票咨询或定制旅游,微信</span></span><span><span>客服：</span></span><span><span>，</span></span></p>',
    to: '<p><span>多种北戴河旅游有40多个景区、景点，给您介绍下基本情况和选择建议。</span></p>',
  },
  {
    file: '阿那亚超全打卡清单-景点-美食-住宿一站式攻略-解锁海边理想生活.html',
    // 整块都是推销,直接删
    from: '<section><strong><span><span>公司团建 |旅游定制 |</span><span><span>私人海钓| 包船出海打渔 </span></span></span><span></span><span><span>咨询电话/微信</span><span><span> ：</span></span></span><span><span></span></span></strong></section>',
    to: '',
  },
];

const stat = { brand: 0, brandFiles: 0, solicit: 0 };

for (const file of fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html'))) {
  const abs = path.join(ROOT, 'blog', file);
  const before = fs.readFileSync(abs, 'utf8');
  let html = before;

  const n = (html.match(BRAND) || []).length;
  if (n) {
    html = html.replace(BRAND, '');
    stat.brand += n;
    stat.brandFiles++;
  }

  if (html !== before && !DRY) fs.writeFileSync(abs, html, 'utf8');
}

for (const s of SOLICITATIONS) {
  const abs = path.join(ROOT, 'blog', s.file);
  if (!fs.existsSync(abs)) { console.warn(`   (找不到 ${s.file})`); continue; }
  const before = fs.readFileSync(abs, 'utf8');
  if (!before.includes(s.from)) continue;          // 已经清过了
  const html = before.replace(s.from, s.to);
  if (!DRY) fs.writeFileSync(abs, html, 'utf8');
  stat.solicit++;
}

console.log(
  `${DRY ? '[dry-run] ' : ''}✅ 转载残留:平台品牌尾巴 ${stat.brand} 处(${stat.brandFiles} 个文件),招揽 ${stat.solicit} 处`
);
