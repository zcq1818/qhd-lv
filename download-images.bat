@echo off
REM 秦皇岛景点图片自动下载工具 (Windows 版)
REM 使用 PowerShell 从免费图库下载图片

echo.
echo ====================================================
echo   秦皇岛景点图片自动完善工具
echo ====================================================
echo.

REM 检查Python是否已安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 需要安装 Python 3
    echo.
    echo 请从以下网址下载 Python:
    echo   https://www.python.org/downloads/
    echo.
    echo 安装后请运行此脚本
    pause
    exit /b 1
)

echo [1/3] 检查依赖包...
python -m pip install requests >nul 2>&1
if errorlevel 1 (
    echo [安装] 正在安装 requests 库...
    python -m pip install requests
    if errorlevel 1 (
        echo [错误] 安装失败
        pause
        exit /b 1
    )
)

echo [✓] 依赖检查完成
echo.
echo [2/3] 开始下载景点图片...
echo.

python scripts\download-attractions-images.py

if errorlevel 1 (
    echo.
    echo [错误] 下载过程中出现问题
    echo 请检查网络连接或查看详细日志
    pause
    exit /b 1
)

echo.
echo [3/3] 验证结果...
echo.

REM 统计已完成的图片
for /f %%f in ('dir /b images\attraction-*.jpg 2^>nul ^| find /c /v ""') do set COUNT=%%f

if "%COUNT%"=="" set COUNT=0

echo ================================================
echo   完成！已下载 %COUNT% 张新图片
echo ================================================
echo.
echo 后续步骤：
echo   1. npm run dev
echo   2. 访问 http://localhost:3000/map.html 查看效果
echo   3. git add . && git commit -m "Add attraction images"
echo   4. git push origin main （部署到Vercel）
echo.
pause
