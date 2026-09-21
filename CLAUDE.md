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
