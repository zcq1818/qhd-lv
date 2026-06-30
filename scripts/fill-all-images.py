#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
秦皇岛景点快速图片完善工具 v2
预制高质量图片链接，一次性填充所有缺图景点
"""

import json
import requests
from pathlib import Path

# 基于实际景点ID的完整映射表
IMAGE_MAP = {
    "liangfengshan": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "dongwuyuan": "https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=1200&q=80",
    "shidi": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "jiashan": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "mengjiang": "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&q=80",
    "leao": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80",
    "changshou": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "yansai": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "gucheng": "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&q=80",
    "qinhuang": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "underwater": "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200&q=80",
    "museum": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",
    "daihe": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "nandaihe": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80",
    "fisherman": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "shenglan": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80",
    "jieshi": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "azure": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
    "xianoluo": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "sandart": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "nandaiheent": "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&q=80",
    "zushan": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "bingtang": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "banchang": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "tianmalake": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "grapvalley": "https://images.unsplash.com/photo-1605521209278-fe9a84db0db4?w=1200&q=80",
    "huaxia": "https://images.unsplash.com/photo-1500382017468-6049aca57014?w=1200&q=80",
    "laojun": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "kingstar": "https://images.unsplash.com/photo-1605521209278-fe9a84db0db4?w=1200&q=80",
    "hongxing": "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&q=80",
    "longyun": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "qipan": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "wufeng": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "tianmaview": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "baozi": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "liuhevalley": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    "liuhezhuang": "https://images.unsplash.com/photo-1500382017468-6049aca57014?w=1200&q=80",
    "folkmuseum": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",
    "qihai": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
}

def download_image(url, save_path, timeout=10):
    """下载单个图片"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, timeout=timeout, headers=headers)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        pass
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
    
    print("🖼️  秦皇岛景点图片快速完善工具 v2")
    print("=" * 70)
    
    downloaded = 0
    skipped = 0
    failed = 0
    
    for i, spot in enumerate(data["spots"], 1):
        name = spot["name"]
        spot_id = spot["id"]
        
        # 跳过已有图片的
        if spot.get("img") and spot["img"].strip():
            print(f"[{i:2d}] ✅ {name}")
            skipped += 1
            continue
        
        # 查找对应URL
        if spot_id in IMAGE_MAP:
            url = IMAGE_MAP[spot_id]
            img_path = f"images/attraction-{spot_id}.jpg"
            
            if download_image(url, img_path):
                spot["img"] = img_path
                downloaded += 1
                print(f"[{i:2d}] 📍 {name} ✅")
            else:
                failed += 1
                print(f"[{i:2d}] ❌ {name} (下载失败)")
        else:
            failed += 1
            print(f"[{i:2d}] ❓ {name} (无预制链接)")
    
    # 保存更新
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 70)
    print(f"\n📊 完成统计:")
    print(f"  • 新增下载: {downloaded} 张 ✅")
    print(f"  • 跳过已有: {skipped} 张")
    print(f"  • 下载失败: {failed} 个")
    print(f"  • 总计: {len(data['spots'])} 个景点")
    print(f"\n✅ 景点数据已更新: {json_path}")

if __name__ == "__main__":
    main()
