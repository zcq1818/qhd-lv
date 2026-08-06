# 博客阅读量统计配置说明

## 功能说明

博客文章页和博客列表页已集成阅读量统计功能：
- **文章页**：自动 +1 并显示阅读次数（30分钟内同浏览器不重复计数）
- **列表页**：批量显示所有文章的阅读量
- **数据存储**：Vercel KV（免费额度：每日 300,000 次请求）

## ⚠️ 部署前必做：创建 Vercel KV 数据库

阅读量功能需要 Vercel KV 支持，未配置时显示为 0 且不报错。配置步骤：

### 第1步：创建 KV 数据库

1. 登录 https://vercel.com/dashboard
2. 进入你的项目（qhd-lv / divdu.com）
3. 点击顶部 **Storage** 标签
4. 点击 **Create Database** → 选择 **KV**
5. 数据库名称填 `blog-views`（随意）
6. 选择区域（推荐 Washington D.C. - 默认）
7. 点击 **Create**

### 第2步：链接到项目

1. 创建完成后，点击 **Connect to Project**
2. 选择你的项目（qhd-lv）
3. 环境选 **Production**（+ 可加 Preview）
4. 点击 **Connect**

### 第3步：自动注入环境变量

链接后，Vercel 会自动注入以下环境变量（无需手动配置）：
- `KV_REST_API_URL` - KV REST API 地址
- `KV_REST_API_TOKEN` - KV REST API Token

### 第4步：重新部署

1. 进入 **Deployments** 页面
2. 找到最新部署 → 点击 `...` → **Redeploy**
3. 等待 1-2 分钟部署完成

### 第5步：验证

- 访问任意博客文章，如 https://www.divdu.com/blog/yutian-qilihai-guide-2026
- 文章meta区应显示 "X 次阅读"（首次访问为 1）
- 访问 https://www.divdu.com/blog 列表页，每张卡片右下角应显示阅读量
- 访问 https://www.divdu.com/api/view-counter?list=1 可查看所有文章阅读量JSON数据

## 文件清单

| 文件 | 作用 |
|------|------|
| `api/view-counter.js` | Edge Function API，处理阅读量读写 |
| `js/view-counter.js` | 前端逻辑，自动计数+显示 |
| `blog/*.html` | 文章页meta区有 `[data-view-count]` 显示元素 |
| `blog.html` | 列表页通过JS动态注入slug和阅读量显示 |

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/view-counter?slug=xxx` | POST | 阅读量+1，返回新计数 |
| `/api/view-counter?slug=xxx` | GET | 只读取计数（不+1） |
| `/api/view-counter?list=1` | GET | 批量读取所有文章计数 |

## 数据查看

- **Vercel 后台**：Storage → blog-views → 查看所有 `views:*` 键值
- **API 查询**：访问 `/api/view-counter?list=1` 返回JSON

## 费用

- Vercel KV 免费额度：每日 300,000 次请求
- 足够博客站点使用，无需付费

## 故障排查

**问题：阅读量一直显示 0**
- 检查 Vercel KV 是否已链接到项目
- 检查环境变量 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 是否存在
- 访问 `/api/view-counter?slug=test` 查看返回是否包含 `KV_NOT_CONFIGURED`

**问题：API 返回 500 错误**
- 检查 Vercel Functions 日志
- 确认 KV 数据库状态正常
