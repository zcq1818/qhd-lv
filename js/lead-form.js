/* ============================================================
   咨询入口卡片(全站复用)
   ------------------------------------------------------------
   页面里只需要放一个占位元素:
     <div data-lead-form
          data-source="itinerary"                 提交来源,后台按这个分渠道
          data-service="行程定制"                 预填的需求类型
          data-title="不确定几天合适?"            标题(可省)
          data-sub="留个联系方式…"                副标题(可省)
     >
       <!-- 占位元素里的内容是 JS 起不来时的兜底,渲染后会被替换 -->
     </div>

   为什么用 JS 渲染:同样一段表单要出现在 200 多个页面上,写死在 HTML 里
   以后改一个字就得重跑脚本改 200 个文件。这是转化组件不是正文内容,
   不参与收录,所以不影响 SEO;不带 JS 的访客看到的是占位里的邮箱兜底。

   中英双语:界面文字在下面的 T 里按语言分开,按页面的 <html lang> 自动选,
   占位元素上的 data-lang 可以覆盖。

   ------------------------------------------------------------
   2026-10 改版:三周里近一千五百人看到表单,只留了一条。接口验过是好的,
   所以问题在表单本身,按这几条改:
   - 原来第一个、也是唯一必填的就是手机号。陌生网站一上来要电话,
     第一反应是「会被推销骚扰」。现在先问问题,再要联系方式 ——
     问题打出来之后,留个联系方式就顺理成章了
   - 联系方式下面直接写明「只用来回复你,不打电话推销」
   - 「免费咨询 / 提交咨询」听着像销售,改成「本地人免费答疑 / 发送问题」
   - 日期和人数收起来作为可选项,不再像一张预订单
   - 原来写「不想填表可以直接加微信」,卡片里却没有微信号,是条死路。
     现在只有配了 WX 才出现微信入口,并且可以一键复制
   - 补测量:开始填写、提交成功、提交失败、复制微信号。原来只知道
     「看到」和「留了」,中间是黑的
   ============================================================ */
