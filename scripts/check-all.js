#!/usr/bin/env node
/**
 * 站点全量自检。
 *
 * 这个项目有八九个维护命令,靠人记得跑迟早出事 —— 曾经 9 个页面一直在
 * 下载未压缩脚本、RSS 烂到 27 条里 18 条是死链,根子都是「有个步骤
 * 没人记得做」。所以把「做没做对」变成可以自动判断的事:
 * 提交前跑一遍,有问题就拦下来,并直接告诉你跑哪个命令能修。
 *
 * 用法:
 *   node scripts/check-all.js              全量检查
 *   node scripts/check-all.js --staged     只在 git 暂存区里查敏感文件(钩子用)
 */
const { execFileSync } = require('child_process');
const C = require('./lib/checks');

const STAGED = process.argv.includes('--staged');

function stagedFiles() {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: C.ROOT })
      .toString().split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (e) { return []; }
}

const pages = C.allPages();
const retired = C.retiredSlugs();

const results = [
  C.checkForbidden(STAGED ? stagedFiles() : []),
  C.checkArtifacts(),
  C.checkMinRefs(pages),
  C.checkAnalytics(pages),
  C.checkViewCounter(pages, retired),
  C.checkAssets(pages),
  C.checkSitemapRss(pages, retired),
];

let bad = 0;
const fixes = new Set();

for (const r of results) {
  if (!r.problems.length) {
    console.log(`  ✅ ${r.name}`);
    continue;
  }
  console.log(`  ❌ ${r.name}`);
  for (const p of r.problems) {
    console.log(`       ${p.msg}`);
    if (p.fix) fixes.add(p.fix);
    bad++;
  }
}

if (bad) {
  console.log(`\n共 ${bad} 个问题。依次运行:`);
  for (const f of fixes) console.log(`  ${f}`);
  console.log('\n(或者直接 npm run all,它会把该跑的都跑一遍)');
  process.exit(1);
}

console.log(`\n✅ 全部通过(${pages.length} 个页面)`);
