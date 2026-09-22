# 秦皇岛旅游官网(qhd-lv)

纯静态站 + Vercel Serverless(api/),线上域名 https://www.divdu.com。Vercel 不执行构建命令,仓库里提交的文件就是线上文件。

## 目录

- `*.html` 根目录页面;`attraction/` 47 个景点页;`blog/` 博客(退役文章仍在磁盘,由 vercel.json 301 到合并后的文章)
- `data/attractions.json` 景点**主数据**(含英文简介、FAQ、贴士、交通、来源等),只给构建脚本用,不下发浏览器
- `data/spots.json` 浏览器加载的**运行时数据**(约 42KB),由 `npm run data` 从主数据生成,景点大全/地图/画廊/行程/搜索都读它
- `data/blog-index.json` 博客索引;`data/retired-posts.json` 退役博客
- `css/`、`js/`、`style.css` 源文件;同名 `.min.*` 是提交到仓库的压缩产物;`js/vendor/` 第三方库本地托管
- `api/` Vercel 函数(weather、tide、chat、view-counter),密钥全部走环境变量,见 `.env.example`
- `scripts/` 构建与内容脚本(node + python)

## 改动 CSS / JS 后必须做

页面统一引用 `.min` 文件。改完源文件后运行:

```bash
npm run optimize
```

它会用 esbuild 重新压缩、把页面引用统一到 .min、修 SEO,并用 `check-min` 校验没有过期产物。只想校验用 `npm run check`。

## 改导航栏

导航栏在每个页面里都是复制的。改 `scripts/unify-navbar.js` 里的 `LINKS`,再运行 `node scripts/unify-navbar.js`。
注意:`local-guide.html` 和 `seafood.html` 有定制的导航高亮,脚本会覆盖它们,跑完后用 `git diff` 检查并手动恢复。
顶部导航保持 9 项,新功能入口放在相关页面内(例如 3D 画廊入口在景点大全页),不要往导航里加。

## 改动景点数据后

改完 `data/attractions.json` 必须重新生成运行时数据,否则页面看到的还是旧值:

```bash
npm run data
```

## 英文版

`en/` 三个总览页加 `en/attraction/` 47 个景点详情页,由 `npm run en` 从景点主数据生成。
英文字段:nameEn / descEn / highlightsEn 来自景点研究,bestSeasonEn / suitableForEn / ticketNotesEn /
openTimeNotesEn / transportEn / tipsEn / faqEn 由 `scripts/merge-en-translations.js` 合并翻译结果得到。
品牌封面有中英两版,英文版在 `images/cover/en/`,用 `python scripts/gen-cover-images.py --en` 生成。
中文站导航右侧有 EN 切换,由 `scripts/unify-navbar.js` 统一注入;英文页底部与卡片上有回中文的链接。
英文首页地址是 `/en`(不带尾斜杠),站点 trailingSlash 为 false,写成 `/en/` 会 308 跳转。

## 询价线索与统计

访客留下的联系方式走 `api/leads.js`(Edge Function,写 Upstash Redis,线索存 400 天),
后台 `dashboard.html` 查看,需要环境变量 `LEADS_ADMIN_KEY` 才能读;没配置不影响访客提交。
后台是 noindex + robots 屏蔽 + 不进 sitemap 的,别把它加进导航。
线索可以标记处理状态(PATCH ?id=&status=done|new)与删除(DELETE ?id=),
标记用 KEEPTTL 保住原来的 400 天到期时间,不因为点一下就续命。

有新线索时会推一条到微信,走 Server酱,环境变量 `SERVERCHAN_KEY`(不填就只是没通知,
线索照常入库)。推送刻意做成失败也不吭声 —— 线索那时已经落库,不能因为推送商挂了
就让访客看到「提交失败」去重复提交。自测用 `/api/leads?testnotify=1`(需口令),
它不会制造假线索。

覆盖 151 个页面:47 个景点页、88 篇在线博客(退役的不铺)、16 个栏目页。
当地向导页有自己的表单,不走这个组件;首页、地图、天气这类工具/索引页
与英文版暂未铺。栏目页的文案在脚本里各写各的 —— 同一句「有问题找我们」
放在必玩景点页和门票页上,说服力完全不同。

咨询入口是一个复用组件:页面里只放占位 `<div class="lead-card" data-lead-form data-source="…">`,
真正的表单由 `js/lead-form.js` 渲染,占位里那一行微信/邮箱是 JS 起不来时的兜底。
**改文案只改 js/lead-form.js,不要回头改 151 个页面。** 铺到新页面用:

```bash
npm run leads
```

浏览量统计在 `js/view-counter.js`,`getSlug()` 决定 slug 前缀(spot- / en- / page- / 博客直接用 slug)。
同一文件还记三个转化动作,slug 带 `event-` 前缀(qr-view / qr-tap / form-view),
后台按这个前缀拆出「转化漏斗」,不混进页面热度。铺到新页面用:

```bash
npm run views
```

注意 `/api/view-counter?list=1` 必须保持单次 MGET —— 统计范围是全站 250 个 slug,
改回逐个 GET 会让后台直接超时。

## 广告位与招商

页面里的 `.ad-slot` 是预留的广告位,共 144 处(首页 3 处 + 47 个景点页各 3 处)。
未售出时由 `css/advertise.css` 控制:同一页面只显示第一个,内容是指向 `/advertise`
的招商入口,其余用 CSS 隐藏,售出后把真实广告填进对应的 `.ad-slot` 即可显示。
重建招商位用 `npm run ads`,招商页是 `advertise.html`。

约定:广告必须标注,不伪装成攻略;不接弹窗与自动播放;不接与秦皇岛旅游无关的行业。
第三方票务平台外链目前关闭,见「预订外链」一节。

## 新增页面 / 博客后

```bash
npm run sitemap
```

sitemap 会自动扫描根目录、attraction/、blog/(跳过退役文章),lastmod 取 git 最近提交日期。

## 本地预览

```bash
npm run preview
```

python 静态服务不支持 cleanUrls,本地访问要带 `.html`;`/api/*` 与 `/_vercel/*` 在本地 404 属正常。

## 约定

- 品牌色 `#1a73e8`,变量在 `style.css` 的 `:root`
- 图片优先用 `images/*.webp`,`images/webp/attraction-*.webp` 大多是按分类套用的通用图,只有约 10 张是独立实拍
- 不要提交 `.env`、`Claude outputs/`、`.claude/`
