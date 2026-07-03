#!/usr/bin/env python3
"""
攻略文章抓取器 — 从URL列表抓取内容并生成博客HTML
用法:
  python3 scripts/crawl-articles.py urls.txt          # 从文件读取URL
  python3 scripts/crawl-articles.py URL1 URL2 ...     # 直接传URL
  echo "URL" | python3 scripts/crawl-articles.py -    # 从stdin读取
"""

import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = PROJECT_ROOT / "blog"
IMAGES_DIR = PROJECT_ROOT / "images" / "crawled"
DATA_DIR = PROJECT_ROOT / "data"
CRAWL_LOG = DATA_DIR / "crawl-log.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
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


def _clean_content(html: str, text: str) -> tuple:
    """清洗抓取的内容，去噪声"""
    # 噪声关键词
    noise_kw = [
        'VIP邮箱', '免费下载', '网易官方', '手机邮箱', '热门推荐',
        '热线：', '微信号：', '许可证号', '信用代码', '报名咨询',
        '认准正规', '无中间商', '咨询电话', '24小时', '官方微信',
        '旅行社', '报名优选', '联系电话', '添加微信', '扫码咨询',
        '海量资讯', '打开APP', '阅读原文', '举报/反馈',
        '特别声明', '不代表', '不得转载', '责任编辑',
    ]

    # 清洗 HTML 中的段落
    def clean_p(match):
        tag = match.group(0)
        plain = re.sub(r'<[^>]+>', '', tag).strip()
        if len(plain) < 25:
            return ''
        if any(kw in plain for kw in noise_kw):
            return ''
        return tag

    html = re.sub(r'<p[^>]*>.*?</p>', clean_p, html, flags=re.DOTALL)
    html = re.sub(r'<p[^>]*>\s*</p>', '', html)

    # 清洗纯文本
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        if len(line) < 25:
            continue
        if any(kw in line for kw in noise_kw):
            continue
        lines.append(line)
    text = '\n'.join(lines)

    return html, text


