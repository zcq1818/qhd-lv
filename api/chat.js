/**
 * 秦皇岛旅游网站 — Agnes 2.0 Flash AI 聊天后端代理
 * Vercel Serverless Function
 *
 * 功能：
 * - 从环境变量读取 API Key（绝不硬编码）
 * - 接收前端 POST 请求 { messages, mode }
 * - 根据 mode 注入不同系统提示词
 * - 转发到 Agnes AI API，支持流式 SSE 透传
 * - 错误处理与 CORS
 *
 * 环境变量：AGNES_API_KEY
 */

const AGNES_API_BASE = 'https://apihub.agnes-ai.com/v1';
const AGNES_MODEL = 'agnes-2.0-flash';
const CHAT_ENDPOINT = '/chat/completions';
const UPSTREAM_TIMEOUT_MS = 55000; // 上游请求超时 55 秒（略低于 Vercel 60 秒上限）

// ============ 系统提示词 ============

const SYSTEM_PROMPTS = {
  plan: `你是秦皇岛旅游规划助手，专注于帮助用户规划秦皇岛旅行行程。

你了解秦皇岛的核心旅游资源：
- 北戴河海滨风景区：中国四大避暑胜地之一，沙滩细腻、海水清澈
- 鸽子窝公园：北戴河最佳日出观赏地，鹰角石矗立海边
- 山海关·天下第一关：明长城东北关隘，六百年历史
- 老龙头景区：长城唯一入海处，澄海楼、入海石城
- 黄金海岸：沙滩细腻，有国际滑沙中心
- 碧螺塔海上酒吧公园：北戴河夜生活地标
- 老虎石海上公园：北戴河最著名的海滨浴场

秦皇岛美食：海鲜大排档（石塘路市场自购加工）、烤生蚝烤扇贝、四条包子（山海关百年老店）、山海关焖子、饸饹面

交通：高铁首选北戴河站（离景区最近），北京出发2小时。34路公交直达海滨。
住宿：北戴河区最方便（靠海），海港区最经济，山海关区适合文化游。
最佳时间：5月中-6月初 / 9月，避开7-8月暑假高峰。

请根据用户的需求（天数、预算、兴趣偏好），提供详细的行程规划建议，包含每天的时间安排、景点推荐、美食建议和预算参考。回答使用中文，格式清晰。`,

  chat: `你是秦皇岛旅游景点问答助手，帮助用户了解秦皇岛的景点、美食、交通、住宿等信息。

你了解秦皇岛的核心信息：
景点：北戴河海滨、鸽子窝公园、山海关、老龙头、黄金海岸、碧螺塔、老虎石
美食：海鲜大排档、烤生蚝、四条包子、山海关焖子
交通：高铁北戴河站，34路公交
住宿：北戴河区/海港区/山海关区
最佳时间：5月中-6月初/9月

请简洁、准确地回答用户关于秦皇岛旅游的问题。如果用户问的不是秦皇岛旅游相关内容，请礼貌引导回旅游话题。回答使用中文。`
};

// ============ 简易内存速率限制（单实例级别） ============

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 分钟窗口
const RATE_LIMIT_MAX = 20; // 每分钟最多 20 次（对应免费计划 20 RPM）

/**
 * 检查并更新速率限制
 * @param {string} clientId - 客户端标识
 * @returns {{allowed: boolean, retryAfter?: number}}
 */
function checkRateLimit(clientId) {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // 新窗口
    rateLimitMap.set(clientId, { windowStart: now, count: 1 });
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

// 注意：Serverless 函数为短生命周期，不做定期清理（Map 会在实例回收时自动释放）

// ============ 工具函数 ============

/**
 * 返回 JSON 错误响应
 * @param {number} status - HTTP 状态码
 * @param {string} message - 错误信息
 * @param {object} [extra] - 额外字段
 * @returns {Response}
 */
function errorResponse(status, message, extra) {
  return new Response(
    JSON.stringify({ error: true, message, ...extra }),
    {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}

/**
 * 验证并清洗消息数组
 * @param {any} messages - 前端传入的 messages
 * @returns {{valid: boolean, messages?: Array, error?: string}}
 */
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: 'messages 必须是非空数组' };
  }

  // 限制上下文长度，防止滥用
  if (messages.length > 50) {
    return { valid: false, error: '消息历史过长，请开启新对话' };
  }

  const cleaned = [];
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') continue;
    const role = String(msg.role || '');
    const content = String(msg.content || '');

    if (!['user', 'assistant', 'system'].includes(role)) {
      return { valid: false, error: `无效的角色: ${role}` };
    }
    if (!content.trim()) {
      return { valid: false, error: '消息内容不能为空' };
    }
    // 限制单条消息长度（约 8KB）
    if (content.length > 8000) {
      return { valid: false, error: '单条消息过长' };
    }

    cleaned.push({ role, content });
  }

  if (cleaned.length === 0) {
    return { valid: false, error: '没有有效的消息' };
  }

  return { valid: true, messages: cleaned };
}

