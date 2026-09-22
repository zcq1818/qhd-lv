#!/usr/bin/env node
/**
 * 把咨询入口铺到高意向页面(可重复执行)。
 *
 * 背景:第一阶段只有当地向导页一个地方能留资料,但访客真正犹豫的时刻
 * 不在那一页 —— 是在看完某个景点、排不明白行程、不知道住哪一片的时候。
 * 这里在三类页面的「读完了、正准备走」的位置放一个咨询卡片:
 *   景点详情页  相关推荐之前(FAQ 与周边都看完了)
 *   博客文章    署名之前(读完正文顺势就看到)
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

const stat = { spots: 0, blogs: 0, pages: 0, skipped: 0 };

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

/* ---------------- 2. 博客文章 ----------------
   博客是搜索流量最主要的落地页(攻略类长尾词),但此前一个转化入口都没有,
   连二维码都没放 —— 人看完就走了。退役文章会 301 跳走,不处理。 */
const blogDir = path.join(ROOT, 'blog');
const retired = new Set(
  (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'retired-posts.json'), 'utf8')).posts || [])
    .map((p) => p.slug)
);

for (const file of fs.readdirSync(blogDir).filter((f) => f.endsWith('.html'))) {
  if (retired.has(file.replace(/\.html$/, ''))) { stat.skipped++; continue; }

  const abs = path.join(blogDir, file);
  const before = fs.readFileSync(abs, 'utf8');
  let html = before;

  if (!html.includes('data-lead-form')) {
    // 多数文章的 h1 里带着「— 秦皇岛旅游博客」这类站点后缀,
    // 原样塞进推送标题里全是噪音,去掉。
    const title = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s*[—|]\s*秦皇岛旅游(博客|官网)/g, '')   // 个别文章的后缀跑到了标题中间
      .trim();

    // 优先放在署名之前,读完正文顺势就看到;没有署名块的就放在文章末尾。
    // 署名块上面那行注释是描述署名的,要连注释一起让位,否则注释会飘到卡片头上。
    const anchor = ['  <!-- 作者署名 + 最后更新 -->', '  <div class="article-footer">', '</article>']
      .find((a) => html.includes(a));
    if (!anchor) { stat.skipped++; continue; }

    // source 统一用 blog:具体是哪一篇,提交时带的 page 字段已经记下了,
    // 文件名做 source 会超长被截断,反而分不清。
    html = html.replace(anchor, placeholder({
      source: 'blog',
      service: title ? `文章咨询:${title}`.slice(0, 80) : '文章咨询',
      title: '看完还有拿不准的地方?',
      sub: '攻略写得再细,也盖不住你自己的情况 —— 几号来、几个人、带不带老人小孩,合适的安排完全不同。说一下,我们给一份具体建议,不收费。',
      indent: '  ',
    }) + anchor);
  }

  html = ensureAssets(html, 1);
  if (html === before) { stat.skipped++; continue; }
  if (!DRY) fs.writeFileSync(abs, html, 'utf8');
  stat.blogs++;
}

