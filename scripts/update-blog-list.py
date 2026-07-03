#!/usr/bin/env python3
"""
自动扫描 blog/ 目录，更新 blog.html 中的文章列表
将新抓取的文章自动加入博客首页
"""

import json
import re
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = PROJECT_ROOT / "blog"
BLOG_HTML = PROJECT_ROOT / "blog.html"
DATA_DIR = PROJECT_ROOT / "data"

# 原创文章（手动维护，不会被覆盖）
ORIGINAL_SLUGS = [
    "qhd-food-guide", "qhd-ganhai-guide", "qhd-transport-guide",
    "qhd-family-travel", "qhd-winter-travel", "qhd-beidaihe-july-tips",
    "beidaihe-stay-guide", "geziwo-sunrise-guide", "shanhaiguan-one-day",
    "beidaihe-july-tips",
]


def extract_meta(filepath: Path) -> dict:
    """从 HTML 文件提取标题、描述、日期"""
    text = filepath.read_text(encoding="utf-8", errors="replace")

    title_m = re.search(r"<title>([^<]+)</title>", text)
    desc_m = re.search(r'<meta name="description" content="([^"]+)"', text)
    date_m = re.search(r'<meta property="article:published_time" content="([^"]+)"', text)
    # 也尝试从 JSON-LD 提取
    date_m2 = re.search(r'"datePublished"\s*:\s*"([^"]+)"', text)
    author_m = re.search(r'<meta name="author" content="([^"]+)"', text)

    title = title_m.group(1).replace(" | 秦皇岛旅游博客", "").strip() if title_m else filepath.stem
    desc = desc_m.group(1)[:120] if desc_m else ""
    date = (date_m.group(1) if date_m else date_m2.group(1) if date_m2 else "")
    author = author_m.group(1) if author_m else "编辑团队"

    return {
        "title": title,
        "desc": desc,
        "date": date,
        "author": author,
        "slug": filepath.stem,
        "is_crawled": filepath.stem not in ORIGINAL_SLUGS,
    }


def build_blog_card(meta: dict) -> str:
    """生成单个博客卡片 HTML"""
    slug = meta["slug"]
    title = meta["title"]
    desc = meta["desc"]
    date = meta["date"]
    author = meta["author"]
    badge = '<span style="background:#fef3c7;color:#92400e;font-size:0.7rem;padding:2px 8px;border-radius:12px;font-weight:600;">转载</span>' if meta["is_crawled"] else ""

    return f'''
    <article class="blog-card" data-crawl="{'true' if meta['is_crawled'] else 'false'}">
      <div class="blog-card-body">
        <div class="blog-card-meta">
          {badge}
          <span>📅 {date}</span>
          <span>·</span>
          <span>{author}</span>
        </div>
        <h3><a href="/blog/{slug}">{title}</a></h3>
        <p>{desc}</p>
        <a href="/blog/{slug}" class="blog-read-more">阅读全文 →</a>
      </div>
    </article>'''


def main():
    # 扫描所有博客文件
    all_files = sorted(BLOG_DIR.glob("*.html"), key=lambda f: f.stat().st_mtime, reverse=True)
    all_metas = [extract_meta(f) for f in all_files]

    # 分为原创和转载
    originals = [m for m in all_metas if not m["is_crawled"]]
    crawled = [m for m in all_metas if m["is_crawled"]]

    print(f"📊 博客统计: 原创 {len(originals)} 篇, 转载 {len(crawled)} 篇")

    # 读取现有 blog.html
    html = BLOG_HTML.read_text(encoding="utf-8")

    # 找到转载文章区域（如果存在则替换，否则在原创区域后插入）
    crawled_marker_start = "<!-- CRAWLED_ARTICLES_START -->"
    crawled_marker_end = "<!-- CRAWLED_ARTICLES_END -->"

    crawled_cards = "\n".join(build_blog_card(m) for m in crawled[:20])  # 最多显示20篇

    crawled_section = f"""
{crawled_marker_start}
<section class="blog-section" style="margin-top:var(--s10);">
  <h2 style="font-size:var(--text-2xl);margin-bottom:var(--s6);">📰 精选转载 <span style="font-size:var(--text-sm);color:var(--text-muted);font-weight:400;">来自各大旅游公众号</span></h2>
  <div class="blog-grid">
    {crawled_cards}
  </div>
</section>
{crawled_marker_end}"""

    if crawled_marker_start in html:
        # 替换已有区域
        pattern = re.compile(
            re.escape(crawled_marker_start) + r".*?" + re.escape(crawled_marker_end),
            re.DOTALL
        )
        html = pattern.sub(crawled_section, html)
    else:
        # 在 </main> 之前插入
        html = html.replace("</main>", crawled_section + "\n</main>")

    # 更新 JSON-LD 中的博客列表
    blog_posts_json = json.dumps([
        {
            "@type": "BlogPosting",
            "headline": m["title"],
            "url": f"https://qhd-lv.vercel.app/blog/{m['slug']}",
            "datePublished": m["date"] or "2025-01-01",
            "author": {"@type": "Organization", "name": m["author"]},
        }
        for m in all_metas[:30]
    ], ensure_ascii=False, indent=4)

    # 替换 blogPost 数组
    html = re.sub(
        r'"blogPost"\s*:\s*\[.*?\]',
        f'"blogPost": {blog_posts_json}',
        html,
        flags=re.DOTALL,
    )

    BLOG_HTML.write_text(html, encoding="utf-8")
    print(f"✅ blog.html 已更新 (原创 {len(originals)} + 转载 {len(crawled)})")


if __name__ == "__main__":
    main()
