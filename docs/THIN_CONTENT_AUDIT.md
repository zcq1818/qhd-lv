# 秦皇岛旅游官网 · 博客薄内容盘点

盘点日期：2026-09-20　范围：`blog/` 共 **175** 篇

统计口径：只计 `article-body` 容器内的正文中文字符数，不含标题、导航、页脚、FAQ 结构化数据。

## 一、整体分布

| 正文中文字数 | 篇数 | 占比 |
|---|---|---|
| 0–200 字 | 67 | 38% |
| 200–300 字 | 19 | 10% |
| 300–500 字 | 10 | 5% |
| 500–800 字 | 29 | 16% |
| 800–1500 字 | 24 | 13% |
| 1500 字以上 | 26 | 14% |

中位数 **344 字**，最少 56 字，最多 3746 字。

> 参考线：中文旅游攻略类页面，正文低于 300 字基本会被搜索引擎判为薄内容；300–500 字属边缘；800 字以上才算有独立价值。

## 二、最严重的问题：模板化重复

**30 篇文章的结尾正文逐字相同**，内容为：

> 是秦皇岛最热门的旅游区，拥有优质的海滩、丰富的景点和完善的配套设施。无论是看日出、赶海、游泳还是品尝海鲜，北戴河都能满足你的需求。最佳旅游时间6-9月是旺季，其中7-8月最适合游泳。5月和9月人少价低，适合错峰出行。冬天可以看冻海和泡温泉。…

涉及页面：

```
beidaihe-sand-sculpture           beidaihe-indoor-pool              beidaihe-parasailing
beidaihe-banana-boat              beidaihe-lost-child               beidaihe-yacht
beidaihe-kite                     beidaihe-island-hop               beidaihe-jellyfish
beidaihe-tide-app                 beidaihe-power-bank               beidaihe-swimsuit
beidaihe-luggage                  beidaihe-map-guide                beidaihe-shell-collecting
beidaihe-night-life               beidaihe-wheelchair               beidaihe-souvenirs
beidaihe-weekend-guide            beidaihe-ganhai-spots             beidaihe-coffee
beidaihe-fishing                  beidaihe-homestay-tips            beidaihe-surfing
beidaihe-winter-hot-spring        beidaihe-camping-hotel            beidaihe-breakfast
beidaihe-hotel-vs-bnb             beidaihe-camping                  beidaihe-instagram
```

这些页面的结构都是「1–2 句标题相关的开场 + 完全相同的『必去景点 / 美食推荐 / 行程建议』三段」。
同站内大面积复制，比单纯字数少更容易触发降权——搜索引擎会认为整个 `blog/` 目录是批量生成的低质内容农场，拖累 175 篇里那些真正写得好的长文。

## 三、正文不足 300 字的页面（86 篇）

「重复」列标记该页是否属于上面的重复簇。

