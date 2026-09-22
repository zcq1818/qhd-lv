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
   不参与收录,所以不影响 SEO;不带 JS 的访客看到的是占位里的微信/邮箱兜底。

   中英双语:界面文字在下面的 T 里按语言分开,按页面的 <html lang> 自动选,
   占位元素上的 data-lang 可以覆盖。英文版的兜底只给邮箱 —— 微信对
   境外访客没用。
   ============================================================ */
(function () {
  'use strict';

  var ENDPOINT = '/api/leads';
  var MAIL = 'zhaochenqi@163.com';

  /* 界面文字按语言分开。英文页有 50 个,不能为它们复制一份组件 ——
     那以后改一句话要改两个文件,迟早漏一个。 */
  var T = {
    zh: {
      eyebrow: '免费咨询',
      title: '不知道怎么安排?说说你的情况',
      sub: '留个联系方式,我们按你的时间、人数和预算给一份具体建议。不收费,也不会拿去做别的用途。',
      contact: '手机号 / 微信号(必填,方便回复你)',
      people: '出行人数',
      peopleOpts: ['1 人', '2 人', '3-4 人', '5-8 人', '9 人以上'],
      dateLabel: '出行日期',
      note: '想问什么?比如带老人小孩怎么安排、几月份来合适、预算大概多少',
      submit: '提交咨询',
      submitting: '提交中…',
      hp: '网址(请留空)',
      alt: '不想填表也可以直接加微信,或发邮件到 <a href="mailto:' + MAIL + '">' + MAIL + '</a>。',
      needContact: '请填写联系方式,不然我们没法回复你。',
      doneTitle: '已收到,我们会尽快回复',
      doneBody: '回复会发到你留的联系方式上。想更快得到答复,可以直接加微信说明情况。',
      failPrefix: '提交没能成功,可能是网络问题。',
      failSuffix: ' 你可以直接加微信,或发邮件到 <a href="mailto:' + MAIL + '">' + MAIL + '</a>,我们同样会回复。'
    },
    en: {
      eyebrow: 'Free help',
      title: 'Not sure how to plan your trip?',
      sub: 'Tell us your dates, group size and what you want to see. We will send back a concrete suggestion. No charge, and we will not pass your details on.',
      contact: 'Email or WhatsApp (required, so we can reply)',
      people: 'Group size',
      peopleOpts: ['1 person', '2 people', '3-4 people', '5-8 people', '9 or more'],
      dateLabel: 'Travel date',
      note: 'What would you like to know? Getting there without Chinese, travelling with kids or older parents, best month to visit, rough budget…',
      submit: 'Send enquiry',
      submitting: 'Sending…',
      hp: 'Website (leave blank)',
      alt: 'Prefer email? Write to <a href="mailto:' + MAIL + '">' + MAIL + '</a>. We usually reply within a day.',
      needContact: 'Please leave an email or phone number so we can reply.',
      doneTitle: 'Got it — we will be in touch',
      doneBody: 'We will reply to the contact you left, usually within a day. Please check your spam folder if you do not hear from us.',
      failPrefix: 'That did not go through, probably a network problem.',
      failSuffix: ' You can email us at <a href="mailto:' + MAIL + '">' + MAIL + '</a> instead — we will reply either way.'
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
        '<input class="lead-full" type="text" name="contact" required ' +
          'placeholder="' + esc(t.contact) + '" autocomplete="tel">' +
        '<input type="date" name="date" min="' + today() + '" aria-label="' + esc(t.dateLabel) + '">' +
        '<select name="people" aria-label="' + esc(t.people) + '">' +
          '<option value="">' + esc(t.people) + '</option>' +
          t.peopleOpts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') +
        '</select>' +
        '<textarea class="lead-full" name="note" placeholder="' + esc(t.note) + '"></textarea>' +
        '<div class="lead-hp" aria-hidden="true">' +
          '<label>' + esc(t.hp) + '<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
        '</div>' +
        '<button type="submit" class="lead-card-btn">' + esc(t.submit) + '</button>' +
        '<p class="lead-card-tip" hidden></p>' +
      '</form>' +
      '<p class="lead-card-alt">' + t.alt + '</p>';

    bind(box, source, service, t);
  }

  function bind(box, source, service, t) {
    var form = box.querySelector('form');
    var btn = box.querySelector('.lead-card-btn');
    var tip = box.querySelector('.lead-card-tip');

    function say(html) {
      tip.innerHTML = html;
      tip.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var get = function (n) {
        var el = form.querySelector('[name="' + n + '"]');
        return el ? el.value.trim() : '';
      };

      var contact = get('contact');
      if (!contact) {
        say(esc(t.needContact));
        form.querySelector('[name="contact"]').focus();
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
          note: get('note'),
          website: get('website'),
          page: location.pathname
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error((d && d.error) || '提交失败');
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
