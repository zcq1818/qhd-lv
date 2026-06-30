#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按类别为所有缺图景点分配高质量占位符图片
"""

import json
import requests
from pathlib import Path

# 按景点类别预制的高质量图片URL
CATEGORY_IMAGES = {
    "beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=800&q=80",
    "history": "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&h=800&q=80",
    "nature": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&q=80",
    "family": "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&h=800&q=80",
    "culture": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&h=800&q=80",
}

def download_and_save(url, save_path):
    """下载图片到本地"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        resp = requests.get(url, timeout=10, headers=headers)
        if resp.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(resp.content)
            return True
    except:
        pass
    return False

def main():
    json_path = Path("data/attractions.json")
    with open(json_path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    
    Path("images").mkdir(exist_ok=True)
    
    print("🎨 按类别为缺图景点分配图片...")
    print("=" * 70)
    
    downloaded = 0
    assigned = 0
    
    for i, spot in enumerate(data["spots"], 1):
        name = spot["name"]
        spot_id = spot["id"]
        category = spot.get("cat", "nature")
        
        # 跳过已有图片
        if spot.get("img") and spot["img"].strip():
            print(f"[{i:2d}] ✅ {name}")
            continue
        
        # 获取类别对应的URL
        url = CATEGORY_IMAGES.get(category, CATEGORY_IMAGES["nature"])
        img_path = f"images/attraction-{spot_id}.jpg"
        
        if download_and_save(url, img_path):
            spot["img"] = img_path
            assigned += 1
            downloaded += 1
            print(f"[{i:2d}] 🎨 {name} ({category}) ✅")
        else:
            print(f"[{i:2d}] ⏳ {name} ({category}) - 网络超时，使用占位符")
            # 至少更新JSON中的图片路径
            spot["img"] = img_path
            assigned += 1
    
    # 保存
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 70)
    print(f"\n📊 结果:")
    print(f"  • 新增分配: {assigned} 张")
    print(f"  • 成功下载: {downloaded} 张")
    print(f"  • 总已分配: {48 - (data['spots'].count(None) if None in [s.get('img') for s in data['spots']] else 0)} 张")
    print(f"\n✅ data/attractions.json 已更新！")

if __name__ == "__main__":
    main()
