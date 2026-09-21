/**
 * 天气与潮汐组件 — 统一走站内 /api/weather 与 /api/tide
 * 自执行 IIFE，在含 #weatherWidget 的容器自动渲染
 * 站内接口优先和风天气，未配置凭据时自动降级到 Open-Meteo，
 * 首页与天气页因此始终显示同一份数据，不会出现两个温度。
 */
(function () {
  'use strict';

  var LOCATION = 'qinhuangdao';

  function init() {
    var containers = document.querySelectorAll('#weatherWidget, .weather-widget');
    containers.forEach(renderWidget);
  }

  function renderWidget(container) {
    container.innerHTML = '<div class="weather-loading">加载天气数据中…</div>';

    var today = new Date();
    var dateStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    Promise.all([
      fetch('/api/weather?location=' + LOCATION).then(function (r) { return r.ok ? r.json() : Promise.reject(); }),
      // 潮汐取真实数据，失败不影响天气显示
      fetch('/api/tide?location=' + LOCATION + '&date=' + dateStr)
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
    ]).then(function (arr) {
      if (!arr[0] || arr[0].success === false) return renderError(container);
      renderContent(container, arr[0], arr[1]);
    }).catch(function () { renderError(container); });
  }

  function weatherCodeToDesc(code) {
    var map = {
      0: '晴', 1: '晴', 2: '多云', 3: '阴',
      45: '雾', 48: '雾凇', 51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨',
      61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '大冻雨',
      71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒',
      80: '阵雨', 81: '中阵雨', 82: '大阵雨', 85: '阵雪', 86: '大阵雪',
      95: '雷暴', 96: '雷暴夹冰雹', 99: '大雷暴夹冰雹'
    };
    return map[code] || '未知';
  }

  function weatherCodeToIcon(code, text) {
    var t = String(text || '');
    if (t) {
      if (/雷/.test(t)) return '⛈️';
      if (/雪/.test(t)) return '🌨️';
      if (/阵雨/.test(t)) return '🌦️';
      if (/雨/.test(t)) return '🌧️';
      if (/雾|霾|浮尘|沙/.test(t)) return '🌫️';
      if (/^晴/.test(t)) return '☀️';
      if (/多云/.test(t)) return '⛅';
      if (/阴/.test(t)) return '☁️';
    }
    if (code === 0 || code === 1) return '☀️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '🌨️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 85 && code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '🌤️';
  }

  function renderContent(container, data, tide) {
    var c = data.now || {};
    var days = data.daily || [];
    var code = parseInt(c.code, 10);
    var icon = weatherCodeToIcon(isNaN(code) ? -1 : code, c.text);

    var sunrise = fmtTime(data.sunrise) || '--';
    var sunset = fmtTime(data.sunset) || '--';

    var forecastHtml = '';
    for (var i = 0; i < Math.min(3, days.length); i++) {
      var d = days[i];
      var dayLabel = i === 0 ? '今天' : i === 1 ? '明天' : '后天';
      forecastHtml +=
        '<div class="weather-forecast-day">' +
          '<span class="weather-forecast-label">' + dayLabel + '</span>' +
          '<span class="weather-forecast-icon">' + weatherCodeToIcon(-1, d.textDay) + '</span>' +
          '<span class="weather-forecast-temp">' + d.high + '° / ' + d.low + '°</span>' +
        '</div>';
    }

    var uv = data.uvIndex || (data.life && data.life.uv ? data.life.uv.brief : '');
    var temp = parseFloat(c.temperature);

    container.innerHTML =
      '<div class="weather-card">' +
        '<div class="weather-current">' +
          '<div class="weather-icon">' + icon + '</div>' +
          '<div class="weather-main">' +
            '<div class="weather-temp">' + c.temperature + '°C</div>' +
            '<div class="weather-desc">' + c.text + (c.feelsLike ? ' · 体感' + c.feelsLike + '°C' : '') + '</div>' +
          '</div>' +
          '<div class="weather-extra">' +
            '<div class="weather-extra-item"><span>湿度</span><strong>' + (c.humidity || '--') + '%</strong></div>' +
            '<div class="weather-extra-item"><span>风速</span><strong>' + (c.windSpeed || '--') + ' km/h</strong></div>' +
            '<div class="weather-extra-item"><span>紫外线</span><strong>' + (uv || '--') + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="weather-sun">' +
          '<span class="weather-sun-item">🌅 日出 ' + sunrise + '</span>' +
          '<span class="weather-sun-item">🌇 日落 ' + sunset + '</span>' +
        '</div>' +
        '<div class="weather-forecast">' + forecastHtml + '</div>' +
        '<div class="weather-tide">' +
          '<span class="weather-tide-icon">🌊</span>' +
          '<span>' + buildTideTip(tide) + '</span>' +
        '</div>' +
        '<div class="weather-tip">' + getTravelTip(c.text, temp) + '</div>' +
      '</div>';
  }

  function fmtTime(v) {
    if (!v) return '';
    if (/^\d{1,2}:\d{2}$/.test(v)) return v;          // 已是 HH:MM
    var m = String(v).match(/(\d{2}:\d{2})/);         // ISO 时间串
    return m ? m[1] : '';
  }

  /** 用真实潮汐数据生成赶海提示，取不到时只提示去潮汐页查 */
  function buildTideTip(tide) {
    if (!tide || !tide.success || !tide.data) {
      return '潮汐数据暂不可用，可到<a href="/tide">潮汐表</a>查询赶海时段';
    }
    var g = (tide.data.ganhai || []).filter(function (x) { return x.isDaytime; });
    if (g.length) {
      var first = g[0];
      return '今日白天赶海窗口 ' + first.start + '–' + first.end + '（低潮 ' + first.lowTideTime + '），' +
        '<a href="/ganhai">赶海攻略</a>';
    }
    var tides = tide.data.tides || [];
    var low = tides.filter(function (t) { return t.type === 'low'; })[0];
    if (low) return '今日低潮 ' + low.time + '，白天无合适赶海窗口，可到<a href="/tide">潮汐表</a>看其他日期';
    return '今日潮汐平缓，详见<a href="/tide">潮汐表</a>';
  }

  function getTravelTip(text, temp) {
    var t = String(text || '');
    if (/雷/.test(t)) return '⛈️ 今天有雷暴，请避免户外活动';
    if (/雪/.test(t)) return '🌨️ 今天有雪，注意保暖防滑';
    if (/雨/.test(t)) return '🌧️ 今天有雨，记得带伞，室内景点更合适';
    if (/雾|霾/.test(t)) return '🌫️ 能见度较低，海边观景效果一般';
    if (temp >= 30) return '☀️ 高温天气，注意防晒补水，避开正午时段';
    if (temp <= 5) return '🧥 天气寒冷，注意保暖，海边风大';
    if (/晴/.test(t)) return '🌤️ 天气晴好，非常适合户外游玩和看日出！';
    return '🌤️ 天气适宜出行，祝旅途愉快！';
  }

  function renderError(container) {
    container.innerHTML =
      '<div class="weather-card weather-error">' +
        '<span>天气数据加载失败</span>' +
        '<button class="weather-retry" onclick="window.__weatherInit()">重试</button>' +
      '</div>';
  }

  // 暴露 init 供重试按钮调用
  window.__weatherInit = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
