#!/bin/bash
# 秦皇岛景点图片自动下载工具 (Mac/Linux 版)

echo ""
echo "===================================================="
echo "   秦皇岛景点图片自动完善工具"
echo "===================================================="
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "[错误] 需要安装 Python 3"
    echo ""
    echo "请运行:"
    echo "  brew install python3  (Mac)"
    echo "  sudo apt install python3  (Linux)"
    exit 1
fi

echo "[1/3] 检查依赖..."
pip3 install requests -q 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[安装] 正在安装 requests 库..."
    pip3 install requests
fi

echo "[✓] 依赖检查完成"
echo ""
echo "[2/3] 开始下载景点图片..."
echo ""

python3 scripts/download-attractions-images.py

if [ $? -ne 0 ]; then
    echo ""
    echo "[错误] 下载过程中出现问题"
    echo "请检查网络连接"
    exit 1
fi

echo ""
echo "[3/3] 验证结果..."
echo ""

COUNT=$(find images -name "attraction-*.jpg" 2>/dev/null | wc -l)

echo "=================================================="
echo "   完成！已下载 $COUNT 张新图片"
echo "=================================================="
echo ""
echo "后续步骤："
echo "  1. npm run dev"
echo "  2. 访问 http://localhost:3000/map.html 查看效果"
echo "  3. git add . && git commit -m 'Add attraction images'"
echo "  4. git push origin main （部署到Vercel）"
echo ""
