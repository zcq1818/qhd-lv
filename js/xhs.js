/* ============================================================
   小红书出图页
   ------------------------------------------------------------
   数据和文案都来自 /api/cron-xhs?preview=1 —— 和每天推到微信的是
   同一份,不在这里重算。一份逻辑两处用,改了不会对不上。

   卡片按 3:4 排版(小红书竖图比例),截屏就能发。
   ============================================================ */
(function () {
  'use strict';

  var data = null;
  var kind = 'ganhai';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  function md(d) { return (+d.slice(5, 7)) + '月' + (+d.slice(8, 10)) + '日'; }
  // 按纯日历日期算,不受访客所在时区影响
  function week(d) { return '周' + WEEK[new Date(d + 'T00:00:00Z').getUTCDay()]; }

  /* ---------- 卡片 ---------- */

  function ganhaiRows() {
    return (data.days || []).map(function (d) {
      var w = null;
      (d.wins || []).forEach(function (x) {
        if (!w && x.isDay && !x.shallow) w = x;
      });
      if (!w) (d.wins || []).forEach(function (x) { if (!w && x.isDay) w = x; });
      if (!w) w = (d.wins || [])[0];

      if (!w) return { date: d.date, time: '—', tag: '无数据', cls: 'na' };
      return {
        date: d.date,
        time: w.from + ' - ' + w.to,
        tag: !w.isDay ? '半夜' : (w.shallow ? '退得浅' : '可以去'),
        cls: !w.isDay ? 'night' : (w.shallow ? 'shallow' : 'ok'),
      };
    });
  }

  function vis(text) {
    var t = String(text || '');
    if (/雷|暴雨|大雨|中雨|雪|雨|雾|霾|沙/.test(t)) return { tag: '看不到', cls: 'night' };
    if (/阴/.test(t)) return { tag: '希望不大', cls: 'shallow' };
    if (/多云/.test(t)) return { tag: '看运气', cls: 'maybe' };
    if (/晴/.test(t)) return { tag: '能看到', cls: 'ok' };
    return { tag: '不确定', cls: 'maybe' };
  }

  function sunriseRows() {
    return (data.daily || []).map(function (d) {
      var v = vis(d.textDay);
      return { date: d.date, time: d.sunrise || '—', tag: v.tag, cls: v.cls };
    });
  }

  function renderCard() {
    var copy = kind === 'sunrise' ? data.sunrise : data.ganhai;
    if (!copy) return;
    var rows = kind === 'sunrise' ? sunriseRows() : ganhaiRows();

    document.getElementById('card').innerHTML =
      '<div class="xc-top">' +
        '<div class="xc-kicker">' + (kind === 'sunrise' ? '秦皇岛 · 看日出' : '秦皇岛 · 赶海') + '</div>' +
        '<h1 class="xc-title">' + esc(copy.title) + '</h1>' +
      '</div>' +
      '<div class="xc-rows">' +
        rows.map(function (r) {
          return '<div class="xc-row">' +
            '<span class="xc-d">' + esc(md(r.date)) + ' ' + esc(week(r.date)) + '</span>' +
            '<span class="xc-t">' + esc(r.time) + '</span>' +
            '<span class="xc-tag ' + r.cls + '">' + esc(r.tag) + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="xc-foot">' +
        '<span>每天实时更新</span>' +
        '<b>divdu.com</b>' +
      '</div>';
  }

  function renderCopy() {
    var copy = kind === 'sunrise' ? data.sunrise : data.ganhai;
    if (!copy) return;
    document.getElementById('cpTitle').textContent = copy.title;
    document.getElementById('cpBody').textContent = copy.body;
    document.getElementById('cpTags').textContent = copy.tags.map(function (t) { return '#' + t; }).join(' ');
    // 一键复制的是标题+正文+标签,直接粘进小红书
    document.getElementById('cpAll').value = copy.title + '\n\n' + copy.body + '\n\n' +
      copy.tags.map(function (t) { return '#' + t; }).join(' ');
  }

  function paint() {
    renderCard();
    renderCopy();
    document.querySelectorAll('[data-kind]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-kind') === kind);
    });
  }

  function init() {
    var q = new URLSearchParams(location.search).get('t');
    if (q === 'sunrise' || q === 'ganhai') kind = q;

    document.querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () { kind = b.getAttribute('data-kind'); paint(); });
    });

    document.getElementById('copyBtn').addEventListener('click', function () {
      var ta = document.getElementById('cpAll');
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* 老浏览器 */ }
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(function () { ok = true; });
      var btn = this;
      var old = btn.textContent;
      btn.textContent = ok !== false ? '已复制' : '请手动选中复制';
      setTimeout(function () { btn.textContent = old; }, 1500);
    });

    fetch('/api/cron-xhs?preview=1')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || '接口异常');
        data = j;
        // 接口自己挑了今天更值得发的那条,默认就选它
        if (!q && j.pick && j.pick.kind) kind = j.pick.kind;
        document.getElementById('loading').hidden = true;
        document.getElementById('main').hidden = false;
        paint();
      })
      .catch(function (e) {
        document.getElementById('loading').innerHTML =
          '取数据失败:' + esc(e.message || e) + '<br><small>接口在本地是 404,属正常;线上再试。</small>';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
