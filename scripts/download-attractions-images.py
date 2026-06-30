#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
秦皇岛景点图片自动下载工具
从 Unsplash、Pexels 等免费图库下载景点高质量图片
"""

import json
import os
import requests
from pathlib import Path
from urllib.parse import quote

# Unsplash API (无需认证即可使用)
UNSPLASH_API = "https://api.unsplash.com/search/photos"
PEXELS_API = "https://api.pexels.com/v1/search"

# 景点中文名到英文搜索词的映射
SEARCH_KEYWORDS = {
    "联峰山公园": "Lianfeng Mountain Beidaihe",
    "怪楼奇园": "Guailou Qiyuan",
    "秦皇岛野生动物园": "Qinhuangdao Zoo",
    "集发农业梦想王国": "Jifa agricultural dream kingdom",
    "北戴河湿地公园": "Beidaihe wetland park",
    "角山长城": "Jiao Mountain Great Wall",
    "孟姜女庙": "Meng Jiangnu temple",
    "乐岛海洋王国": "Leao Ocean Kingdom",
    "长寿山景区": "Changshou Mountain",
    "燕塞湖": "Yan Sai Lake",
    "山海关古城": "Shanhaiguan ancient city",
    "秦皇求仙入海处": "Qinhuang seeking immortals",
    "新澳海底世界": "Xin Ao Underwater World",
    "秦皇岛港口博物馆": "Qinhuangdao Port Museum",
    "戴河生态园": "Daihe Ecological Park",
    "南戴河·黄金海岸": "Nandaihe Golden Coast",
    "渔岛海洋温泉景区": "Fisherman Island hot spring",
    "圣蓝海洋公园": "Shenglan Ocean Park",
    "碣石山": "Jieshi Mountain",
    "蔚蓝海岸": "Azure Coast",
    "仙螺岛": "Xianoluo Island",
    "沙雕海洋乐园": "Sand sculpture ocean park",
    "南戴河国际娱乐中心": "Nandaihe International Entertainment",
    "祖山风景区": "Zushan scenic area",
    "冰塘峪大峡谷": "Bingtang Gorge",
    "板厂峪长城景区": "Banchang Great Wall",
    "天马湖景区": "Tianma Lake",
    "葡萄沟": "Grape Valley",
    "华夏庄园景区": "Huaxia Manor",
    "老君顶景区": "Laojun Peak",
    "金士国际葡萄酒庄": "Kingstar Winery",
    "魅力宏兴工业文化园": "Hongxing Industrial Park",
    "龙云谷景区": "Longyun Valley",
    "棋盘山景区": "Qipan Mountain",
    "五峰山景区": "Wufeng Mountain",
    "天马山旅游风景区": "Tianma Mountain",
    "鲍子沟景区": "Baozi Gorge",
    "柳河溪谷": "Liuhe Valley",
    "柳河山庄": "Liuhe Manor",
    "山海关古城民俗博物馆（王家大院）": "Shanhaiguan folk museum",
    "渔田·七里海度假区": "Fished seven-li sea resort",
}

def download_from_unsplash(query, save_path, max_width=1200):
    """从 Unsplash 下载图片"""
    try:
        params = {
            "query": query,
            "per_page": 1,
            "order_by": "relevant",
            "w": max_width,
        }
        response = requests.get(UNSPLASH_API, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data["results"]:
                img_url = data["results"][0]["urls"]["regular"]
                # 下载图片
                img_response = requests.get(img_url, timeout=10)
                if img_response.status_code == 200:
                    with open(save_path, "wb") as f:
                        f.write(img_response.content)
                    return True
    except Exception as e:
        print(f"  ⚠️  Unsplash 下载失败: {e}")
    return False

def download_from_pexels(query, save_path, api_key=None):
    """从 Pexels 下载图片"""
    try:
        # Pexels 有免费 API，无需密钥即可使用
        headers = {}
        if api_key:
            headers["Authorization"] = api_key
        
        params = {"query": query, "per_page": 1}
        response = requests.get(PEXELS_API, params=params, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("photos"):
                img_url = data["photos"][0]["src"]["large"]
                img_response = requests.get(img_url, timeout=10)
                if img_response.status_code == 200:
                    with open(save_path, "wb") as f:
                        f.write(img_response.content)
                    return True
    except Exception as e:
        print(f"  ⚠️  Pexels 下载失败: {e}")
    return False

def main():
    # 加载景点数据
    json_path = Path("data/attractions.json")
    if not json_path.exists():
        print("❌ 找不到 data/attractions.json")
        return
    
    with open(json_path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    
    # 创建图片目录
    img_dir = Path("images")
    img_dir.mkdir(exist_ok=True)
    
    print("🖼️  秦皇岛景点图片批量下载工具\n")
    print("=" * 60)
    
    missing_count = 0
    downloaded_count = 0
    
    for spot in data["spots"]:
        name = spot["name"]
        spot_id = spot["id"]
        
        # 检查是否已有图片
        if spot.get("img") and spot["img"].strip():
            print(f"✅ {name} - 已有图片")
            continue
        
        missing_count += 1
        print(f"\n📍 ({missing_count}/41) {name}")
        
        # 构建搜索关键词
        if name in SEARCH_KEYWORDS:
            search_query = SEARCH_KEYWORDS[name]
        else:
            # 默认用中文名搜索
            search_query = name
        
        # 生成本地文件名
        safe_name = name.replace("·", "-").replace("（", "").replace("）", "").replace("/", "-")
        img_filename = f"images/attraction-{spot_id}.jpg"
        img_path = Path(img_filename)
        
        # 尝试从 Unsplash 下载
        print(f"  🔍 搜索: {search_query}")
        if download_from_unsplash(search_query, img_path):
            print(f"  ✓ 从 Unsplash 下载成功 ({img_path})")
            spot["img"] = img_filename
            downloaded_count += 1
        # 否则尝试从 Pexels 下载
        elif download_from_pexels(search_query, img_path):
            print(f"  ✓ 从 Pexels 下载成功 ({img_path})")
            spot["img"] = img_filename
            downloaded_count += 1
        else:
            print(f"  ✗ 下载失败，需要手动补充")
    
    # 保存更新后的 JSON
    print("\n" + "=" * 60)
    print(f"\n📊 下载统计:")
    print(f"  • 已有真实图: 7 张")
    print(f"  • 缺图景点: 41 个")
    print(f"  • 成功下载: {downloaded_count} 张")
    print(f"  • 仍需手动: {41 - downloaded_count} 个")
    
    # 保存更新
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 景点数据已更新: {json_path}")
    print("\n💡 提示:")
    print("  1. 如果某个景点仍缺图，可手动从以下网站下载:")
    print("     - Unsplash: https://unsplash.com")
    print("     - Pexels: https://www.pexels.com")
    print("     - Pixabay: https://pixabay.com")
    print("  2. 将图片保存为 images/attraction-{景点ID}.jpg")
    print("  3. 更新 data/attractions.json 中对应景点的 'img' 字段")

if __name__ == "__main__":
    main()
