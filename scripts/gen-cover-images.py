#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
给没有实景照片的景点生成统一的品牌封面图(images/cover/<id>.webp)。

背景:此前这些景点用的是随机国外素材(瑞士雪山、抽象油画、卫生间照片等),
与景点毫无关系,对旅游站是硬伤。在拿到实拍照片之前,用一张诚实的品牌封面
比用误导性的照片好:不假装是实景,同时保持版面整齐,也能用作分享缩略图。

用法: python scripts/gen-cover-images.py [景点id...]
"""
import json, os, sys, math
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'images', 'cover')
W, H = 1200, 800

FONT_BOLD = 'C:/Windows/Fonts/msyhbd.ttc'
FONT_REG = 'C:/Windows/Fonts/msyh.ttc'

# 分类 → 配色(深→浅)与图形母题
CAT_STYLE = {
    'beach':   {'from': (8, 47, 93),    'to': (23, 138, 178), 'motif': 'wave',     'label': '海滨风光'},
    'history': {'from': (61, 32, 16),   'to': (146, 84, 32),  'motif': 'wall',     'label': '历史文化'},
    'nature':  {'from': (13, 51, 32),   'to': (34, 122, 74),  'motif': 'mountain', 'label': '自然风光'},
    'family':  {'from': (76, 15, 56),   'to': (170, 45, 110), 'motif': 'ferris',   'label': '亲子娱乐'},
    'culture': {'from': (44, 20, 74),   'to': (110, 60, 170), 'motif': 'arch',     'label': '文艺打卡'},
}
DEFAULT = {'from': (15, 30, 60), 'to': (26, 115, 232), 'motif': 'wave', 'label': '景点'}


def gradient(size, c1, c2):
    w, h = size
    img = Image.new('RGB', (1, h))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return img.resize((w, h), Image.BILINEAR)


def draw_motif(d, kind, w, h):
    """右下角的半透明装饰图形,区分类别又不抢文字。"""
    col = (255, 255, 255, 26)
    if kind == 'wave':
        for k in range(3):
            pts = []
            base = h - 150 + k * 52
            for x in range(0, w + 20, 20):
                pts.append((x, base + math.sin(x / 130.0 + k) * 26))
            pts += [(w, h), (0, h)]
            d.polygon(pts, fill=(255, 255, 255, 18 + k * 6))
    elif kind == 'mountain':
        d.polygon([(w * 0.42, h), (w * 0.70, h * 0.40), (w * 0.98, h)], fill=col)
        d.polygon([(w * 0.60, h), (w * 0.86, h * 0.55), (w * 1.05, h)], fill=(255, 255, 255, 18))
    elif kind == 'wall':
        y0 = h * 0.58
        for i in range(9):
            x = w * 0.42 + i * (w * 0.07)
            top = y0 + (0 if i % 2 else -34)
            d.rectangle([x, top, x + w * 0.055, h], fill=(255, 255, 255, 20 if i % 2 else 26))
    elif kind == 'ferris':
        cx, cy, r = w * 0.80, h * 0.58, 165
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 40), width=6)
        for i in range(12):
            a = i * math.pi / 6
            d.line([cx, cy, cx + r * math.cos(a), cy + r * math.sin(a)], fill=(255, 255, 255, 26), width=4)
    elif kind == 'arch':
        cx, cy, r = w * 0.79, h * 0.62, 150
        d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=col)
        d.rectangle([cx - r, cy, cx + r, h], fill=col)


def wrap(text, font, max_w, draw):
    """按像素宽度折行,中文逐字判断。"""
    lines, cur = [], ''
    for ch in text:
        t = cur + ch
        if draw.textbbox((0, 0), t, font=font)[2] > max_w and cur:
            lines.append(cur); cur = ch
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines[:2]


def build(spot, areas):
    st = CAT_STYLE.get(spot.get('cat'), DEFAULT)
    img = gradient((W, H), st['from'], st['to']).convert('RGBA')
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    draw_motif(d, st['motif'], W, H)
    img = Image.alpha_composite(img, layer)
    d = ImageDraw.Draw(img)

    pad = 84
    area_name = areas.get(spot.get('area'), '')
    f_kicker = ImageFont.truetype(FONT_REG, 34)
    f_title = ImageFont.truetype(FONT_BOLD, 92)
    f_meta = ImageFont.truetype(FONT_REG, 33)
    f_brand = ImageFont.truetype(FONT_REG, 27)

    # 顶部:区域 · 分类
    kicker = ' · '.join([x for x in [area_name, st['label']] if x])
    d.text((pad, pad), kicker, font=f_kicker, fill=(255, 255, 255, 190))

    # 主标题
    name = spot['name'].split('（')[0]
    lines = wrap(name, f_title, W - pad * 2, d)
    y = pad + 86
    for ln in lines:
        d.text((pad, y), ln, font=f_title, fill=(255, 255, 255, 255))
        y += 108

    # 分隔线
    d.rectangle([pad, y + 16, pad + 96, y + 22], fill=(255, 255, 255, 200))

    # 关键信息
    bits = []
    if spot.get('level') and spot['level'] != '无':
        bits.append(spot['level'] + '景区')
    if spot.get('price'):
        bits.append(str(spot['price']).split('；')[0].split(';')[0])
    if spot.get('duration'):
        bits.append('建议' + spot['duration'])
    if bits:
        d.text((pad, y + 56), '  ·  '.join(bits), font=f_meta, fill=(255, 255, 255, 205))

    # 角标
    d.text((pad, H - pad - 14), '秦皇岛旅游官网  divdu.com', font=f_brand, fill=(255, 255, 255, 150))

    return img.convert('RGB')


def main():
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    data = json.load(open(os.path.join(ROOT, 'data', 'attractions.json'), encoding='utf-8'))
    areas = {a['id']: a['name'] for a in data['areas']}
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for s in data['spots']:
        if only and s['id'] not in only:
            continue
        if not only and str(s.get('img', '')).startswith('images/real/'):
            continue          # 已有实景照片的不动
        img = build(s, areas)
        p = os.path.join(OUT, s['id'] + '.webp')
        img.save(p, 'WEBP', quality=88, method=6)
        n += 1
        print('  %-22s %s' % (s['id'], os.path.relpath(p, ROOT).replace('\\', '/')))
    print('✅ 生成 %d 张品牌封面图 → images/cover/' % n)


if __name__ == '__main__':
    main()
