#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速图片链接下载工具 - 从预制链接直接下载
"""

import json
import requests
from pathlib import Path

# 预制的高质量景点图片链接（来自免费库）
IMAGE_URLS = {
    "lianfengshan": "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&q=80",  # mountain
    "guailou": "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&q=80",  # building
    "zoo": "https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=1200&q=80",  # animals
    "jifa": "https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=1200&q=80",  # farm
    "wetland": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # nature
    "jaoshan": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # wall
    "mengjiang": "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&q=80",  # temple
    "leao": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80",  # water park
    "changshou": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # mountain
    "yansai": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # lake
    "ancient_city": "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&q=80",  # ancient
    "qinhuang": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # sea
    "underwater": "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200&q=80",  # ocean
    "museum": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",  # museum
    "daihe": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # park
    "nandaihe": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80",  # coast
    "fisherman": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # hot spring
    "shenglan": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80",  # ocean park
    "jieshi": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # mountain
    "azure": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",  # beach
    "xianoluo": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # island
    "sand_sculpture": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # beach
    "nandaihe_entertainment": "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&q=80",  # entertainment
    "zushan": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # mountain
    "bingtang": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # gorge
    "banchang": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # wall
    "tianma_lake": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # lake
    "grape": "https://images.unsplash.com/photo-1605521209278-fe9a84db0db4?w=1200&q=80",  # vineyard
    "huaxia": "https://images.unsplash.com/photo-1500382017468-6049aca57014?w=1200&q=80",  # manor
    "laojun": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # peak
    "kingstar": "https://images.unsplash.com/photo-1605521209278-fe9a84db0db4?w=1200&q=80",  # winery
    "hongxing": "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&q=80",  # industrial
    "longyun": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # valley
    "qipan": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # mountain
    "wufeng": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # mountain
    "tianma_tour": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # mountain
    "baozi": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # gorge
    "liuhe_valley": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # valley
    "liuhe_manor": "https://images.unsplash.com/photo-1500382017468-6049aca57014?w=1200&q=80",  # manor
    "folk_museum": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",  # museum
    "qihai": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",  # resort
}

def download_image(url, save_path):
    """下载单个图片"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        print(f"    ⚠️ 下载失败: {e}")
    return False

def main():
    json_path = Path("data/attractions.json")
    if not json_path.exists():
        print("❌ 找不到 data/attractions.json")
        return
    
    with open(json_path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    
    img_dir = Path("images")
    img_dir.mkdir(exist_ok=True)
    
    print("🖼️  秦皇岛景点图片快速下载工具")
    print("=" * 60)
    
    downloaded = 0
    
    for spot in data["spots"]:
        name = spot["name"]
        spot_id = spot["id"]
        
        # 跳过已有图片的
        if spot.get("img") and spot["img"].strip():
            print(f"✅ {name}")
            continue
        
        # 查找对应URL
        if spot_id in IMAGE_URLS:
            url = IMAGE_URLS[spot_id]
            img_path = f"images/attraction-{spot_id}.jpg"
            
            print(f"📍 {name}")
            print(f"  🔄 正在下载... {url[:50]}...")
            
            if download_image(url, img_path):
                spot["img"] = img_path
                downloaded += 1
                print(f"  ✅ 成功")
            else:
                print(f"  ❌ 失败")
        else:
            print(f"❓ {name} - 暂无预制链接")
    
    # 保存更新
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print(f"\n📊 完成统计:")
    print(f"  • 新增下载: {downloaded} 张")
    print(f"  • 景点数据已更新: {json_path}")

if __name__ == "__main__":
    main()
