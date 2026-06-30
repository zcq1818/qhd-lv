/**
 * 无障碍辅助脚本 (Accessibility Enhancements)
 * - 键盘导航支持
 * - 焦点管理
 * - ARIA 动态补充
 */

(function() {
  'use strict';

  /**
   * 1. 为所有纯图标按钮补充 aria-label（如果缺失）
   */
  function enhanceAriaLabels() {
    const buttonAriaMap = {
      '.hamburger': '打开菜单',
      '[id*="toggle"]': '切换',
      '[id*="close"]': '关闭',
      '[id*="search"]': '搜索',
      '.nav-cta': '免费规划行程',
      '[onclick*="exportJSON"]': '导出 JSON',
      '[onclick*="importJSON"]': '导入 JSON',
      '[onclick*="addModal"]': '新增景点',
      '[onclick*="reset"]': '恢复默认'
    };

    for (const [selector, label] of Object.entries(buttonAriaMap)) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!el.getAttribute('aria-label') && el.tagName === 'BUTTON') {
          el.setAttribute('aria-label', label);
        }
      });
    }
  }

  /**
   * 2. 为表单控件补充关联标签和 ARIA 属性
   */
  function enhanceFormAccessibility() {
    // 搜索框
    const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]');
    searchInputs.forEach((input, index) => {
      if (!input.getAttribute('aria-label')) {
        input.setAttribute('aria-label', '搜索');
      }
    });

    // 过滤器
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      if (!select.getAttribute('aria-label')) {
        const label = select.previousElementSibling?.textContent || '筛选';
        select.setAttribute('aria-label', label);
      }
    });
  }

  /**
   * 3. 增强键盘导航：支持 Escape 键关闭模态框
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      // Escape: 关闭模态框、侧边栏等
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('[role="dialog"], .modal, [id*="Modal"]');
        modals.forEach(modal => {
          if (modal.style.display !== 'none') {
            modal.style.display = 'none';
            // 恢复焦点到触发器
            if (modal.previousFocusElement) {
              modal.previousFocusElement.focus();
            }
          }
        });

        // 关闭打开的侧边栏
        const sidebars = document.querySelectorAll('[id*="Sidebar"]');
        sidebars.forEach(sidebar => {
          if (sidebar.classList && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
          }
        });
      }

      // Alt + 1-7: 快速导航（可选）
      if (e.altKey) {
        const navLinks = document.querySelectorAll('.nav-links a');
        const quickNavMap = {
          '1': 0, // 首页
          '2': 1, // 景点
          '3': 2, // 地图
          '4': 3, // 行程规划
          '5': 4, // 美食
          '6': 5, // 攻略
          '7': 6  // 关于
        };
        if (e.key in quickNavMap && navLinks[quickNavMap[e.key]]) {
          navLinks[quickNavMap[e.key]].focus();
        }
      }
    });
  }

  /**
   * 4. 焦点可见性：确保焦点环非常清晰
   */
  function setupFocusVisibility() {
    const style = document.createElement('style');
    style.textContent = `
      /* 焦点可见时强调焦点环 */
      *:focus-visible {
        outline: 3px solid #1a73e8 !important;
        outline-offset: 2px !important;
        border-radius: 2px;
      }

      button:focus-visible,
      a:focus-visible,
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible {
        box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.5) !important;
      }

      /* 为古旧浏览器兼容 */
      *:focus {
        outline: 2px solid #1a73e8 !important;
        outline-offset: 1px !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 5. 确保所有交互元素都是键盘可操作的
   */
  function makeElementsKeyboardAccessible() {
    // 为所有 div 或 span 的模拟按钮补充 tabindex 和键盘事件处理
    const clickableElements = document.querySelectorAll('[onclick], .clickable, [role="button"]');
    clickableElements.forEach(el => {
      // 不是原生按钮或链接的情况下
      if (el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        if (!el.hasAttribute('tabindex')) {
          el.setAttribute('tabindex', '0');
          el.setAttribute('role', 'button');
        }
        // 为 DIV/SPAN 按钮添加 Enter 和 Space 键支持
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
          }
        });
      }
    });
  }

  /**
   * 6. 为动态内容补充 ARIA live regions（用于通知用户）
   */
  function setupLiveRegions() {
    let liveRegion = document.getElementById('aria-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'aria-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }
    window.announceToScreenReader = function(message) {
      liveRegion.textContent = message;
    };
  }

  /**
   * 初始化所有无障碍功能
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        enhanceAriaLabels();
        enhanceFormAccessibility();
        setupKeyboardShortcuts();
        setupFocusVisibility();
        makeElementsKeyboardAccessible();
        setupLiveRegions();
        console.log('[Accessibility] 无障碍功能已初始化');
      });
    } else {
      enhanceAriaLabels();
      enhanceFormAccessibility();
      setupKeyboardShortcuts();
      setupFocusVisibility();
      makeElementsKeyboardAccessible();
      setupLiveRegions();
      console.log('[Accessibility] 无障碍功能已初始化');
    }
  }

  init();
})();
