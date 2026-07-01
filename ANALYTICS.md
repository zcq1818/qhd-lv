# 秦皇岛旅游官网 - 网站分析指南

## 📊 Vercel Analytics 集成

本网站已集成 Vercel 官方的 Web Analytics，用于追踪网站性能和用户行为。

### 🚀 启用分析

#### 第1步：Vercel Dashboard 配置
1. 登录 [Vercel Console](https://vercel.com/)
2. 进入项目 `qhd-lv` → Settings → Analytics
3. 启用 "Web Analytics"（如果尚未启用）

#### 第2步：查看分析数据
- **访问数据**：https://vercel.com/dashboard
- **实时数据**：Analytics 面板显示最近 24 小时的数据
- **历史数据**：支持按周/月/年查看趋势

### 📈 可用的分析指标

| 指标 | 说明 |
|------|------|
| **Pageviews** | 页面浏览次数（包含重复访问） |
| **Visitors** | 独立访客数 |
| **Session Duration** | 平均会话时长 |
| **Bounce Rate** | 跳出率（用户访问一个页面后离开的比例） |
| **Top Pages** | 最受欢迎的页面排名 |
| **Top Referrers** | 来源网站排名 |
| **Geography** | 访客地理分布 |
| **Devices** | 设备类型分布（桌面/移动/平板） |
| **Web Vitals** | Core Web Vitals 指标（LCP、FID、CLS） |

### 🔍 关键性能指标 (Core Web Vitals)

本网站通过 Vercel Analytics 追踪三个核心指标：

1. **LCP (Largest Contentful Paint)** - 最大内容绘制
   - 目标：< 2.5 秒（绿色）
   - 衡量：加载体验

2. **FID (First Input Delay)** - 首次输入延迟
   - 目标：< 100ms（绿色）
   - 衡量：交互性

3. **CLS (Cumulative Layout Shift)** - 累积布局偏移
   - 目标：< 0.1（绿色）
   - 衡量：视觉稳定性

### 💡 使用分析数据的建议

#### 优化内容
- 查看 **Top Pages** 了解哪些景点、攻略最受欢迎
- 针对低流量页面优化内容或更新

#### 改进用户体验
- 关注 **Bounce Rate** - 高跳出率可能表示内容不符合预期
- 检查 **Session Duration** - 短会话可能需要优化导航

#### 性能优化
- 监控 **Web Vitals** - 确保网站速度和响应性
- 针对 LCP/FID/CLS 差的指标进行优化

#### 流量分析
- **Top Referrers**：了解用户来源（搜索引擎、社交媒体等）
- **Geography**：根据地域分布调整内容和营销策略

### 🛠️ 本地开发环境

在本地运行时，分析数据不会被记录（仅在部署到 Vercel 时生效）。

```bash
# 本地预览
npm run preview

# 本地开发
npm run dev
```

### 📱 移动优化检查

由于大量用户使用手机访问，建议定期检查：
- 移动设备占比
- 移动设备的 Web Vitals
- 响应式设计在小屏幕上的表现

### 🔐 隐私政策

- Vercel Analytics 不使用 cookie，符合 GDPR/隐私法规
- 数据存储在 Vercel 的服务器上，不与第三方共享
- 用户信息匿名化处理

### 📞 获取帮助

- [Vercel Analytics 官方文档](https://vercel.com/docs/concepts/analytics)
- [Web Vitals 学习资源](https://web.dev/vitals/)
- [Vercel 支持](https://vercel.com/support)

---

**提示**：Analytics 数据通常在网站部署后的 5-10 分钟内开始收集。首次启用可能需要 1-2 小时才能看到数据。
