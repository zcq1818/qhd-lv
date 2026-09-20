/* 骨架屏加载（全站通用）：顶部进度条 + 图片 shimmer 骨架 */
(function () {
  'use strict';
  if (window.__qhdSkeleton) return;
  window.__qhdSkeleton = true;

  var d = document;

  function ready(fn) {
    if (d.readyState === 'loading') {
      d.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  // 1. 顶部加载进度条
  function initBar() {
    var bar = d.createElement('div');
    bar.className = 'qhd-loadbar';
    (d.body || d.documentElement).appendChild(bar);

    var progress = 0;
    var done = false;
    var timer = setInterval(function () {
      if (done) return;
      progress += Math.random() * 18 + 6;
      if (progress >= 90) {
        progress = 90;
        clearInterval(timer);
      }
      bar.style.width = progress + '%';
    }, 160);

    function finish() {
      if (done) return;
      done = true;
      clearInterval(timer);
      bar.style.width = '100%';
      setTimeout(function () {
        bar.classList.add('qhd-loadbar-done');
        setTimeout(function () {
          if (bar.parentNode) bar.parentNode.removeChild(bar);
        }, 450);
      }, 180);
    }

    window.addEventListener('load', finish);
    setTimeout(finish, 3500); // 兜底：避免 load 迟迟不触发
  }

  // 2. 图片 shimmer 骨架
  function initImages() {
    var imgs = d.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        // 跳过显式声明不需要骨架的图片
        if (img.getAttribute('data-no-skeleton') !== null) return;
        img.classList.add('qhd-skel-img');
        function loaded() {
          img.classList.add('qhd-img-loaded');
        }
        if (img.complete) {
          loaded();
        } else {
          img.addEventListener('load', loaded);
          img.addEventListener('error', loaded);
        }
      })(imgs[i]);
    }
  }

  ready(function () {
    initBar();
    initImages();
  });
})();
