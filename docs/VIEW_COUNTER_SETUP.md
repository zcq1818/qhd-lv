# 博客阅读量统计配置说明

## 功能说明

博客文章页和博客列表页已集成阅读量统计功能：
- **文章页**：自动 +1 并显示阅读次数（30分钟内同浏览器不重复计数）
- **列表页**：批量显示所有文章的阅读量
- **数据存储**：Upstash Redis（免费额度：每日 10,000 次命令）

## ⚠️ 部署前必做：创建 Upstash Redis 数据库

Vercel KV 已被弃用，现在使用 Upstash Redis 替代。配置步骤：

### 第1步：创建 Upstash Redis 数据库

**方式A：通过 Vercel Marketplace（推荐，最简单）**

1. 登录 https://vercel.com/dashboard
2. 进入你的项目（qhd-lv / divdu.com）
3. 点击顶部 **Storage** 标签
4. 点击 **Create Database** → 选择 **Upstash Redis**
5. 数据库名称填 `blog-views`（随意）
6. 选择区域（推荐 Washington D.C. - 默认）
7. 点击 **Create**

**方式B：通过 Upstash 官网（如果 Vercel Marketplace 没显示）**

1. 访问 https://console.upstash.com/login
2. 用 GitHub 或 Google 登录（免费）
3. 点击 **Create Database**
4. Name: `blog-views`
5. Region: `AWS US-East-1`（或就近选择）
6. 点击 **Create**
7. 创建后进入数据库详情页，找到 **REST API** 部分
8. 复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 的值
9. 回到 Vercel 项目 → **Settings** → **Environment Variables**
10. 手动添加这两个环境变量：
    - Name: `UPSTASH_REDIS_REST_URL`，Value: 复制的URL
    - Name: `UPSTASH_REDIS_REST_TOKEN`，Value: 复制的Token

### 第2步：链接到项目（仅方式A需要）

如果用 Vercel Marketplace 创建：
1. 创建完成后，点击 **Connect to Project**
2. 选择你的项目（qhd-lv）
3. 环境选 **Production**（+ 可加 Preview）
4. 点击 **Connect**
5. 环境变量会自动注入（`UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`）

### 第3步：重新部署

1. 进入 **Deployments** 页面
2. 找到最新部署 → 点击 `...` → **Redeploy**
3. 等待 1-2 分钟部署完成

### 第4步：验证

- 访问任意博客文章，如 https://www.divdu.com/blog/yutian-qilihai-guide-2026
- 文章meta区应显示 "X 次阅读"（首次访问为 1）
- 访问 https://www.divdu.com/blog 列表页，每张卡片右下角应显示阅读量
- 访问 https://www.divdu.com/api/view-counter?list=1 可查看所有文章阅读量JSON数据
- 访问 https://www.divdu.com/api/view-counter?slug=test 可查看单篇文章（应返回 count: 0）

## 文件清单

| 文件 | 作用 |
|------|------|
| `api/view-counter.js` | Edge Function API，处理阅读量读写（兼容 Upstash + KV） |
| `js/view-counter.js` | 前端逻辑，自动计数+显示 |
| `blog/*.html` | 文章页meta区有 `[data-view-count]` 显示元素 |
| `blog.html` | 列表页通过JS动态注入slug和阅读量显示 |

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/view-counter?slug=xxx` | POST | 阅读量+1（原子INCR），返回新计数 |
| `/api/view-counter?slug=xxx` | GET | 只读取计数（不+1） |
| `/api/view-counter?list=1` | GET | 批量读取所有文章计数 |

## 数据查看

- **Upstash 控制台**：console.upstash.com → 进入数据库 → 查看数据
- **API 查询**：访问 `/api/view-counter?list=1` 返回JSON
- **Vercel 日志**：Functions 日志可查看请求记录

## 费用

- Upstash Redis 免费额度：每日 10,000 次命令
- 足够博客站点使用，无需付费
- 超出免费额度后按量计费（$0.2/10万次命令）

## 兼容性

API 代码自动检测环境变量，兼容两种存储：
1. **Upstash Redis（推荐）**：`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
2. **旧版 Vercel KV**：`KV_REST_API_URL` + `KV_REST_API_TOKEN`

## 故障排查

**问题：阅读量一直显示 0**
- 检查 Upstash Redis 是否已链接到项目
- 检查环境变量 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 是否存在
- 访问 `/api/view-counter?slug=test` 查看返回是否包含 `REDIS_NOT_CONFIGURED`

**问题：API 返回 500 错误**
- 检查 Vercel Functions 日志
- 确认 Upstash Redis 数据库状态正常
- 检查环境变量值是否完整（无多余空格）

**问题：列表页阅读量不显示**
- 检查浏览器控制台是否有 JS 错误
- 确认 `/api/view-counter?list=1` 返回正常数据
- 列表页阅读量有5分钟缓存，新访问的文章可能延迟显示
