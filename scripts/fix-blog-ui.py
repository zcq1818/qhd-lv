#!/usr/bin/env python3
"""
批量修复博客文章页的导航栏和页脚，与主站统一
"""
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = PROJECT_ROOT / "blog"

# 统一的导航栏 HTML（来自 blog.html，路径调整为 ../）
NAV_HTML = """<nav class="navbar" id="navbar">
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
</nav>"""

# 统一的页脚 HTML（来自 blog.html，路径调整为 ../）
FOOTER_HTML = """<footer class="footer">
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
</footer>"""

# 统一的脚本
SCRIPTS_HTML = """<script>
window.addEventListener('scroll', function () {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});
document.getElementById('hamburger').addEventListener('click', function () {
  document.getElementById('navLinks').classList.toggle('open');
});
</script>
<script src="../js/search.js" defer></script>
<script src="../js/chat-widget.js" defer></script>
<link rel="stylesheet" href="../css/chat-widget.css">"""

# 需要注入的 CSS（搜索按钮 + 导航栏样式补丁）
STYLE_INJECT = """
<style>
  .nav-search-trigger { display:inline-flex;align-items:center;gap:4px;background:none;border:1px solid rgba(255,255,255,0.25);color:rgba(255,255,255,0.8);padding:6px 12px;border-radius:var(--radius,8px);cursor:pointer;font-size:0.8rem;transition:all 0.2s; }
  .nav-search-trigger:hover { border-color:rgba(255,255,255,0.5);color:#fff; }
  .search-kbd { font-size:0.65rem;opacity:0.5;margin-left:4px; }
  .breadcrumb { max-width:var(--max-width,1200px);margin:0 auto;padding:calc(var(--s3,12px) + 60px) var(--s6,24px) var(--s3,12px);font-size:var(--text-sm,0.875rem);color:var(--text-muted,#6b7280); }
  .breadcrumb a { color:var(--brand,#1a73e8);text-decoration:none; }
  .breadcrumb a:hover { text-decoration:underline; }
  .breadcrumb .sep { margin:0 var(--s2,8px);opacity:0.4; }
</style>"""


def fix_blog_article(filepath: Path):
    """修复单个博客文章的导航栏和页脚"""
    html = filepath.read_text(encoding="utf-8")
    original = html

    # 1. 替换导航栏：匹配从 <nav 到 </nav> 的所有变体
    # 匹配简单面包屑导航或旧导航栏
    nav_patterns = [
        r'<nav[^>]*class="breadcrumb"[^>]*>.*?</nav>',
        r'<nav\s+class="navbar"[^>]*>.*?</nav>',
        r'<nav[^>]*>.*?秦皇岛旅游.*?</nav>',
    ]
    nav_replaced = False
    for pattern in nav_patterns:
        if re.search(pattern, html, re.DOTALL):
            html = re.sub(pattern, NAV_HTML, html, count=1, flags=re.DOTALL)
            nav_replaced = True
            break

    # 如果没找到 nav，尝试在 <body> 后插入
    if not nav_replaced:
        html = html.replace('<body>', '<body>\n' + NAV_HTML, 1)

    # 2. 替换页脚
    footer_pattern = r'<footer[^>]*>.*?</footer>'
    if re.search(footer_pattern, html, re.DOTALL):
        html = re.sub(footer_pattern, FOOTER_HTML, html, count=1, flags=re.DOTALL)
    else:
        html = html.replace('</body>', FOOTER_HTML + '\n</body>', 1)

    # 3. 替换脚本区域（在 </body> 前）
    # 移除旧的 script 标签
    html = re.sub(r'<script[^>]*>.*?search\.js.*?</script>', '', html, flags=re.DOTALL)
    html = re.sub(r'<script[^>]*>.*?chat-widget.*?</script>', '', html, flags=re.DOTALL)
    html = re.sub(r'<link[^>]*chat-widget\.css[^>]*>', '', html)

    # 在 </body> 前插入统一脚本
    html = html.replace('</body>', SCRIPTS_HTML + '\n</body>')

    # 4. 注入缺失的 CSS
    if 'nav-search-trigger' not in html:
        html = html.replace('</head>', STYLE_INJECT + '\n</head>')

    # 5. 确保有 navbar CSS（从 style.css 引用）
    if 'style.css' not in html:
        html = html.replace('</head>', '<link rel="stylesheet" href="../style.css">\n</head>')

    # 6. 修复相对路径：确保 ../ 前缀正确
    # 有些文章可能已经有正确的路径，有些可能没有

    if html != original:
        filepath.write_text(html, encoding="utf-8")
        return True
    return False


def main():
    files = sorted(BLOG_DIR.glob("*.html"))
    # 排除 blog.html 自身
    files = [f for f in files if f.name != "blog.html"]

    print(f"🔧 批量修复 {len(files)} 个博客文章的导航栏和页脚\n")

    fixed = 0
    for f in files:
        result = fix_blog_article(f)
        status = "✅ 已修复" if result else "⏭ 无变化"
        print(f"  {status}: {f.name}")
        if result:
            fixed += 1

    print(f"\n📊 完成: {fixed}/{len(files)} 个文件已更新")


if __name__ == "__main__":
    main()
