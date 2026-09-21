// 博客阅读量统计前端逻辑
// 功能：1) 文章页自动+1并显示  2) 列表页批量显示
// 防重复：同一浏览器30分钟内重复访问不重复计数

(function () {
  'use strict';

  // 从URL提取文章slug（支持 /blog/xxx 和 /blog/xxx.html 两种格式）
  // 统计范围从「只有博客」扩到全站:博客、景点页、英文景点页与主要栏目页,
  // 都用一个可读的 slug 作为键,后台按这个排热度。
  function getSlug() {
    var path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    if (!path) return 'home';

    var m = path.match(/\/blog\/([^\/\?]+)/);
    if (m) return m[1];

    m = path.match(/\/en\/attraction\/([^\/\?]+)/);
    if (m) return 'en-spot-' + m[1];

    m = path.match(/\/attraction\/([^\/\?]+)/);
    if (m) return 'spot-' + m[1];

    m = path.match(/\/en\/([^\/\?]+)/);
    if (m) return 'en-' + m[1];

    // 根目录栏目页:只统计有价值的几类,后台页与 404 不计
    var name = path.replace(/^\//, '');
    if (!name || name.indexOf('/') >= 0) return null;
    if (/^(admin|404|favorites)$/.test(name)) return null;
    return 'page-' + name;
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

  /* ========== 转化动作统计 ==========
     光知道「多少人看了这一页」不够用,还得知道有多少人真的走到了
     加微信那一步。这里记三件事,都复用同一个接口,slug 带 event- 前缀:
       event-qr-view   二维码真正滚动到视野里(不是页面一打开就算)
       event-qr-tap    二维码被点/长按
       event-form-view 咨询表单滚进视野
     同一次会话每种只记一次,避免来回滚动把数字刷上去。 */
  function trackOnce(name) {
    var key = 'ev_' + name;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (e) { /* 无痕模式下 sessionStorage 可能不可用,记一次也无妨 */ }
    fetch('/api/view-counter?slug=' + encodeURIComponent('event-' + name), { method: 'POST' })
      .catch(function () { /* 统计失败不影响页面 */ });
  }

  function watch(el, name) {
    if (!el) return;
    if (!window.IntersectionObserver) { trackOnce(name); return; }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          trackOnce(name);
          io.disconnect();
          return;
        }
      }
    }, { threshold: 0.5 });
    io.observe(el);
  }

  function trackConversions() {
    var qr = document.querySelector('img[src*="wechat-qr"]');
    if (qr) {
      watch(qr, 'qr-view');
      var target = qr.closest('.contact-qr') || qr;
      target.addEventListener('click', function () { trackOnce('qr-tap'); });
    }
    // 咨询卡片是 JS 渲染的,等它出现再观察
    var form = document.querySelector('[data-lead-form]');
    if (form) watch(form, 'form-view');
  }

  // 页面加载后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (isArticlePage()) incrementAndDisplay();
      else if (isListPage()) batchDisplay();
      trackConversions();
    });
  } else {
    if (isArticlePage()) incrementAndDisplay();
    else if (isListPage()) batchDisplay();
    trackConversions();
  }
})();
