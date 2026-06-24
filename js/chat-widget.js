/**
 * 秦皇岛AI旅游助手 — 前端浮动聊天组件
 * 自执行 IIFE，不污染全局命名空间，自动注入 DOM
 *
 * 功能：
 * - 浮动按钮 + 弹出聊天窗口
 * - 模式切换（行程规划 / 景点问答）
 * - 流式输出（fetch + ReadableStream 读取 SSE）
 * - Markdown 简单渲染
 * - 快捷问题、打字指示器、自动滚动
 * - 移动端全屏适配
 * - localStorage 保存对话历史
 */
(function () {
  'use strict';

  // ============ 配置 ============

  var API_URL = '/api/chat';
  var STORAGE_KEY = 'agnes_chat_history';
  var MAX_HISTORY = 30; // 最多保存 30 条

  // 快捷问题（按模式区分）
  var QUICK_QUESTIONS = {
    plan: ['帮我规划3天行程', '2天家庭游怎么安排', '预算500元怎么玩'],
    chat: ['北戴河有什么好玩的', '山海关值得去吗', '秦皇岛哪里吃海鲜']
  };

  // ============ 状态 ============

  var state = {
    isOpen: false,
    mode: 'plan', // 'plan' | 'chat'
    messages: [], // [{role, content, timestamp}]
    isStreaming: false,
    abortController: null
  };

  // ============ DOM 引用 ============

  var dom = {};

  // ============ 初始化 ============

  function init() {
    // 防止重复初始化
    if (document.querySelector('.agnes-chat-widget')) return;

    // 加载历史对话
    loadHistory();

    // 创建并注入 DOM
    var container = document.createElement('div');
    container.className = 'agnes-chat-widget';
    container.innerHTML = buildHTML();
    document.body.appendChild(container);

    // 缓存 DOM 引用
    cacheDom();

    // 绑定事件
    bindEvents();

    // 渲染初始消息
    renderMessages();
    renderQuickQuestions();
  }

  // ============ HTML 模板 ============

  function buildHTML() {
    return [
      '<!-- 浮动按钮 -->',
      '<button class="agnes-chat-fab" aria-label="打开AI旅游助手" title="秦皇岛AI旅游助手">',
      '  <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
      '</button>',
      '<!-- 聊天窗口 -->',
      '<div class="agnes-chat-window" role="dialog" aria-label="秦皇岛AI旅游助手">',
      '  <div class="agnes-chat-header">',
      '    <div class="agnes-chat-header-info">',
      '      <div class="agnes-chat-header-icon">',
      '        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      '      </div>',
      '      <div class="agnes-chat-header-text">',
      '        <h3>秦皇岛AI旅游助手</h3>',
      '        <span><i class="agnes-status-dot"></i> 在线 · 随时为你服务</span>',
      '      </div>',
      '    </div>',
      '    <button class="agnes-chat-close" aria-label="关闭" title="关闭">',
      '      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      '    </button>',
      '  </div>',
      '  <div class="agnes-chat-tabs">',
      '    <button class="agnes-chat-tab agnes-active" data-mode="plan">行程规划</button>',
      '    <button class="agnes-chat-tab" data-mode="chat">景点问答</button>',
      '  </div>',
      '  <div class="agnes-chat-messages"></div>',
      '  <div class="agnes-quick-questions"></div>',
      '  <div class="agnes-chat-input-area">',
      '    <textarea class="agnes-chat-input" placeholder="输入你的问题..." rows="1" aria-label="消息输入框"></textarea>',
      '    <button class="agnes-chat-send" aria-label="发送" title="发送">',
      '      <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // ============ DOM 缓存 ============

  function cacheDom() {
    var root = document.querySelector('.agnes-chat-widget');
    dom.fab = root.querySelector('.agnes-chat-fab');
    dom.window = root.querySelector('.agnes-chat-window');
    dom.closeBtn = root.querySelector('.agnes-chat-close');
    dom.tabs = root.querySelectorAll('.agnes-chat-tab');
    dom.messages = root.querySelector('.agnes-chat-messages');
    dom.quickQuestions = root.querySelector('.agnes-quick-questions');
    dom.input = root.querySelector('.agnes-chat-input');
    dom.sendBtn = root.querySelector('.agnes-chat-send');
  }

  // ============ 事件绑定 ============

  function bindEvents() {
    // 浮动按钮点击
    dom.fab.addEventListener('click', toggleWindow);

    // 关闭按钮
    dom.closeBtn.addEventListener('click', closeWindow);

    // Tab 切换
    dom.tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var newMode = tab.getAttribute('data-mode');
        if (newMode === state.mode) return;
        switchMode(newMode);
      });
    });

    // 发送按钮
    dom.sendBtn.addEventListener('click', handleSend);

    // 输入框
    dom.input.addEventListener('keydown', function (e) {
      // Enter 发送，Shift+Enter 换行
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // 输入框自适应高度
    dom.input.addEventListener('input', autoResizeInput);

    // ESC 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isOpen) {
        closeWindow();
      }
    });
  }

  // ============ 窗口控制 ============

  function toggleWindow() {
    if (state.isOpen) {
      closeWindow();
    } else {
      openWindow();
    }
  }

  function openWindow() {
    state.isOpen = true;
    dom.fab.classList.add('agnes-hidden', 'agnes-opened');
    dom.window.classList.add('agnes-visible');
    // 延迟聚焦，等待动画完成
    setTimeout(function () {
      dom.input.focus();
      scrollToBottom();
    }, 300);
  }

  function closeWindow() {
    state.isOpen = false;
    dom.fab.classList.remove('agnes-hidden');
    dom.window.classList.remove('agnes-visible');
    dom.input.blur();
  }

  // ============ 模式切换 ============

  function switchMode(newMode) {
    state.mode = newMode;
    dom.tabs.forEach(function (tab) {
      tab.classList.toggle('agnes-active', tab.getAttribute('data-mode') === newMode);
    });
    renderQuickQuestions();
  }

  // ============ 渲染 ============

  function renderMessages() {
    dom.messages.innerHTML = '';

    if (state.messages.length === 0) {
      // 显示欢迎消息
      var welcome = document.createElement('div');
      welcome.className = 'agnes-chat-welcome';
      welcome.innerHTML = [
        '<div class="agnes-chat-welcome-icon">',
        '  <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
        '</div>',
        '<h4>你好！我是秦皇岛AI旅游助手 👋</h4>',
        '<p>我可以帮你规划行程、推荐景点和美食<br>选择上方模式，开始聊天吧！</p>'
      ].join('');
      dom.messages.appendChild(welcome);
      return;
    }

    state.messages.forEach(function (msg) {
      dom.messages.appendChild(createMessageEl(msg));
    });

    scrollToBottom();
  }

  function createMessageEl(msg) {
    var wrapper = document.createElement('div');
    wrapper.className = 'agnes-msg agnes-msg-' + msg.role;

    if (msg.role === 'assistant') {
      // AI 头像
      var avatar = document.createElement('div');
      avatar.className = 'agnes-msg-ai-avatar';
      avatar.innerHTML = [
        '<div class="agnes-msg-ai-avatar-icon">',
        '  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
        '</div>',
        '<span>AI助手</span>'
      ].join('');
      wrapper.appendChild(avatar);
    }

    var bubble = document.createElement('div');
    bubble.className = 'agnes-msg-bubble agnes-md';
    bubble.innerHTML = renderMarkdown(msg.content);
    wrapper.appendChild(bubble);

    return wrapper;
  }

  function renderQuickQuestions() {
    var questions = QUICK_QUESTIONS[state.mode] || QUICK_QUESTIONS.chat;
    dom.quickQuestions.innerHTML = '';

    questions.forEach(function (q) {
      var btn = document.createElement('button');
      btn.className = 'agnes-quick-q';
      btn.textContent = q;
      btn.addEventListener('click', function () {
        dom.input.value = q;
        handleSend();
      });
      dom.quickQuestions.appendChild(btn);
    });
  }

  // ============ 发送消息 ============

  function handleSend() {
    var text = dom.input.value.trim();
    if (!text || state.isStreaming) return;

    // 添加用户消息
    var userMsg = { role: 'user', content: text, timestamp: Date.now() };
    state.messages.push(userMsg);
    saveHistory();

    // 清空输入框
    dom.input.value = '';
    autoResizeInput();

    // 重新渲染消息（含用户消息）
    renderMessages();

    // 创建 AI 占位消息（流式填充）
    var aiMsg = { role: 'assistant', content: '', timestamp: Date.now() };
    state.messages.push(aiMsg);

    // 显示打字指示器
    showTypingIndicator();

    // 发送请求
    streamChat(text);
  }

  // ============ 流式请求 ============

  function streamChat(userText) {
    state.isStreaming = true;
    updateSendButton();

    // 构建发送给 API 的消息（不包含空的 AI 占位）
    var apiMessages = state.messages
      .filter(function (m) { return m.content.trim() !== ''; })
      .map(function (m) {
        return { role: m.role, content: m.content };
      });

    // 支持中断
    if (typeof AbortController !== 'undefined') {
      state.abortController = new AbortController();
    }

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages, mode: state.mode }),
      signal: state.abortController ? state.abortController.signal : undefined
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json().then(function (err) {
            throw new Error(err.message || '请求失败 (' + response.status + ')');
          }).catch(function () {
            throw new Error('请求失败 (' + response.status + ')');
          });
        }

        if (!response.body) {
          throw new Error('浏览器不支持流式响应');
        }

        // 移除打字指示器，开始流式渲染
        removeTypingIndicator();
        startStreamingRender();

        // 读取 SSE 流
        return readSSEStream(response.body);
      })
      .then(function () {
        // 流完成
        finishStreaming();
      })
      .catch(function (err) {
        removeTypingIndicator();

        if (err.name === 'AbortError') {
          // 用户主动中断，保留已有内容
          if (state.messages.length > 0 && state.messages[state.messages.length - 1].content === '') {
            state.messages.pop();
          }
        } else {
          // 显示错误
          showError(err.message || '网络错误，请稍后重试');
          // 移除空的 AI 占位消息
          if (state.messages.length > 0 && state.messages[state.messages.length - 1].content === '') {
            state.messages.pop();
          }
        }

        finishStreaming();
        renderMessages();
      });
  }

  /**
   * 读取 SSE 流并逐块更新 AI 消息
   * @param {ReadableStream} stream
   * @returns {Promise<void>}
   */
  function readSSEStream(stream) {
    var reader = stream.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';
    var aiMsgIndex = state.messages.length - 1;

    function processBuffer() {
      // SSE 以双换行分隔事件
      var lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后不完整的行

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();

        if (!line || line.startsWith(':')) continue; // 空行或注释
        if (!line.startsWith('data:')) continue;

        var data = line.slice(5).trim();

        if (data === '[DONE]') {
          return true; // 流结束
        }

        try {
          var parsed = JSON.parse(data);
          var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;

          if (delta && delta.content) {
            // 追加内容到 AI 消息
            state.messages[aiMsgIndex].content += delta.content;
            updateStreamingBubble(state.messages[aiMsgIndex].content);
          }
        } catch (e) {
          // 忽略解析错误的行
        }
      }

      return false;
    }

    function pump() {
      return reader.read().then(function (result) {
        if (result.done) {
          // 处理剩余缓冲
          if (buffer.trim()) {
            processBuffer();
          }
          return;
        }

        buffer += decoder.decode(result.value, { stream: true });

        if (processBuffer()) {
          // [DONE] 收到，结束
          return;
        }

        return pump();
      });
    }

    return pump();
  }

  // ============ 流式渲染 ============

  var streamingBubble = null;

  function startStreamingRender() {
    // 移除欢迎消息（如果存在）
    var welcome = dom.messages.querySelector('.agnes-chat-welcome');
    if (welcome) welcome.remove();

    // 创建 AI 消息元素
    var msgEl = createMessageEl({ role: 'assistant', content: '' });
    // 如果之前没有消息，先清空欢迎消息
    if (dom.messages.querySelector('.agnes-chat-welcome')) {
      dom.messages.innerHTML = '';
    }
    dom.messages.appendChild(msgEl);
    streamingBubble = msgEl.querySelector('.agnes-msg-bubble');
    scrollToBottom();
  }

  function updateStreamingBubble(content) {
    if (!streamingBubble) return;
    streamingBubble.innerHTML = renderMarkdown(content);
    scrollToBottom();
  }

  function finishStreaming() {
    state.isStreaming = false;
    state.abortController = null;
    streamingBubble = null;
    updateSendButton();
    saveHistory();
  }

  // ============ 打字指示器 ============

  function showTypingIndicator() {
    // 移除欢迎消息
    var welcome = dom.messages.querySelector('.agnes-chat-welcome');
    if (welcome) welcome.remove();

    var typing = document.createElement('div');
    typing.className = 'agnes-msg agnes-msg-ai';
    typing.id = 'agnes-typing-wrapper';

    var avatar = document.createElement('div');
    avatar.className = 'agnes-msg-ai-avatar';
    avatar.innerHTML = [
      '<div class="agnes-msg-ai-avatar-icon">',
      '  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      '</div>',
      '<span>AI助手</span>'
    ].join('');

    var bubble = document.createElement('div');
    bubble.className = 'agnes-msg-bubble';
    bubble.style.padding = '0';
    bubble.innerHTML = '<div class="agnes-typing"><span class="agnes-typing-dot"></span><span class="agnes-typing-dot"></span><span class="agnes-typing-dot"></span></div>';

    typing.appendChild(avatar);
    typing.appendChild(bubble);
    dom.messages.appendChild(typing);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    var typing = document.getElementById('agnes-typing-wrapper');
    if (typing) typing.remove();
  }

  // ============ 错误显示 ============

  function showError(message) {
    var errEl = document.createElement('div');
    errEl.className = 'agnes-msg-error';
    errEl.textContent = '⚠ ' + message;
    dom.messages.appendChild(errEl);
    scrollToBottom();
  }

  // ============ 工具函数 ============

  function updateSendButton() {
    dom.sendBtn.disabled = state.isStreaming;
    dom.input.disabled = state.isStreaming;
    if (state.isStreaming) {
      dom.input.placeholder = 'AI 正在回复...';
    } else {
      dom.input.placeholder = '输入你的问题...';
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(function () {
      dom.messages.scrollTop = dom.messages.scrollHeight;
    });
  }

  function autoResizeInput() {
    dom.input.style.height = 'auto';
    dom.input.style.height = Math.min(dom.input.scrollHeight, 100) + 'px';
  }

  /**
   * 简单 Markdown 渲染
   * 支持：加粗、斜体、行内代码、代码块、标题、无序列表、有序列表、换行
   * @param {string} text
   * @returns {string} HTML
   */
  function renderMarkdown(text) {
    if (!text) return '';

    // 先转义 HTML
    var html = escapeHtml(text);

    // 代码块 ```lang\ncode\n```
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, function (match, lang, code) {
      return '<pre><code>' + code.trim() + '</code></pre>';
    });

    // 标题 ### / ## / #
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // 加粗 **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体 *text*（加粗已先处理，剩余单个 * 视为斜体）
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // 行内代码 `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 无序列表项 - 或 *
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    // 将连续的 <li> 包裹在 <ul> 中
    html = html.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, function (match) {
      return '<ul>' + match + '</ul>';
    });

    // 有序列表项 1. 2. 3.
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // 段落处理：将连续非标签行包裹在 <p> 中
    html = html.replace(/^(?!<[hupol])(.+)$/gm, function (match, line) {
      return line.trim() ? '<p>' + line + '</p>' : '';
    });

    return html;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============ 本地存储 ============

  function saveHistory() {
    try {
      // 限制保存数量
      var toSave = state.messages.slice(-MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: state.mode,
        messages: toSave,
        savedAt: Date.now()
      }));
    } catch (e) {
      // localStorage 可能不可用（隐私模式等），忽略错误
    }
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      var data = JSON.parse(raw);
      if (data && Array.isArray(data.messages) && data.messages.length > 0) {
        state.messages = data.messages;
        state.mode = data.mode || 'plan';
      }
    } catch (e) {
      // 解析失败，忽略
    }
  }

  function clearHistory() {
    state.messages = [];
    saveHistory();
    renderMessages();
  }

  // ============ 启动 ============

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
