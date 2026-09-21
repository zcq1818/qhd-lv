#!/usr/bin/env node
/**
 * 把批量翻译结果(<目录>/batch*.en.json)合并进 data/attractions.json,
 * 写入 bestSeasonEn / suitableForEn / ticketNotesEn / openTimeNotesEn /
 * transportEn / tipsEn / faqEn 字段,供英文景点详情页使用。
 *
 * 用法: node scripts/merge-en-translations.js <翻译目录>
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error('用法: node scripts/merge-en-translations.js <翻译目录>'); process.exit(1); }

const dataPath = path.join(ROOT, 'data', 'attractions.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const byId = Object.fromEntries(data.spots.map((s) => [s.id, s]));

const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() || null : v);
const nonEmpty = (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length);

let merged = 0, missing = [], warnings = [];
for (const f of fs.readdirSync(dir).filter((x) => /\.en\.json$/.test(x)).sort()) {
  let arr;
  try { arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
  catch (e) { warnings.push(`${f}: JSON 解析失败 ${e.message.slice(0, 60)}`); continue; }
  if (!Array.isArray(arr)) { warnings.push(`${f}: 不是数组`); continue; }

  for (const r of arr) {
    const s = byId[r.id];
    if (!s) { missing.push(r.id); continue; }
    if (nonEmpty(r.bestSeasonEn)) s.bestSeasonEn = clean(r.bestSeasonEn);
    if (nonEmpty(r.suitableForEn)) s.suitableForEn = clean(r.suitableForEn);
    if (nonEmpty(r.ticketNotesEn)) s.ticketNotesEn = clean(r.ticketNotesEn);
    if (nonEmpty(r.openTimeNotesEn)) s.openTimeNotesEn = clean(r.openTimeNotesEn);
    if (r.transportEn && typeof r.transportEn === 'object') {
      const t = {};
      for (const k of ['publicTransit', 'driving', 'parking']) if (nonEmpty(r.transportEn[k])) t[k] = clean(r.transportEn[k]);
      if (Object.keys(t).length) s.transportEn = t;
    }
    if (Array.isArray(r.tipsEn) && r.tipsEn.length) s.tipsEn = r.tipsEn.map(clean).filter(Boolean);
    if (Array.isArray(r.faqEn) && r.faqEn.length) {
      s.faqEn = r.faqEn.filter((x) => x && x.q && x.a).map((x) => ({ q: clean(x.q), a: clean(x.a) }));
    }
    merged++;
  }
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

const done = data.spots.filter((s) => s.tipsEn?.length && s.transportEn);
console.log(`✅ 合并 ${merged} 个景点的英文字段`);
console.log(`   英文资料齐全(含贴士与交通):${done.length}/${data.spots.length}`);
const todo = data.spots.filter((s) => !(s.tipsEn?.length && s.transportEn)).map((s) => s.id);
if (todo.length) console.log(`   尚缺:${todo.join(', ')}`);
if (missing.length) console.log(`   数据中无此 id:${[...new Set(missing)].join(', ')}`);
if (warnings.length) console.log('   提示:\n     ' + warnings.join('\n     '));
