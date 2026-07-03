#!/usr/bin/env python3
"""
微信公众号文章爬虫 — 通过搜狗微信搜索抓取
用法: python3 scripts/crawl-weixin.py [--query "关键词"] [--max 5] [--no-push]
"""
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = PROJECT_ROOT / "blog"
IMAGES_DIR = PROJECT_ROOT / "images" / "crawled"
DATA_DIR = PROJECT_ROOT / "data"
CRAWL_LOG = DATA_DIR / "crawl-log.json"

DEFAULT_QUERIES = [
    "秦皇岛旅游攻略",
    "北戴河旅游攻略",
    "山海关旅游",
    "秦皇岛美食攻略",
    "北戴河赶海攻略",
    "秦皇岛亲子游",
]

sys.path.insert(0, str(Path.home() / '.openclaw/skills/mimo-omni'))
try:
    from mimo_api import call_api as mimo_call_api
    HAS_AI = True
except ImportError:
    HAS_AI = False


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


def ai_polish(text, title=""):
    if not HAS_AI or len(text) < 200:
        return text
    truncated = text[:6000] if len(text) > 6000 else text
    prompt = "你是一个旅游攻略编辑。请对以下旅游攻略文章进行润色：\n\n"
    prompt += "要求：\n"
    prompt += "1. 去除所有营销内容（旅行社广告、微信号、电话等）\n"
    prompt += "2. 去除网站噪声（导航、页脚、版权声明等）\n"
    prompt += "3. 保留实用信息（景点介绍、路线、门票、交通、美食）\n"
    prompt += "4. 优化语言流畅度，不要改变事实\n"
    prompt += "5. 只返回润色后的正文\n\n"
    prompt += f"标题：{title}\n\n原文：\n{truncated}"
    try:
        result = mimo_call_api(prompt, max_tokens=8192, timeout=60)
        if result and len(result) > 200:
            return result
    except Exception as e:
        print(f"  ⚠ AI润色失败: {e}")
    return text


def crawl_weixin(queries, max_per_query=5):
    """用 Playwright 搜狗微信搜索抓取文章"""
    from playwright.sync_api import sync_playwright

    articles = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
            locale='zh-CN',
        )

        for query in queries:
            print(f"\n🔍 搜索: {query}")
            page = ctx.new_page()
            page.goto(f'https://weixin.sogou.com/weixin?type=2&query={query}&ie=utf8',
                     wait_until='domcontentloaded', timeout=20000)
            page.wait_for_timeout(3000)

            results = page.query_selector_all('ul.news-list li')
            count = 0

            for item in results:
                if count >= max_per_query:
                    break

                link = item.query_selector('h3 a')
                if not link:
                    continue

                title = link.inner_text().strip()
                href = link.get_attribute('href') or ''
                if href.startswith('/'):
                    href = 'https://weixin.sogou.com' + href

                # 跟踪链接到微信文章
                art_page = ctx.new_page()
                try:
                    art_page.goto(href, wait_until='domcontentloaded', timeout=20000)
                    art_page.wait_for_timeout(3000)

                    url = art_page.url
                    if 'mp.weixin.qq.com' not in url or 'captcha' in url:
                        art_page.close()
                        continue

                    body_el = art_page.query_selector('#js_content')
                    if not body_el:
                        art_page.close()
                        continue

                    text = body_el.inner_text().strip()
                    if len(text) < 300:
                        art_page.close()
                        continue

                    # 提取图片
                    imgs = []
                    for img in body_el.query_selector_all('img'):
                        src = img.get_attribute('data-src') or img.get_attribute('src') or ''
                        if src and 'mmbiz' in src:
                            imgs.append(src)

                    # 提取作者
                    author_el = art_page.query_selector('#js_name')
                    author = author_el.inner_text().strip() if author_el else '微信公众号'

                    articles.append({
                        'title': title,
                        'content_text': text,
                        'images': imgs[:10],
                        'author': author,
                        'source_url': url,
                    })

                    print(f"  ✅ {title[:40]} ({len(text)}字, {len(imgs)}图)")
                    count += 1

                except Exception as e:
                    pass
                finally:
                    art_page.close()

                time.sleep(2)

            page.close()
            time.sleep(3)

        browser.close()

    return articles


