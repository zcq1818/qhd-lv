#!/usr/bin/env python3
"""
博客文章内容清洗器 — 去除网站噪声、营销内容、广告
用法: python3 scripts/clean-articles.py [--file blog/xxx.html] [--all]
"""
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = PROJECT_ROOT / "blog"

# ============ 噪声模式 ============

# 网站导航/页脚噪声
SITE_NOISE = [
    r'注册VIP邮箱.*?邮箱应用',
    r'免费下载.*?邮箱应用',
    r'网易官方.*?应用',
    r'热门推荐.*?$',
    r'网易新闻.*?$',
    r'来源:.*?\d{4}-\d{2}-\d{2}',
    r'\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*来源',
    r'责任编辑:.*?$',
    r'本文来源:.*?$',
    r'举报/反馈.*?$',
    r'查看更多精彩内容.*?$',
    r'打开APP.*?阅读',
    r'海量资讯.*?尽在.*?APP',
    r'特别声明:.*?$',
    r'以上内容.*?不代表.*?观点',
    r'未经许可.*?不得转载',
    r'文章作者:.*?$',
]

# 营销/广告内容
MARKETING_NOISE = [
    r'☎.*?热线:.*?\d+',
    r'官方微信号:.*?[\w]+',
    r'微信同号.*?$',
    r'咨询电话:.*?$',
    r'24小时.*?热线',
    r'报名咨询.*?$',
    r'认准正规.*?即可',
    r'推荐选择.*?旅行社',
    r'许可证号:.*?$',
    r'统一社会信用代码:.*?$',
    r'官方24小时.*?$',
    r'点击.*?咨询.*?$',
    r'扫码.*?咨询.*?$',
    r'添加.*?微信.*?$',
    r'联系.*?获取.*?报价',
    r'中港国际旅行社.*?$',
    r'蒙旅国际旅行社.*?$',
    r'一对一规划.*?$',
    r'无中间商.*?$',
    r'想.*?省心.*?认准.*?$',
    r'旅游报名优选.*?$',
]

# 短段落噪声（太短的段落通常是广告/导航）
MIN_PARAGRAPH_LEN = 30

# ============ 清洗函数 ============

def clean_text(text: str) -> str:
    """清洗文本内容"""
    # 移除网站噪声
    for pattern in SITE_NOISE:
        text = re.sub(pattern, '', text, flags=re.MULTILINE | re.IGNORECASE)
    
    # 移除营销内容
    for pattern in MARKETING_NOISE:
        text = re.sub(pattern, '', text, flags=re.MULTILINE | re.IGNORECASE)
    
    # 移除连续空行
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 移除行首行尾空白
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    return text.strip()


def clean_paragraphs(html_content: str) -> str:
    """清洗 HTML 中的段落"""
    soup_content = html_content
    
    # 找到所有 <p> 标签
    def clean_p(match):
        tag = match.group(0)
        # 提取纯文本
        text = re.sub(r'<[^>]+>', '', tag).strip()
        # 跳过太短的段落
        if len(text) < MIN_PARAGRAPH_LEN:
            return ''
        # 跳过包含噪声关键词的段落
        noise_keywords = ['VIP邮箱', '免费下载', '网易官方', '手机邮箱', '热门推荐',
                         '热线', '微信号', '许可证号', '信用代码', '旅行社', '报名咨询',
                         '认准正规', '无中间商', '咨询电话', '24小时', '官方微信']
        if any(kw in text for kw in noise_keywords):
            return ''
        return tag
    
    soup_content = re.sub(r'<p[^>]*>.*?</p>', clean_p, soup_content, flags=re.DOTALL)
    
    # 移除空的段落
    soup_content = re.sub(r'<p[^>]*>\s*</p>', '', soup_content)
    
    return soup_content


def clean_article(filepath: Path) -> bool:
    """清洗单篇文章"""
    html = filepath.read_text(encoding='utf-8')
    original = html
    
    # 1. 清洗 title 中的噪声
    title_m = re.search(r'<title>([^<]+)</title>', html)
    if title_m:
        title = title_m.group(1)
        title = re.sub(r'\|.*?网易.*$', '', title).strip()
        title = re.sub(r'\|.*$', '', title).strip()
        html = html.replace(title_m.group(0), f'<title>{title}</title>')
    
    # 2. 清洗 meta description
    desc_m = re.search(r'<meta name="description" content="([^"]*)"', html)
    if desc_m:
        desc = desc_m.group(1)
        desc = clean_text(desc)
        if len(desc) > 160:
            desc = desc[:157] + '...'
        html = html.replace(desc_m.group(0), f'<meta name="description" content="{desc}">')
    
    # 3. 清洗正文
    body_m = re.search(r'(<article class="article-body">)(.*?)(</article>)', html, re.DOTALL)
    if body_m:
        body = body_m.group(2)
        
        # 清洗段落中的噪声
        body = clean_paragraphs(body)
        
        # 清洗纯文本噪声
        body = clean_text(body)
        
        # 移除来源/日期行
        body = re.sub(r'<p[^>]*>\s*\d{4}-\d{2}-\d{2}.*?</p>', '', body)
        body = re.sub(r'<p[^>]*>\s*来源:.*?</p>', '', body)
        
        html = html[:body_m.start(2)] + body + html[body_m.end(2):]
    
    # 4. 清洗作者
    author_m = re.search(r'<meta name="author" content="([^"]*)"', html)
    if author_m:
        author = author_m.group(1)
        if '旅行社' in author or '热线' in author or len(author) > 20:
            html = html.replace(author_m.group(0), '<meta name="author" content="网络整理">')
    
    if html != original:
        filepath.write_text(html, encoding='utf-8')
        return True
    return False


def main():
    import sys
    
    if '--all' in sys.argv:
        files = sorted(BLOG_DIR.glob('*.html'))
        files = [f for f in files if f.name != 'blog.html']
    elif '--file' in sys.argv:
        idx = sys.argv.index('--file')
        if idx + 1 < len(sys.argv):
            files = [Path(sys.argv[idx + 1])]
        else:
            print("❌ --file 需要文件路径")
            return
    else:
        print("用法:")
        print("  python3 scripts/clean-articles.py --all")
        print("  python3 scripts/clean-articles.py --file blog/xxx.html")
        return
    
    print(f"🧹 清洗 {len(files)} 篇文章\n")
    
    cleaned = 0
    for f in files:
        result = clean_article(f)
        status = "✅ 已清洗" if result else "⏭ 无变化"
        print(f"  {status}: {f.name}")
        if result:
            cleaned += 1
    
    print(f"\n📊 完成: {cleaned}/{len(files)} 篇已清洗")


if __name__ == "__main__":
    main()
