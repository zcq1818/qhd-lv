#!/usr/bin/env node
/**
 * 从 data/attractions.json 的 photoCandidates(Wikimedia Commons,CC 许可)下载实景照片,
 * 转成 1200px 宽的 webp 存到 images/real/<id>.webp,并把 spot.img 指向它,署名写入 spot.photoCredit。
 *
 * 用法:
 *   node scripts/fetch-commons-photos.js --list            只列出候选,不下载
 *   node scripts/fetch-commons-photos.js                   下载所有有候选且尚未有 real 图的景点
 *   node scripts/fetch-commons-photos.js geziwo laolongtou  只处理指定景点
 * 依赖:python3 + Pillow(转 webp)。
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const dataPath = path.join(ROOT, 'data', 'attractions.json');
const outDir = path.join(ROOT, 'images', 'real');
const args = process.argv.slice(2);
const LIST = args.includes('--list');
const only = args.filter((a) => !a.startsWith('--'));
const OK_LICENSE = /^(CC0|CC BY(-SA)?( [0-9.]+)?|Public domain|PD)/i;

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const targets = data.spots.filter((s) => (!only.length || only.includes(s.id)) && Array.isArray(s.photoCandidates) && s.photoCandidates.length);

function pick(spot) {
  // 优先:许可合规 → 横向 → 分辨率高
  const c = spot.photoCandidates.filter((p) => p.imageUrl && OK_LICENSE.test(p.license || ''));
  c.sort((a, b) => ((b.width || 0) >= (b.height || 0)) - ((a.width || 0) >= (a.height || 0)) || (b.width || 0) - (a.width || 0));
  return c[0] || null;
}

const UA = 'qhd-lv-site/1.0 (https://www.divdu.com; site maintainer)';

/** 用 curl 抓取(本机 Node 直连 wikimedia 会超时,curl 正常) */
function curlText(url, timeout = 30) {
  return execFileSync('curl', ['-sS', '--max-time', String(timeout), '-A', UA, url], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
}
function curlFile(url, dest, timeout = 90) {
  execFileSync('curl', ['-sS', '-L', '--max-time', String(timeout), '-A', UA, '-o', dest, url], { maxBuffer: 1024 });
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 2048) throw new Error('下载内容过小或失败');
}

/** 用 MediaWiki API 取 1600px 缩略图地址,避免下载原图 */
function thumbUrl(title) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=1600&titles=' + encodeURIComponent(title);
  const body = JSON.parse(curlText(api, 25));
  const info = Object.values(body?.query?.pages || {})[0]?.imageinfo?.[0];
  return info?.thumburl || info?.url || null;
}

(() => {
  if (LIST) {
    let total = 0;
    for (const s of targets) { const p = pick(s); if (!p) continue; total++; console.log(`${s.id.padEnd(20)} ${p.license.padEnd(14)} ${p.width}x${p.height}  ${p.title}  by ${p.author || '?'}`); }
    console.log(`\n共 ${total} 个景点有可用照片候选`);
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  let done = 0;
  for (const s of targets) {
    const p = pick(s); if (!p) continue;
    const webp = path.join(outDir, `${s.id}.webp`);
    if (fs.existsSync(webp) && !only.length) { console.log(`跳过(已有): ${s.id}`); continue; }
    const tmp = path.join(outDir, `${s.id}.src`);
    try {
      const url = thumbUrl(p.title) || p.imageUrl;
      curlFile(url, tmp);
      execFileSync('python', ['-c', `
from PIL import Image, ImageOps; import sys
im = Image.open(sys.argv[1]); im = ImageOps.exif_transpose(im).convert('RGB')
w, h = im.size
if w > 1200: im = im.resize((1200, round(h * 1200 / w)), Image.LANCZOS)
im.save(sys.argv[2], 'WEBP', quality=82, method=6)
print(im.size)`, tmp, webp]);
      fs.unlinkSync(tmp);
      s.img = `images/real/${s.id}.webp`;
      s.photoCredit = { title: p.title, author: p.author || null, license: p.license, source: p.pageUrl };
      done++;
      console.log(`✅ ${s.id} ← ${p.title} (${p.license})`);
    } catch (e) {
      console.log(`❌ ${s.id}: ${e.message}`);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`\n完成 ${done} 张。记得运行 python scripts/gen-detail-pages.py 之前先确认页面更新方式,或用 scripts/apply-photos.js 只替换头图。`);
})();
