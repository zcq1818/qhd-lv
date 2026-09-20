# 博客内容合并与扩写执行记录

**执行日期：** 2026-09-20
**范围：** `blog/` 全量 175 篇 → 保留 86 篇

---

## 一、结果对比

| 指标 | 处理前 | 处理后 |
|---|---:|---:|
| 收录博客篇数 | 175 | 86 |
| 正文中文字数中位数 | 191 | 1308 |
| 正文 < 300 字 | 86 篇 | 3 篇（均已 noindex） |
| 正文 < 800 字 | 125 篇 | 21 篇 |
| 结尾正文逐字重复簇 | 30 篇共用同一段 | 0 |
| sitemap URL 总数 | 244 | 156 |

新增原创内容约 **23,000 中文字**。

---

## 二、三档处置

### A. 合并（89 篇 → 26 个长文/页面）

薄页内容被吸收进对应长文的新章节，原 URL 做 **301 永久重定向**到目标页锚点。

| 目标页 | 吸收篇数 | 主题 |
|---|---:|---|
| `qhd-sea-sports-guide` | 11 | 海上运动（摩托艇/香蕉船/滑翔伞/冲浪/潜水/海钓/游艇/跳岛/沙滩排球） |
| `qhd-emergency` | 9 | 实用信息与安全（就医/网络支付/寄存充电/海边安全） |
| `qhd-transport-guide-2026` | 8 | 交通（高铁/公交打车/周边城市） |
| `qhd-food-guide` | 7 | 美食（本地菜/烧烤/早餐/咖啡/特产/采摘） |
| `qhd-family-travel` | 7 | 亲子（分龄推荐/沙滩活动/游泳/观鸟） |
| `qhd-ganhai-schedule-2026` | 5 | 赶海（潮汐/地点/捡贝壳） |
| `beidaihe-where-to-stay` | 5 | 住宿（区域/酒店vs民宿/露营） |
| `qhd-what-to-bring` | 4 | 行前准备（穿衣/泳衣/防晒） |
| `geziwo-sunrise-guide` | 3 | 日出（时间/日出vs日落/晨跑） |
| `qhd-travel-budget` | 3 | 预算（穷游/门票省钱） |
| `qhd-photography-guide` | 3 | 摄影（机位/婚纱照） |
| `qhd-best-time-to-visit` | 3 | 最佳时间（春季/天气查询） |
| `beidaihe-2days-weekend` | 3 | 周末两天 |
| 其余 13 个目标 | 各 1–2 | 详见 `data/retired-posts.json` |

### B. 扩写（11 篇）

原本最薄但关键词最核心的页面，整体重写为 1300–1900 字长文：

`geziwo-sunrise-guide`（56→1724）、`qhd-food-guide`（59→1801）、`qhd-emergency`（184→1947）、
`qhd-what-to-bring`（127→1494）、`qhd-family-travel`（247→1637）、`qhd-transport-guide-2026`（425→1460）、
`qhd-travel-budget`（197→1388）、`qhd-winter-travel`（344→1299）、`qhd-hiking`（191→1295）、
`qhd-couple-trip-guide`、`qhd-photography-guide`（追加章节）

### C. noindex（3 篇）

`qhd-pet-friendly`、`beidaihe-wheelchair`、`beidaihe-group-travel` —— 主题小众、暂无合适归宿，
加 `noindex, follow` 保留站内链接权重传递，内容写够后再放开。

---

## 三、配套改动

- **`data/retired-posts.json`（新增）** —— 退役 slug 与重定向目标的唯一事实来源。
- **`vercel.json`** —— 新增 89 条 301，总计 92 条。
- **`scripts/generate-sitemap.js` / `scripts/gen-blog-index.js`** —— 读取退役清单并跳过，
  确保以后再跑生成脚本不会把重定向 URL 放回 sitemap。
- **`blog.html`** —— 移除 85 张退役卡片；JSON-LD 中另清掉 6 条指向不存在文件的死条目。
- **`rss.xml`** —— 移除 3 条已退役文章。
- **内链改写** —— 29 个文件共 101 处指向退役页的站内链接，改写为新目标锚点。
- **索引重建** —— `sitemap.xml`、`data/blog-index.json`、`js/search-index.js`、`data/related-guides.json`。

### 顺带修掉的既有缺陷（非本次合并引入）

1. **JSON-LD 语法错误（6 个文件）** —— 描述文本里的英文直引号未转义，导致整块结构化数据无法解析，
   `FAQPage` / `Article` 标记等于失效。已逐块修复。
2. **`weather-widget.js` 路径错误（102 个页面）** —— `blog/` 和 `attraction/` 下写成扁平路径
   `js/weather-widget.js`，实际请求 `/blog/js/...` 返回 404，天气组件从未加载。已改为 `../js/`，
   与已经正确的另外 30 个页面统一。
3. **孤立 `</div>`（3 个采集页，共 8 个）** —— 抓取内容残留的无主闭合标签，已移除。
4. **一处失效内链** —— `../qhd-food-guide` → `../blog/qhd-food-guide`。

---

## 四、上线前检查

1. **确认 Vercel 环境变量**：`QWEATHER_API_KEY`、`QWEATHER_API_HOST`（天气/潮汐接口已改为强制读环境变量）。
2. **轮换和风天气旧密钥**（曾硬编码并进入 Git 历史）。
3. 部署后抽查几条 301 是否生效，例如
   `/blog/qhd-jet-ski` → `/blog/qhd-sea-sports-guide#shuishang`。
4. 在搜索引擎站长平台重新提交 `sitemap.xml`。

## 五、遗留项

- 89 个退役页面仍以「跳转桩」形式保留在 `blog/` 目录（301 已使其不可达）。确认线上无误后可直接删除，
  同时保留 `vercel.json` 的 301 与 `data/retired-posts.json`。
- `js/search.min.js`、`css/search.min.css`（旧版搜索组件）现已无任何页面引用，可一并删除。
- `scripts/build.js` 的 `minifyJS` 是正则实现，会压掉换行，对依赖 ASI 的代码有风险，建议换成 terser。
