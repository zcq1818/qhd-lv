/**
 * 博客「相关阅读」组件
 * 读取 data/blog-index.json，按关键词 IDF 加权匹配相关博客，注入文章底部内链
 * 用法：博客页引入 <script src="../js/blog-related.js" defer></script>
 */
(function () {
  'use strict';
  var m = location.pathname.match(/\/blog\/([^/]+?)(?:\.html)?$/);
  if (!m) return;
  var slug = decodeURIComponent(m[1]);

  var wrap = document.querySelector('.article-wrap');
  if (!wrap) return;

  fetch('/data/blog-index.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(function (data) {
      var posts = (data && data.posts) || [];
      if (!posts.length) return;

      var cur = null, others = [];
      for (var i = 0; i < posts.length; i++) {
        if (posts[i].slug === slug) cur = posts[i];
        else others.push(posts[i]);
      }

      var top;
      if (cur && (cur.kw || []).length) {
        // IDF 加权：高频泛词权重低，低频主题词权重高
        var N = posts.length;
        var df = {};
        posts.forEach(function (p) {
          (p.kw || []).forEach(function (k) {
            if (!df[k]) df[k] = {};
            df[k][p.slug] = 1;
          });
        });
        var idf = {};
        Object.keys(df).forEach(function (k) {
          var cnt = Object.keys(df[k]).length;
          idf[k] = Math.log((N + 1) / (cnt + 1)) + 1;
        });

        var curKw = cur.kw;
        var scored = others.map(function (p) {
          var kw = p.kw || [];
          var score = 0;
          for (var j = 0; j < curKw.length; j++) {
            if (kw.indexOf(curKw[j]) >= 0) score += idf[curKw[j]] || 0;
          }
          return { p: p, score: score };
        }).filter(function (x) { return x.score > 0; })
          .sort(function (a, b) { return b.score - a.score; });

        top = scored.slice(0, 4).map(function (x) { return x.p; });
      } else {
        top = [];
      }

      // 相关不足时补足到 4 篇
      if (top.length < 4) {
        for (var k = 0; k < others.length && top.length < 4; k++) {
          if (top.indexOf(others[k]) < 0) top.push(others[k]);
        }
      }
      if (!top.length) return;
      inject(top);
    });

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inject(list) {
    if (wrap.querySelector('.br-section')) return;

    var style = document.createElement('style');
    style.textContent =
      '.br-section{margin-top:34px;padding-top:22px;border-top:1px solid var(--gray-200);}' +
      '.br-section h2{font-size:1.1rem;font-weight:800;margin:0 0 14px;color:var(--gray-900);}' +
      '.br-list{display:flex;flex-direction:column;gap:10px;}' +
      '.br-item{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f8fafc;border:1px solid var(--gray-100);border-radius:var(--radius);text-decoration:none;color:var(--gray-800);transition:all var(--dur);}' +
      '.br-item:hover{border-color:var(--brand);background:#fff;box-shadow:var(--shadow-sm);}' +
      '.br-item-num{font-size:12px;font-weight:800;color:var(--brand);background:rgba(26,115,232,0.1);min-width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '.br-item-title{flex:1;font-size:14px;font-weight:600;line-height:1.4;}' +
      '.br-item-arrow{color:var(--brand);font-weight:700;flex-shrink:0;}';
    document.head.appendChild(style);

    var section = document.createElement('div');
    section.className = 'br-section';
    section.innerHTML = '<h2>📖 相关阅读</h2><div class="br-list">' +
      list.map(function (p, i) {
        return '<a class="br-item" href="/blog/' + encodeURIComponent(p.slug) + '">' +
          '<span class="br-item-num">' + (i + 1) + '</span>' +
          '<span class="br-item-title">' + esc(p.title) + '</span>' +
          '<span class="br-item-arrow">→</span>' +
          '</a>';
      }).join('') +
      '</div>';

    var footer = wrap.querySelector('.article-footer');
    if (footer) wrap.insertBefore(section, footer);
    else wrap.appendChild(section);
  }
})();
