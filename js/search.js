/**
 * 全站搜索组件：在导航栏注入搜索框，搜索景点 + 攻略 + 博客
 * 依赖 js/search-index.js（window.SEARCH_INDEX）和 data/attractions.json（景点）
 * 用法：页面引入 <script src="js/search-index.js" defer></script> 和 <script src="js/search.js" defer></script>
 */
(function() {
  'use strict';
  var nav = document.querySelector('.nav-inner');
  if (!nav) return;

  // 注入样式
  var style = document.createElement('style');
  style.textContent =
    '.site-search{position:relative;margin-left:auto;margin-right:8px;flex-shrink:0;}' +
    '.site-search-btn{background:none;border:1px solid var(--gray-200);border-radius:50%;width:38px;height:38px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all var(--dur);}' +
    '.site-search-btn:hover{border-color:var(--brand);background:var(--gray-50);}' +
    '.site-search-panel{position:absolute;top:46px;right:0;width:340px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow-lg);border:1px solid var(--gray-200);padding:10px;display:none;z-index:2000;}' +
    '.site-search.open .site-search-panel{display:block;}' +
    '.site-search-input{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid var(--gray-200);border-radius:var(--radius);font-size:14px;outline:none;}' +
    '.site-search-input:focus{border-color:var(--brand);}' +
    '.site-search-results{margin-top:8px;max-height:380px;overflow-y:auto;}' +
    '.site-search-item{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;border-radius:var(--radius-sm);text-decoration:none;color:var(--gray-800);font-size:13px;}' +
    '.site-search-item:hover{background:var(--gray-50);}' +
    '.site-search-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.site-search-type{font-size:11px;color:var(--brand);background:rgba(26,115,232,0.1);padding:2px 7px;border-radius:var(--radius-full);flex-shrink:0;}' +
    '.site-search-empty{padding:18px;text-align:center;color:var(--text-muted);font-size:13px;}' +
    '@media(max-width:768px){.site-search-panel{position:fixed;top:60px;left:12px;right:12px;width:auto;}}';
  document.head.appendChild(style);

  // 注入搜索框
  var wrap = document.createElement('div');
  wrap.className = 'site-search';
  wrap.innerHTML =
    '<button class="site-search-btn" aria-label="站内搜索" title="搜索">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
    '</button>' +
    '<div class="site-search-panel">' +
      '<input type="text" class="site-search-input" placeholder="搜索景点、攻略、博客…" autocomplete="off">' +
      '<div class="site-search-results"></div>' +
    '</div>';

  var cta = nav.querySelector('.nav-cta');
  if (cta) nav.insertBefore(wrap, cta);
  else nav.appendChild(wrap);

  var btn = wrap.querySelector('.site-search-btn');
  var input = wrap.querySelector('.site-search-input');
  var results = wrap.querySelector('.site-search-results');

  // 景点数据（动态加载）
  var spots = [];
  fetch('/data/attractions.json').then(function(r) { return r.json(); }).then(function(d) {
    spots = (d.spots || []).map(function(s) { return { title: s.name, url: '/attraction/' + s.id, type: '景点' }; });
  }).catch(function() {});

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function doSearch() {
    var kw = input.value.trim().toLowerCase();
    if (!kw) { results.innerHTML = ''; return; }
    var all = (window.SEARCH_INDEX || []).concat(spots);
    var matched = all.filter(function(it) { return it.title.toLowerCase().indexOf(kw) >= 0; }).slice(0, 10);
    if (!matched.length) {
      results.innerHTML = '<div class="site-search-empty">没有找到「' + esc(input.value.trim()) + '」</div>';
      return;
    }
    var html = '';
    matched.forEach(function(it) {
      html += '<a class="site-search-item" href="' + it.url + '">' +
        '<span class="site-search-title">' + esc(it.title) + '</span>' +
        '<span class="site-search-type">' + it.type + '</span>' +
      '</a>';
    });
    results.innerHTML = html;
  }

  btn.addEventListener('click', function() {
    wrap.classList.toggle('open');
    if (wrap.classList.contains('open')) { input.focus(); if (input.value) doSearch(); }
  });

  input.addEventListener('input', doSearch);

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var first = results.querySelector('.site-search-item');
      if (first) location.href = first.getAttribute('href');
    }
  });

  document.addEventListener('click', function(e) {
    if (!wrap.contains(e.target)) wrap.classList.remove('open');
  });
})();
