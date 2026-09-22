#!/usr/bin/env node
/**
 * 主动推送 URL 给搜索引擎(百度普通收录 + IndexNow)。
 *
 * 为什么重写:原来的 baidu-push.js / indexnow.js 会把后台页、404、以及
 * 89 篇已退役(会 301 跳走)的博客一起推上去 —— 百度每天的推送配额是有限的,
 * 拿去推这些等于白扔;同时它们又漏掉了 50 个英文页。
 *
 * 另外它们只挂在 npm run build 里,而那条命令中间有一步 vercel build,
 * 日常是 git push 部署,从来不跑 —— 所以实际上一次都没推过。
 *
 * 推送顺序按「最可能带来流量」排:首页 → 在线博客 → 栏目页 → 景点页 → 英文页。
 * 配额用完时,先推上去的是最值钱的那批。
 *
 * 用法:
 *   node scripts/push-urls.js            推百度 + IndexNow
 *   node scripts/push-urls.js --baidu    只推百度
 *   node scripts/push-urls.js --indexnow 只推 IndexNow
 *   node scripts/push-urls.js --dry      只列出要推的 URL,不发请求
 *   node scripts/push-urls.js --limit 10 百度只推 10 条,并记住推到哪儿,
 *                                        下次接着往后推(配额有限时每天跑一次)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.divdu.com';

// token 可用环境变量覆盖,方便轮换 —— 仓库是公开的,写死在文件里等于公开
const BAIDU_TOKEN = process.env.BAIDU_PUSH_TOKEN || 'cPgQP32Tem2D7Xla';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'divdu-qhd-2026-indexnow-key';

const ONLY_BAIDU = process.argv.includes('--baidu');
const ONLY_INDEXNOW = process.argv.includes('--indexnow');
const DRY = process.argv.includes('--dry');

/* 不该推的:后台、404、纯本地功能页 */
const SKIP_ROOT = new Set(['admin', 'dashboard', '404', 'favorites', 'index']);

const retired = new Set(
  (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'retired-posts.json'), 'utf8')).posts || [])
    .map((p) => p.slug)
);

const list = (dir) => (fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)) : [])
  .filter((f) => f.endsWith('.html'))
  .map((f) => f.replace(/\.html$/, ''));

const rootPages = list('.').filter((s) => !SKIP_ROOT.has(s));
const blogs = list('blog').filter((s) => !retired.has(s));
const spots = list('attraction');
const enSpots = list('en/attraction');

// 顺序即优先级
const urls = [
  `${SITE}/`,
  ...blogs.map((s) => `${SITE}/blog/${encodeURIComponent(s)}`),
  ...rootPages.map((s) => `${SITE}/${s}`),
  ...spots.map((s) => `${SITE}/attraction/${s}`),
  `${SITE}/en`, `${SITE}/en/attractions`, `${SITE}/en/practical`,
  ...enSpots.map((s) => `${SITE}/en/attraction/${s}`),
];

/* ---------- 配额轮转 ----------
   百度的推送配额是按天给的,未验证站点通常只有 10 条/天,一次推 210 条
   必然 over quota。这里记住上次推到哪儿,每天跑一次就往后推一批,
   若干天把全站推完;推完一轮从头再来(内容更新后也需要重推)。 */
const STATE = path.join(ROOT, 'data', 'push-state.json');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i > 0 ? parseInt(process.argv[i + 1], 10) || 0 : 0;
})();

function loadCursor() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')).cursor || 0; } catch (e) { return 0; }
}
function saveCursor(c, pushed) {
  fs.writeFileSync(STATE, JSON.stringify({
    cursor: c, total: urls.length, lastRun: new Date().toISOString(), lastPushed: pushed,
  }, null, 2) + '\n', 'utf8');
}

let baiduUrls = urls;
let cursor = 0;
if (LIMIT > 0) {
  cursor = loadCursor();
  if (cursor >= urls.length) cursor = 0;            // 推完一轮,从头再来
  baiduUrls = urls.slice(cursor, cursor + LIMIT);
}

console.log(`准备推送 ${urls.length} 个 URL`);
console.log(`  首页 1 + 在线博客 ${blogs.length} + 栏目页 ${rootPages.length} + 景点页 ${spots.length} + 英文页 ${enSpots.length + 3}`);
console.log(`  已排除:退役博客 ${retired.size} 篇、后台与 404 等 ${SKIP_ROOT.size} 页`);

if (DRY) {
  console.log('\n[dry-run] 前 10 个:');
  urls.slice(0, 10).forEach((u) => console.log('  ' + u));
  process.exit(0);
}

async function pushBaidu() {
  const api = `http://data.zz.baidu.com/urls?site=${SITE}&token=${BAIDU_TOKEN}`;
  console.log(`\n📤 百度普通收录…(本次 ${baiduUrls.length} 条${LIMIT > 0 ? `,第 ${cursor + 1}-${cursor + baiduUrls.length} 条` : ''})`);
  try {
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: baiduUrls.join('\n'),
    });
    const text = await res.text();
    let d = null;
    try { d = JSON.parse(text); } catch (e) { /* 配额用尽时百度会返回非 JSON */ }

    if (!d) { console.log(`  ⚠️ 返回的不是 JSON(HTTP ${res.status}):${text.slice(0, 200)}`); return; }
    if (d.error) {
      console.log(`  ❌ ${d.error}:${d.message}`);
      if (/quota/i.test(d.message || '')) {
        console.log('     今天的配额用完了。明天再跑一次即可,游标不动,不会漏推。');
        console.log('     想提高配额:去 https://ziyuan.baidu.com 验证站点。');
      }
      return;
    }

    console.log(`  ✅ 成功推送 ${d.success} 条`);
    if (typeof d.remain === 'number') console.log(`  今日剩余配额:${d.remain}`);
    if (LIMIT > 0) {
      saveCursor(cursor + baiduUrls.length, baiduUrls.length);
      const done = cursor + baiduUrls.length;
      console.log(`  进度:${done}/${urls.length}${done >= urls.length ? '(本轮推完,下次从头开始)' : ''}`);
    }
    if (d.not_same_site?.length) console.log(`  ⚠️ 不属于本站(被忽略):${d.not_same_site.length} 条`);
    if (d.not_valid?.length) console.log(`  ⚠️ 格式不合法:${d.not_valid.slice(0, 3).join(', ')}`);
  } catch (err) {
    console.error('  ❌ 请求失败:', err.message);
  }
}

async function pushIndexNow() {
  console.log('\n📤 IndexNow(Bing / Yandex)…');
  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'www.divdu.com',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
    // 200/202 都算收下了;IndexNow 不返回逐条结果
    console.log(`  ${res.status === 200 || res.status === 202 ? '✅' : '⚠️'} HTTP ${res.status} ${res.statusText}`);
    if (res.status >= 400) console.log('  ' + (await res.text()).slice(0, 200));
  } catch (err) {
    console.error('  ❌ 请求失败:', err.message);
  }
}

(async () => {
  if (!ONLY_INDEXNOW) await pushBaidu();
  if (!ONLY_BAIDU) await pushIndexNow();
})();