def download_image(url, save_dir):
    try:
        headers = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://mp.weixin.qq.com/'}
        resp = requests.get(url, headers=headers, timeout=15, stream=True)
        if resp.status_code == 200 and len(resp.content) > 500:
            ct = resp.headers.get('Content-Type', '')
            ext = '.jpg'
            if 'webp' in ct: ext = '.webp'
            elif 'png' in ct: ext = '.png'
            filename = f"crawl-{md5(url)}{ext}"
            save_dir.mkdir(parents=True, exist_ok=True)
            (save_dir / filename).write_bytes(resp.content)
            return f"images/crawled/{filename}"
    except:
        pass
    return None


def generate_blog_html(article, images_local):
    title = article.get('title', '未命名')
    author = article.get('author', '微信公众号')
    pub_date = datetime.now().strftime('%Y-%m-%d')
    content_text = article.get('content_text', '')
    source_url = article.get('source_url', '')
    desc = content_text[:160].replace('\n', ' ').replace('"', '&quot;')
    cover_img = images_local[0] if images_local else 'images/qhd-panorama.webp'
    slug = slugify(title)

    # 构建HTML段落
    paragraphs = [p.strip() for p in content_text.split('\n') if p.strip() and len(p.strip()) > 10]
    content_html = '\n'.join(f'<p>{p}</p>' for p in paragraphs)

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | 秦皇岛旅游博客</title>
<meta name="description" content="{desc}">
<meta name="author" content="{author}">
<link rel="canonical" href="https://qhd-lv.vercel.app/blog/{slug}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://qhd-lv.vercel.app/blog/{slug}">
<meta property="og:image" content="https://qhd-lv.vercel.app/{cover_img}">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="../css/search.css">
<link rel="stylesheet" href="../css/share.css">
<style>
  .article-wrap {{ max-width: 800px; margin: 0 auto; padding: 0 var(--s6) var(--s12); }}
  .article-header {{ padding: var(--s6) 0; border-bottom: 1px solid var(--border-light); margin-bottom: var(--s8); }}
  .article-header h1 {{ font-size: clamp(1.6rem, 3.2vw, 2.2rem); font-weight: 800; line-height: 1.35; margin: var(--s3) 0 var(--s4); }}
  .article-meta {{ display: flex; align-items: center; flex-wrap: wrap; gap: var(--s3); font-size: var(--text-sm); color: var(--text-muted); }}
  .article-meta .sep {{ opacity: 0.4; }}
  .article-cover {{ width: 100%; height: auto; max-height: 420px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: var(--s8); }}
  .article-body {{ font-size: 1.02rem; line-height: 1.95; color: var(--gray-800); }}
  .article-body h2 {{ font-size: var(--text-2xl); font-weight: 800; margin: var(--s10) 0 var(--s4); }}
  .article-body p {{ margin-bottom: var(--s4); }}
  .article-body img {{ max-width: 100%; height: auto; border-radius: var(--radius); margin: var(--s4) 0; }}
  .source-note {{ background: var(--gray-50); border: 1px solid var(--border-light); border-radius: var(--radius); padding: var(--s4) var(--s5); margin-top: var(--s8); font-size: var(--text-sm); color: var(--text-muted); }}
  .source-note a {{ color: var(--brand); }}
</style>
</head>
<body>
<nav class="navbar" id="navbar">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <svg class="nav-logo-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" fill="#1a73e8"/><path d="M8 18 Q11 10 14 8 Q17 10 20 18" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      秦皇岛旅游官网
    </a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/">首页</a></li>
      <li><a href="../attractions">景点</a></li>
      <li><a href="../map">地图</a></li>
      <li><a href="../itinerary">行程规划</a></li>
      <li><a href="../planner">智能规划</a></li>
      <li><a href="../food">美食</a></li>
      <li><a href="../guide">旅游攻略</a></li>
      <li><a href="../blog" class="active">博客</a></li>
      <li><a href="../about">关于我们</a></li>
    </ul>
    <a href="../itinerary" class="nav-cta">免费规划行程 <span class="nav-cta-arrow">→</span></a>
    <button class="hamburger" id="hamburger" aria-label="菜单"><span></span><span></span><span></span></button>
  </div>
</nav>
<div class="breadcrumb"><a href="/">首页</a> <span class="sep">/</span> <a href="/blog">博客</a> <span class="sep">/</span> <span>{title[:20]}…</span></div>
<main class="article-wrap">
  <header class="article-header">
    <h1>{title}</h1>
    <div class="article-meta">
      <span>📝 {author}</span><span class="sep">·</span><span>📅 {pub_date}</span><span class="sep">·</span><span>微信公众号</span>
    </div>
  </header>
  <img class="article-cover" src="../{cover_img}" alt="{title}" loading="lazy">
  <article class="article-body">{content_html}</article>
  <div class="source-note">📌 <strong>来源：</strong>本文来自微信公众号「{author}」，<a href="{source_url}" target="_blank" rel="noopener">查看原文</a>。如有侵权请联系删除。</div>
