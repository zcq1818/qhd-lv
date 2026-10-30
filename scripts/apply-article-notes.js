#!/usr/bin/env node
/**
 * 给已有文章插入「时效提示」和「要点速览」:按 data/article-notes.json(可重复执行)。
 *
 * 老文章大多不是由稿件生成的,改它们以前靠临时脚本直接插 HTML —— 临时目录一清就
 * 没法复现,景区重新开放时想撤掉闭园提示也无处可改。现在两样都写在数据里:
 *  - notice:时效提示(闭园、暂停开放、季节性变化),黄底,放在正文最前
 *  - tldr:要点速览,AI 搜索最常摘的就是开头几句能单独成立的结论
 * 页面里用 <!-- article-notes --> … <!-- /article-notes --> 包住,每次构建整块重写;
 * 从清单里删掉某页,下次构建时这块也会被摘掉。
 *
 * 插入位置:正文容器(class="article-body")开头;找不到就插在第一个 <h2> 前。
 * 已经由稿件生成、自带 article-tldr 的文章不要写 tldr,会出现两块。
 *
 * 用法: node scripts/apply-article-notes.js [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const START = '<!-- article-notes -->';
const END = '<!-- /article-notes -->';
const CSS_MARK = '/* article-notes */';
const CSS = `<style>${CSS_MARK}` +
  '.article-notice{margin:0 0 18px;padding:14px 18px;border-radius:12px;background:#fffbeb;border:1px solid #fcd34d;color:#92400e;line-height:1.8}' +
  '.article-notice strong:first-child{display:block;margin-bottom:4px}.article-notice a{color:#b45309}' +
  '.article-tldr{margin:0 0 20px;padding:14px 18px;border-left:4px solid #1a73e8;background:#f0f6ff;border-radius:0 12px 12px 0}' +
  '.article-tldr b{display:block;margin-bottom:6px;color:#0f172a;font-size:.95rem}' +
  '.article-tldr ul{margin:0;padding-left:1.2em;display:grid;gap:4px;line-height:1.75;color:#1e293b;font-size:.94rem}' +
  '</style>\n';

const md = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

const conf = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'article-notes.json'), 'utf8')).pages || {};

function strip(h) {
  const i = h.indexOf(START);
  if (i < 0) return h;
  const j = h.indexOf(END, i);
  return h.slice(0, i) + h.slice(j + END.length).replace(/^[ \t]*\n/, '');
}

let changed = 0;
const warn = [];
const blogDir = path.join(ROOT, 'blog');
const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.html')).map((f) => `blog/${f}`);

for (const rel of files) {
  const file = path.join(ROOT, rel);
  const before = fs.readFileSync(file, 'utf8');
  let h = strip(before);
  const c = conf[rel];

  if (c) {
    let block = '';
    if (c.notice) {
      block += `<div class="article-notice"><strong>${md(c.notice.title)}</strong>${md(c.notice.text)}</div>\n`;
    }
    if ((c.tldr || []).length) {
      if (/class="article-tldr"/.test(h)) warn.push(`${rel} 已自带要点速览,清单里的 tldr 没加`);
      else block += `<section class="article-tldr" aria-label="要点速览"><b>要点速览</b><ul>${c.tldr.map((t) => `<li>${md(t)}</li>`).join('')}</ul></section>\n`;
    }
    if (block) {
      const wrapped = `${START}\n${block}${END}\n`;
      const m = h.match(/<(?:div|article)[^>]*class="article-body"[^>]*>\s*\n/);
      if (m) h = h.slice(0, m.index + m[0].length) + wrapped + h.slice(m.index + m[0].length);
      else if (h.includes('<h2')) h = h.replace('<h2', wrapped + '<h2');
      else { warn.push(`${rel} 找不到插入位置`); h = before; }
      if (!h.includes(CSS_MARK)) h = h.replace('</head>', CSS + '</head>');
      if (c.updated) h = h.replace(/"dateModified":\s*"[^"]*"/, `"dateModified": "${c.updated}"`);
    }
  }

  if (h !== before) {
    changed++;
    if (!DRY) fs.writeFileSync(file, h, 'utf8');
  }
}

for (const rel of Object.keys(conf)) if (!fs.existsSync(path.join(ROOT, rel))) warn.push(`${rel} 不存在`);
console.log(`✅ 文章时效提示/要点速览:改动 ${changed} 页${DRY ? '(--dry,未写入)' : ''}`);
warn.forEach((w) => console.log('   ⚠ ' + w));
