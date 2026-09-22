/* ============================================================
   今天几点赶海 —— 实时潮汐窗口
   ------------------------------------------------------------
   为什么这些数据不写进 HTML:上游潮汐接口只有约 5 天的真实数据,
   再往后返回的是天文算法估算值。把估算值当潮汐表发出去,
   对一个以准确性为卖点的页面是自毁 —— 有人照着去了,赶上涨潮。
   所以页面里能被收录的是常青内容,这张表每次访问实时拉。
   ============================================================ */
(function () {
  'use strict';

  var API = '/api/tide';
  var DAYS = 5;

  var STATIONS = [
    { id: 'qinhuangdao', label: '秦皇岛市区' },
    { id: 'beidaihe', label: '北戴河' },
    { id: 'nandaihe', label: '南戴河' },
    { id: 'shankhaiguan', label: '山海关·老龙头' },
    { id: 'qilihai', label: '七里海' },
    { id: 'huangjin', label: '黄金海岸' }
  ];

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function toMin(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    return m ? +m[1] * 60 + +m[2] : null;
  }

  function fmtMin(min) {
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* 赶海窗口:低潮前 1.5 小时到低潮后 1 小时。
     退潮到底前滩涂才露出来,涨潮一起就得往回走 —— 后半段留得比前半段短，
     是因为涨潮比退潮危险。 */
  function windowOf(lowMin) {
    return { from: fmtMin(lowMin - 90), to: fmtMin(lowMin + 60) };
  }

  /* 潮差越大,露出的滩涂越多。这是当天最高潮位减最低潮位。 */
  function rate(tides) {
    var hs = tides.map(function (t) { return t.height; });
    var range = Math.max.apply(null, hs) - Math.min.apply(null, hs);
    if (range >= 1.2) return { text: '大潮', cls: 'good', tip: '潮差大,滩涂露得多,适合赶海' };
    if (range >= 0.7) return { text: '中潮', cls: 'ok', tip: '潮差一般,能赶但收获看运气' };
    return { text: '小潮', cls: 'weak', tip: '潮差小,滩涂露得少,不建议专程去' };
  }

  /**
   * 一天的赶海窗口:时刻、深浅、白天还是夜里,都在这里算一次。
   * 卡片和顶部结论共用 —— 之前两处各算各的,结论推荐过一个卡片上
   * 标着「退得浅」的窗口。
   */
  function windowsOf(entry) {
    var tides = (entry.data && entry.data.tides) || [];
    var lows = tides.filter(function (t) { return t.type === 'low'; })
      .map(function (t) { return { min: toMin(t.time), h: t.height }; })
      .filter(function (t) { return t.min != null; });
    if (!lows.length) return [];

    var hs = tides.map(function (t) { return t.height; });
    var lo = Math.min.apply(null, hs), hi = Math.max.apply(null, hs);
    var span = hi - lo;

    // 白天还是夜里直接决定这个窗口对绝大多数人有没有用,接口自己算好了
    var dayFlag = {};
    ((entry.data && entry.data.ganhai) || []).forEach(function (g) {
      dayFlag[g.lowTideTime] = !!g.isDaytime;
    });

    return lows.map(function (l) {
      var t = fmtMin(l.min);
      var w = windowOf(l.min);
      return {
        time: t,
        height: l.h,
        from: w.from,
        to: w.to,
        // 「低潮」水位和当天高潮差不多时(浅半日潮),照着去就是白跑
        shallow: span > 0 && (l.h - lo) > span * 0.4,
        // 接口没给就按 06:00-18:00 粗略判断,总比不标好
        isDay: dayFlag.hasOwnProperty(t) ? dayFlag[t] : (l.min >= 360 && l.min <= 1080),
      };
    });
  }

  function dayCard(entry, isToday) {
    var tides = (entry.data && entry.data.tides) || [];
    var wins = windowsOf(entry);

    var d = new Date(entry.date + 'T00:00:00+08:00');
    var label = (entry.date || '').slice(5).replace('-', '月') + '日 ' + WEEK[d.getDay()];
    var r = tides.length ? rate(tides) : null;

    if (!wins.length) {
      return '<div class="gh-day"><div class="gh-date">' + esc(label) + (isToday ? ' <em>今天</em>' : '') +
        '</div><div class="gh-none">这天没有取到低潮时刻</div></div>';
    }

    var windows = wins.map(function (w) {
      return '<div class="gh-win' + (w.shallow ? ' is-shallow' : '') + (w.isDay ? '' : ' is-night') + '">' +
        '<b>' + w.from + ' – ' + w.to +
          '<span class="gh-tag ' + (w.isDay ? 'day' : 'night') + '">' + (w.isDay ? '白天' : '夜间') + '</span></b>' +
        '<small>低潮 ' + w.time + ' · ' + w.height.toFixed(2) + ' 米' +
        (w.shallow ? '<br><i>这次退得浅,滩涂露不出多少</i>' : '') + '</small></div>';
    }).join('');

    return '<div class="gh-day' + (isToday ? ' is-today' : '') + '">' +
      '<div class="gh-date">' + esc(label) + (isToday ? ' <em>今天</em>' : '') +
      (r ? '<span class="gh-rate ' + r.cls + '" title="' + esc(r.tip) + '">' + r.text + '</span>' : '') +
      '</div>' + windows + '</div>';
  }

  /* 一句话结论放最上面。
     秦皇岛的大潮低潮常常整整一周都落在凌晨,这种时候最该先告诉人
     「这几天白天没有好潮水」,而不是让他自己一张张卡片去数。 */
  function summary(list, today) {
    var good = [];
    list.forEach(function (e) {
      windowsOf(e).forEach(function (w) {
        // 白天还不够,还得真退得下去 —— 否则等于推荐人去看一片水
        if (w.isDay && !w.shallow) good.push({ date: e.date, w: w });
      });
    });

    if (!good.length) {
      var anyDay = list.some(function (e) {
        return windowsOf(e).some(function (w) { return w.isDay; });
      });
      return '<div class="gh-sum warn">接下来 5 天,<b>白天没有值得跑一趟的赶海窗口</b> —— ' +
        (anyDay ? '白天有低潮,但都退得浅,滩涂露不出多少;退得狠的那几次在凌晨。'
                : '退得最狠的低潮都在凌晨。') +
        '想去的话需要头灯和同伴,或者往后再等几天。</div>';
    }

    var first = good[0];
    var when = first.date === today ? '就在今天' :
      (first.date.slice(5).replace('-', '月') + '日');
    return '<div class="gh-sum ok">接下来 5 天有 <b>' + good.length + ' 个白天的好窗口</b>,' +
      '最近的是 ' + when + ' <b>' + first.w.from + ' – ' + first.w.to + '</b>' +
      '(低潮 ' + first.w.time + ')。其余日子见下面,标了「夜间」的是凌晨。</div>';
  }

  function render(box, json, station) {
    var list = json.data;
    // days=1 时接口返回的是单天对象,统一成数组
    if (!Array.isArray(list)) list = [{ date: json.date, data: json.data }];

    var today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
    var estimated = list.some(function (e) { return e.source === 'estimated'; });

    box.innerHTML =
      summary(list, today) +
      '<div class="gh-days">' +
        list.map(function (e) { return dayCard(e, e.date === today); }).join('') +
      '</div>' +
      '<p class="gh-meta">数据来源:' + esc(json.station || '潮汐站') + ' · ' + esc(station.label) +
        (estimated ? ' · <b>部分日期为算法估算,以当天实况为准</b>' : '') + '</p>';
  }

  function load(stationId) {
    var box = document.getElementById('ghTable');
    if (!box) return;
    var station = STATIONS.filter(function (s) { return s.id === stationId; })[0] || STATIONS[0];

    box.innerHTML = '<p class="gh-loading">正在获取潮汐数据…</p>';

    fetch(API + '?days=' + DAYS + '&location=' + encodeURIComponent(station.id))
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json || !json.success) throw new Error('接口返回异常');
        render(box, json, station);
      })
      .catch(function () {
        box.innerHTML = '<p class="gh-loading">潮汐数据暂时取不到。可以看下面的「怎么自己算赶海时间」,' +
          '或者稍后刷新重试。</p>';
      });
  }

  function init() {
    var sel = document.getElementById('ghStation');
    if (!sel) return;

    sel.innerHTML = STATIONS.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.label) + '</option>';
    }).join('');

    var saved = null;
    try { saved = localStorage.getItem('gh-station'); } catch (e) { /* 无痕模式下读不到,用默认 */ }
    if (saved && STATIONS.some(function (s) { return s.id === saved; })) sel.value = saved;

    sel.addEventListener('change', function () {
      try { localStorage.setItem('gh-station', sel.value); } catch (e) { /* 存不了也不影响本次 */ }
      load(sel.value);
    });

    load(sel.value);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
