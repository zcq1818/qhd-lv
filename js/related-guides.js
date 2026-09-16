/**
 * 景点详情页「相关攻略」组件
 * 读取 data/related-guides.json，按当前景点 id 注入攻略链接
 * 用法：详情页引入 <script src="../js/related-guides.js" defer></script>
 */
(function () {
  'use strict';
  var m = location.pathname.match(/\/attraction\/([^/]+)/);
  if (!m) return;
  var spotId = m[1].replace(/\.html?$/, '');

  fetch('/data/related-guides.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(function (data) {
      var guides = data[spotId] || [];
      if (!guides.length) return;

      var main = document.querySelector('.detail-main');
      if (!main || main.querySelector('.rg-section')) return;

      var style = document.createElement('style');
      style.textContent =
        '.rg-section{margin-top:36px;}' +
        '.rg-section h2{font-size:1.2rem;font-weight:800;margin:0 0 14px;}' +
        '.rg-list{display:flex;flex-direction:column;gap:10px;}' +
        '.rg-item{display:flex;align-items:center;gap:10px;padding:13px 16px;background:#f8fafc;border:1px solid var(--gray-100);border-radius:var(--radius);text-decoration:none;color:var(--gray-800);transition:all var(--dur);}' +
        '.rg-item:hover{border-color:var(--brand);background:#fff;box-shadow:var(--shadow-sm);}' +
        '.rg-item-icon{font-size:18px;}' +
        '.rg-item-title{flex:1;font-size:14px;font-weight:600;}' +
        '.rg-item-arrow{color:var(--brand);font-weight:700;}';
      document.head.appendChild(style);

      function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      var section = document.createElement('div');
      section.className = 'rg-section';
      section.innerHTML = '<h2>📖 相关攻略</h2><div class="rg-list">' +
        guides.map(function (g) {
          return '<a class="rg-item" href="' + g.url + '">' +
            '<span class="rg-item-icon">📝</span>' +
            '<span class="rg-item-title">' + esc(g.title) + '</span>' +
            '<span class="rg-item-arrow">→</span>' +
          '</a>';
        }).join('') +
      '</div>';
      main.appendChild(section);
    });
})();
