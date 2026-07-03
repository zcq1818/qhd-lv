#!/bin/bash
# 自动抓取微信公众号文章 + 更新博客列表 + Git 部署
# 用法: bash scripts/auto-crawl-deploy.sh [--dry-run]

set -e
cd "$(dirname "$0")/.."

echo "========================================"
echo "  🕷️  微信公众号文章自动抓取部署"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# 1. 抓取文章
echo "📡 [1/3] 抓取微信公众号文章..."
python3 scripts/wechat-crawler.py "$@"
CRAWL_EXIT=$?

if [ $CRAWL_EXIT -ne 0 ]; then
    echo "⚠️  抓取出错，继续执行后续步骤..."
fi

# 2. 更新博客列表页
echo ""
echo "📝 [2/3] 更新博客列表页..."
python3 scripts/update-blog-list.py

# 3. Git 提交和推送
if [[ "$*" != *"--dry-run"* ]]; then
    echo ""
    echo "📤 [3/3] Git 提交部署..."
    git add blog/ images/crawled/ data/crawl-log.json blog.html sitemap.xml 2>/dev/null || true

    # 检查是否有变更
    if git diff --cached --quiet; then
        echo "  ℹ️  没有新变更，跳过提交"
    else
        CHANGED=$(git diff --cached --stat | tail -1)
        git commit -m "feat(crawler): 自动抓取公众号文章 $(date '+%Y-%m-%d')

$CHANGED"
        git push
        echo ""
        echo "✅ 已推送！Vercel 将自动部署"
    fi
else
    echo ""
    echo "🔍 [DRY RUN] 跳过 Git 提交"
fi

echo ""
echo "========================================"
echo "  ✅ 完成！"
echo "========================================"