| # | 字数 | 重复 | slug | 标题 |
|---:|---:|:--:|---|---|
| 1 | 56 |  | `geziwo-sunrise-guide` | 北戴河看日出全攻略 | 秦皇岛 |
| 2 | 58 |  | `qhd-ganhai-guide` | 北戴河赶海攻略 | 潮汐·地点·装备 | 秦皇岛 |
| 3 | 59 |  | `qhd-food-guide` | 秦皇岛美食攻略 | 10大必吃小吃 | 秦皇岛 |
| 4 | 127 |  | `qhd-what-to-bring` | 去秦皇岛带什么 | 必备物品清单 — 秦皇岛 |
| 5 | 136 |  | `qhd-what-to-wear` | 秦皇岛穿什么 | 四季穿衣指南 — 秦皇岛 |
| 6 | 144 |  | `qhd-sunburn-tips` | 北戴河防晒攻略 | 海边不晒黑的秘诀 — 秦皇岛 |
| 7 | 171 |  | `qhd-bike-ride` | 秦皇岛骑行攻略 | 海边骑行路线 — 秦皇岛 |
| 8 | 174 |  | `qhd-one-day-trip` | 秦皇岛一日游攻略 | 精华路线 — 秦皇岛 |
| 9 | 182 |  | `qhd-wifi-guide` | 秦皇岛WiFi攻略 | 景区网络覆盖 — 秦皇岛 |
| 10 | 183 |  | `qhd-diving` | 秦皇岛潜水 | 海底世界 — 秦皇岛 |
| 11 | 183 |  | `qhd-jet-ski` | 秦皇岛摩托艇 | 海上飙车 — 秦皇岛 |
| 12 | 183 |  | `qhd-kite-surfing` | 秦皇岛风筝冲浪 | 极限运动 — 秦皇岛 |
| 13 | 184 |  | `qhd-beach-volleyball` | 秦皇岛沙滩排球 | 海边运动 — 秦皇岛 |
| 14 | 184 |  | `qhd-emergency` | 秦皇岛紧急电话 | 报警·急救·投诉 — 秦皇岛 |
| 15 | 184 |  | `qhd-wifi-password` | 秦皇岛WiFi密码 | 景区免费WiFi — 秦皇岛 |
| 16 | 185 |  | `qhd-water-park` | 秦皇岛水上乐园 | 夏天玩水 — 秦皇岛 |
| 17 | 185 |  | `qhd-weather-app` | 秦皇岛天气APP | 看天气用什么 — 秦皇岛 |
| 18 | 186 |  | `qhd-sand-castle` | 秦皇岛堆沙堡攻略 | 亲子活动 — 秦皇岛 |
| 19 | 186 |  | `qhd-to-tianjin` | 秦皇岛到天津 | 周末游攻略 — 秦皇岛 |
| 20 | 187 | 是 | `beidaihe-sand-sculpture` | 北戴河沙雕艺术 | 沙雕展 — 秦皇岛 |
| 21 | 187 |  | `qhd-barbecue` | 秦皇岛烧烤攻略 | 去哪吃烧烤 — 秦皇岛 |
| 22 | 187 |  | `qhd-sunrise-alarm` | 秦皇岛日出时间 | 几点起床看日出 — 秦皇岛 |
| 23 | 187 |  | `qhd-sunscreen-review` | 秦皇岛防晒霜推荐 | 实测对比 — 秦皇岛 |
| 24 | 188 |  | `beidaihe-group-travel` | 北戴河团建攻略 | 公司团建推荐 — 秦皇岛 |
| 25 | 188 | 是 | `beidaihe-indoor-pool` | 北戴河室内泳池 | 雨天游泳 — 秦皇岛 |
| 26 | 188 | 是 | `beidaihe-parasailing` | 北戴河滑翔伞 | 空中看海 — 秦皇岛 |
| 27 | 188 |  | `qhd-fishing-boat` | 秦皇岛出海打渔 | 渔船体验 — 秦皇岛 |
| 28 | 188 |  | `qhd-group-discount` | 秦皇岛团体票优惠 | 多人省钱攻略 — 秦皇岛 |
| 29 | 188 |  | `qhd-sea-gull` | 秦皇岛喂海鸥 | 观鸟攻略 — 秦皇岛 |
| 30 | 189 |  | `beidaihe-sunrise-vs-sunset` | 北戴河日出和日落 | 哣个更值得看 — 秦皇岛 |
| 31 | 189 |  | `qhd-elderly-guide` | 秦皇岛老人旅游 | 适合老人的行程 — 秦皇岛 |
| 32 | 189 |  | `qhd-tide-table` | 秦皇岛潮汐表 | 赶海看潮汐 — 秦皇岛 |
| 33 | 190 | 是 | `beidaihe-banana-boat` | 北戴河香蕉船 | 海上娱乐 — 秦皇岛 |
| 34 | 190 |  | `qhd-taxi-guide` | 秦皇岛打车攻略 | 注意事项和价格 — 秦皇岛 |
| 35 | 190 |  | `qhd-wechat-pay` | 秦皇岛支付攻略 | 微信支付宝 — 秦皇岛 |
| 36 | 191 | 是 | `beidaihe-lost-child` | 北戴河孩子走失 | 安全须知 — 秦皇岛 |
| 37 | 191 | 是 | `beidaihe-yacht` | 北戴河游艇 | 包船出海 — 秦皇岛 |
| 38 | 191 |  | `qhd-hiking` | 秦皇岛爬山攻略 | 祖山·角山·联峰山 — 秦皇岛 |
| 39 | 191 |  | `qhd-weather-tips` | 秦皇岛天气攻略 | 什么时候去最好 — 秦皇岛 |
| 40 | 192 | 是 | `beidaihe-kite` | 北戴河放风筝 | 海边放风筝 — 秦皇岛 |
| 41 | 192 |  | `qhd-rain-activities` | 秦皇岛下雨天 | 10个室内活动 — 秦皇岛 |
| 42 | 192 |  | `qhd-seafood-cooking` | 秦皇岛海鲜怎么做 | 买回自己做 — 秦皇岛 |
| 43 | 193 | 是 | `beidaihe-island-hop` | 北戴河跳岛游 | 周边小岛 — 秦皇岛 |
| 44 | 193 | 是 | `beidaihe-jellyfish` | 北戴河有水母吗 | 海边安全须知 — 秦皇岛 |
| 45 | 193 | 是 | `beidaihe-tide-app` | 北戴河潮汐APP | 查潮汐用什么 — 秦皇岛 |
| 46 | 193 |  | `qhd-to-beijing` | 秦皇岛到北京 | 周末往返攻略 — 秦皇岛 |
| 47 | 193 |  | `qhd-wedding-photo` | 秦皇岛婚纱照 | 海边拍照攻略 — 秦皇岛 |
| 48 | 194 | 是 | `beidaihe-power-bank` | 北戴河充电宝 | 租借攻略 — 秦皇岛 |
| 49 | 194 | 是 | `beidaihe-swimsuit` | 北戴河泳衣攻略 | 买还是自带 — 秦皇岛 |
| 50 | 194 |  | `qhd-hospital` | 秦皇岛医院攻略 | 旅游生病怎么办 — 秦皇岛 |
| 51 | 194 |  | `qhd-train-ticket` | 秦皇岛高铁票怎么买 | 购票攻略 — 秦皇岛 |
| 52 | 195 | 是 | `beidaihe-luggage` | 北戴河行李寄存 | 存放攻略 — 秦皇岛 |
| 53 | 195 | 是 | `beidaihe-map-guide` | 北戴河地图攻略 | 景点分布图 — 秦皇岛 |
| 54 | 195 | 是 | `beidaihe-shell-collecting` | 北戴河捡贝壳 | 哪里贝壳多 — 秦皇岛 |
| 55 | 195 |  | `qhd-student-budget` | 秦皇岛学生穷游攻略 | 500元玩3天 — 秦皇岛 |
| 56 | 196 | 是 | `beidaihe-night-life` | 北戴河夜生活 | 晚上玩什么 — 秦皇岛 |
| 57 | 196 | 是 | `beidaihe-wheelchair` | 北戴河无障碍旅游 | 轮椅出行攻略 — 秦皇岛 |
| 58 | 196 |  | `qhd-bus-guide` | 秦皇岛公交攻略 | 34路·37路全指南 — 秦皇岛 |
| 59 | 196 |  | `qhd-pet-friendly` | 秦皇岛能带宠物吗 | 宠物友好攻略 — 秦皇岛 |
| 60 | 197 | 是 | `beidaihe-souvenirs` | 北戴河买什么特产 | 伴手礼推荐 — 秦皇岛 |
| 61 | 197 |  | `beidaihe-ticket-discount` | 北戴河景区门票优惠 | 省钱购票攻略 — 秦皇岛 |
| 62 | 197 | 是 | `beidaihe-weekend-guide` | 北戴河周末游攻略 | 2天1晚行程 — 秦皇岛 |
| 63 | 197 |  | `qhd-to-chengde` | 秦皇岛到承德 | 草原避暑攻略 — 秦皇岛 |
| 64 | 197 |  | `qhd-train-guide` | 秦皇岛火车站攻略 | 哪个站离景区近 — 秦皇岛 |
| 65 | 197 |  | `qhd-travel-budget` | 秦皇岛旅游花多少钱 | 预算攻略 — 秦皇岛 |
| 66 | 198 | 是 | `beidaihe-ganhai-spots` | 北戴河赶海地点 | 本地人推荐 — 秦皇岛 |
| 67 | 198 |  | `qhd-fruit-picking` | 秦皇岛水果采摘 | 葡萄·樱桃·草莓 — 秦皇岛 |
| 68 | 200 | 是 | `beidaihe-coffee` | 北戴河咖啡馆 | 海边喝咖啡推荐 — 秦皇岛 |
| 69 | 200 | 是 | `beidaihe-fishing` | 北戴河海钓攻略 | 钓鱼地点推荐 — 秦皇岛 |
| 70 | 200 | 是 | `beidaihe-homestay-tips` | 北戴河民宿避坑 | 选民宿注意事项 — 秦皇岛 |
| 71 | 200 | 是 | `beidaihe-surfing` | 北戴河能冲浪吗 | 水上运动攻略 — 秦皇岛 |
| 72 | 200 |  | `qhd-local-food` | 秦皇岛本地人吃什么 | 地道美食推荐 — 秦皇岛 |
| 73 | 201 |  | `beidaihe-morning-jog` | 北戴河晨跑路线 | 海边跑步推荐 — 秦皇岛 |
| 74 | 201 | 是 | `beidaihe-winter-hot-spring` | 北戴河冬天泡温泉 | 温泉推荐 — 秦皇岛 |
| 75 | 202 | 是 | `beidaihe-camping-hotel` | 北戴河露营酒店 | 帐篷酒店推荐 — 秦皇岛 |
| 76 | 202 |  | `qhd-swim-safety` | 北戴河游泳安全 | 注意事项和救生 — 秦皇岛 |
| 77 | 203 | 是 | `beidaihe-breakfast` | 北戴河早餐去哪吃 | 早餐攻略 — 秦皇岛 |
| 78 | 203 |  | `qhd-photography-spots` | 秦皇岛拍照打卡地 | 20个出片机位 — 秦皇岛 |
| 79 | 204 | 是 | `beidaihe-hotel-vs-bnb` | 北戴河住酒店还是民宿 | 住宿对比 — 秦皇岛 |
| 80 | 207 | 是 | `beidaihe-camping` | 北戴河露营攻略 | 海边露营地推荐 — 秦皇岛 |
| 81 | 208 |  | `beidaihe-spring` | 北戴河春天好玩吗 | 4-5月旅游攻略 — 秦皇岛 |
| 82 | 213 | 是 | `beidaihe-instagram` | 北戴河网红打卡地 | 最全拍照指南 — 秦皇岛 |
| 83 | 224 |  | `beidaihe-couple-trip` | 北戴河情侣攻略 | 浪漫行程推荐 — 秦皇岛 |
| 84 | 244 |  | `beidaihe-winter-swim` | 冬天去北戴河看冻海 | 冰海攻略 — 秦皇岛 |
| 85 | 247 |  | `qhd-family-travel` | 秦皇岛亲子游攻略 | 8个必去景点 | 秦皇岛 |
| 86 | 250 |  | `qhd-transport-guide` | 秦皇岛交通攻略 | 高铁·自驾·公交 | 秦皇岛 |

