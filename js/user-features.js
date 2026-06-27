/**
 * 用户互动组件 — 收藏 + 评价（localStorage 本地版）
 * 自执行 IIFE
 *
 * 用法：
 *   1. 在景点卡片上添加 data-spot-id / data-spot-name 属性
 *   2. 组件自动注入「收藏」按钮和「评价」区域
 *   3. 收藏列表在导航栏「我的收藏」入口查看
 */
(function () {
  'use strict';

  var STORAGE_FAV = 'qhd_favorites';
  var STORAGE_REV = 'qhd_reviews';

  var dom = {};

  // ============ 工具函数 ============

  function getJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }

  function setJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // ============ 收藏功能 ============

  function getFavorites() { return getJSON(STORAGE_FAV, []); }
  function isFavorited(spotId) { return getFavorites().indexOf(spotId) >= 0; }

  function toggleFavorite(spotId, spotName) {
    var favs = getFavorites();
    var idx = favs.indexOf(spotId);
    if (idx >= 0) {
      favs.splice(idx, 1);
      setJSON(STORAGE_FAV, favs);
      return false;
    } else {
      favs.push(spotId);
      setJSON(STORAGE_FAV, favs);
      // 同时存名称映射
      var nameMap = getJSON('qhd_fav_names', {});
      nameMap[spotId] = spotName;
      setJSON('qhd_fav_names', nameMap);
      return true;
    }
  }

  function injectFavButtons() {
    // 查找所有带 data-spot-id 的景点卡片
    var cards = document.querySelectorAll('[data-spot-id]');
    cards.forEach(function (card) {
      if (card.querySelector('.qhd-fav-btn')) return; // 避免重复注入
      var spotId = card.getAttribute('data-spot-id');
      var spotName = card.getAttribute('data-spot-name') || card.querySelector('.spot-name, .card-title, h3, h4') ?
        (card.querySelector('.spot-name') || card.querySelector('.card-title') || card.querySelector('h3') || card.querySelector('h4')).textContent.trim() : spotId;

      var btn = document.createElement('button');
      btn.className = 'qhd-fav-btn' + (isFavorited(spotId) ? ' favorited' : '');
      btn.setAttribute('data-fav-spot', spotId);
      btn.setAttribute('aria-label', '收藏');
      btn.innerHTML =
        '<svg class="qhd-fav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>' +
        '</svg>';
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var fav = toggleFavorite(spotId, spotName);
        btn.classList.toggle('favorited', fav);
        flashToast(fav ? '已收藏「' + spotName + '」' : '已取消收藏');
        updateFavCount();
      });
      card.style.position = card.style.position || 'relative';
      card.appendChild(btn);
    });
    updateFavCount();
  }

  function updateFavCount() {
    var count = getFavorites().length;
    var badges = document.querySelectorAll('.qhd-fav-count');
    badges.forEach(function (b) {
      b.textContent = count > 0 ? count : '';
      b.style.display = count > 0 ? '' : 'none';
    });
  }

  // ============ 评价功能 ============

  function getReviews(spotId) {
    var all = getJSON(STORAGE_REV, {});
    return all[spotId] || [];
  }

  function addReview(spotId, review) {
    var all = getJSON(STORAGE_REV, {});
    if (!all[spotId]) all[spotId] = [];
    review.id = Date.now();
    review.date = new Date().toISOString().slice(0, 10);
    all[spotId].unshift(review);
    setJSON(STORAGE_REV, all);
    return review;
  }

  function getAvgRating(spotId) {
    var reviews = getReviews(spotId);
    if (!reviews.length) return { avg: 0, count: 0 };
    var sum = reviews.reduce(function (s, r) { return s + (r.rating || 0); }, 0);
    return { avg: (sum / reviews.length).toFixed(1), count: reviews.length };
  }

  function injectReviewSection(container, spotId, spotName) {
    if (!container || container.querySelector('.qhd-review-section')) return;

    var section = document.createElement('div');
    section.className = 'qhd-review-section';
    section.setAttribute('data-review-spot', spotId);

    var ratingInfo = getAvgRating(spotId);
    var reviews = getReviews(spotId);

    section.innerHTML =
      '<h4 class="qhd-review-title">游客评价 <span class="qhd-review-count">(' + ratingInfo.count + '条)</span></h4>' +
      (ratingInfo.count > 0 ?
        '<div class="qhd-review-summary">' +
          '<span class="qhd-review-stars">' + renderStars(ratingInfo.avg) + '</span>' +
          '<span class="qhd-review-avg">' + ratingInfo.avg + '</span>' +
        '</div>' : '') +
      '<div class="qhd-review-form">' +
        '<div class="qhd-review-stars-input">' +
          '<span class="qhd-review-label">我的评分：</span>' +
          renderStarInput() +
        '</div>' +
        '<textarea class="qhd-review-text" placeholder="分享你的游玩体验，帮助其他游客…" rows="3"></textarea>' +
        '<div class="qhd-review-form-bottom">' +
          '<input class="qhd-review-name" type="text" placeholder="昵称（选填）" maxlength="20" />' +
          '<button class="qhd-review-submit">发表评价</button>' +
        '</div>' +
      '</div>' +
      '<div class="qhd-review-list">' + renderReviewList(reviews) + '</div>';

    container.appendChild(section);

    // 绑定事件
    var starsInput = section.querySelectorAll('.qhd-star-input');
    var currentRating = 0;
    starsInput.forEach(function (star) {
      star.addEventListener('click', function () {
        currentRating = parseInt(star.getAttribute('data-rating'));
        starsInput.forEach(function (s, i) {
          s.classList.toggle('active', i < currentRating);
        });
      });
    });

    section.querySelector('.qhd-review-submit').addEventListener('click', function () {
      var text = section.querySelector('.qhd-review-text').value.trim();
      var name = section.querySelector('.qhd-review-name').value.trim() || '匿名游客';
      if (currentRating === 0) { flashToast('请先选择评分'); return; }
      if (!text) { flashToast('请输入评价内容'); return; }

      addReview(spotId, { rating: currentRating, text: text, name: name });

      // 重新渲染
      var newRating = getAvgRating(spotId);
      var newReviews = getReviews(spotId);
      section.querySelector('.qhd-review-count').textContent = '(' + newRating.count + '条)';
      var summary = section.querySelector('.qhd-review-summary');
      if (summary) {
        summary.querySelector('.qhd-review-stars').innerHTML = renderStars(newRating.avg);
        summary.querySelector('.qhd-review-avg').textContent = newRating.avg;
      } else {
        var s = document.createElement('div');
        s.className = 'qhd-review-summary';
        s.innerHTML = '<span class="qhd-review-stars">' + renderStars(newRating.avg) + '</span><span class="qhd-review-avg">' + newRating.avg + '</span>';
        section.querySelector('.qhd-review-title').insertAdjacentElement('afterend', s);
      }
      section.querySelector('.qhd-review-list').innerHTML = renderReviewList(newReviews);
      section.querySelector('.qhd-review-text').value = '';
      section.querySelector('.qhd-review-name').value = '';
      starsInput.forEach(function (s) { s.classList.remove('active'); });
      currentRating = 0;
      flashToast('评价发表成功！');
    });
  }

  function renderStars(rating) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      html += '<svg class="qhd-star ' + (i <= Math.round(rating) ? 'filled' : '') + '" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    return html;
  }

  function renderStarInput() {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      html += '<svg class="qhd-star qhd-star-input" data-rating="' + i + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    return html;
  }

  function renderReviewList(reviews) {
    if (!reviews.length) return '<p class="qhd-review-empty">还没有评价，快来发表第一条吧！</p>';
    return reviews.map(function (r) {
      return '<div class="qhd-review-item">' +
        '<div class="qhd-review-item-header">' +
          '<span class="qhd-review-item-name">' + escapeHtml(r.name) + '</span>' +
          '<span class="qhd-review-item-stars">' + renderStars(r.rating) + '</span>' +
          '<span class="qhd-review-item-date">' + r.date + '</span>' +
        '</div>' +
        '<p class="qhd-review-item-text">' + escapeHtml(r.text) + '</p>' +
      '</div>';
    }).join('');
  }

  // ============ 收藏列表页面渲染 ============

  function renderFavoritesPage() {
    var container = document.querySelector('#favoritesList');
    if (!container) return;

    var favIds = getFavorites();
    var nameMap = getJSON('qhd_fav_names', {});

    if (!favIds.length) {
      container.innerHTML =
        '<div class="qhd-fav-empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' +
          '<p>还没有收藏任何景点</p>' +
          '<a href="attractions.html" class="qhd-fav-go">去逛逛景点 →</a>' +
        '</div>';
      return;
    }

    // 尝试从 attractions.json 获取详细信息
    fetch('data/attractions.json', { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : { spots: [] }; })
      .catch(function () { return { spots: [] }; })
      .then(function (data) {
        var spotsMap = {};
        (data.spots || []).forEach(function (s) { spotsMap[s.id] = s; });

        container.innerHTML = '<div class="qhd-fav-grid">' + favIds.map(function (id) {
          var spot = spotsMap[id];
          var name = spot ? spot.name : (nameMap[id] || id);
          var desc = spot ? spot.desc : '点击查看详情';
          var url = 'attractions.html#' + id + '-spot';
          var img = spot && spot.img ? spot.img : '';
          var area = spot ? spot.area : '';
          return '<a class="qhd-fav-card" href="' + url + '">' +
            (img ? '<div class="qhd-fav-card-img" style="background-image:url(' + img + ')"></div>' :
                   '<div class="qhd-fav-card-img qhd-fav-card-placeholder"><span>' + name.charAt(0) + '</span></div>') +
            '<div class="qhd-fav-card-body">' +
              '<h4>' + escapeHtml(name) + '</h4>' +
              (area ? '<span class="qhd-fav-card-area">' + escapeHtml(area) + '</span>' : '') +
              '<p>' + escapeHtml(desc) + '</p>' +
            '</div>' +
            '<button class="qhd-fav-remove" data-remove-id="' + id + '" aria-label="取消收藏">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
          '</a>';
        }).join('') + '</div>';

        // 绑定取消收藏
        container.querySelectorAll('[data-remove-id]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            var id = btn.getAttribute('data-remove-id');
            toggleFavorite(id, nameMap[id] || id);
            renderFavoritesPage();
            updateFavCount();
            flashToast('已取消收藏');
          });
        });
      });
  }

  // ============ Toast ============

  function flashToast(msg) {
    var existing = document.querySelector('.qhd-user-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'qhd-user-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 300);
    }, 2000);
  }

  // ============ 暴露 API（供外部页面调用） ============

  window.QHDUser = {
    injectFavButtons: injectFavButtons,
    injectReviewSection: injectReviewSection,
    renderFavoritesPage: renderFavoritesPage,
    getFavorites: getFavorites,
    getReviews: getReviews,
    getAvgRating: getAvgRating,
    flashToast: flashToast
  };

  // ============ 自动初始化 ============

  function init() {
    // 注入收藏按钮
    injectFavButtons();
    // 如果是收藏页面，渲染列表
    renderFavoritesPage();
    // 如果景点详情区域有 data-review-container，注入评价
    document.querySelectorAll('[data-review-container]').forEach(function (el) {
      var spotId = el.getAttribute('data-review-container');
      var spotName = el.getAttribute('data-review-name') || '';
      injectReviewSection(el, spotId, spotName);
    });
    // 注入最后更新时间到页脚
    injectLastUpdated();
  }

  // ============ 信任度建设：自动注入最后更新时间 ============

  function injectLastUpdated() {
    var footer = document.querySelector('.footer-bottom');
    if (!footer || footer.querySelector('.qhd-last-updated')) return;
    var now = new Date();
    var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月';
    var span = document.createElement('span');
    span.className = 'qhd-last-updated';
    span.textContent = '最后更新：' + dateStr;
    span.style.fontSize = '0.78rem';
    span.style.opacity = '0.6';
    footer.appendChild(span);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 动态加载的景点卡片也需要注入收藏按钮（MutationObserver）
  var observer = new MutationObserver(function () {
    injectFavButtons();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
