#!/usr/bin/env python3
"""
旅游攻略爬虫 v6 — Playwright搜索 + requests抓取
用法: python3 scripts/wechat-crawler.py [--query "关键词"] [--max 5] [--dry-run]
"""

import argparse
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = PROJECT_ROOT / "blog"
IMAGES_DIR = PROJECT_ROOT / "images" / "crawled"
DATA_DIR = PROJECT_ROOT / "data"
CRAWL_LOG = DATA_DIR / "crawl-log.json"

DEFAULT_QUERIES = [
    "秦皇岛旅游攻略 2025 2026",
    "北戴河旅游攻略 2025",
    "山海关旅游攻略",
    "秦皇岛美食攻略",
    "北戴河赶海攻略",
    "秦皇岛住宿攻略",
    "秦皇岛亲子游",
    "秦皇岛交通攻略",
]

GOOD_SOURCES = [
    "sohu.com", "163.com", "zhihu.com", "ctrip.com", "mafengwo.cn",
    "sina.com", "baijia.baidu.com", "toutiao.com", "15386.cn",
    "bilibili.com", "douban.com", "thepaper.cn", "360doc.com",
]
BLACKLIST = ["douyin.com", "xiaohongshu.com"]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

def slugify(text):
    text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '-', text)
    return re.sub(r'-+', '-', text).strip('-')[:60]

def md5(text):
    return hashlib.md5(text.encode()).hexdigest()[:8]

def load_crawl_log():
    if CRAWL_LOG.exists():
        return json.loads(CRAWL_LOG.read_text(encoding="utf-8"))
    return {"crawled_urls": [], "last_run": None, "total": 0}

def save_crawl_log(log):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CRAWL_LOG.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")


# ============ Playwright 搜索 ============

def search_with_playwright(queries: list, max_per_query: int) -> list:
    """用 Playwright 搜索百度，返回结果列表"""
    from playwright.sync_api import sync_playwright

    all_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            locale="zh-CN",
        )
        page = ctx.new_page()

        for query in queries:
            print(f"🔍 搜索: {query}")
            search_q = f"{query} site:mp.weixin.qq.com"
            url = f"https://www.baidu.com/s?wd={quote(search_q)}&ie=utf-8"

            try:
                page.goto(url, wait_until="commit", timeout=25000)
                page.wait_for_timeout(3000)

                # 提取结果
                links = page.query_selector_all("a")
                for a in links:
                    href = a.get_attribute("href") or ""
                    text = a.inner_text().strip()

                    # 只要百度跳转链接
                    if "baidu.com/link" not in href:
                        continue
                    if len(text) < 8:
                        continue

                    # 过滤导航/标签链接
                    skip_words = ["图片", "视频", "资讯", "笔记", "地图", "贴吧", "文库",
                                  "登录", "更多", "反馈", "设为首页", "百度首页"]
                    if any(w == text for w in skip_words):
                        continue

                    all_results.append({
                        "title": text,
                        "baidu_url": href,
                        "query": query,
                    })
                    print(f"   📄 {text[:50]}")

                    if len([r for r in all_results if r["query"] == query]) >= max_per_query:
                        break

            except Exception as e:
                print(f"   ❌ 搜索出错: {e}")

            time.sleep(3)

        browser.close()

    return all_results


# ============ 内容抓取 ============

def resolve_url(baidu_url: str) -> str:
    """跟踪百度跳转获取真实URL"""
    try:
        resp = requests.get(baidu_url, headers=HEADERS, timeout=10, allow_redirects=True)
        return resp.url
    except Exception:
        return baidu_url