## 四、处置建议

按投入产出排序，分三档：

### A. 合并（推荐优先做，约 60 篇）

大量页面是同一主题被拆成了多个关键词页，本身就该是一篇长文里的一节。典型可合并簇：

- **水上项目**：`qhd-jet-ski` / `qhd-diving` / `qhd-kite-surfing` / `beidaihe-banana-boat` / `beidaihe-parasailing` / `beidaihe-surfing` / `beidaihe-yacht` → 并入已有的 `qhd-sea-sports-guide`
- **实用杂项**：`qhd-wifi-guide` / `qhd-wifi-password` / `qhd-wechat-pay` / `beidaihe-power-bank` / `qhd-emergency` / `qhd-hospital` → 合成一篇「秦皇岛旅行实用信息速查」
- **行前准备**：`qhd-what-to-bring` / `qhd-what-to-wear` / `qhd-sunburn-tips` / `qhd-sunscreen-review` / `beidaihe-swimsuit` / `beidaihe-luggage` → 并入 `checklist` 页
- **城际交通**：`qhd-to-beijing` / `qhd-to-tianjin` / `qhd-to-chengde` / `qhd-train-guide` / `qhd-train-ticket` / `qhd-bus-guide` / `qhd-taxi-guide` → 并入 `qhd-transport-guide`

合并做法：目标长文里新增对应小节，原 URL 做 **301 重定向**到长文锚点（`vercel.json` 的 `redirects` 已有现成写法），并从 `sitemap.xml` 移除。

### B. 扩写（约 25 篇）

有独立搜索需求、但内容没写够的，补到 800 字以上并加入实拍图、价格、时间、坐标等只有本地视角才有的信息：

`geziwo-sunrise-guide`（56 字）、`qhd-ganhai-guide`（58 字）、`qhd-food-guide`（59 字）这三篇字数最少但主题最核心，应当最先扩写。

### C. noindex（兜底）

暂时没精力处理的，先加 `<meta name="robots" content="noindex,follow">` 并从 sitemap 移除，保留站内链接传递权重，等内容写够了再放开。比留在索引里拖后腿好。

---

附：本次同时修复的三项工程问题见对话记录 —— 密钥硬编码、86 个页面重复加载新旧两套搜索组件、`blog-article.css` 源文件缺失 25 条样式规则。
