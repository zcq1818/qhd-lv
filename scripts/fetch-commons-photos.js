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

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'qhd-lv-site/1.0 (https://www.divdu.com; contact via site)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return download(res.headers.location, dest).then(resolve, reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      const ws = fs.createWriteStream(dest);
      res.pipe(ws); ws.on('finish', () => ws.close(resolve)); ws.on('error', reject);
    });
    req.on('error', reject);
  });
}

(async () => {
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
      // 用 Commons 缩略图接口拿 1600px 版本,避免下载几十 MB 原图
      const thumb = p.imageUrl.replace('/wikipedia/commons/', '/wikipedia/commons/thumb/') + '/1600px-' + path.basename(decodeURIComponent(p.imageUrl));
      try { await download(thumb, tmp); } catch (e) { await download(p.imageUrl, tmp); }
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
