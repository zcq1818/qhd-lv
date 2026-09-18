/**
 * 转化埋点：OTA 预订按钮点击 + 入群入口点击
 * 同时上报 Google Analytics(gtag) 与百度统计(_hmt)
 * 用法：在含 OTA 按钮 / 入群入口的页面引入 <script src="js/conversion-track.js" defer></script>
 */
(function () {
  'use strict';

  function track(category, action, label) {
    try {
      if (typeof gtag === 'function') {
        gtag('event', action, {
          event_category: category,
          event_label: label || ''
        });
      }
    } catch (e) {}
    try {
      if (window._hmt && typeof window._hmt.push === 'function') {
        window._hmt.push(['_trackEvent', category, action, label || '']);
      }
    } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var el = e.target;

    // 向上查找最近的 <a> 或 <button>
    var node = el;
    while (node && node !== document && node.nodeType === 1) {
      if (node.tagName === 'A' || node.tagName === 'BUTTON') break;
      node = node.parentNode;
    }
    if (!node || node.nodeType !== 1) return;

    var cls = (node.className && node.className.baseVal !== undefined)
      ? node.className.baseVal : (node.className || '');
    cls = String(cls);
    var href = node.getAttribute && node.getAttribute('href') || '';
    var onclick = node.getAttribute && node.getAttribute('onclick') || '';

    // 1) OTA 预订按钮点击
    if (cls.indexOf('booking-btn') >= 0) {
      var platform = 'other';
      if (cls.indexOf('meituan') >= 0) platform = 'meituan';
      else if (cls.indexOf('ctrip') >= 0) platform = 'ctrip';
      else if (cls.indexOf('tongcheng') >= 0) platform = 'tongcheng';
      else if (cls.indexOf('qunar') >= 0) platform = 'qunar';
      else if (cls.indexOf('fliggy') >= 0) platform = 'fliggy';
      track('OTA预订', 'ota_click_' + platform, location.pathname);
      return;
    }

    // 2) 入群 / 二维码入口点击
    if (onclick.indexOf('showQr') >= 0 || href.indexOf('wechat-qr') >= 0) {
      track('粉丝沉淀', 'join_group_click', location.pathname);
      return;
    }
  });
})();
