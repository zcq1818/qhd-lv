/**
 * 浮动「加入旅行群」按钮组件
 * 给 #communityFloat 绑定点击 → 弹出二维码弹窗（无则动态创建），并上报埋点
 * 用法：在含 #communityFloat 的页面引入 <script src="js/community-float.js" defer></script>
 */
(function () {
  'use strict';
  var btn = document.getElementById('communityFloat');
  if (!btn) return;

  function track(action, label) {
    try {
      if (typeof gtag === 'function') {
        gtag('event', action, { event_category: '粉丝沉淀', event_label: label || '' });
      }
    } catch (e) {}
    try {
      if (window._hmt && typeof window._hmt.push === 'function') {
        window._hmt.push(['_trackEvent', '粉丝沉淀', action, label || '']);
      }
    } catch (e) {}
  }

  function ensureLightbox() {
    var lb = document.getElementById('qrLightbox');
    if (lb) return lb;

    var style = document.createElement('style');
    style.textContent =
      '.qr-lightbox{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.72);align-items:center;justify-content:center;padding:24px;}' +
      '.qr-lightbox.show{display:flex;}' +
      '.qr-lightbox-inner{background:#fff;border-radius:16px;padding:24px;text-align:center;max-width:320px;width:100%;}' +
      '.qr-lightbox-inner img{width:100%;max-width:280px;height:auto;border-radius:8px;}';
    document.head.appendChild(style);

    var div = document.createElement('div');
    div.id = 'qrLightbox';
    div.className = 'qr-lightbox';
    div.innerHTML = '<div class="qr-lightbox-inner">' +
      '<img src="images/wechat-qr.jpg" alt="秦皇岛旅行交流群二维码">' +
      '<div style="margin-top:12px;font-size:15px;font-weight:700;color:#00695c;">长按识别二维码加入群聊</div>' +
      '<button class="qr-close" style="margin-top:12px;padding:8px 24px;border:none;border-radius:999px;background:#00695c;color:#fff;font-size:14px;cursor:pointer;font-family:inherit;">关闭</button>' +
      '</div>';
    document.body.appendChild(div);

    div.addEventListener('click', function (e) {
      if (e.target === div) div.classList.remove('show');
    });
    div.querySelector('.qr-close').addEventListener('click', function () {
      div.classList.remove('show');
    });
    return div;
  }

  var lb = ensureLightbox();
  btn.addEventListener('click', function () {
    lb.classList.add('show');
    track('join_group_click', location.pathname);
  });
})();