def fetch_article(url: str) -> dict | None:
    """抓取文章全文"""
    try:
        resp = requests.get(url, headers={**HEADERS, "Referer": "https://www.baidu.com/"}, timeout=20)
        resp.encoding = resp.apparent_encoding or "utf-8"
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup.find_all(["script", "style", "nav", "footer", "aside"]):
            tag.decompose()

        # 标题
        title = ""
        for sel in ["h1", ".article-title", ".content-title", "title"]:
            tag = soup.select_one(sel)
            if tag:
                t = tag.get_text(strip=True)
                if len(t) > 5:
                    title = t
                    break

        # 作者
        author = ""
        for sel in [".author-name", ".user-name", ".article-author", ".source", "[class*=author]"]:
            tag = soup.select_one(sel)
            if tag:
                author = tag.get_text(strip=True)[:20]
                break

        # 正文
        content_html = ""
        content_text = ""
        for sel in [
            ".article-content", ".post-content", ".content", "#article-content",
            ".article-body", ".entry-content", "article",
            ".RichContent-inner", ".Post-RichText",
            "[class*=article][class*=content]",
        ]:
            tag = soup.select_one(sel)
            if tag:
                text = tag.get_text(strip=True)
                if len(text) > 200:
                    content_html = str(tag)
                    content_text = text
                    break

        if not content_text:
            body = soup.find("body")
            if body:
                content_text = body.get_text(separator="\n", strip=True)

        # 图片
        images = []
        if content_html:
            csoup = BeautifulSoup(content_html, "html.parser")
            for img in csoup.find_all("img"):
                src = img.get("src") or img.get("data-src") or ""
                if src and not src.startswith("data:") and len(src) > 10:
                    images.append(src)

        # 日期
        pub_date = ""
        for sel in [".publish-time", ".article-date", ".date", "time", "[class*=time]"]:
            tag = soup.select_one(sel)
            if tag:
                dm = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})', tag.get_text())
                if dm:
                    pub_date = dm.group(1).replace("/", "-")
                    break

        return {
            "title": title, "author": author,
            "content_html": content_html, "content_text": content_text,
            "images": images[:10], "pub_date": pub_date, "source_url": url,
        }
    except Exception as e:
        print(f"       ⚠ 抓取失败: {e}")
        return None


def download_image(url: str, save_dir: Path) -> str | None:
    try:
        resp = requests.get(url, headers={**HEADERS}, timeout=15, stream=True)
        if resp.status_code == 200 and len(resp.content) > 500:
            ct = resp.headers.get("Content-Type", "")
            ext = ".jpg"
            if "webp" in ct: ext = ".webp"
            elif "png" in ct: ext = ".png"
            filename = f"crawl-{md5(url)}{ext}"
            save_dir.mkdir(parents=True, exist_ok=True)
            (save_dir / filename).write_bytes(resp.content)
            return f"images/crawled/{filename}"
    except Exception:
        pass
    return None


# ============ HTML 模板 ============