// ============ 主处理函数 ============

/**
 * Vercel Serverless Function 入口
 * @param {Request} req - 请求对象
 * @returns {Promise<Response>}
 */
// 使用 CommonJS 格式（项目无 package.json，Vercel 默认 CommonJS）
module.exports = async function handler(req) {
  // ---- CORS 预检 ----
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // ---- 仅允许 POST ----
  if (req.method !== 'POST') {
    return errorResponse(405, '仅支持 POST 请求');
  }

  // ---- 检查 API Key ----
  const apiKey = process.env.AGNES_API_KEY;
  if (!apiKey) {
    console.error('[chat] AGNES_API_KEY 环境变量未设置');
    return errorResponse(500, '服务器未配置 AI API Key，请联系管理员');
  }

  // ---- 速率限制 ----
  const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
  const rateCheck = checkRateLimit(clientId);
  if (!rateCheck.allowed) {
    return errorResponse(429, '请求过于频繁，请稍后再试', {
      retryAfter: rateCheck.retryAfter
    });
  }

  // ---- 解析请求体 ----
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return errorResponse(400, '请求体不是有效的 JSON');
  }

  const { messages: rawMessages, mode: rawMode } = body;

  // ---- 验证 mode ----
  const mode = rawMode === 'plan' ? 'plan' : 'chat';

  // ---- 验证 messages ----
  const validation = validateMessages(rawMessages);
  if (!validation.valid) {
    return errorResponse(400, validation.error);
  }

  // ---- 注入系统提示词 ----
  const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...validation.messages
  ];

  // ---- 构建上游请求 ----
  const upstreamUrl = `${AGNES_API_BASE}${CHAT_ENDPOINT}`;
  const upstreamBody = JSON.stringify({
    model: AGNES_MODEL,
    messages: finalMessages,
    stream: true,
    temperature: mode === 'plan' ? 0.7 : 0.5,
    max_tokens: 2048
  });

  // ---- 转发到 Agnes AI（流式） ----
  let upstreamResponse;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: upstreamBody,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      console.error('[chat] 上游请求超时');
      return errorResponse(504, 'AI 响应超时，请换个简短的问题重试');
    }
    console.error('[chat] 上游请求失败:', e.message);
    return errorResponse(502, 'AI 服务暂时不可用，请稍后再试');
  }

  // ---- 处理上游错误 ----
  if (!upstreamResponse.ok) {
    let errorMsg = 'AI 服务返回错误';
    let errorDetail = '';
    try {
      const errorData = await upstreamResponse.json();
      errorDetail = errorData?.error?.message || errorData?.message || '';
    } catch (_) {
      // 非 JSON 错误体
      try {
        errorDetail = await upstreamResponse.text();
      } catch (_) {
        // 忽略
      }
    }

    if (upstreamResponse.status === 401) {
      errorMsg = 'API Key 无效或已过期';
    } else if (upstreamResponse.status === 429) {
      errorMsg = 'AI 服务请求达到上限，请稍后再试';
    } else if (upstreamResponse.status >= 500) {
      errorMsg = 'AI 服务内部错误，请稍后再试';
    }

    console.error(`[chat] 上游错误 ${upstreamResponse.status}: ${errorDetail}`);
    return errorResponse(upstreamResponse.status, errorMsg);
  }

  // ---- 透传流式响应（SSE） ----
  // 创建 TransformStream 来透传上游的 SSE 数据
  const { readable, writable } = new TransformStream({
    // 直接透传，不做修改
    transform(chunk, controller) {
      controller.enqueue(chunk);
    }
  });

  // 将上游响应体 pipe 到我们的可写流
  // 在后台异步执行 pipe，不阻塞返回
  (async () => {
    try {
      const reader = upstreamResponse.body.getReader();
      const writer = writable.getWriter();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
      await writer.close();
    } catch (e) {
      console.error('[chat] 流式透传错误:', e.message);
      try {
        await writable.abort(e);
      } catch (_) {
        // 忽略
      }
    }
  })();

  // 返回流式响应给前端
  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'
    }
  });
}
