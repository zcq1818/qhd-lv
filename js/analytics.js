/* ============================================================
   统计脚本(全站统一)
   ------------------------------------------------------------
   原先每个页面里都内嵌着 Google 和百度两段代码,而且覆盖不一致:
   Google 在 156 个页面上,百度只有 61 个 —— 这站是冲百度搜索做的,
   关键词数据只覆盖两成页面,等于最该看的那份数据基本是瞎的。

   现在统一成这一个文件,页面只留一行引用。换 ID、加事件都只改这里。

   注意:dataLayer 与 gtag 必须在加载 GTM 之前就定义好。
   其他脚本(咨询表单、转化埋点)里写的是 if (window.gtag) gtag(...),
   只要函数在,调用就会先进 dataLayer 排队,等 GTM 到位再统一处理,
   不会丢事件。
   ============================================================ */
(function () {
  'use strict';

  var GA_ID = 'G-QNGJC2KRK0';
  var BAIDU_ID = '7b1ee61e8afe12d737233bf307fc7648';

  /* ---------- Google Analytics ---------- */
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }
  gtag('js', new Date());
  gtag('config', GA_ID);

  var ga = document.createElement('script');
  ga.async = true;
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(ga);

  /* ---------- 百度统计 ---------- */
  window._hmt = window._hmt || [];
  var hm = document.createElement('script');
  hm.async = true;
  hm.src = 'https://hm.baidu.com/hm.js?' + BAIDU_ID;
  document.head.appendChild(hm);
})();
