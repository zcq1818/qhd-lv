#!/usr/bin/env python3
"""
Notion → 博客同步脚本
从 Notion 数据库拉取文章，生成博客 HTML
用法: python3 scripts/notion-sync.py [--dry-run]
"""
import json
import os
import re
import sys
import hashlib
from datetime import datetime
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = PROJECT_ROOT / "blog"
DATA_DIR = PROJECT_ROOT / "data"
CONFIG_FILE = DATA_DIR / "notion-config.json"

# Notion 配置
def load_config():
    config = {}
    if CONFIG_FILE.exists():
        config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    # Token 从环境变量读取
    token_env = config.get("token_env", "NOTION_API_TOKEN")
    config["token"] = os.environ.get(token_env, "")
    return config

def save_config(config):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")

def slugify(text):
    text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '-', text)
    return re.sub(r'-+', '-', text).strip('-')[:60]

def notion_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }

def get_database_articles(token, db_id):
    """从 Notion 数据库获取所有文章"""
    url = f"https://api.notion.com/v1/databases/{db_id}/query"
    all_pages = []
    has_more = True
    start_cursor = None

    while has_more:
        body = {"page_size": 100}
        if start_cursor:
            body["start_cursor"] = start_cursor

        r = requests.post(url, headers=notion_headers(token), json=body)
        if r.status_code != 200:
            print(f"❌ 查询失败: {r.json().get('message', '')}")
            break

        data = r.json()
        all_pages.extend(data.get("results", []))
        has_more = data.get("has_more", False)
        start_cursor = data.get("next_cursor")

    return all_pages

def extract_page_data(page):
    """从 Notion 页面提取数据"""
    props = page.get("properties", {})

    # 标题
    title = ""
    for t in props.get("标题", {}).get("title", []):
        title += t.get("plain_text", "")

    # 状态
    status = props.get("状态", {}).get("status", {})
    status_name = status.get("name", "") if status else ""

    # 分类
    category = props.get("分类", {}).get("select", {})
    cat_name = category.get("name", "") if category else ""

    # 标签
    tags = [t.get("name", "") for t in props.get("标签", {}).get("multi_select", [])]

    # 摘要
    desc = ""
    for t in props.get("摘要", {}).get("rich_text", []):
        desc += t.get("plain_text", "")

    # Slug
    slug = ""
    for t in props.get("Slug", {}).get("rich_text", []):
        slug += t.get("plain_text", "")

    # 日期
    date_obj = props.get("发布日期", {}).get("date")
    pub_date = date_obj.get("start", "") if date_obj else ""

    # 来源
    source = props.get("来源", {}).get("select", {})
    source_name = source.get("name", "") if source else ""

    # 封面图
    cover = props.get("封面图", {}).get("url", "")

    # 内容（从页面 blocks 获取）
    content = page.get("_content", "")

    return {
        "id": page["id"],
        "title": title,
        "status": status_name,
        "category": cat_name,
        "tags": tags,
        "desc": desc,
        "slug": slug or slugify(title),
        "pub_date": pub_date or datetime.now().strftime("%Y-%m-%d"),
        "source": source_name,
        "cover": cover,
        "content": content,
    }

def get_page_content(token, page_id):
    """获取页面内容（blocks）"""
    url = f"https://api.notion.com/v1/blocks/{page_id}/children"
    r = requests.get(url, headers=notion_headers(token), params={"page_size": 100})
    if r.status_code != 200:
        return ""

    blocks = r.json().get("results", [])
    paragraphs = []

    for block in blocks:
        block_type = block.get("type", "")
        if block_type == "paragraph":
            text = ""
            for t in block.get("paragraph", {}).get("rich_text", []):
                text += t.get("plain_text", "")
            if text.strip():
                paragraphs.append(f"<p>{text}</p>")
        elif block_type in ("heading_1", "heading_2", "heading_3"):
            level = block_type[-1]
            text = ""
            for t in block.get(block_type, {}).get("rich_text", []):
                text += t.get("plain_text", "")
            if text.strip():
                paragraphs.append(f"<h{level}>{text}</h{level}>")
        elif block_type == "bulleted_list_item":
            text = ""
            for t in block.get("bulleted_list_item", {}).get("rich_text", []):
                text += t.get("plain_text", "")
            if text.strip():
                paragraphs.append(f"<li>{text}</li>")
        elif block_type == "numbered_list_item":
            text = ""
            for t in block.get("numbered_list_item", {}).get("rich_text", []):
                text += t.get("plain_text", "")
            if text.strip():
                paragraphs.append(f"<li>{text}</li>")
        elif block_type == "image":
            img_url = ""
            img_data = block.get("image", {})
            if img_data.get("type") == "external":
                img_url = img_data.get("external", {}).get("url", "")
            elif img_data.get("type") == "file":
                img_url = img_data.get("file", {}).get("url", "")
            if img_url:
                paragraphs.append(f'<p><img src="{img_url}" alt="图片" loading="lazy"></p>')

    return "\n".join(paragraphs)

