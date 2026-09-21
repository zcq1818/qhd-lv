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

   为什么用 JS 渲染:同样一段表单要出现在 50 多个页面上,写死在 HTML 里
   以后改一个字就得重跑脚本改 50 个文件。这是转化组件不是正文内容,
   不参与收录,所以不影响 SEO;不带 JS 的访客看到的是占位里的微信/邮箱兜底。
   ============================================================ */
(function () {
  'use strict';

  var ENDPOINT = '/api/leads';
  var MAIL = 'zhaochenqi@163.com';

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
    var source = box.getAttribute('data-source') || 'unknown';
    var service = box.getAttribute('data-service') || '';
    var title = box.getAttribute('data-title') || '不知道怎么安排?说说你的情况';
    var sub = box.getAttribute('data-sub')
      || '留个联系方式,我们按你的时间、人数和预算给一份具体建议。不收费,也不会拿去做别的用途。';
    var eyebrow = box.getAttribute('data-eyebrow') || '免费咨询';

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
          'placeholder="手机号 / 微信号(必填,方便回复你)" autocomplete="tel">' +
        '<input type="date" name="date" min="' + today() + '" aria-label="出行日期">' +
        '<select name="people" aria-label="出行人数">' +
          '<option value="">出行人数</option>' +
          '<option>1 人</option><option>2 人</option><option>3-4 人</option>' +
          '<option>5-8 人</option><option>9 人以上</option>' +
        '</select>' +
        '<textarea class="lead-full" name="note" ' +
          'placeholder="想问什么?比如带老人小孩怎么安排、几月份来合适、预算大概多少"></textarea>' +
        '<div class="lead-hp" aria-hidden="true">' +
          '<label>网址(请留空)<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
        '</div>' +
        '<button type="submit" class="lead-card-btn">提交咨询</button>' +
        '<p class="lead-card-tip" hidden></p>' +
      '</form>' +
      '<p class="lead-card-alt">不想填表也可以直接加微信,或发邮件到 ' +
        '<a href="mailto:' + MAIL + '">' + MAIL + '</a>。</p>';

    bind(box, source, service);
  }

  function bind(box, source, service) {
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
        say('请填写联系方式,不然我们没法回复你。');
        form.querySelector('[name="contact"]').focus();
        return;
      }

      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = '提交中…';
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
              '<h3>已收到,我们会尽快回复</h3>' +
              '<p>回复会发到你留的联系方式上。想更快得到答复,可以直接加微信说明情况。</p>' +
            '</div>';
          if (window.gtag) {
            gtag('event', 'lead_submit', { event_category: 'conversion', event_label: source });
          }
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = original;
          // 只把访客能理解的错误原样显示,其余一律归到「网络问题」
          var known = /请填写|频繁|保存失败/.test(err.message || '') ? err.message : '';
          say((known || '提交没能成功,可能是网络问题。') +
            ' 你可以直接加微信,或发邮件到 <a href="mailto:' + MAIL + '">' + MAIL + '</a>,我们同样会回复。');
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