def generate_blog_html(article: dict, images_local: list) -> str:
    title = article.get("title") or "未命名文章"
    author = article.get("author") or article.get("source") or "网络整理"
    pub_date = article.get("pub_date") or datetime.now().strftime("%Y-%m-%d")
    content_html = article.get("content_html", "")
    content_text = article.get("content_text") or article.get("description", "")
    source_url = article.get("source_url", "")
    desc = content_text[:160].replace("\n", " ").replace('"', '&quot;')
    cover_img = images_local[0] if images_local else "images/qhd-panorama.webp"
    slug = slugify(title)

    if not content_html or len(content_html) < 200:
        paragraphs = [p.strip() for p in content_text.split("\n") if p.strip() and len(p.strip()) > 10]
        content_html = "".join(f"<p>{p}</p>" for p in paragraphs[:50]) if paragraphs else f"<p>{content_text[:2000]}</p>"
        if source_url:
            content_html += f"<p><em>更多内容请<a href='{source_url}' target='_blank'>查看原文</a>。</em></p>"

    content_html = re.sub(r'<script[^>]*>.*?</script>', '', content_html, flags=re.DOTALL)
    content_html = re.sub(r'<style[^>]*>.*?</style>', '', content_html, flags=re.DOTALL)
    content_html = re.sub(r'data-src=', 'src=', content_html)

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | 秦皇岛旅游博客</title>
<meta name="description" content="{desc}">
<meta name="author" content="{author}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="https://qhd-lv.vercel.app/blog/{slug}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://qhd-lv.vercel.app/blog/{slug}">
<meta property="og:image" content="https://qhd-lv.vercel.app/{cover_img}">
<meta property="og:site_name" content="秦皇岛旅游官网">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="../css/search.css">
<link rel="stylesheet" href="../css/share.css">
<style>
  .article-wrap {{ max-width: 800px; margin: 0 auto; padding: 0 var(--s6) var(--s12); }}
  .article-header {{ padding: var(--s6) 0; border-bottom: 1px solid var(--border-light); margin-bottom: var(--s8); }}
  .article-header h1 {{ font-size: clamp(1.6rem, 3.2vw, 2.2rem); font-weight: 800; line-height: 1.35; margin: var(--s3) 0 var(--s4); }}
  .article-meta {{ display: flex; align-items: center; flex-wrap: wrap; gap: var(--s3); font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--s4); }}
  .article-meta .sep {{ opacity: 0.4; }}
  .article-cover {{ width: 100%; height: auto; max-height: 420px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: var(--s8); }}
  .article-body {{ font-size: 1.02rem; line-height: 1.95; color: var(--gray-800); }}
  .article-body h2 {{ font-size: var(--text-2xl); font-weight: 800; margin: var(--s10) 0 var(--s4); }}
  .article-body h3 {{ font-size: var(--text-xl); font-weight: 700; margin: var(--s6) 0 var(--s3); }}
  .article-body p {{ margin-bottom: var(--s4); }}
  .article-body img {{ max-width: 100%; height: auto; border-radius: var(--radius); margin: var(--s4) 0; }}
  .article-body ul, .article-body ol {{ margin: 0 0 var(--s4) var(--s6); }}
  .article-body li {{ margin-bottom: var(--s2); line-height: 1.9; }}
  .article-body blockquote {{ border-left: 4px solid var(--brand); background: rgba(26,115,232,0.04); padding: var(--s4) var(--s5); border-radius: 0 var(--radius) var(--radius) 0; margin: var(--s6) 0; }}
  .source-note {{ background: var(--gray-50); border: 1px solid var(--border-light); border-radius: var(--radius); padding: var(--s4) var(--s5); margin-top: var(--s8); font-size: var(--text-sm); color: var(--text-muted); }}
  .source-note a {{ color: var(--brand); }}
</style>
</head>
<body>
<nav class="breadcrumb"><div class="container"><a href="/">首页</a> <span>›</span> <a href="/blog">旅游博客</a> <span>›</span> <span aria-current="page">{title[:20]}…</span></div></nav>
<main class="article-wrap">
  <header class="article-header">
    <h1>{title}</h1>
    <div class="article-meta">
      <span>📝 {author}</span><span class="sep">·</span><span>📅 {pub_date}</span><span class="sep">·</span><span>转载整理</span>
    </div>
  </header>
  <img class="article-cover" src="../{cover_img}" alt="{title}" loading="lazy">
  <article class="article-body">{content_html}</article>
  <div class="source-note">📌 <strong>来源说明：</strong>本文转载自「{author}」，<a href="{source_url}" target="_blank" rel="noopener">查看原文</a>。如有侵权请联系删除。</div>
  <nav class="related-articles" style="margin-top:var(--s10);padding-top:var(--s8);border-top:1px solid var(--border-light);">
    <h3 style="font-size:var(--text-xl);margin-bottom:var(--s5);">📖 更多推荐</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--s4);">
      <a href="/blog/qhd-food-guide" style="display:block;padding:var(--s4);background:var(--gray-50);border-radius:var(--radius);text-decoration:none;color:var(--text);">🦞 秦皇岛美食攻略</a>
      <a href="/blog/qhd-ganhai-guide" style="display:block;padding:var(--s4);background:var(--gray-50);border-radius:var(--radius);text-decoration:none;color:var(--text);">🦀 秦皇岛赶海攻略</a>
      <a href="/blog/qhd-transport-guide" style="display:block;padding:var(--s4);background:var(--gray-50);border-radius:var(--radius);text-decoration:none;color:var(--text);">🚗 秦皇岛交通攻略</a>
    </div>
  </nav>
