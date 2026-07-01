# 🖼️ 秦皇岛景点图片完善指南

## 📊 现状

- **已有图片**：7张（北戴河、鸽子窝、老虎石、碧螺塔、山海关、老龙头、阿那亚）
- **缺失图片**：41个景点
- **完成度**：14.6%

## 🚀 快速解决方案

### 方案1️⃣：自动下载（推荐）

使用Python脚本自动从Unsplash和Pexels下载高质量免费图片：

```bash
# 安装依赖
pip install requests

# 运行脚本
python scripts/download-attractions-images.py
```

**优点**：
- ✅ 自动化，省时省力
- ✅ 免费高质量图片
- ✅ 自动更新JSON文件

---

### 方案2️⃣：手动补充（精选方案）

如果要获得更精准的景点图片，可从以下免费图库手动下载：

#### 📌 **海滨景点** (Beach)
- **北戴河相关**
  - [Unsplash - Beidaihe Beach](https://unsplash.com/search/photos/beidaihe)
  - [Pexels - Beach](https://www.pexels.com/search/beach/)
  
- **景点推荐图片搜索词**：
  - 联峰山公园 → "mountain beach qinhuangdao" / "beidaihe"
  - 老虎石 → "tiger stone beach"
  - 鸽子窝 → "pigeon nest park"

#### 🏛️ **历史文化** (History)
- **长城相关**
  - [Unsplash - Great Wall](https://unsplash.com/search/photos/great%20wall)
  - 搜索词：角山长城、山海关、老龙头 → "great wall china"

- **古迹庙宇**
  - 孟姜女庙 → "temple china"
  - 山海关古城 → "ancient city china"

#### ⛰️ **自然风光** (Nature)
- **山景**
  - 祖山、老君顶、五峰山 → "mountain landscape"
  - 冰塘峪大峡谷 → "gorge canyon"

- **资源**
  - [Unsplash - Mountains](https://unsplash.com/search/photos/mountain)
  - [Pexels - Nature](https://www.pexels.com/search/nature/)

#### 🎢 **亲子娱乐** (Family)
- 乐岛海洋王国 → "aquatic park" / "water park"
- 沙雕海洋乐园 → "sand sculpture"
- 秦皇岛野生动物园 → "zoo animals"

#### 🎭 **文化艺术** (Culture)
- 阿那亚图书馆 → "library architecture" (已有图✅)
- 港口博物馆 → "museum harbor"
- 葡萄酒庄 → "winery vineyard"

---

## 🎯 免费图片来源TOP 3

| 平台 | 特点 | 需要注册 | 下载速度 |
|------|------|---------|---------|
| **Unsplash** | 高质量、专业、数量多 | 否 | 快 |
| **Pexels** | 海量、支持API | 否 | 快 |
| **Pixabay** | 多种格式、无版权 | 否 | 快 |

### 最简单的方法 💡

**直接在Google Images中搜索，然后按"使用权"筛选为"知识共享许可"**

例如：
1. Google搜索："秦皇岛 北戴河" → 图片
2. 工具 → 使用权 → 创意共享许可
3. 下载高质量图片

---

## 📝 手动补充流程

### Step 1: 下载图片
- 从以上任一来源下载 JPG 格式（建议 600x400px 以上）
- 名称格式：`attraction-{景点ID}.jpg`
  - 例：`attraction-lianfengshan.jpg`

### Step 2: 保存到项目
```
images/
├── beidaihe-beach.png          ✅ 已有
├── geziwo-sunrise.jpg          ✅ 已有
├── attraction-lianfengshan.jpg  ← 新增
├── attraction-guailou.jpg       ← 新增
└── ...
```

### Step 3: 更新 JSON
编辑 `data/attractions.json`，为对应景点的 `img` 字段赋值：

```json
{
  "id": "lianfengshan",
  "name": "联峰山公园",
  "img": "images/attraction-lianfengshan.jpg",  // ← 改这里
  ...
}
```

---

## 🛠️ 高效批量方案

### 用Excel/Google Sheets管理

1. **导出景点列表**
```bash
# 从attractions.json提取景点清单
```

2. **Excel里创建下载计划表**
   | 景点名 | 搜索词 | 下载链接 | 本地文件 | 完成 |
   |-------|--------|--------|--------|------|
   | 联峰山公园 | Lianfeng | ... | attraction-lianfengshan.jpg | ☐ |

3. **批量下载后，用脚本更新JSON**

---

## ✨ 最佳实践

### 图片选择标准
- ✅ **分辨率**：至少 600x400px（建议 1200x800px）
- ✅ **格式**：JPG （轻量高效）、PNG（清晰度高）
- ✅ **内容**：展示景点特色（海景、建筑、山景等）
- ✅ **许可**：允许商用（知识共享CC0/CC-BY）

### 文件优化
建议用TinyPNG或ImageOptim压缩图片：
```bash
# 批量压缩（Windows用户可用在线工具）
tinypng.com
```

### CDN加速
部署到Vercel后，所有图片自动享受CDN加速，无需额外配置。

---

## 📋 41个缺图景点清单

### 北戴河区（6个）
- ❌ 联峰山公园
- ❌ 怪楼奇园
- ❌ 秦皇岛野生动物园
- ❌ 集发农业梦想王国
- ❌ 北戴河湿地公园

### 山海关区（10个）
- ❌ 角山长城
- ❌ 孟姜女庙
- ❌ 乐岛海洋王国
- ❌ 长寿山景区
- ❌ 燕塞湖
- ❌ 山海关古城
- ❌ 秦皇求仙入海处
- ❌ 新澳海底世界
- ❌ 秦皇岛港口博物馆
- ❌ 山海关古城民俗博物馆（王家大院）

### 海港区（1个）
- ❌ 戴河生态园

### 南戴河/昌黎区（8个）
- ❌ 南戴河·黄金海岸
- ❌ 渔岛海洋温泉景区
- ❌ 圣蓝海洋公园
- ❌ 碣石山
- ❌ 蔚蓝海岸
- ❌ 仙螺岛
- ❌ 沙雕海洋乐园
- ❌ 南戴河国际娱乐中心

### 抚宁/青龙区（10个）
- ❌ 祖山风景区
- ❌ 冰塘峪大峡谷
- ❌ 板厂峪长城景区
- ❌ 天马湖景区
- ❌ 葡萄沟
- ❌ 华夏庄园景区
- ❌ 老君顶景区
- ❌ 金士国际葡萄酒庄
- ❌ 魅力宏兴工业文化园
- ❌ 龙云谷景区

### 卢龙县（6个）
- ❌ 棋盘山景区
- ❌ 五峰山景区
- ❌ 天马山旅游风景区
- ❌ 鲍子沟景区
- ❌ 柳河溪谷
- ❌ 柳河山庄
- ❌ 渔田·七里海度假区

---

## 🎬 下一步

### 立即行动
```bash
# 1️⃣ 试试自动下载
python scripts/download-attractions-images.py

# 2️⃣ 或手动补充最重要的景点（Top 5 + 热门景区）
# Top 5: 北戴河、鸽子窝、碧螺塔、老龙头、阿那亚
# 其他热门：山海关、乐岛、祖山等

# 3️⃣ 完成后测试
npm run dev
# 访问 http://localhost:3000/map.html 查看效果
```

### 预计工作量
- **自动方案**：10分钟（脚本运行）
- **手动精选**：1-2小时（为15-20个热门景点）
- **全量完成**：3-4小时（所有41个）

---

## 💡 额外建议

### 视频内容
某些景点可补充视频而不仅是静图，可在 `highlights` 或新增 `video` 字段

### 360°全景
高端方案：某些景点可用 Panorama.io 或 Google Street View

### 用户UGC
允许用户上传景点照片（需后端支持）

---

**让我知道你需要什么帮助！** 🚀
- 想自动下载？已准备好脚本
- 想推荐具体图片链接？我可以直接提供
- 想优化某个景点的搜索？告诉我具体名称

