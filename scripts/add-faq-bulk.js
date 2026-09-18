// 批量给博客攻略页添加通用 FAQPage 结构化数据（用于 AI 搜索引擎优化）
// 用法：node scripts/add-faq-bulk.js
// 说明：跳过已含 FAQPage 的文件；对每个缺失的文件，基于 <title> 生成 1 个标题相关问答 + 2 个秦皇岛通用问答。
// 编码：保持原文件 UTF-8 无 BOM / 有 BOM 状态不变。

const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '..', 'blog');

const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.html'));

let added = 0;
let skipped = 0;
let failed = 0;
const failedList = [];

function extractTitle(html, fallback) {
  const m = html.match(/<\s*title[^>]*>([\s\S]*?)<\s*\/title\s*>/i);
  return m ? m[1].trim() : fallback;
}

// 取标题主干：去掉 | ｜ — – - 之后的部分，并控制长度
function coreTitle(title) {
  let core = title.split(/[|｜—–-]/)[0].trim() || title;
  if (core.length > 40) core = core.slice(0, 40);
  return core;
}

function buildFaq(core) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `这篇《${core}》攻略主要讲了什么？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `这篇攻略围绕「${core}」展开，涵盖交通、住宿、美食、游玩路线等实用信息，适合计划去秦皇岛旅行的游客参考。`,
        },
      },
      {
        '@type': 'Question',
        name: '秦皇岛旅游最佳时间是什么时候？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '夏季（6-8月）适合避暑看海，秋季（9-11月）人少、海鲜肥、适合看红叶，春秋天气凉爽宜人。具体取决于你想玩海还是赏秋，建议结合天气和潮汐提前规划。',
        },
      },
      {
        '@type': 'Question',
        name: '去秦皇岛旅游需要提前准备什么？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '建议提前查好天气和潮汐、预订住宿、备好防晒和防滑鞋；赶海要看潮汐表，海边注意看管儿童，旺季提前订票错峰出行。',
        },
      },
    ],
  };
}

for (const file of files) {
  const filePath = path.join(blogDir, file);

  let buf = fs.readFileSync(filePath);
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  let html = buf.toString('utf8');
  if (hasBom) html = html.replace(/^\uFEFF/, '');

  if (html.includes('"@type": "FAQPage"') || html.includes('"@type":"FAQPage"')) {
    skipped++;
    continue;
  }

  if (!html.includes('</head>')) {
    failed++;
    failedList.push(file);
    continue;
  }

  const title = extractTitle(html, file.replace(/\.html$/, ''));
  const core = coreTitle(title);
  const faqScript =
    '<script type="application/ld+json">\n' + JSON.stringify(buildFaq(core), null, 2) + '\n</script>\n';

  html = html.replace('</head>', faqScript + '</head>');

  let outBuf = Buffer.from(html, 'utf8');
  if (hasBom) outBuf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), outBuf]);
  fs.writeFileSync(filePath, outBuf);
  added++;
}

console.log(`完成：新增 ${added} 个，跳过(已有FAQ) ${skipped} 个，失败 ${failed} 个`);
if (failedList.length) console.log('失败文件：\n' + failedList.join('\n'));
