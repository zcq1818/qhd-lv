/**
 * 景点详情页实时数据关联脚本
 * 根据当前景点类型，在详情页顶部插入关联的实时信息：
 *  - 看日出景点（鸽子窝/老龙头/角山）：明日日出时间
 *  - 海滨景点：今日低潮时间（赶海）
 * 用法：详情页引入 <script src="../js/spot-realtime.js" defer></script>
 */
(function() {
  'use strict';
  var m = location.pathname.match(/\/attraction\/([a-zA-Z0-9_]+)/);
  if (!m) return;
  var spotId = m[1];

  var RAD = Math.PI / 180, LAT = 39.9, LNG = 119.55, TZ = 8;
  function toTime(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } hh = ((hh % 24) + 24) % 24; return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
  function calcSunrise(date) {
    var s = new Date(date.getFullYear(), 0, 0), N = Math.floor((date - s) / 86400000);
    var decl = 23.45 * Math.sin(RAD * (360 / 365) * (284 + N));
    var cosH = (Math.sin(-0.833 * RAD) - Math.sin(LAT * RAD) * Math.sin(decl * RAD)) / (Math.cos(LAT * RAD) * Math.cos(decl * RAD));
    var H = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD;
    var B = RAD * (360 / 365) * (N - 81), eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    var noon = 12 + (TZ * 15 - LNG) / 15 - eot / 60;
    return toTime(noon - H / 15);
  }

  var AREA_TIDE = { beidaihe: 'beidaihe', shanhaiguan: 'shankhaiguan', haigang: 'qinhuangdao', nandaihe: 'nandaihe', funing: 'qinhuangdao', lulong: 'qinhuangdao' };

  function mount(html) {
    var anchor = document.querySelector('.address-bar') || document.querySelector('.detail-hero');
    if (!anchor) return;
    var el = document.createElement('div');
    el.style.cssText = 'margin:16px 0;padding:12px 16px;background:#f0f7ff;border:1px solid #d0e5ff;border-radius:8px;font-size:14px;line-height:1.7;';
    el.innerHTML = html;
    anchor.parentNode.insertBefore(el, anchor.nextSibling);
  }

  fetch('../data/attractions.json').then(function(r) { return r.json(); }).then(function(data) {
    var spot = null;
    (data.spots || []).forEach(function(s) { if (s.id === spotId) spot = s; });
    if (!spot) return;

    var isSunriseSpot = (spotId === 'geziwo' || spotId === 'laolongtou' || spotId === 'jiaoshan');
    var isBeach = spot.cat === 'beach';
    var parts = [];

    if (isSunriseSpot) {
      var t = new Date(); t.setDate(t.getDate() + 1);
      parts.push('🌅 明日日出 <a href="../sunrise" style="color:#1a73e8;font-weight:700;text-decoration:none;">' + calcSunrise(t) + '</a>（提前40分钟占位）');
    }

    if (isBeach) {
      var loc = AREA_TIDE[spot.area] || 'qinhuangdao';
      var todayStr = new Date().toISOString().split('T')[0];
      fetch('/api/tide?location=' + loc + '&date=' + todayStr).then(function(r) { return r.json(); }).then(function(d) {
        if (!d.success || !d.data || !d.data.tides) return;
        var lows = d.data.tides.filter(function(t) { return t.type === 'low'; });
        var nowM = new Date().getHours() * 60 + new Date().getMinutes(), next = null;
        lows.forEach(function(t) { var p = t.time.split(':').map(Number); var mm = p[0] * 60 + p[1]; if (mm > nowM && (!next || mm < next.m)) next = { time: t.time, m: mm }; });
        if (!next && lows.length) { var p = lows[0].time.split(':').map(Number); next = { time: lows[0].time, m: p[0] * 60 + p[1] }; }
        if (next) {
          parts.push('🌊 今日低潮 <a href="../tide" style="color:#1a73e8;font-weight:700;text-decoration:none;">' + next.time + '</a> 前后2小时适合赶海');
        }
        mount(parts.join('　'));
      }).catch(function() {});
    }

    if (parts.length && !isBeach) mount(parts.join('　'));
  }).catch(function() {});
})();
