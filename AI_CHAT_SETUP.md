# 秦皇岛AI旅游助手 — 部署配置说明

## 功能概述

网站已集成 Agnes 2.0 Flash AI 聊天功能，提供两种模式：

- **行程规划模式**：根据天数、预算、兴趣偏好，生成详细的秦皇岛旅行行程
- **景点问答模式**：回答关于秦皇岛景点、美食、交通、住宿的问题

所有页面右下角均有浮动聊天按钮，点击即可与AI助手对话，支持流式输出（打字机效果）。

## 文件结构

```
├── api/
│   └── chat.js              # Vercel Serverless Function（后端AI代理）
├── css/
│   └── chat-widget.css      # 聊天组件样式
├── js/
│   └── chat-widget.js       # 聊天组件逻辑（自执行，自动注入DOM）
├── .env.example             # 环境变量示例
└── AI_CHAT_SETUP.md         # 本文档
```

## 部署步骤

### 1. 获取 API Key

前往 [Agnes AI 平台](https://platform.agnes-ai.com) 注册并获取 API Key。

### 2. 配置环境变量

在 Vercel 项目设置中添加环境变量：

1. 进入 Vercel 项目 → **Settings** → **Environment Variables**
2. 添加变量：
   - **Key**: `AGNES_API_KEY`
   - **Value**: 你的 API Key
3. 选择所有环境（Production / Preview / Development）
4. 点击 **Save**

### 3. 部署

推送代码到 GitHub，Vercel 会自动部署。`/api/chat.js` 会自动被识别为 Serverless Function。

### 4. 验证

部署完成后：
- 访问任意页面，右下角应出现蓝色浮动按钮
- 点击按钮打开聊天窗口
- 选择模式后输入问题，AI 应流式返回回答

## 本地开发

### 方法一：Vercel CLI（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目根目录执行
vercel

# 按提示操作，选择链接到已有项目或创建新项目
# 然后设置本地环境变量
vercel env pull

# 本地运行（支持 Serverless Functions）
vercel dev
```

### 方法二：设置本地环境变量

```bash
# Linux/Mac
export AGNES_API_KEY=your_api_key_here

# Windows PowerShell
$env:AGNES_API_KEY="your_api_key_here"
```

然后使用 `vercel dev` 启动本地服务器（普通静态服务器无法运行 `/api` 函数）。

## API 规格

- **模型**: `agnes-2.0-flash`
- **上下文窗口**: 256K
- **免费计划限制**: 20 RPM（每分钟20次请求），1500 requests/5 hours
- **API 端点**: `https://apihub.agnes-ai.com/v1/chat/completions`
- **格式**: OpenAI 兼容，支持流式（SSE）

## 安全说明

- API Key **仅存在于服务端**（`api/chat.js` 通过 `process.env.AGNES_API_KEY` 读取），前端代码中不含任何密钥
- 后端代理已内置速率限制保护（20 RPM / IP）
- 请求消息经过验证和清洗（限制长度、角色白名单）
- CORS 处理确保同源请求安全

## 技术实现

- **后端**: Vercel Serverless Function（Node.js 原生 `fetch`，无第三方依赖）
- **流式传输**: 后端透传 Agnes AI 的 SSE 响应，前端通过 `fetch` + `ReadableStream` 逐字读取
- **前端**: 纯原生 JavaScript IIFE，无框架依赖，自动注入 DOM
- **样式**: 使用项目设计系统 CSS 变量，与整体视觉一致
- **存储**: 对话历史保存在 `localStorage`，刷新页面不丢失
