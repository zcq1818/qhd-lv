/**
 * 社交分享组件 — 微信/微博/复制链接/生成分享卡片
 * 自执行 IIFE，自动在页面插入浮动分享栏
 */
(function () {
  'use strict';

  var dom = {};

  function init() {
    if (document.querySelector('.qhd-share-bar')) return;
    buildDOM();
    cacheDom();
    bindEvents();
  }

  function buildDOM() {
    var bar = document.createElement('div');
    bar.className = 'qhd-share-bar';
    bar.innerHTML =
      '<button class="qhd-share-toggle" aria-label="分享">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
      '</button>' +
      '<div class="qhd-share-panel">' +
        '<button class="qhd-share-btn" data-platform="wechat" title="微信分享">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8.5 4C4.36 4 1 6.69 1 10c0 1.89 1.08 3.56 2.78 4.66L3 17l2.5-1.5c.96.27 1.96.42 3 .42.26 0 .51-.01.77-.03C9.05 15.36 9 15.43 9 15.5c0 2.76 2.91 5 6.5 5 .83 0 1.62-.13 2.36-.36L20 21l-.7-2.2C20.94 17.96 22 16.32 22 14.5c0-2.76-2.91-5-6.5-5-3.59 0-6.5 2.24-6.5 5 0 .07-.05.14-.05.21L8.5 14c-1.05 0-2.05-.15-3-.42L3 15l.78-2.34C2.08 11.56 1 9.89 1 8c0-3.31 3.36-6 7.5-6 4.14 0 7.5 2.69 7.5 6 0 .17-.02.33-.04.5H14c0-2.21-2.46-4-5.5-4z"/></svg>' +
          '<span>微信</span>' +
        '</button>' +
        '<button class="qhd-share-btn" data-platform="weibo" title="微博分享">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10.1 13.4c-3.4 0-6.1 2.1-6.1 4.7 0 2.6 2.7 4.7 6.1 4.7s6.1-2.1 6.1-4.7c0-2.6-2.7-4.7-6.1-4.7zm-1.8 5.6c-.7.1-1.4-.3-1.5-.9-.1-.6.4-1.2 1.1-1.3.7-.1 1.4.3 1.5.9.1.6-.4 1.2-1.1 1.3zm1.9-2.2c-.2.3-.7.5-1 .3-.3-.2-.4-.6-.2-.9.2-.3.6-.4.9-.3.3.2.4.6.3.9zm.4-2.7c-1.6-.4-3.4.4-4 1.8-.7 1.4-.1 2.9 1.4 3.4 1.6.5 3.5-.3 4.1-1.8.6-1.4-.1-2.9-1.5-3.4z"/><path d="M20.5 10.4c-.3-1-.9-1.6-1.7-1.8-.3-.1-.5 0-.6.3-.1.3 0 .5.3.6.5.2.8.5 1 1 .1.3.4.4.6.3.3-.1.4-.3.4-.4zM18.3 5.1c-2.1-.6-4.3.2-5.5 1.9-.2.3-.1.6.1.7.3.2.5.1.7-.2 1-1.4 2.7-2 4.4-1.5.3.1.5-.1.6-.3.1-.3 0-.5-.3-.6z"/><path d="M21.7 3.8c-1.1-1-2.5-1.4-3.9-1.1-.4.1-.6.4-.5.7.1.3.4.5.7.4 1-.2 2 .1 2.8.8 1.6 1.5 1.7 3.9.3 5.5-.2.2-.2.5 0 .7.2.2.5.2.7 0 1.8-2 1.7-5.1-.1-7z"/></svg>' +
          '<span>微博</span>' +
        '</button>' +
        '<button class="qhd-share-btn" data-platform="copy" title="复制链接">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
          '<span>复制链接</span>' +
        '</button>' +
        '<button class="qhd-share-btn" data-platform="card" title="生成分享卡片">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>' +
          '<span>分享卡片</span>' +
        '</button>' +
      '</div>';

    // 微信二维码弹窗
    var qrModal = document.createElement('div');
    qrModal.className = 'qhd-share-qr-overlay';
    qrModal.innerHTML =
      '<div class="qhd-share-qr-modal">' +
        '<button class="qhd-share-qr-close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '<h3>微信扫一扫分享</h3>' +
        '<div class="qhd-share-qr-img" id="qhdShareQr"></div>' +
        '<p>打开微信扫一扫，分享给好友</p>' +
      '</div>';

    document.body.appendChild(bar);
    document.body.appendChild(qrModal);
  }

  function cacheDom() {
    dom.bar = document.querySelector('.qhd-share-bar');
    dom.toggle = dom.bar.querySelector('.qhd-share-toggle');
    dom.panel = dom.bar.querySelector('.qhd-share-panel');
    dom.qrOverlay = document.querySelector('.qhd-share-qr-overlay');
    dom.qrClose = dom.qrOverlay.querySelector('.qhd-share-qr-close');
    dom.qrImg = dom.qrOverlay.querySelector('#qhdShareQr');
  }

  function bindEvents() {
    dom.toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      dom.bar.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (!dom.bar.contains(e.target)) dom.bar.classList.remove('open');
    });

    dom.panel.addEventListener('click', function (e) {
      var btn = e.target.closest('.qhd-share-btn');
      if (!btn) return;
      var platform = btn.getAttribute('data-platform');
      handleShare(platform);
      dom.bar.classList.remove('open');
    });

    dom.qrClose.addEventListener('click', function () {
      dom.qrOverlay.classList.remove('open');
    });
    dom.qrOverlay.addEventListener('click', function (e) {
      if (e.target === dom.qrOverlay) dom.qrOverlay.classList.remove('open');
    });
  }

  function getPageInfo() {
    return {
      url: window.location.href,
      title: document.title.split('—')[0].trim() || '秦皇岛旅游官网',
      desc: document.querySelector('meta[name="description"]') ?
            document.querySelector('meta[name="description"]').getAttribute('content') : ''
    };
  }

  function handleShare(platform) {
    var info = getPageInfo();
    switch (platform) {
      case 'wechat':
        showQRCode(info.url);
        break;
      case 'weibo':
        window.open(
          'https://service.weibo.com/share/share.php?url=' + encodeURIComponent(info.url) +
          '&title=' + encodeURIComponent(info.title + ' - ' + info.desc),
          '_blank', 'width=600,height=500'
        );
        break;
      case 'copy':
        copyLink(info.url);
        break;
      case 'card':
        generateCard(info);
        break;
    }
  }

  function showQRCode(url) {
    // 使用第三方 QR 码生成 API（无需后端）
    var qrApi = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
    dom.qrImg.innerHTML = '<img src="' + qrApi + '" alt="二维码" width="200" height="200">';
    dom.qrOverlay.classList.add('open');
  }

  function copyLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(flashToast).catch(function () { fallbackCopy(url); });
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); flashToast(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function flashToast() {
    var toast = document.createElement('div');
    toast.className = 'qhd-share-toast';
    toast.textContent = '链接已复制，快去分享吧！';
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { document.body.removeChild(toast); }, 300);
    }, 2000);
  }

  function generateCard(info) {
    // 用 Canvas 生成分享卡片图片
    var canvas = document.createElement('canvas');
    canvas.width = 750; canvas.height = 1334;
    var ctx = canvas.getContext('2d');

    // 背景渐变
    var grad = ctx.createLinearGradient(0, 0, 0, 1334);
    grad.addColorStop(0, '#0d47a1');
    grad.addColorStop(0.5, '#1a73e8');
    grad.addColorStop(1, '#4a9af5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 750, 1334);

    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, info.title, 375, 400, 650, 52);

    // 描述
    ctx.font = '24px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    wrapText(ctx, info.desc, 375, 520, 600, 36);

    // 品牌名
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('秦皇岛旅游官网', 375, 1100);

    // 网址
    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('qhd-lv.vercel.app', 375, 1150);

    // 装饰线
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(250, 1050); ctx.lineTo(500, 1050); ctx.stroke();

    // 下载图片
    var link = document.createElement('a');
    link.download = '秦皇岛旅游分享卡片.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    flashToast();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var chars = text.split('');
    var line = '';
    var lines = [];
    for (var i = 0; i < chars.length; i++) {
      var testLine = line + chars[i];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = chars[i];
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    lines = lines.slice(0, 4); // 最多4行
    lines.forEach(function (l, i) {
      ctx.fillText(l, x, y + i * lineHeight);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