def fetch_article(url: str) -> dict | None:
    """抓取文章全文"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.encoding = resp.apparent_encoding or "utf-8"
        if resp.status_code != 200:
            print(f"  ❌ HTTP {resp.status_code}")
            return None

        soup = BeautifulSoup(resp.text, "html.parser")
        # 移除无关标签
        for tag in soup.find_all(["script", "style", "nav", "footer", "aside", "header",
                                   "iframe", "ins", "aside"]):
            tag.decompose()
        # 移除广告/推荐/评论等区块
        for sel in [".ad", ".ads", ".recommend", ".related", ".comment",
                     ".sidebar", ".widget", "[class*=ad-]", "[class*=recommend]",
                     ".Post-Sub", "[class*=subscription]", "[class*=newsletter]",
                     ".article-footer-meta", ".source-info", "[class*=source]",
                     ".topic-link", "[class*=topic]", "[class*=hot]",
                     ".content-footer", ".article-relate"]:
            for tag in soup.select(sel):
                tag.decompose()

        # 标题
        title = ""
        for sel in ["h1", ".article-title", ".content-title", "title"]:
            tag = soup.select_one(sel)
            if tag:
                t = tag.get_text(strip=True)
                if len(t) > 3:
                    title = t
                    break

        # 去掉网站名后缀
        title = re.sub(r'[-_|·]\s*(搜狐|网易|新浪|知乎|百度|头条|携程|马蜂窝|旅荐网).*$',
                       '', title).strip()

        # 作者/来源
        author = ""
        for sel in [".author-name", ".user-name", ".article-author", ".source",
                     "[class*=author]", ".media-name", ".account-name"]:
            tag = soup.select_one(sel)
            if tag:
                author = tag.get_text(strip=True)[:20]
                break

        # 正文
        content_html = ""
        content_text = ""
        for sel in [
            ".article-content", ".post-content", "#article-content",
            ".article-body", ".entry-content", ".content-detail",
            ".RichContent-inner", ".Post-RichText",
            "article .content", "article",
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

        # 内容清洗：去噪声
        content_html, content_text = _clean_content(content_html, content_text)

        # 图片
        images = []
        if content_html:
            csoup = BeautifulSoup(content_html, "html.parser")
            for img in csoup.find_all("img"):
                src = img.get("src") or img.get("data-src") or ""
                if src and not src.startswith("data:") and len(src) > 10:
                    # 过滤小图标
                    w = img.get("width", "")
                    if w and w.isdigit() and int(w) < 50:
                        continue
                    images.append(src)

        # 日期
        pub_date = ""
        for sel in [".publish-time", ".article-date", ".date", "time",
                     "[class*=time]", "[class*=date]"]:
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
        print(f"  ❌ 抓取失败: {e}")
        return None


def download_image(url: str, save_dir: Path) -> str | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, stream=True)
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


def generate_blog_html(article: dict, images_local: list) -> str:
    title = article.get("title") or "未命名文章"
    author = article.get("author") or "网络整理"
    pub_date = article.get("pub_date") or datetime.now().strftime("%Y-%m-%d")
    content_html = article.get("content_html", "")
    content_text = article.get("content_text", "")
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
<style>
  .nav-search-trigger {{ display:inline-flex;align-items:center;gap:4px;background:none;border:1px solid rgba(255,255,255,0.25);color:rgba(255,255,255,0.8);padding:6px 12px;border-radius:var(--radius,8px);cursor:pointer;font-size:0.8rem;transition:all 0.2s; }}
  .nav-search-trigger:hover {{ border-color:rgba(255,255,255,0.5);color:#fff; }}
  .search-kbd {{ font-size:0.65rem;opacity:0.5;margin-left:4px; }}
  .breadcrumb {{ max-width:var(--max-width,1200px);margin:0 auto;padding:calc(var(--s3,12px) + 60px) var(--s6,24px) var(--s3,12px);font-size:var(--text-sm,0.875rem);color:var(--text-muted,#6b7280); }}
  .breadcrumb a {{ color:var(--brand,#1a73e8);text-decoration:none; }}
  .breadcrumb a:hover {{ text-decoration:underline; }}
  .breadcrumb .sep {{ margin:0 var(--s2,8px);opacity:0.4; }}
</style>
</head>
<body>
<nav class="navbar" id="navbar">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <svg class="nav-logo-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" fill="#0c4a6e"/><circle cx="14" cy="14" r="12.5" fill="none" stroke="#fcd34d" stroke-width="0.8"/><path d="M8 15L8 13L9 13L9 12L10 12L10 13L11 13L11 12L12 12L12 13L13 13L13 12L14 12L14 13L15 13L15 12L16 12L16 13L17 13L17 12L18 12L18 13L19 13L19 12L20 12L20 13L20 15Z" fill="#fcd34d"/><rect x="13" y="10" width="2" height="2" rx="0.2" fill="#fcd34d"/><path d="M8 15Q11 14 14 15T20 15L20 19L8 19Z" fill="#38bdf8"/><path d="M8 19Q11 18 14 19T20 19L20 22L8 22Z" fill="#0284c7"/></svg>
      秦皇岛旅游官网
    </a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/">首页</a></li>
      <li><a href="../attractions">景点</a></li>
      <li><a href="../map">地图</a></li>
      <li><a href="../itinerary">行程规划</a></li>
      <li><a href="../food">美食</a></li>
      <li><a href="../guide">旅游攻略</a></li>
      <li><a href="../blog" class="active">博客</a></li>
      <li><a href="../about">关于我们</a></li>
    </ul>
    <a href="../itinerary" class="nav-cta">免费规划行程 <span class="nav-cta-arrow">→</span></a>
    <button class="nav-search-trigger" aria-label="搜索">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span class="search-kbd">⌘K</span>
    </button>
    <button class="hamburger" id="hamburger" aria-label="菜单"><span></span><span></span><span></span></button>
  </div>
</nav>
<div class="breadcrumb"><a href="/">首页</a> <span class="sep">/</span> <a href="/blog">博客</a> <span class="sep">/</span> <span>{title[:20]}…</span></div>
<main class="article-wrap">
  <header class="article-header">
    <h1>{title}</h1>
    <div class="article-meta"><span>📝 {author}</span><span class="sep">·</span><span>📅 {pub_date}</span><span class="sep">·</span><span>转载整理</span></div>
  </header>
  <img class="article-cover" src="../{cover_img}" alt="{title}" loading="lazy">
  <article class="article-body">{content_html}</article>
  <div class="source-note">📌 <strong>来源：</strong>本文转载自「{author}」，<a href="{source_url}" target="_blank" rel="noopener">查看原文</a>。如有侵权请联系删除。</div>
  <nav style="margin-top:var(--s10);padding-top:var(--s8);border-top:1px solid var(--border-light);">
    <h3 style="font-size:var(--text-xl);margin-bottom:var(--s5);">📖 更多推荐</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--s4);">
      <a href="/blog/qhd-food-guide" style="display:block;padding:var(--s4);background:var(--gray-50);border-radius:var(--radius);text-decoration:none;color:var(--text);">🦞 秦皇岛美食攻略</a>
      <a href="/blog/qhd-ganhai-guide" style="display:block;padding:var(--s4);background:var(--gray-50);border-radius:var(--radius);text-decoration:none;color:var(--text);">🦀 秦皇岛赶海攻略</a>
      <a href="/blog/qhd-transport-guide" style="display:block;padding:var(--s4);background:var(--gray-50);border-radius:var(--radius);text-decoration:none;color:var(--text);">🚗 秦皇岛交通攻略</a>
    </div>
  </nav>
</main>
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>秦皇岛旅游官网</h3>
        <p>致力于为每一位来秦皇岛的游客，提供最实用、最全面的旅游攻略。</p>
      </div>
      <div class="footer-col">
        <h4>热门页面</h4>
        <a href="/">首页</a>
        <a href="../attractions">景点推荐</a>
        <a href="../itinerary">行程规划</a>
        <a href="../food">美食推荐</a>
      </div>
      <div class="footer-col">
        <h4>旅游攻略</h4>
        <a href="../guide">出行指南</a>
        <a href="../map">旅游地图</a>
        <a href="../blog">旅游博客</a>
      </div>
      <div class="footer-col">
        <h4>关于我们</h4>
        <a href="../about">关于官网</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 秦皇岛旅游官网</span>
      <span>冀ICP备16026346号-2</span>
      <div><a href="../sitemap.xml">网站地图</a></div>
    </div>
  </div>
</footer>
<script>
window.addEventListener('scroll', function () {{
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
}});
document.getElementById('hamburger').addEventListener('click', function () {{
  document.getElementById('navLinks').classList.toggle('open');
}});
</script>
<script src="../js/search.js" defer></script>
<script src="../js/chat-widget.js" defer></script>
<link rel="stylesheet" href="../css/chat-widget.css">
</body>
</html>"""