(function () {
  'use strict';

  var ENDPOINT = '/api/leads';
  var MAIL = 'zhaochenqi@163.com';

  /* 微信号。填上之后卡片底部会出现「复制微信号」;留空就不提微信,
     免得又写一句「可以加微信」却不给号。
     手机上只给号 + 复制按钮(在手机上扫不了自己屏幕上的码);
     电脑上再加一张二维码,掏出手机扫屏幕最顺手。显隐由 CSS 按设备决定。 */
  var WX = 'cctvzcq';
  var WX_QR = '/images/wechat-qr.jpg';

  /* 界面文字按语言分开。英文页有 50 个,不能为它们复制一份组件 ——
     那以后改一句话要改两个文件,迟早漏一个。 */
  var T = {
    zh: {
      eyebrow: '本地人免费答疑',
      title: '去之前有拿不准的?直接问',
      sub: '带老人孩子怎么安排、几月来合适、住哪一片方便 —— 写下你的问题,我们按你的情况回答。不收费。',
      ask: '你想问什么?比如:带 70 岁的老人去山海关累不累、10 月去北戴河还能下海吗',
      contact: '怎么回复你?手机号或微信号',
      assure: '只用来回复你这一次 · 不打电话推销 · 一般 24 小时内回复',
      more: '+ 补充出行日期和人数(可选,答得更准)',
      people: '几个人',
      peopleOpts: ['1 人', '2 人', '3-4 人', '5-8 人', '9 人以上'],
      dateLabel: '出行日期',
      submit: '发送问题',
      submitting: '发送中…',
      hp: '网址(请留空)',
      altMail: '也可以发邮件到 <a href="mailto:' + MAIL + '">' + MAIL + '</a>',
      wxLead: '不想填?加微信直接问:',
      wxCopy: '复制微信号',
      wxCopied: '已复制,去微信添加',
      wxQrAlt: '微信二维码',
      wxQrTip: '手机微信扫一扫',
      needContact: '留个手机号或微信号,我们才能把回答发给你。',
      needSomething: '写一下你想问什么,或者至少留个联系方式。',
      doneTitle: '收到了,我们会尽快回复你',
      doneBody: '回答会发到你留的联系方式上,一般 24 小时内。',
      failPrefix: '没发出去,可能是网络问题。',
      failSuffix: ' 你可以稍后再试,或者发邮件到 <a href="mailto:' + MAIL + '">' + MAIL + '</a>,我们同样会回复。'
    },
    en: {
      eyebrow: 'Free help from locals',
      title: 'Not sure about something? Just ask',
      sub: 'Getting there without Chinese, travelling with kids or older parents, best month to visit — write your question and we will answer for your situation. Free.',
      ask: 'What would you like to know? e.g. Is Shanhaiguan manageable with a 70-year-old? Can we swim at Beidaihe in October?',
      contact: 'How should we reply? Email or WhatsApp',
      assure: 'Only used to reply to you · No sales calls · Usually within a day',
      more: '+ Add travel dates and group size (optional)',
      people: 'Group size',
      peopleOpts: ['1 person', '2 people', '3-4 people', '5-8 people', '9 or more'],
      dateLabel: 'Travel date',
      submit: 'Send question',
      submitting: 'Sending…',
      hp: 'Website (leave blank)',
      altMail: 'Or email <a href="mailto:' + MAIL + '">' + MAIL + '</a>',
      wxLead: '',
      wxCopy: '',
      wxCopied: '',
      wxQrAlt: '',
      wxQrTip: '',
      needContact: 'Please leave an email or WhatsApp so we can send you the answer.',
      needSomething: 'Write your question, or at least leave a contact.',
      doneTitle: 'Got it — we will be in touch',
      doneBody: 'We will reply to the contact you left, usually within a day. Please check your spam folder if you do not hear from us.',
      failPrefix: 'That did not go through, probably a network problem.',
      failSuffix: ' Please try again, or email us at <a href="mailto:' + MAIL + '">' + MAIL + '</a> — we will reply either way.'
    }
  };

  /* 语言取页面的 lang,占位元素上的 data-lang 可以覆盖 */
  function stringsFor(box) {
    var lang = box.getAttribute('data-lang')
      || document.documentElement.getAttribute('lang') || 'zh';
    return /^en/i.test(lang) ? T.en : T.zh;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* 今天起的日期下限,免得有人选到去年 */
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* 转化动作计数。和 view-counter.js 里的同一套:slug 带 event- 前缀,
     同一会话每种只记一次,所以后台看到的是人数不是次数。 */
  function track(name) {
    try {
      var k = 'ev_' + name;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
    } catch (e) { /* 无痕模式下记一次也无妨 */ }
    fetch('/api/view-counter?slug=' + encodeURIComponent('event-' + name), { method: 'POST' })
      .catch(function () { /* 统计失败不影响表单 */ });
  }

  function wxBlock(t) {
    if (!WX || !t.wxCopy) return '';
    return '<div class="lead-wx">' +
      '<div class="lead-wx-main">' +
        '<span>' + esc(t.wxLead) + '<b>' + esc(WX) + '</b></span>' +
        '<button type="button" class="lead-wx-btn">' + esc(t.wxCopy) + '</button>' +
      '</div>' +
      (WX_QR ? '<figure class="lead-wx-qr">' +
        '<img src="' + WX_QR + '" alt="' + esc(t.wxQrAlt) + '" width="88" height="88" loading="lazy">' +
        '<figcaption>' + esc(t.wxQrTip) + '</figcaption>' +
      '</figure>' : '') +
    '</div>';
  }

  function render(box) {
    var t = stringsFor(box);
    var source = box.getAttribute('data-source') || 'unknown';
    var service = box.getAttribute('data-service') || '';
    var title = box.getAttribute('data-title') || t.title;
    var sub = box.getAttribute('data-sub') || t.sub;
    var eyebrow = box.getAttribute('data-eyebrow') || t.eyebrow;

    // 占位元素在 HTML 里通常已经带了 lead-card(无 JS 时也能看)
    if (box.className.indexOf('lead-card') < 0) {
      box.className = (box.className ? box.className + ' ' : '') + 'lead-card';
    }
    box.innerHTML =
      '<div class="lead-card-eyebrow">' + esc(eyebrow) + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p class="lead-card-sub">' + esc(sub) + '</p>' +
      '<form class="lead-card-form" novalidate>' +
        // 先问问题:把问题打出来之后,留联系方式就顺理成章了
        '<textarea class="lead-full" name="note" rows="3" placeholder="' + esc(t.ask) + '"></textarea>' +
        '<input class="lead-full" type="text" name="contact" ' +
          'placeholder="' + esc(t.contact) + '" autocomplete="tel">' +
        '<p class="lead-assure">' + esc(t.assure) + '</p>' +
        '<button type="button" class="lead-more">' + esc(t.more) + '</button>' +
        '<div class="lead-extra" hidden>' +
          '<input type="date" name="date" min="' + today() + '" aria-label="' + esc(t.dateLabel) + '">' +
          '<select name="people" aria-label="' + esc(t.people) + '">' +
            '<option value="">' + esc(t.people) + '</option>' +
            t.peopleOpts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div class="lead-hp" aria-hidden="true">' +
          '<label>' + esc(t.hp) + '<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
        '</div>' +
        '<button type="submit" class="lead-card-btn">' + esc(t.submit) + '</button>' +
        '<p class="lead-card-tip" hidden></p>' +
      '</form>' +
      wxBlock(t) +
      '<p class="lead-card-alt">' + t.altMail + '</p>';

    bind(box, source, service, t);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // 老浏览器兜底
    return new Promise(function (ok, fail) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? ok() : fail(); } catch (e) { fail(e); }
      document.body.removeChild(ta);
    });
  }

  function bind(box, source, service, t) {
    var form = box.querySelector('form');
    var btn = box.querySelector('.lead-card-btn');
    var tip = box.querySelector('.lead-card-tip');
    var more = box.querySelector('.lead-more');
    var extra = box.querySelector('.lead-extra');
    var wxBtn = box.querySelector('.lead-wx-btn');

    function say(html) {
      tip.innerHTML = html;
      tip.hidden = false;
    }

    // 开始填写:任一输入框第一次获得焦点就算。和「看到表单」对比,
    // 能分清人是根本没动手,还是填到一半走了
    form.addEventListener('focusin', function () { track('form-start'); });

    more.addEventListener('click', function () {
      extra.hidden = false;
      more.hidden = true;
      track('form-start');
    });

    if (wxBtn) {
      wxBtn.addEventListener('click', function () {
        copyText(WX).then(function () {
          wxBtn.textContent = t.wxCopied;
          track('wx-copy');
        }).catch(function () {
          wxBtn.textContent = WX;   // 复制不了就把号显示出来让人手动抄
        });
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var get = function (n) {
        var el = form.querySelector('[name="' + n + '"]');
        return el ? el.value.trim() : '';
      };

      var contact = get('contact');
      var note = get('note');
      if (!contact) {
        say(esc(note ? t.needContact : t.needSomething));
        form.querySelector('[name="' + (note ? 'contact' : 'note') + '"]').focus();
        return;
      }

      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = t.submitting;
      tip.hidden = true;

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: source,
          contact: contact,
          date: get('date'),
          people: get('people'),
          service: service,
          note: note,
          website: get('website'),
          page: location.pathname
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error((d && d.error) || '提交失败');
          track('form-submit');
          // 成功后整块换掉,避免重复提交
          box.innerHTML =
            '<div class="lead-done">' +
              '<div class="lead-done-icon">✓</div>' +
              '<h3>' + esc(t.doneTitle) + '</h3>' +
              '<p>' + esc(t.doneBody) + '</p>' +
            '</div>';
          if (window.gtag) {
            gtag('event', 'lead_submit', { event_category: 'conversion', event_label: source });
          }
        })
        .catch(function (err) {
          track('form-fail');
          btn.disabled = false;
          btn.textContent = original;
          // 只把访客能理解的错误原样显示,其余一律归到「网络问题」
          // 接口返回的是中文,英文页只在识别得出的情况下才照搬
          var known = /请填写|频繁|保存失败/.test(err.message || '') ? err.message : '';
          say((t === T.en ? t.failPrefix : (known || t.failPrefix)) + t.failSuffix);
        });
    });
  }

  function init() {
    var boxes = document.querySelectorAll('[data-lead-form]');
    for (var i = 0; i < boxes.length; i++) {
      if (!boxes[i].__lead) {
        boxes[i].__lead = 1;
        render(boxes[i]);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
