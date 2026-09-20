# 模板化迁移方案:从 249 个手写 HTML 到静态生成器

状态:方案,未开始。目的是让导航、页脚、头部 meta 只写一次,景点页和博客由数据 + 模板生成,不再依赖脚本批量改写 HTML。

## 为什么要做

- 导航栏、页脚在 249 个页面里各存一份,`unify-navbar.js` 全站覆盖时会误伤定制页(2026-09-20 已发生一次)
- `scripts/` 里 40 多个 node/python 脚本互相叠加,没有单一构建入口,重跑结果不可保证
- 47 个景点页由 `gen-detail-pages.py` 生成后就成了独立文件,数据改了页面不会跟着变
- 新页面要手抄 head、导航、页脚、GA、结构化数据,容易漏

## 选型:Eleventy(11ty)

理由:零框架、输出纯 HTML、可以逐页迁移、现有 HTML 几乎原样搬进模板即可、`data/*.json` 直接成为全局数据。Astro 也可以,但对这个纯内容站没有额外收益,学习成本更高。

## 目标结构

```
src/
  _includes/
    layouts/base.njk        head、GA、导航、页脚、chat-widget、skeleton
    layouts/attraction.njk  景点详情页模板
    layouts/blog.njk        博客文章模板
    partials/navbar.njk     导航(唯一来源)
    partials/footer.njk
  _data/
    attractions.json  ->  软链或复制自 data/attractions.json
    blog-index.json
    site.json               站名、域名、GA ID、品牌色
  index.njk, must-play.njk, attractions.njk ...   根目录页面
  attraction/attraction.njk   pagination 遍历 attractions.spots 生成 47 页
  blog/*.md 或 *.njk          博客正文
  css/ js/ images/ api/       原样 passthrough copy
_site/                        构建输出(Vercel outputDirectory)
```

## 分步实施(每步都可独立上线)

1. 搭骨架:安装 eleventy,配置 passthrough(css、js、images、api、data、robots、manifest、sw),`vercel.json` 的 `buildCommand` 改为 `npm run build`、`outputDirectory` 改为 `_site`。先只迁 1 个页面(about),确认线上 URL 不变。
2. 抽公共部分:navbar、footer、head 抽成 partial,`unify-navbar.js` 退役。定制导航(local-guide、seafood)通过模板变量 `navActive` 与 `navExtra` 表达。
3. 根目录 23 个页面逐个搬进 base 布局,每搬一个对比线上截图。
4. 景点页:用 pagination 从 `attractions.json` 生成,把 `gen-detail-pages.py` 里的字段映射搬进模板;`attraction/*.html` 删除。
5. 博客:86 篇正文转成 `.md` 或保留 HTML 片段 + front matter(title、description、date、cover、kw);`blog-index.json`、`related-guides.json`、FAQ 结构化数据改由 11ty 集合生成;退役文章的 301 继续放在 vercel.json。
6. sitemap、rss、search-index 改为 11ty 模板输出,`generate-sitemap.js`、`gen-blog-index.js`、`gen-search-index.js` 退役。
7. 压缩:esbuild 作为 11ty 的 transform,产物不再提交进仓库,`.min` 文件与 `use-minified.js` 退役。

## 风险与对策

- URL 必须完全不变(cleanUrls、中文 slug 的博客):用 permalink 显式指定,上线前用脚本对比新旧 sitemap 集合完全一致。
- 内联在页面里的 `<style>` 和 `<script>`(如 attractions、map、itinerary)体量大:第一阶段原样放进模板 body,不重构逻辑。
- 博客正文里的相对路径 `../images/...`:统一改为绝对路径 `/images/...`。
- GA、百度统计、IndexNow 推送脚本继续保留,只改路径。

## 工作量估计

骨架 + 公共部分 + 根目录页面约 1 天;景点页半天;博客 1 到 2 天(取决于是否转 Markdown);收尾半天。建议按上面的顺序分 4 到 5 次提交上线,每次都可回滚。
