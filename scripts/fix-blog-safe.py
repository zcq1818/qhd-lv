#!/usr/bin/env python3
"""
安全修复博客文章：只替换导航栏和页脚，不动文章内容
"""
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = PROJECT_ROOT / "blog"

# 标准导航栏（博客文章用，路径 ../）
NAV_HTML = '''<nav class="navbar" id="navbar">
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
</nav>'''

# 标准页脚（博客文章用，路径 ../）
FOOTER_HTML = '''<footer class="footer">
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
        <a href="../planner">智能规划</a>
        <a href="../food">美食推荐</a>
        <a href="../blog">旅游博客</a>
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
</footer>'''

SCRIPTS = '''<script>
window.addEventListener('scroll', function () {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});
document.getElementById('hamburger').addEventListener('click', function () {
  document.getElementById('navLinks').classList.toggle('open');
});
</script>'''


def safe_fix(filepath: Path):
    """安全修复：只替换导航栏和页脚"""
    html = filepath.read_text(encoding='utf-8')
    original = html
    
    # 1. 替换导航栏：从 <nav class="navbar" 到 </nav>
    nav_pattern = r'<nav\s+class="navbar"[^>]*>.*?</nav>'
    if re.search(nav_pattern, html, re.DOTALL):
        html = re.sub(nav_pattern, NAV_HTML, html, count=1, flags=re.DOTALL)
    
    # 2. 替换页脚：从 <footer 到 </footer>
    footer_pattern = r'<footer\s+class="footer"[^>]*>.*?</footer>'
    if re.search(footer_pattern, html, re.DOTALL):
        html = re.sub(footer_pattern, FOOTER_HTML, html, count=1, flags=re.DOTALL)
    
    # 3. 确保有滚动脚本
    if "navbar.classList.toggle" not in html:
        html = html.replace('</body>', SCRIPTS + '\n</body>')
    
    # 4. 添加 apple-touch-icon
    if 'apple-touch-icon' not in html:
        html = html.replace('</head>', '<link rel="apple-touch-icon" href="../assets/favicon.svg">\n</head>')
    
    # 5. 添加 hreflang
    if 'hreflang' not in html:
        html = html.replace('</head>', '<link rel="alternate" hreflang="zh-CN" href="https://qhd-lv.vercel.app/">\n</head>')
    
    if html != original:
        filepath.write_text(html, encoding='utf-8')
        return True
    return False


def main():
    files = sorted(BLOG_DIR.glob('*.html'))
    files = [f for f in files if f.name != 'blog.html']
    
    print(f"🔧 安全修复 {len(files)} 个博客文章\n")
    
    fixed = 0
    for f in files:
        result = safe_fix(f)
        status = "✅ 已修复" if result else "⏭ 无变化"
        print(f"  {status}: {f.name}")
        if result:
            fixed += 1
    
    print(f"\n📊 完成: {fixed}/{len(files)}")


if __name__ == "__main__":
    main()
