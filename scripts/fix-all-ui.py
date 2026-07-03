#!/usr/bin/env python3
"""
统一所有页面的导航栏和页脚
"""
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# 标准导航栏链接（index.html 为基准）
NAV_LINKS = [
    ("/", "首页", False),
    ("attractions", "景点", False),
    ("map", "地图", False),
    ("itinerary", "行程规划", False),
    ("planner", "智能规划", False),
    ("food", "美食", False),
    ("guide", "旅游攻略", False),
    ("blog", "博客", False),
    ("about", "关于我们", False),
]

# 标准页脚
FOOTER_HTML = """<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>秦皇岛旅游官网</h3>
        <p>致力于为每一位来秦皇岛的游客，提供最实用、最全面的旅游攻略。</p>
        <p style="margin-top:16px;">
          <span style="color:var(--brand-light);font-weight:700;">商务合作 / 广告投放</span><br>
          酒店·景区·餐饮 — 欢迎洽谈合作
        </p>
      </div>
      <div class="footer-col">
        <h4>热门页面</h4>
        <a href="/">首页</a>
        <a href="attractions">景点推荐</a>
        <a href="itinerary">行程规划</a>
        <a href="planner">智能规划</a>
        <a href="food">美食推荐</a>
        <a href="blog">旅游博客</a>
      </div>
      <div class="footer-col">
        <h4>旅游攻略</h4>
        <a href="guide">出行指南</a>
        <a href="guide#transport">交通攻略</a>
        <a href="guide#accommodation">住宿推荐</a>
        <a href="guide#besttime">最佳时间</a>
      </div>
      <div class="footer-col">
        <h4>关于我们</h4>
        <a href="about">关于官网</a>
        <a href="about#cooperation">商务合作</a>
        <a href="about#privacy">隐私政策</a>
        <a href="about#disclaimer">免责声明</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 秦皇岛旅游官网 qhd-lv.vercel.app</span>
      <span>冀ICP备16026346号-2</span>
      <div>
        <a href="about#privacy">隐私政策</a> ·
        <a href="about#disclaimer">免责声明</a> ·
        <a href="sitemap.xml">网站地图</a>
      </div>
    </div>
  </div>
</footer>"""


def make_nav_html(active_page: str) -> str:
    """生成导航栏 HTML，active_page 是当前页面的路径"""
    links_html = ""
    for href, label, _ in NAV_LINKS:
        is_active = (href == active_page)
        cls = ' class="active"' if is_active else ""
        links_html += f'      <li><a href="{href}"{cls}>{label}</a></li>\n'

    return f"""<nav class="navbar" id="navbar">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <svg class="nav-logo-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" fill="#1a73e8"/><path d="M8 18 Q11 10 14 8 Q17 10 20 18" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      秦皇岛旅游官网
    </a>
    <ul class="nav-links" id="navLinks">
{links_html}    </ul>
    <a href="itinerary" class="nav-cta">免费规划行程 <span class="nav-cta-arrow">→</span></a>
    <button class="hamburger" id="hamburger" aria-label="菜单"><span></span><span></span><span></span></button>
  </div>
</nav>"""


def fix_page(filepath: Path, active_page: str):
    """修复单个页面的导航栏和页脚"""
    html = filepath.read_text(encoding="utf-8")
    original = html

    # 1. 替换导航栏
    nav_pattern = r'<nav\s+class="navbar"[^>]*>.*?</nav>'
    new_nav = make_nav_html(active_page)
    if re.search(nav_pattern, html, re.DOTALL):
        html = re.sub(nav_pattern, new_nav, html, count=1, flags=re.DOTALL)

    # 2. 替换页脚
    footer_pattern = r'<footer[^>]*>.*?</footer>'
    if re.search(footer_pattern, html, re.DOTALL):
        html = re.sub(footer_pattern, FOOTER_HTML, html, count=1, flags=re.DOTALL)

    if html != original:
        filepath.write_text(html, encoding="utf-8")
        return True
    return False


def main():
    # 页面文件名 -> 导航栏 active 状态
    pages = {
        "index.html": "/",
        "attractions.html": "attractions",
        "map.html": "map",
        "itinerary.html": "itinerary",
        "planner.html": "planner",
        "food.html": "food",
        "guide.html": "guide",
        "blog.html": "blog",
        "about.html": "about",
    }

    print("🔧 统一所有页面的导航栏和页脚\n")

    for filename, active in pages.items():
        filepath = PROJECT_ROOT / filename
        if not filepath.exists():
            print(f"  ⏭ 不存在: {filename}")
            continue
        result = fix_page(filepath, active)
        status = "✅ 已修复" if result else "⏭ 无变化"
        print(f"  {status}: {filename} (active={active})")

    # 也修复 404.html
    f404 = PROJECT_ROOT / "404.html"
    if f404.exists():
        result = fix_page(f404, "")
        print(f"  {'✅ 已修复' if result else '⏭ 无变化'}: 404.html")

    print("\n✅ 完成！")


if __name__ == "__main__":
    main()