</main>
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand"><h3>秦皇岛旅游官网</h3><p>致力于为每一位来秦皇岛的游客，提供最实用、最全面的旅游攻略。</p></div>
      <div class="footer-col"><h4>热门页面</h4><a href="/">首页</a><a href="../attractions">景点推荐</a><a href="../itinerary">行程规划</a><a href="../food">美食推荐</a></div>
      <div class="footer-col"><h4>旅游攻略</h4><a href="../guide">出行指南</a><a href="../map">旅游地图</a><a href="../blog">旅游博客</a></div>
      <div class="footer-col"><h4>关于我们</h4><a href="../about">关于官网</a></div>
    </div>
    <div class="footer-bottom"><span>© 2026 秦皇岛旅游官网</span><span>冀ICP备16026346号-2</span><div><a href="../sitemap.xml">网站地图</a></div></div>
  </div>
</footer>
<script>
window.addEventListener('scroll', function() {{ document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20); }});
document.getElementById('hamburger').addEventListener('click', function() {{ document.getElementById('navLinks').classList.toggle('open'); }});
</script>
</body>
</html>"""


def main():
    import requests

    no_push = '--no-push' in sys.argv
    no_ai = '--no-ai' in sys.argv
    if no_ai:
        global HAS_AI
        HAS_AI = False

    queries = DEFAULT_QUERIES
    max_per_query = 3

    log = load_crawl_log()
    crawled = set(log.get('crawled_urls', []))
    new_articles = []

    print("🚀 微信公众号文章抓取\n")

    # Playwright 抓取
    articles = crawl_weixin(queries, max_per_query)
    print(f"\n📋 共抓取 {len(articles)} 篇有效文章\n")

    for i, article in enumerate(articles):
        url_hash = md5(article['source_url'])
        if url_hash in crawled:
            print(f"  ⏭ 已抓过: {article['title'][:30]}")
            continue

        print(f"[{i+1}] 📄 {article['title'][:40]}...")

        # AI 润色
        if HAS_AI and len(article.get('content_text', '')) > 300:
            print(f"  🤖 AI润色中...")
            polished = ai_polish(article['content_text'], article['title'])
            if polished and len(polished) > 200:
                article['content_text'] = polished
                paragraphs = [p.strip() for p in polished.split('\n') if p.strip() and len(p.strip()) > 10]
                article['content_html'] = '\n'.join(f'<p>{p}</p>' for p in paragraphs)
                print(f"  ✅ AI润色完成 ({len(polished)}字)")

        # 下载图片
        images_local = []
        for img_url in article.get('images', [])[:5]:
            local = download_image(img_url, IMAGES_DIR)
            if local:
                images_local.append(local)
            time.sleep(0.5)

        # 生成 HTML
        slug = slugify(article['title'])
        filename = f"{slug}.html"
        filepath = BLOG_DIR / filename
        if filepath.exists():
            filename = f"{slug}-{url_hash}.html"
            filepath = BLOG_DIR / filename

        html = generate_blog_html(article, images_local)
        filepath.write_text(html, encoding='utf-8')
        print(f"  📝 blog/{filename} ({len(html)} bytes, {len(images_local)} 张图)")

        crawled.add(url_hash)
        new_articles.append({
            'title': article['title'],
            'file': filename,
            'source': article.get('author', ''),
            'date': datetime.now().strftime('%Y-%m-%d'),
        })

        time.sleep(3)

    # 保存日志
    log['crawled_urls'] = list(crawled)
    log['last_run'] = datetime.now().isoformat()
    log['total'] = len(crawled)
    save_crawl_log(log)

    print(f"\n{'='*50}")
    print(f"📊 本次结果: 新增 {len(new_articles)} 篇微信公众号文章")
    for a in new_articles:
        print(f"  📝 {a['title'][:40]} → blog/{a['file']}")

    if new_articles and not no_push:
        print("\n📤 提交部署...")
        os.chdir(PROJECT_ROOT)
        os.system('git add blog/ images/crawled/ data/crawl-log.json')
        os.system(f'git commit -m "feat(crawler): 新增 {len(new_articles)} 篇微信公众号文章"')
        os.system('git push')
        print("✅ 已推送")


if __name__ == '__main__':
    main()
