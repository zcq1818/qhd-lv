/* ============================================================
   日出实时增强
   ------------------------------------------------------------
   这页原本用简化天文公式在浏览器里算日出日落,好处是任意日期都能查,
   缺点是和实测差约 3 分钟(今天算 05:51,气象模型给 05:48),
   而且算得再准也回答不了真正的问题 —— 那天到底看不看得见。
   四点半爬起来赶到鸽子窝,结果一片阴云,这趟就白跑了。

   所以这里做增量:未来 5 天改用气象接口的日出时刻,并按当天天气
   给一句「能不能看到」。接口取不到就什么都不做,原来的算法结果留在页面上。
   ============================================================ */
(function () {
  'use strict';

  var LOCATIONS = [
    { id: 'beidaihe', label: '北戴河(鸽子窝)' },
    { id: 'qinhuangdao', label: '秦皇岛市区' },
    { id: 'shankhaiguan', label: '山海关(老龙头)' },
    { id: 'nandaihe', label: '南戴河' },
    { id: 'huangjin', label: '黄金海岸' }
  ];

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /**
   * 当天天气能不能看到日出。
   * 说明:接口给的是全天天气概况,不是日出那一刻的云量 —— 这是个参考,
   * 不是保证。所以文案用「大概率/多半」而不是打包票。
   */
  function visibility(text) {
    var t = String(text || '');
    if (/雷|暴雨|大雨|中雨|雪/.test(t)) return { cls: 'no', text: '看不到', tip: t + ',别去了' };
    if (/雨|雾|霾|沙/.test(t)) return { cls: 'no', text: '看不到', tip: t + ',视野不行' };
    if (/阴/.test(t)) return { cls: 'poor', text: '希望不大', tip: '阴天,太阳多半出不来' };
    if (/多云/.test(t)) return { cls: 'maybe', text: '看运气', tip: '有云,可能被挡,也可能拍出火烧云' };
    if (/晴/.test(t)) return { cls: 'good', text: '大概率能看到', tip: '天晴,视野通透' };
    return { cls: 'maybe', text: '不确定', tip: t || '暂无天气' };
  }

  /** 日出前 30 分钟到场:天光最好的是日出前那段,到早了也不亏 */
  function arriveBy(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    if (!m) return '';
    var min = +m[1] * 60 + +m[2] - 30;
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), mm = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }

  function card(d, isToday) {
    var v = visibility(d.textDay);
    // 按纯日历日期算星期,不受访客所在时区影响
    var dt = new Date(d.date + 'T00:00:00Z');
    var label = d.date.slice(5).replace('-', '月') + '日 ' + WEEK[dt.getUTCDay()];

    return '<div class="sl-day' + (isToday ? ' is-today' : '') + '">' +
      '<div class="sl-date">' + esc(label) + (isToday ? ' <em>今天</em>' : '') +
        '<span class="sl-vis ' + v.cls + '" title="' + esc(v.tip) + '">' + v.text + '</span></div>' +
      '<div class="sl-time">' + esc(d.sunrise || '--:--') + '</div>' +
      '<div class="sl-sub">建议 ' + esc(arriveBy(d.sunrise)) + ' 到场 · 日落 ' + esc(d.sunset || '--:--') + '</div>' +
      '<div class="sl-wx">' + esc(d.textDay || '') +
        (d.low && d.high ? ' · ' + esc(d.low) + '~' + esc(d.high) + '℃' : '') + '</div>' +
    '</div>';
  }

  function render(box, json, loc) {
    var daily = (json && json.daily) || [];
    if (!daily.length) return false;

    var today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

    box.innerHTML =
      '<div class="sl-days">' +
        daily.map(function (d) { return card(d, d.date === today); }).join('') +
      '</div>' +
      '<p class="sl-meta">日出时刻来自气象模型(' + esc(loc.label) + ')。' +
        '「能不能看到」按当天天气概况估计,不是日出那一刻的云量 —— 参考,不是保证。' +
        '要查其他日期,用下面的日期查询。</p>';
    return true;
  }

  function load(box, id) {
    var loc = LOCATIONS.filter(function (l) { return l.id === id; })[0] || LOCATIONS[0];
    fetch('/api/weather?location=' + encodeURIComponent(loc.id))
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json || !json.success) throw new Error('接口异常');
        render(box, json, loc);
      })
      .catch(function () {
        /* 静默失败:页面自带的天文算法结果还在,访客照样看得到日出时间 */
      });
  }

  function init() {
    var box = document.getElementById('sunTodayGrid');
    if (!box) return;

    // 地点选择插在网格之前
    var pick = document.createElement('div');
    pick.className = 'sl-pick';
    pick.innerHTML = '<label for="slLoc">看哪一片的日出</label>' +
      '<select id="slLoc">' + LOCATIONS.map(function (l) {
        return '<option value="' + l.id + '">' + esc(l.label) + '</option>';
      }).join('') + '</select>';
    box.parentNode.insertBefore(pick, box);

    var sel = pick.querySelector('#slLoc');
    var saved = null;
    try { saved = localStorage.getItem('sl-loc'); } catch (e) { /* 无痕模式下读不到 */ }
    if (saved && LOCATIONS.some(function (l) { return l.id === saved; })) sel.value = saved;

    sel.addEventListener('change', function () {
      try { localStorage.setItem('sl-loc', sel.value); } catch (e) { /* 存不了不影响本次 */ }
      load(box, sel.value);
    });

    load(box, sel.value);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
