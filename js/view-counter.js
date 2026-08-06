// 博客阅读量统计前端逻辑
// 功能：1) 文章页自动+1并显示  2) 列表页批量显示
// 防重复：同一浏览器30分钟内重复访问不重复计数

(function () {
  'use strict';

  // 从URL提取文章slug（支持 /blog/xxx 和 /blog/xxx.html 两种格式）
  function getSlug() {
    var path = window.location.pathname;
    var match = path.match(/\/blog\/([^\/\?]+)/);
    if (!match) return null;
    var slug = match[1];
    // 去掉 .html 后缀
    slug = slug.replace(/\.html$/, '');
    return slug;
  }

  // 格式化阅读量（1234 → 1.2k）
  function formatCount(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  // 判断是否在文章页
  function isArticlePage() {
    return !!getSlug();
  }

  // 判断是否在博客列表页
  function isListPage() {
    return /\/blog\/?$/.test(window.location.pathname) ||
           /\/blog\/index\.html$/.test(window.location.pathname) ||
           window.location.pathname === '/blog';
  }

  // 防重复：检查30分钟内是否已计数
  function shouldCount(slug) {
    var key = 'view_counted_' + slug;
    var last = localStorage.getItem(key);
    var now = Date.now();
    if (last && (now - parseInt(last, 10)) < 30 * 60 * 1000) {
      return false; // 30分钟内已计数
    }
    localStorage.setItem(key, now.toString());
    return true;
  }

  // 文章页：+1并显示
  function incrementAndDisplay() {
    var slug = getSlug();
    if (!slug) return;

    var displayEl = document.querySelector('[data-view-count]');
    var shouldInc = shouldCount(slug);

    // 先显示加载中
    if (displayEl) {
      displayEl.textContent = '...';
    }

    var url = '/api/view-counter?slug=' + encodeURIComponent(slug);

    if (shouldInc) {
      // POST +1
      fetch(url, { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (displayEl) {
            displayEl.textContent = formatCount(data.count || 0);
            displayEl.setAttribute('data-loaded', '1');
          }
        })
        .catch(function () {
          if (displayEl) displayEl.textContent = '0';
        });
    } else {
      // GET 只读
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (displayEl) {
            displayEl.textContent = formatCount(data.count || 0);
            displayEl.setAttribute('data-loaded', '1');
          }
        })
        .catch(function () {
          if (displayEl) displayEl.textContent = '0';
        });
    }
  }

  // 列表页：批量查询并显示
  function batchDisplay() {
    var cards = document.querySelectorAll('[data-blog-slug]');
    if (!cards.length) return;

    fetch('/api/view-counter?list=1')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var counts = data.counts || {};
        cards.forEach(function (card) {
          var slug = card.getAttribute('data-blog-slug');
          var count = counts[slug] || 0;
          var el = card.querySelector('[data-view-count]');
          if (el) {
            el.textContent = formatCount(count);
            el.setAttribute('data-loaded', '1');
          }
        });
      })
      .catch(function () {
        cards.forEach(function (card) {
          var el = card.querySelector('[data-view-count]');
          if (el) el.textContent = '0';
        });
      });
  }

  // 页面加载后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (isArticlePage()) incrementAndDisplay();
      else if (isListPage()) batchDisplay();
    });
  } else {
    if (isArticlePage()) incrementAndDisplay();
    else if (isListPage()) batchDisplay();
  }
})();