def generate_blog_html(article):
    """生成博客 HTML"""
    title = article["title"]
    author = article.get("source", "编辑团队") or "编辑团队"
    pub_date = article["pub_date"]
    content = article["content"]
    desc = article["desc"][:160].replace('"', '&quot;')
    cover = article.get("cover") or "images/qhd-panorama.webp"
    slug = article["slug"]

    if not content:
        content = f"<p>{article['desc']}</p>"

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
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="../css/search.css">
<link rel="stylesheet" href="../css/share.css">
<style>
  .article-wrap {{ max-width: 800px; margin: 0 auto; padding: 0 var(--s6) var(--s12); }}
  .article-header {{ padding: var(--s6) 0; border-bottom: 1px solid var(--border-light); margin-bottom: var(--s8); }}
  .article-header h1 {{ font-size: clamp(1.6rem, 3.2vw, 2.2rem); font-weight: 800; line-height: 1.35; }}
  .article-meta {{ display: flex; align-items: center; flex-wrap: wrap; gap: var(--s3); font-size: var(--text-sm); color: var(--text-muted); }}
  .article-cover {{ width: 100%; max-height: 420px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: var(--s8); }}
  .article-body {{ font-size: 1.02rem; line-height: 1.95; color: var(--gray-800); }}
  .article-body h2 {{ font-size: var(--text-2xl); font-weight: 800; margin: var(--s10) 0 var(--s4); }}
  .article-body p {{ margin-bottom: var(--s4); }}
  .article-body img {{ max-width: 100%; height: auto; border-radius: var(--radius); margin: var(--s4) 0; }}
</style>
</head>
<body>
<nav class="navbar" id="navbar">
  <div class="nav-inner">
    <a href="/" class="nav-logo">秦皇岛旅游官网</a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/">首页</a></li>
      <li><a href="../attractions">景点</a></li>
      <li><a href="../blog" class="active">博客</a></li>
      <li><a href="../about">关于我们</a></li>
    </ul>
  </div>
</nav>
<main class="article-wrap">
  <header class="article-header">
    <h1>{title}</h1>
    <div class="article-meta">
      <span>📝 {author}</span> · <span>📅 {pub_date}</span>
    </div>
  </header>
  <article class="article-body">{content}</article>
</main>
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand"><h3>秦皇岛旅游官网</h3></div>
      <div class="footer-col"><h4>热门</h4><a href="/">首页</a><a href="../blog">博客</a></div>
    </div>
    <div class="footer-bottom"><span>© 2026 秦皇岛旅游官网</span></div>
  </div>
</footer>
<script>
window.addEventListener('scroll', function() {{ document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20); }});
</script>
</body>
</html>"""


def main():
    config = load_config()
    token = config.get("token", "")
    db_id = config.get("database_id", "")

    if not token or not db_id:
        print("❌ 未配置 Notion，请先运行 notion-sync setup")
        print("   python3 scripts/notion-sync.py setup <token> <database_id>")
        sys.exit(1)

    dry_run = "--dry-run" in sys.argv

    print("🔄 从 Notion 同步文章...\n")

    # 获取所有文章
    pages = get_database_articles(token, db_id)
    print(f"📋 Notion 数据库: {len(pages)} 篇文章")

    synced = 0
    for page in pages:
        # 获取内容
        content = get_page_content(token, page["id"])
        page["_content"] = content

        article = extract_page_data(page)

        # 只同步已发布的
        if article["status"] != "已发布":
            print(f"  ⏭ 跳过(状态:{article['status']}): {article['title'][:30]}")
            continue

        if dry_run:
            print(f"  🔍 [DRY RUN] {article['title'][:40]} ({len(content)}字)")
            continue

        # 生成 HTML
        html = generate_blog_html(article)
        slug = article["slug"]
        filepath = BLOG_DIR / f"{slug}.html"
        filepath.write_text(html, encoding="utf-8")
        print(f"  ✅ {article['title'][:40]} → blog/{slug}.html")
        synced += 1

    if synced > 0 and not dry_run:
        # 更新 blog.html
        os.system("python3 scripts/update-blog-list.py")

        # Git 提交
        os.chdir(PROJECT_ROOT)
        os.system("git add blog/ blog.html")
        os.system(f'git commit -m "sync(notion): 同步 {synced} 篇文章"')
        os.system("git push")
        print(f"\n✅ 同步完成，已部署 {synced} 篇文章")
    else:
        print(f"\n📊 无新文章需要同步")


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "setup":
        token = sys.argv[2]
        db_id = sys.argv[3]
        # 只保存 database_id 和 token 环境变量名
        save_config({"database_id": db_id, "token_env": "NOTION_API_TOKEN"})
        # Token 写入 .env 文件（不提交到 git）
        env_file = PROJECT_ROOT / ".env"
        with open(env_file, "a") as f:
            f.write(f"\nexport NOTION_API_TOKEN={token}\n")
        print(f"✅ Notion 配置已保存")
        print(f"   Token: {token[:10]}... (写入 .env)")
        print(f"   Database: {db_id}")
    else:
        main()
