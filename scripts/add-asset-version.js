#!/usr/bin/env node
/**
 * 给页面里引用的本地 CSS / JS 加内容指纹 ?v=xxxxxxxx。
 *
 * 为什么需要:vercel.json 把 css/js/images 设成了一年强缓存(immutable),
 * 没有指纹的话,改完样式老访客一年内都拿不到新版本。加了指纹后,
 * 文件内容一变 URL 就变,浏览器自然重新下载,缓存可以放心设长。
 *
 * 可重复执行:已有的 ?v= 会按当前文件内容重算。
 * 用法: node scripts/add-asset-version.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

const hashCache = new Map();
function hashOf(rel) {
  if (hashCache.has(rel)) return hashCache.get(rel);
  const abs = path.join(ROOT, rel);
  let h = null;
  if (fs.existsSync(abs)) h = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex').slice(0, 8);
  hashCache.set(rel, h);
  return h;
}

const dirs = ['.', 'attraction', 'blog', 'en'];
const pages = dirs.flatMap((d) => {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.html')).map((f) => (d === '.' ? f : `${d}/${f}`));
});

// 匹配 href="...css" / src="...js",允许已有 ?v=
const RE = /(href|src)="((?:\.\.\/)?(?:css\/|js\/|assets\/)?[A-Za-z0-9_./-]+\.(?:css|js))(?:\?v=[a-f0-9]+)?"/g;

let changed = 0, refs = 0, missing = new Set();
for (const rel of pages) {
  const file = path.join(ROOT, rel);
  const before = fs.readFileSync(file, 'utf8');
  const depth = rel.includes('/') ? 1 : 0;
  const after = before.replace(RE, (m, attr, url) => {
    if (/^https?:|^\/\//.test(url)) return m;
    // 页面内相对路径 → 仓库根相对路径
    let repoPath = url.replace(/^\.\.\//, '');
    if (!depth && url.startsWith('../')) repoPath = url.slice(3);
    const h = hashOf(repoPath);
    if (!h) { missing.add(url); return m; }
    refs++;
    return `${attr}="${url}?v=${h}"`;
  });
  if (after !== before) { fs.writeFileSync(file, after, 'utf8'); changed++; }
}

console.log(`✅ 资源指纹:处理 ${refs} 处引用,改动 ${changed} 个页面`);
if (missing.size) console.log('   跳过(文件不存在):', [...missing].join(', '));
