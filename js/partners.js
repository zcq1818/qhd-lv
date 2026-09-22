/* ============================================================
   合作商家推荐位
   ------------------------------------------------------------
   和页面上那个 .ad-slot 不是一回事:那个是通用横幅,跟内容无关;
   这个带结构化信息(位置、价位、适合谁),按页面上下文筛选 ——
   在「北戴河住哪」那篇文章里只出现北戴河的住宿,转化率不是一个量级,
   也才是能拿去跟商家谈的东西。

   用法:页面里放占位
     <div data-partners="stay" data-area="beidaihe" data-title="…"></div>

   还没有商家时显示招商位,而不是留个空洞 —— 那块位置本身就是销售材料:
   跟民宿谈的时候可以直接指着说「你的信息会出现在这里」。

   点击会记一次 event-partner-<id>。没有转介绍记录,跟商家结算时说不清,
   所以这个不是可选项。
   ============================================================ */
(function () {
  'use strict';

  var DATA = '/data/partners.json';
  var cache = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function track(id) {
    try {
      var k = 'pt_' + id;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
    } catch (e) { /* 无痕模式下记一次也无妨 */ }
    fetch('/api/view-counter?slug=' + encodeURIComponent('event-partner-' + id), { method: 'POST' })
      .catch(function () { /* 统计失败不影响跳转 */ });
  }

  /* 还没有商家时:这块位置就是销售材料本身 */
  function invite(typeLabel) {
    return '<div class="pt-invite">' +
      '<span class="pt-invite-tag">合作位</span>' +
      '<div class="pt-invite-body">' +
        '<b>这个位置在招' + esc(typeLabel) + '合作</b>' +
        '<span>出现在这里的商家,面对的是已经在查秦皇岛怎么玩、马上要来的人。' +
          '按成交分成,不成交不收费。</span>' +
      '</div>' +
      '<a class="pt-invite-go" href="/advertise">了解合作 →</a>' +
    '</div>';
  }

  function card(p) {
    var meta = [p.area, p.price, p.distance].filter(Boolean)
      .map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');

    var inner =
      '<div class="pt-head"><b>' + esc(p.name) + '</b>' +
        '<span class="pt-tag">合作商家</span></div>' +
      (meta ? '<div class="pt-meta">' + meta + '</div>' : '') +
      (p.why ? '<p class="pt-why">' + esc(p.why) + '</p>' : '') +
      (p.note ? '<p class="pt-note">' + esc(p.note) + '</p>' : '');

    // 有链接就是外链,没有就只展示信息(让访客自己走咨询表单)
    if (p.url) {
      return '<a class="pt-card" href="' + esc(p.url) + '" target="_blank" rel="nofollow noopener" ' +
        'data-partner="' + esc(p.id) + '">' + inner +
        '<span class="pt-go">查看 →</span></a>';
    }
    return '<div class="pt-card" data-partner="' + esc(p.id) + '">' + inner + '</div>';
  }

  function render(box, data) {
    var type = box.getAttribute('data-partners') || '';
    var area = box.getAttribute('data-area') || '';
    var title = box.getAttribute('data-title') || '';
    var typeLabel = (data.types || {})[type] || '商家';

    var list = (data.partners || []).filter(function (p) {
      if (!p.active) return false;
      if (type && p.type !== type) return false;
      // 指定了区域就先按区域筛;该区域没有就退回同类型的全部,总比空着强
      return true;
    });

    var inArea = area ? list.filter(function (p) { return p.area === area || p.areaId === area; }) : [];
    var use = inArea.length ? inArea : list;

    box.className = 'pt-block';
    box.innerHTML =
      (title ? '<h3 class="pt-title">' + esc(title) + '</h3>' : '') +
      (use.length
        ? '<div class="pt-list">' + use.slice(0, 4).map(card).join('') + '</div>' +
          '<p class="pt-disclaimer">以上是付费合作商家,按成交分成。我们只收自己去过或有稳定口碑的,' +
            '但不对服务质量作担保 —— 下单前请自行确认。</p>'
        : invite(typeLabel));

    box.querySelectorAll('[data-partner]').forEach(function (el) {
      el.addEventListener('click', function () { track(el.getAttribute('data-partner')); });
    });
  }

  function init() {
    var boxes = document.querySelectorAll('[data-partners]');
    if (!boxes.length) return;

    (cache ? Promise.resolve(cache) : fetch(DATA).then(function (r) { return r.json(); }))
      .then(function (data) {
        cache = data;
        for (var i = 0; i < boxes.length; i++) render(boxes[i], data);
      })
      .catch(function () {
        // 数据取不到就整块收起来,不要在页面上留个坏掉的框
        for (var i = 0; i < boxes.length; i++) boxes[i].hidden = true;
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