/* ---------------- 3. 根目录栏目页 ----------------
   文案按页面各写各的:同一句「有问题找我们」放在必玩景点页和门票页上,
   说服力完全不同。anchor 留空的按 </main> → 页脚 依次找。 */
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
  {
    // 这页的占位已经写在模板里了,列在这里只是为了让 ensureAssets 把样式与脚本补上
    file: 'ganhai-time.html', source: 'ganhai-time', service: '赶海咨询',
    title: '想赶上好潮水,但拿不准哪天去?',
    sub: '告诉我们你哪几天在秦皇岛、住在哪一片、带不带孩子,我们帮你挑出潮差最大、离你最近的那个时段。不收费。',
  },
  {
    file: 'attractions.html', source: 'attractions', service: '景点挑选',
    title: '47 个景点,不知道挑哪几个?',
    sub: '时间有限就得取舍。说说你有几天、和谁一起来,我们帮你圈出值得去的那几个,顺路的排在一起。',
  },
  {
    file: 'must-play.html', source: 'must-play', service: '景点挑选',
    title: '这些必玩的,哪些真适合你?',
    sub: '「必玩」是给所有人的,你的情况是你自己的 —— 带老人爬不动山、带小孩耗不起排队。说一下,我们帮你筛。',
  },
  {
    file: 'guide.html', source: 'guide', service: '综合咨询',
    title: '攻略看完了,还是有拿不准的?',
    sub: '写在纸面上的经验盖不住每个人的具体情况。几号来、几个人、预算多少,说一句,我们给针对性的建议。',
  },
  {
    file: 'routes.html', source: 'routes', service: '路线咨询',
    title: '几条路线之间,选哪条?',
    sub: '路线好不好,取决于你有几天、住在哪、自驾还是坐车。说说你的情况,我们帮你定一条。',
  },
  {
    file: 'food.html', source: 'food', service: '餐饮咨询',
    title: '不知道吃什么、在哪吃?',
    sub: '住在哪一片、几个人、想吃海鲜还是家常,推荐完全不一样。说一下,我们给几家本地人真去的。',
  },
  {
    file: 'seafood.html', source: 'seafood', service: '海鲜咨询',
    title: '海鲜怎么买、去哪吃不踩坑?',
    sub: '市场几点去最新鲜、加工店怎么谈价、哪些说法是套路 —— 这些攻略里写不全。有疑问直接问。',
  },
  {
    file: 'ganhai.html', source: 'ganhai', service: '赶海咨询',
    title: '想赶上好潮水,哪天去?',
    sub: '赶海看的是潮汐不是天气,日子选错了就是去看一片水。告诉我们你哪几天有空,我们帮你挑时间和地点。',
  },
  {
    file: 'sunrise.html', source: 'sunrise', service: '日出咨询',
    title: '看日出,几点出发、去哪个点?',
    sub: '不同月份日出时间差一个多小时,住的地方不同该去的观景点也不同。说一下你的日期和住处。',
  },
  {
    file: 'tickets.html', source: 'tickets', service: '门票咨询',
    title: '门票怎么买不多花钱?',
    sub: '哪些能提前订、哪些现场买更划算、哪些联票其实用不上 —— 按你的行程算一遍最清楚。',
  },
  {
    file: 'summer.html', source: 'summer', service: '综合咨询',
    title: '夏天来,住哪、玩哪最舒服?',
    sub: '七八月人多、价高、天热,但错开时段和地点差别很大。说说你的日期,我们帮你避开高峰。',
  },
  {
    file: 'escape-heat.html', source: 'escape-heat', service: '综合咨询',
    title: '想避暑,去哪几天、哪一片最凉快?',
    sub: '山里和海边凉得不一样,住几天也影响选法。说说你的时间和同行的人,我们给个具体安排。',
  },
  {
    file: 'family-travel.html', source: 'family-travel', service: '亲子行程',
    title: '带孩子来,行程怎么排才不累?',
    sub: '孩子多大、能走多久、要不要午睡 —— 这些决定了一天能安排几个点。说一下,我们给一份不赶的行程。',
  },
  {
    file: 'checklist.html', source: 'checklist', service: '行前咨询',
    title: '还有什么没想到的?',
    sub: '清单是通用的,你的情况未必通用。带老人、带婴儿、自驾还是高铁,要准备的东西差别不小。问一句更稳。',
  },
  {
    file: 'pitfall-guide.html', source: 'pitfall-guide', service: '综合咨询',
    title: '出发前,不如先问一句',
    sub: '大部分坑都是临场才发现的。把你打算怎么玩说一下,我们提前告诉你哪几步容易出问题。',
  },
];

for (const cfg of rootPages) {
  const abs = path.join(ROOT, cfg.file);
  if (!fs.existsSync(abs)) { stat.skipped++; continue; }
  const before = fs.readFileSync(abs, 'utf8');
  let html = before;

  if (!html.includes('data-lead-form')) {
    // 指定了就用指定的,没指定就按 </main> → 页脚 依次找
    const anchor = [cfg.anchor, '</main>', '<footer class="footer">']
      .filter(Boolean)
      .find((a) => html.includes(a));
    if (!anchor) {
      console.warn(`   (${cfg.file} 找不到插入位置,跳过)`);
      stat.skipped++;
      continue;
    }
    // 这些页面在插入点没有带宽度约束的容器,包一层
    const block = `<div class="lead-wrap">\n${placeholder({ ...cfg, indent: '  ' })}</div>\n\n`;
    html = html.replace(anchor, block + anchor);
  }

  html = ensureAssets(html, 0);
  if (html === before) { stat.skipped++; continue; }
  if (!DRY) fs.writeFileSync(abs, html, 'utf8');
  stat.pages++;
}

console.log(`${DRY ? '[dry-run] ' : ''}✅ 咨询入口:景点页 ${stat.spots},博客 ${stat.blogs},栏目页 ${stat.pages},跳过 ${stat.skipped}(已有、退役或无插入位置)`);