</main>
<footer class="site-footer"><div class="container"><p>© 2026 秦皇岛旅游官网 · <a href="/">首页</a> · <a href="/blog">博客</a> · <a href="/attractions">景点</a></p></div></footer>
<script src="../js/search.js"></script>
</body>
</html>"""


# ============ 主流程 ============

def crawl_and_publish(queries, max_per_query=5, dry_run=False):
    log = load_crawl_log()
    crawled_urls = set(log.get("crawled_urls", []))
    new_articles = []

    print(f"🚀 开始抓取 — 关键词 {len(queries)} 个，每个最多 {max_per_query} 篇")
    print(f"   已抓取过: {len(crawled_urls)} 篇\n")

    # 1. Playwright 搜索
    search_results = search_with_playwright(queries, max_per_query)

    # 去重
    new_results = []
    seen = set()
    for r in search_results:
        key = md5(r["baidu_url"])
        if key not in crawled_urls and key not in seen:
            r["_hash"] = key
            new_results.append(r)
            seen.add(key)

    print(f"\n📋 共 {len(new_results)} 篇新文章待处理\n")

    # 2. 逐篇解析+抓取
    for i, item in enumerate(new_results):
        print(f"[{i+1}/{len(new_results)}] 📄 {item['title'][:45]}...")

        # 解析真实URL
        real_url = resolve_url(item["baidu_url"])
        item["source_url"] = real_url
        time.sleep(1)

        # 过滤非优质来源
        is_good = any(src in real_url for src in GOOD_SOURCES)
        if not is_good:
            # 也接受微信文章
            if "mp.weixin.qq.com" not in real_url:
                print(f"       ⏭ 非优质来源，跳过")
                continue

        # 抓取全文
        article = fetch_article(real_url)
        if article and len(article.get("content_text", "")) > 200:
            item.update(article)
            if article.get("title"):
                item["title"] = article["title"]
            print(f"       ✅ 全文 ({len(article['content_text'])}字, {len(article.get('images', []))}图)")
        else:
            print(f"       ⚠ 使用搜索标题")

        # 下载图片
        images_local = []
        for img_url in item.get("images", [])[:5]:
            if img_url:
                local = download_image(img_url, IMAGES_DIR)
                if local:
                    images_local.append(local)
                time.sleep(0.5)

        if dry_run:
            print(f"       🔍 [DRY RUN] URL: {real_url[:60]}")
            continue

        # 生成HTML
        slug = slugify(item["title"])
        filename = f"{slug}.html"
        filepath = BLOG_DIR / filename
        if filepath.exists():
            filename = f"{slug}-{item['_hash']}.html"
            filepath = BLOG_DIR / filename

        html = generate_blog_html(item, images_local)
        filepath.write_text(html, encoding="utf-8")
        print(f"       📝 blog/{filename} ({len(html)} bytes, {len(images_local)} 张图)")

        crawled_urls.add(item["_hash"])
        new_articles.append({
            "title": item["title"], "file": filename,
            "source": item.get("source", ""), "date": datetime.now().strftime("%Y-%m-%d"),
        })
        time.sleep(2)

    # 保存日志
    log["crawled_urls"] = list(crawled_urls)
    log["last_run"] = datetime.now().isoformat()
    log["total"] = len(crawled_urls)
    if not dry_run:
        save_crawl_log(log)

    print(f"\n{'='*50}")
    print(f"📊 本次结果: 新增 {len(new_articles)} 篇文章")
    for a in new_articles:
        print(f"   📝 {a['title'][:40]} → blog/{a['file']}")
    return new_articles


def main():
    parser = argparse.ArgumentParser(description="旅游攻略爬虫")
    parser.add_argument("--query", "-q", type=str)
    parser.add_argument("--max", "-m", type=int, default=3)
    parser.add_argument("--dry-run", "-n", action="store_true")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    queries = [args.query] if args.query else DEFAULT_QUERIES
    new_articles = crawl_and_publish(queries, max_per_query=args.max, dry_run=args.dry_run)

    if new_articles and not args.dry_run and not args.no_push:
        print("\n📤 自动提交并推送...")
        os.chdir(PROJECT_ROOT)
        os.system("git add blog/ images/crawled/ data/crawl-log.json")
        os.system(f'git commit -m "feat(crawler): 自动抓取 {len(new_articles)} 篇攻略文章"')
        os.system("git push")
        print("✅ 已推送，Vercel 将自动部署")
    elif new_articles and not args.dry_run:
        print("\n💡 运行以下命令部署:")
        print("   cd qhd-lv && git add . && git commit -m 'feat: 新增攻略' && git push")


if __name__ == "__main__":
    main()