def process_url(url: str, crawl_log: dict, dry_run=False) -> dict | None:
    """处理单个URL"""
    url_hash = md5(url)
    if url_hash in set(crawl_log.get("crawled_urls", [])):
        print(f"  ⏭ 已抓过: {url[:60]}")
        return None

    print(f"  📄 {url[:70]}...")

    # 抓取
    article = fetch_article(url)
    if not article:
        return None

    title = article.get("title", "未命名")
    content_len = len(article.get("content_text", ""))
    img_count = len(article.get("images", []))
    print(f"     ✅ {title[:40]} ({content_len}字, {img_count}图)")

    if dry_run:
        return None

    # 下载图片
    images_local = []
    for img_url in article.get("images", [])[:5]:
        local = download_image(img_url, IMAGES_DIR)
        if local:
            images_local.append(local)
        time.sleep(0.5)

    # 生成HTML
    slug = slugify(title)
    filename = f"{slug}.html"
    filepath = BLOG_DIR / filename
    if filepath.exists():
        filename = f"{slug}-{url_hash}.html"
        filepath = BLOG_DIR / filename

    html = generate_blog_html(article, images_local)
    filepath.write_text(html, encoding="utf-8")
    print(f"     📝 blog/{filename}")

    # 更新日志
    crawl_log.setdefault("crawled_urls", []).append(url_hash)

    return {
        "title": title, "file": filename,
        "source": article.get("author", ""), "date": datetime.now().strftime("%Y-%m-%d"),
    }


def main():
    urls = []

    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == "-":
            # 从stdin读取
            urls = [line.strip() for line in sys.stdin if line.strip() and not line.startswith("#")]
        elif os.path.isfile(arg):
            # 从文件读取
            urls = [line.strip() for line in open(arg, encoding="utf-8") if line.strip() and not line.startswith("#")]
        else:
            # 直接传的URL
            urls = [a for a in sys.argv[1:] if a.startswith("http")]
    else:
        print("用法:")
        print("  python3 scripts/crawl-articles.py urls.txt")
        print("  python3 scripts/crawl-articles.py URL1 URL2 ...")
        print("  echo URL | python3 scripts/crawl-articles.py -")
        sys.exit(1)

    if not urls:
        print("❌ 没有URL")
        sys.exit(1)

    dry_run = "--dry-run" in sys.argv or "-n" in sys.argv
    no_push = "--no-push" in sys.argv

    # 移除参数标志
    urls = [u for u in urls if not u.startswith("--") and not u.startswith("-")]

    print(f"🚀 开始抓取 {len(urls)} 篇文章\n")

    log = load_crawl_log()
    new_articles = []

    for url in urls:
        result = process_url(url, log, dry_run)
        if result:
            new_articles.append(result)
        time.sleep(2)

    # 保存日志
    log["last_run"] = datetime.now().isoformat()
    log["total"] = len(log.get("crawled_urls", []))
    if not dry_run:
        save_crawl_log(log)

    print(f"\n{'='*50}")
    print(f"📊 本次结果: 新增 {len(new_articles)} 篇")
    for a in new_articles:
        print(f"   📝 {a['title'][:40]} → blog/{a['file']}")

    if new_articles and not dry_run and not no_push:
        print("\n📤 提交部署...")
        os.chdir(PROJECT_ROOT)
        os.system("git add blog/ images/crawled/ data/crawl-log.json")
        os.system(f'git commit -m "feat(crawler): 新增 {len(new_articles)} 篇攻略文章"')
        os.system("git push")
        print("✅ 已推送")


if __name__ == "__main__":
    main()
