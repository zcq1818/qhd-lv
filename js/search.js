/**
 * 全站搜索组件 — 检索景点、美食、攻略
 * 自执行 IIFE，按 Ctrl+K 或点击搜索按钮唤起
 * 数据源：attractions.json + 内置美食/攻略索引
 */
(function () {
  'use strict';

  var SEARCH_DATA = null;
  var DATA_URL = 'data/attractions.json';

  // 内置美食与攻略索引（无需后端）
  var BUILT_IN_INDEX = [
    // 美食
    { type: 'food', title: '刘庄夜市', desc: '北戴河最热闹夜市，烤生蚝、铁板鱿鱼', url: 'food#night', tag: '夜市' },
    { type: 'food', title: '秦皇小巷', desc: '20000㎡古风艺术街区，国风演出', url: 'food#night', tag: '夜市' },
    { type: 'food', title: '燕山夜市', desc: '港城老牌人气夜市，碳烤羊腿', url: 'food#night', tag: '夜市' },
    { type: 'food', title: '山海关关市美食街区', desc: '四条包子、桲椤叶饼、山海关浑锅', url: 'food#night', tag: '夜市' },
    { type: 'food', title: '石塘in巷', desc: '北戴河文创烟火市集，亲子遛娃', url: 'food#night', tag: '夜市' },
    { type: 'food', title: '石塘路海鲜市场', desc: '北戴河最大海鲜市场，自购加工', url: 'food#seafood', tag: '海鲜市场' },
    { type: 'food', title: '新开口渔港', desc: '渔民直销，下午4-5点最热闹', url: 'food#seafood', tag: '海鲜市场' },
    { type: 'food', title: '马坊市场', desc: '本地人常去的综合市场', url: 'food#seafood', tag: '海鲜市场' },
    { type: 'food', title: '昌黎葡萄酒', desc: '中国干红之乡，长城/茅台/朗格斯', url: 'food#specialty', tag: '特产' },
    { type: 'food', title: '回记绿豆糕', desc: '山海关1945年老店，入口即化', url: 'food#specialty', tag: '特产' },
    { type: 'food', title: '四条包子', desc: '山海关百年老店，皮薄馅大', url: 'food#night', tag: '美食' },
    { type: 'food', title: '杨肠子火腿', desc: '北戴河传统工艺熏制', url: 'food#specialty', tag: '特产' },
    // 攻略
    { type: 'guide', title: '如何到达秦皇岛', desc: '高铁/火车/飞机/自驾全指南', url: 'guide#transport', tag: '交通' },
    { type: 'guide', title: '住宿区域推荐', desc: '北戴河/海港区/山海关区对比', url: 'guide#accommodation', tag: '住宿' },
    { type: 'guide', title: '最佳旅游时间', desc: '四季特点与推荐窗口', url: 'guide#besttime', tag: '时间' },
    { type: 'guide', title: '吃海鲜全攻略', desc: '防宰客核心要点', url: 'guide#foodtips', tag: '美食' },
    { type: 'guide', title: '旅行注意事项', desc: '防晒防暑、防坑防宰、实用APP', url: 'guide#tips', tag: '贴士' },
    { type: 'guide', title: '3日精华行程', desc: '北戴河+山海关+南戴河经典路线', url: 'itinerary', tag: '行程' },
    { type: 'guide', title: 'AI智能行程规划', desc: '根据偏好AI生成专属行程', url: 'itinerary#aiPlanner', tag: '行程' },
    // 博客
    { type: 'blog', title: '北戴河7月避坑指南', desc: '旺季人挤人？这样玩才聪明', url: 'blog/beidaihe-july-tips', tag: '避坑' },
    { type: 'blog', title: '山海关一日游实测路线', desc: '跟着当地人走，不花冤枉钱', url: 'blog/shanhaiguan-one-day', tag: '实测' },
    { type: 'blog', title: '秦皇岛赶海攻略', desc: '潮汐时间表+工具+最佳地点', url: 'blog/qhd-ganhai-guide', tag: '赶海' }
  ];

  var dom = {};
  var state = { query: '', results: [], activeIndex: -1 };

  // ============ 初始化 ============

  function init() {
    if (document.querySelector('.qhd-search-overlay')) return;
    buildDOM();
    cacheDom();
    bindEvents();
  }

  // ============ DOM 构建 ============

  function buildDOM() {
    var overlay = document.createElement('div');
    overlay.className = 'qhd-search-overlay';
    overlay.innerHTML =
      '<div class="qhd-search-modal">' +
        '<div class="qhd-search-header">' +
          '<svg class="qhd-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="text" class="qhd-search-input" placeholder="搜索景点、美食、攻略…" autocomplete="off" />' +
          '<button class="qhd-search-close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="qhd-search-body" id="qhdSearchBody">' +
          '<div class="qhd-search-hint">' +
            '<p>输入关键词搜索，或试试：</p>' +
            '<div class="qhd-search-suggestions">' +
              '<button class="qhd-suggestion-chip">北戴河</button>' +
              '<button class="qhd-suggestion-chip">山海关</button>' +
              '<button class="qhd-suggestion-chip">海鲜</button>' +
              '<button class="qhd-suggestion-chip">日出</button>' +
              '<button class="qhd-suggestion-chip">住宿</button>' +
              '<button class="qhd-suggestion-chip">3日游</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  function cacheDom() {
    dom.overlay = document.querySelector('.qhd-search-overlay');
    dom.input = dom.overlay.querySelector('.qhd-search-input');
    dom.body = dom.overlay.querySelector('#qhdSearchBody');
    dom.close = dom.overlay.querySelector('.qhd-search-close');
  }

  // ============ 事件绑定 ============

  function bindEvents() {
    // Ctrl+K / Cmd+K 唤起
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
      if (e.key === 'Escape') close();
    });

    // 搜索按钮（导航栏的 .nav-search-trigger）
    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-search-trigger')) {
        e.preventDefault();
        open();
      }
    });

    dom.close.addEventListener('click', close);
    dom.overlay.addEventListener('click', function (e) {
      if (e.target === dom.overlay) close();
    });

    // 输入搜索
    var debounceTimer = null;
    dom.input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        state.query = dom.input.value.trim();
        search();
      }, 200);
    });

    // 键盘导航
    dom.input.addEventListener('keydown', function (e) {
      var items = dom.body.querySelectorAll('.qhd-result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.activeIndex = Math.min(state.activeIndex + 1, items.length - 1);
        updateActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.activeIndex = Math.max(state.activeIndex - 1, -1);
        updateActive(items);
      } else if (e.key === 'Enter') {
        if (state.activeIndex >= 0 && items[state.activeIndex]) {
          var href = items[state.activeIndex].getAttribute('data-href');
          if (href) window.location.href = href;
        }
      }
    });

    // 点击建议词
    dom.body.addEventListener('click', function (e) {
      var chip = e.target.closest('.qhd-suggestion-chip');
      if (chip) {
        dom.input.value = chip.textContent;
        state.query = chip.textContent;
        search();
        dom.input.focus();
      }
      var item = e.target.closest('.qhd-result-item');
      if (item) {
        var href = item.getAttribute('data-href');
        if (href) window.location.href = href;
      }
    });
  }

  // ============ 搜索逻辑 ============

  function ensureData() {
    if (SEARCH_DATA) return Promise.resolve(SEARCH_DATA);
    return fetch(DATA_URL, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : { spots: [] }; })
      .catch(function () { return { spots: [] }; })
      .then(function (data) {
        SEARCH_DATA = data;
        return data;
      });
  }

  function search() {
    if (!state.query) {
      renderHint();
      return;
    }

    ensureData().then(function (data) {
      var q = state.query.toLowerCase();
      var results = [];

      // 搜索景点
      (data.spots || []).forEach(function (spot) {
        var score = 0;
        var name = (spot.name || '').toLowerCase();
        var desc = (spot.desc || '').toLowerCase();
        var area = (spot.area || '').toLowerCase();
        if (name.indexOf(q) >= 0) score += 10;
        if (desc.indexOf(q) >= 0) score += 3;
        if (area.indexOf(q) >= 0) score += 2;
        (spot.highlights || []).forEach(function (h) {
          if (h.toLowerCase().indexOf(q) >= 0) score += 2;
        });
        if (score > 0) {
          results.push({
            type: 'attraction',
            title: spot.name,
            desc: spot.desc,
            url: 'attractions#' + spot.id + '-spot',
            tag: spot.level || '景点',
            score: score
          });
        }
      });

      // 搜索内置索引
      BUILT_IN_INDEX.forEach(function (item) {
        var score = 0;
        if (item.title.toLowerCase().indexOf(q) >= 0) score += 8;
        if (item.desc.toLowerCase().indexOf(q) >= 0) score += 3;
        if (item.tag.toLowerCase().indexOf(q) >= 0) score += 2;
        if (score > 0) results.push(Object.assign({}, item, { score: score }));
      });

      results.sort(function (a, b) { return b.score - a.score; });
      state.results = results.slice(0, 20);
      state.activeIndex = -1;
      renderResults();
    });
  }

  // ============ 渲染 ============

  function renderHint() {
    dom.body.innerHTML =
      '<div class="qhd-search-hint">' +
        '<p>输入关键词搜索，或试试：</p>' +
        '<div class="qhd-search-suggestions">' +
          '<button class="qhd-suggestion-chip">北戴河</button>' +
          '<button class="qhd-suggestion-chip">山海关</button>' +
          '<button class="qhd-suggestion-chip">海鲜</button>' +
          '<button class="qhd-suggestion-chip">日出</button>' +
          '<button class="qhd-suggestion-chip">住宿</button>' +
          '<button class="qhd-suggestion-chip">3日游</button>' +
        '</div>' +
      '</div>';
  }

  function renderResults() {
    if (state.results.length === 0) {
      dom.body.innerHTML =
        '<div class="qhd-search-empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<p>没有找到「' + escapeHtml(state.query) + '」的相关内容</p>' +
          '<span>试试换个关键词，或浏览<a href="`attractions">全部景点</a></span>' +
        '</div>';
      return;
    }

    // 按类型分组
    var groups = { attraction: [], food: [], guide: [], blog: [] };
    state.results.forEach(function (r) {
      if (groups[r.type]) groups[r.type].push(r);
    });

    var typeLabels = {
      attraction: '景点',
      food: '美食',
      guide: '攻略',
      blog: '文章'
    };

    var html = '<div class="qhd-results">';
    Object.keys(groups).forEach(function (type) {
      if (!groups[type].length) return;
      html += '<div class="qhd-result-group"><div class="qhd-result-group-label">' + typeLabels[type] + '</div>';
      groups[type].forEach(function (r) {
        html +=
          '<a class="qhd-result-item" data-href="' + escapeHtml(r.url) + '">' +
            '<div class="qhd-result-info">' +
              '<div class="qhd-result-title">' + highlight(r.title, state.query) + '</div>' +
              '<div class="qhd-result-desc">' + highlight(r.desc, state.query) + '</div>' +
            '</div>' +
            '<span class="qhd-result-tag">' + escapeHtml(r.tag) + '</span>' +
          '</a>';
      });
      html += '</div>';
    });
    html += '</div>';
    dom.body.innerHTML = html;
  }

  function updateActive(items) {
    items.forEach(function (item, i) {
      item.classList.toggle('active', i === state.activeIndex);
    });
    if (state.activeIndex >= 0 && items[state.activeIndex]) {
      items[state.activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  // ============ 工具函数 ============

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    var escaped = escapeHtml(text);
    var reg = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escaped.replace(reg, '<mark>$1</mark>');
  }

  function open() {
    dom.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { dom.input.focus(); }, 100);
  }

  function close() {
    dom.overlay.classList.remove('open');
    document.body.style.overflow = '';
    dom.input.value = '';
    state.query = '';
    renderHint();
  }

  // ============ 启动 ============

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
