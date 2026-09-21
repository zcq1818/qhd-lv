/**
 * 我的行程(本地)— 全站共用
 * - 存储:localStorage 'qhd-trip-v1' = { ids: [], days: 3, updated: ts }
 * - 任何带 data-trip-add="<spotId>" 的元素自动变成「加入行程 / 已加入」切换按钮
 * - 右下角以外的左下角显示悬浮胶囊「我的行程 · n」,点击进入 /itinerary#mytrip
 * - 变化时派发 window 事件 'qhd-trip-change',detail = { ids }
 */
(function () {
  var KEY = 'qhd-trip-v1';
  var MAX = 30;

  function read() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return { ids: Array.isArray(o.ids) ? o.ids : [], days: o.days || 3 }; }
    catch (e) { return { ids: [], days: 3 }; }
  }
  function write(state) {
    try { localStorage.setItem(KEY, JSON.stringify({ ids: state.ids.slice(0, MAX), days: state.days, updated: Date.now() })); } catch (e) {}
    window.dispatchEvent(new CustomEvent('qhd-trip-change', { detail: { ids: state.ids.slice() } }));
  }

  var Trip = {
    list: function () { return read().ids; },
    days: function () { return read().days; },
    setDays: function (d) { var s = read(); s.days = Math.max(1, Math.min(7, parseInt(d, 10) || 3)); write(s); },
    has: function (id) { return read().ids.indexOf(id) >= 0; },
    add: function (id) { var s = read(); if (s.ids.indexOf(id) < 0) { s.ids.push(id); write(s); } return true; },
    remove: function (id) { var s = read(); s.ids = s.ids.filter(function (x) { return x !== id; }); write(s); },
    toggle: function (id) { if (Trip.has(id)) { Trip.remove(id); return false; } Trip.add(id); return true; },
    setAll: function (ids, days) { var s = read(); s.ids = ids.filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, MAX); if (days) s.days = days; write(s); },
    clear: function () { write({ ids: [], days: read().days }); },
    /** 从 URL ?trip=a,b,c&days=3 读取分享的行程(不自动写入) */
    fromQuery: function () {
      try {
        var q = new URLSearchParams(location.search);
        var ids = (q.get('trip') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var days = parseInt(q.get('days'), 10) || 0;
        return ids.length ? { ids: ids, days: days } : null;
      } catch (e) { return null; }
    },
    shareUrl: function (ids, days) {
      var base = location.origin + '/itinerary';
      return base + '?trip=' + encodeURIComponent((ids || Trip.list()).join(',')) + '&days=' + (days || Trip.days()) + '#mytrip';
    }
  };
  window.QhdTrip = Trip;

  /* ---------- 样式 ---------- */
  var css = '' +
    '.trip-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;border:1.5px solid rgba(26,115,232,.45);background:#fff;color:#1a73e8;font-weight:700;font-size:13px;cursor:pointer;transition:all .2s;line-height:1;white-space:nowrap;text-decoration:none}' +
    '.trip-btn:hover{background:#eaf2fe}' +
    '.trip-btn.on{background:#1a73e8;border-color:#1a73e8;color:#fff}' +
    '.trip-btn.dark{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.16);color:#fff}' +
    '.trip-btn.dark.on{background:#fff;color:#1a73e8;border-color:#fff}' +
    '.trip-btn.sm{padding:6px 11px;font-size:12px}' +
    '#qhdTripPill{position:fixed;left:16px;bottom:16px;z-index:900;display:none;align-items:center;gap:8px;padding:10px 14px 10px 12px;border-radius:999px;background:#1E293B;color:#fff;font-weight:700;font-size:13px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:transform .2s}' +
    '#qhdTripPill.show{display:inline-flex}' +
    '#qhdTripPill:hover{transform:translateY(-2px)}' +
    '#qhdTripPill b{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#1a73e8;font-size:12px}' +
    '#qhdTripPill.bump b{animation:tripBump .35s}' +
    '@keyframes tripBump{0%{transform:scale(1)}50%{transform:scale(1.35)}100%{transform:scale(1)}}' +
    '@media (max-width:768px){#qhdTripPill{left:12px;bottom:12px;padding:9px 12px;font-size:12px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- 按钮绑定 ---------- */
  var painting = false;   // 自身写 DOM 期间不响应 MutationObserver,避免「重绘→监听→重绘」死循环
  function paint(btn) {
    var id = btn.getAttribute('data-trip-add');
    var on = Trip.has(id);
    var label = btn.getAttribute('data-trip-label') || '加入行程';
    var html = on ? '<span aria-hidden="true">✓</span> 已加入行程' : '<span aria-hidden="true">＋</span> ' + label;
    if (btn.__tripHtml === html) return;                    // 内容没变就不动 DOM
    painting = true;
    btn.classList.toggle('on', on);
    btn.innerHTML = html;
    btn.__tripHtml = html;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    painting = false;
  }
  function bindAll(root) {
    var list = (root || document).querySelectorAll('[data-trip-add]');
    for (var i = 0; i < list.length; i++) (function (btn) {
      if (btn.__trip) { paint(btn); return; }
      btn.__trip = true;
      btn.classList.add('trip-btn');
      if (btn.tagName === 'BUTTON') btn.type = 'button';
      paint(btn);
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var id = btn.getAttribute('data-trip-add');
        var added = Trip.toggle(id);
        paint(btn);
        if (added) bump();
      });
    })(list[i]);
  }
  window.addEventListener('qhd-trip-change', function () { bindAll(); renderPill(); });
  // 动态渲染的列表(如 attractions.html)也能自动绑定
  var scanQueued = false;
  // 注意:MutationObserver 回调是微任务,同步写 DOM 时设的标志位到这里已经复位,
  // 所以不能靠标志位挡自身的重绘,必须判断「新增节点里是否真的有未绑定的按钮」。
  function needsScan(muts) {
    for (var i = 0; i < muts.length; i++) {
      var added = muts[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var n = added[j];
        if (!n || n.nodeType !== 1) continue;                       // 文本节点直接跳过
        if (n.matches && n.matches('[data-trip-add]') && !n.__trip) return true;
        if (n.querySelector && n.querySelector('[data-trip-add]')) return true;
      }
    }
    return false;
  }
  var mo = new MutationObserver(function (muts) {
    if (scanQueued || !needsScan(muts)) return;
    scanQueued = true;                                              // 合并到下一帧,列表批量渲染只扫一次
    requestAnimationFrame(function () { scanQueued = false; bindAll(); });
  });

  /* ---------- 悬浮胶囊 ---------- */
  var pill;
  function renderPill() {
    var n = Trip.list().length;
    var onItin = /\/itinerary(\.html)?$/.test(location.pathname);
    painting = true;
    if (!pill) {
      pill = document.createElement('a');
      pill.id = 'qhdTripPill';
      pill.href = (location.pathname.indexOf('/attraction/') >= 0 || location.pathname.indexOf('/blog/') >= 0 ? '../' : '') + 'itinerary#mytrip';
      pill.setAttribute('aria-label', '查看我的行程');
      document.body.appendChild(pill);
    }
    var html = '🧭 我的行程 <b>' + n + '</b>';
    if (pill.__html !== html) { pill.innerHTML = html; pill.__html = html; }
    pill.classList.toggle('show', n > 0 && !onItin);
    painting = false;
  }
  function bump() { if (!pill) return; pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }

  function init() { bindAll(); renderPill(); mo.observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
