#!/usr/bin/env python3
"""Generate individual attraction detail pages for QHD-LV static site."""

import json
import os
import html as html_module

BASE_URL = "https://qhd-lv.vercel.app"
FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23e3f2fd'/%3E%3Ccircle cx='300' cy='160' r='40' fill='%23ffd54f' opacity='0.6'/%3E%3Cpath d='M0 280 Q150 250 300 280 T600 280 L600 400 L0 400 Z' fill='%2342a5f5' opacity='0.3'/%3E%3Cpath d='M0 320 Q150 290 300 320 T600 320 L600 400 L0 400 Z' fill='%231a73e8' opacity='0.4'/%3E%3Ctext x='300' y='380' font-size='16' fill='%231565c0' text-anchor='middle' font-family='sans-serif' opacity='0.5'%3E秦皇岛旅游%3C/text%3E%3C/svg%3E"

# Ad slot HTML snippet
AD_SLOT = '''<div class="ad-slot ad-detail-banner" style="margin:32px 0;padding:20px;background:#f8f9fa;border:1px dashed #ddd;text-align:center;border-radius:8px;"><p style="color:#999;font-size:0.85rem;">广告位</p></div>'''

# Category info mapping
CAT_MAP = {
    "beach": {"name": "海滨风光", "icon": "🏖", "color": "#0369a1"},
    "history": {"name": "历史文化", "icon": "🏛", "color": "#92400e"},
    "nature": {"name": "自然风光", "icon": "⛰", "color": "#166534"},
    "family": {"name": "亲子娱乐", "icon": "🎢", "color": "#9d174d"},
    "culture": {"name": "文艺打卡", "icon": "🎭", "color": "#6b21a8"},
}

AREA_MAP = {
    "beidaihe": {"name": "北戴河区", "color": "#0369a1"},
    "shanhaiguan": {"name": "山海关区", "color": "#92400e"},
    "haigang": {"name": "海港区", "color": "#166534"},
    "nandaihe": {"name": "南戴河·昌黎", "color": "#6b21a8"},
    "funing": {"name": "抚宁·青龙", "color": "#EA4335"},
    "lulong": {"name": "卢龙县", "color": "#0f766e"},
}


def esc(text):
    """HTML-escape a string."""
    return html_module.escape(str(text))


def build_booking_buttons(booking):
    """Generate big prominent booking buttons."""
    if not booking:
        return ""
    btns = []
    for b in booking:
        btype = b.get("type", "")
        bname = esc(b.get("name", ""))
        burl = esc(b.get("url", "#"))
        if btype == "ctrip":
            cls = "booking-ctrip"
            icon = "🎫"
        elif btype == "meituan":
            cls = "booking-meituan"
            icon = "🎫"
        elif btype == "hotel":
            cls = "booking-hotel"
            icon = "🏨"
        else:
            cls = "booking-hotel"
            icon = "🔗"
        btns.append(f'<a href="{burl}" target="_blank" rel="noopener" class="booking-btn {cls}">{icon} {bname}</a>')
    return "\n".join(btns)


def build_related(all_spots, current):
    """Get 4 related spots from same area."""
    same_area = [s for s in all_spots if s["area"] == current["area"] and s["id"] != current["id"] and s.get("visible", True)]
    # If not enough from same area, fill from other spots
    if len(same_area) < 4:
        others = [s for s in all_spots if s["id"] != current["id"] and s["area"] != current["area"] and s.get("visible", True)]
        same_area.extend(others[:4 - len(same_area)])
    related = same_area[:4]
    cards = []
    for s in related:
        cat_info = CAT_MAP.get(s["cat"], {"name": "景点", "icon": "📍", "color": "#1a73e8"})
        cards.append(f'''
      <a href="{s['id']}.html" class="related-card">
        <img src="../{esc(s['img'])}" alt="{esc(s['name'])}" loading="lazy" onerror="this.onerror=null;this.src='{FALLBACK_IMG}';">
        <div class="related-card-body">
          <span class="related-tag" style="background:{cat_info['color']}15;color:{cat_info['color']};">{cat_info['icon']} {cat_info['name']}</span>
          <h4>{esc(s['name'])}</h4>
          <span class="related-rating">⭐ {esc(s['rating'])}</span>
        </div>
      </a>''')
    return "\n".join(cards)


def build_level_badge(level):
    """Build level badge HTML."""
    if not level or level == "无":
        return ""
    color = "#1a73e8"
    if "5A" in level:
        color = "#EA4335"
    elif "4A" in level:
        color = "#E37400"
    elif "3A" in level:
        color = "#0F9D58"
    return f'<span class="level-badge" style="background:{color};">{esc(level)}</span>'


def build_highlights(highlights):
    if not highlights:
        return ""
    items = []
    for h in highlights:
        items.append(f'<li>{esc(h)}</li>')
    return "\n".join(items)


def generate_page(spot, all_spots):
    """Generate a single attraction detail page."""
    name = spot["name"]
    sid = spot["id"]
    area = spot["area"]
    cat = spot["cat"]
    cat_info = CAT_MAP.get(cat, {"name": "景点", "icon": "📍", "color": "#1a73e8"})
    area_info = AREA_MAP.get(area, {"name": area, "color": "#1a73e8"})

    title = f"{name} - 秦皇岛旅游攻略"
    desc = spot.get("desc", "")[:160]
    keywords = f"{name},{area_info['name']},秦皇岛旅游,秦皇岛景点"
    og_image = f"{BASE_URL}/{spot['img']}"
    canonical = f"{BASE_URL}/attraction/{sid}"

    level_badge = build_level_badge(spot.get("level", ""))
    booking_html = build_booking_buttons(spot.get("booking", []))
    highlights_html = build_highlights(spot.get("highlights", []))
    related_html = build_related(all_spots, spot)

    # Rating stars display
    rating = spot.get("rating", "0")
    rating_float = float(rating) if rating else 0
    stars_full = int(rating_float)
    star_display = "★" * stars_full + "☆" * (5 - stars_full)

    # Price display
    price = spot.get("price", "免费")
    price_color = "#0F9D58" if price == "免费" else "#E37400"

    # Build highlights section
    highlights_section = ""
    if spot.get("highlights"):
        highlights_section = f'''
    <div class="detail-section">
      <h2 class="section-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        核心亮点
      </h2>
      <ul class="highlights-list">
        {highlights_html}
      </ul>
    </div>'''

    # Tips section
    tips_section = ""
    if spot.get("tips"):
        tips_section = f'''
    <div class="detail-section tips-box">
      <h2 class="section-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/><line x1="9" y1="21" x2="15" y2="21"/></svg>
        实用贴士
      </h2>
      <p>{esc(spot['tips'])}</p>
    </div>'''

    # Transport section
    transport_section = ""
    if spot.get("transport"):
        transport_section = f'''
    <div class="detail-section">
      <h2 class="section-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        交通指南
      </h2>
      <p>{esc(spot['transport'])}</p>
    </div>'''

    # Booking section
    booking_section = ""
    if booking_html:
        booking_section = f'''
    <div class="detail-section">
      <h2 class="section-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        立即预订
      </h2>
      <div class="booking-buttons">
        {booking_html}
      </div>
    </div>'''

    # JSON-LD
    json_ld = {
        "@context": "https://schema.org",
        "@type": "TouristAttraction",
        "name": name,
        "description": spot.get("desc", ""),
        "image": og_image,
        "url": canonical,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "秦皇岛市",
            "addressRegion": "河北省",
            "addressCountry": "CN",
            "streetAddress": spot.get("address", "")
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": spot.get("lat", 0),
            "longitude": spot.get("lng", 0)
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": rating,
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": "100"
        }
    }
    if spot.get("priceNum", 0) > 0:
        json_ld["offers"] = {
            "@type": "Offer",
            "price": spot["priceNum"],
            "priceCurrency": "CNY"
        }

    page_html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="keywords" content="{esc(keywords)}">
<meta name="author" content="秦皇岛旅游官网">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{esc(og_image)}">
<meta property="og:site_name" content="秦皇岛旅游官网">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{esc(og_image)}">
<script type="application/ld+json">
{json.dumps(json_ld, ensure_ascii=False, indent=2)}
</script>
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<style>
/* ===== Design Tokens (same as style.css) ===== */
:root {{
  --brand: #1a73e8; --brand-dark: #0d47a1; --brand-light: #4a9af5; --brand-glow: #8ab4f8;
  --accent-sunset: #E37400; --accent-coral: #EA4335; --accent-green: #0F9D58; --accent-teal: #00ACC1;
  --gray-50: #F8FAFC; --gray-100: #F1F5F9; --gray-200: #E2E8F0; --gray-300: #CBD5E1;
  --gray-400: #94A3B8; --gray-500: #64748B; --gray-600: #475569; --gray-700: #334155;
  --gray-800: #1E293B; --gray-900: #0F172A;
  --text: var(--gray-900); --text-secondary: var(--gray-600); --text-muted: var(--gray-500);
  --bg-page: #fff; --bg-alt: var(--gray-50); --border: var(--gray-200); --border-light: var(--gray-100);
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04);
  --shadow-xl: 0 24px 48px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.04);
  --radius-xs: 4px; --radius-sm: 8px; --radius: 12px; --radius-lg: 16px; --radius-xl: 24px; --radius-full: 999px;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem; --text-lg: 1.125rem;
  --text-xl: 1.25rem; --text-2xl: 1.5rem; --text-3xl: 1.875rem; --text-4xl: 2.25rem;
  --s1: 0.25rem; --s2: 0.5rem; --s3: 0.75rem; --s4: 1rem; --s5: 1.25rem; --s6: 1.5rem;
  --s8: 2rem; --s10: 2.5rem; --s12: 3rem; --s16: 4rem; --s20: 5rem; --s24: 6rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1); --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dur-fast: 150ms; --dur: 250ms; --dur-slow: 400ms;
  --max-width: 1200px; --nav-height: 72px;
}}
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html {{ scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }}
body {{
  font-family: var(--font-sans); background: var(--bg-page); color: var(--text);
  line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden;
}}
a {{ color: var(--brand); text-decoration: none; transition: color var(--dur) var(--ease-out); }}
a:hover {{ color: var(--brand-dark); }}
img {{ max-width: 100%; height: auto; display: block; }}

/* ===== Navbar ===== */
.navbar {{
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: var(--nav-height); transition: all var(--dur-slow) var(--ease-out);
}}
.navbar::before {{
  content: ''; position: absolute; inset: 0;
  background: rgba(255,255,255,0.78); backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid transparent; transition: all var(--dur-slow) var(--ease-out);
}}
.navbar.scrolled::before {{
  background: rgba(255,255,255,0.92); border-bottom-color: var(--border); box-shadow: var(--shadow-sm);
}}
.nav-inner {{
  position: relative; max-width: var(--max-width); margin: 0 auto; padding: 0 var(--s6);
  height: var(--nav-height); display: flex; align-items: center; justify-content: space-between;
}}
.nav-logo {{
  display: flex; align-items: center; gap: var(--s2); font-size: var(--text-xl);
  font-weight: 800; color: var(--brand-dark); letter-spacing: -0.01em;
}}
.nav-logo-icon {{ width: 32px; height: 32px; flex-shrink: 0; }}
.nav-links {{ display: flex; gap: var(--s1); list-style: none; }}
.nav-links a {{
  padding: var(--s2) var(--s4); border-radius: var(--radius-full);
  font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary);
  transition: all var(--dur) var(--ease-out);
}}
.nav-links a:hover, .nav-links a.active {{
  background: rgba(26,115,232,0.06); color: var(--brand);
}}
.nav-cta {{
  background: var(--brand); color: #fff !important; padding: var(--s2) var(--s5);
  border-radius: var(--radius-full); font-weight: 600; font-size: var(--text-sm);
  transition: all var(--dur) var(--ease-out); box-shadow: 0 2px 8px rgba(26,115,232,0.3);
  display: inline-flex; align-items: center; gap: var(--s1);
}}
.nav-cta:hover {{
  background: var(--brand-dark); transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(26,115,232,0.4); color: #fff !important;
}}
.hamburger {{
  display: none; background: none; border: none; cursor: pointer;
  padding: var(--s2); z-index: 101;
}}
.hamburger span {{
  display: block; width: 22px; height: 2px; background: var(--text);
  margin: 5px 0; border-radius: 2px; transition: all var(--dur) var(--ease-out);
}}

/* ===== Hero ===== */
.detail-hero {{
  position: relative; min-height: 55vh; display: flex; align-items: flex-end;
  padding: calc(var(--nav-height) + var(--s16)) var(--s6) var(--s12);
  overflow: hidden;
}}
.detail-hero-bg {{
  position: absolute; inset: 0; z-index: 0;
  width: 100%; height: 100%; object-fit: cover; object-position: center;
}}
.detail-hero-overlay {{
  position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 50%, rgba(15,23,42,0.1) 100%);
}}
.detail-hero-content {{
  position: relative; z-index: 2; max-width: var(--max-width); margin: 0 auto; width: 100%;
  color: #fff;
}}
.detail-hero-content h1 {{
  font-size: clamp(var(--text-3xl), 4vw, var(--text-4xl));
  font-weight: 900; line-height: 1.2; margin-bottom: var(--s3);
  text-shadow: 0 2px 20px rgba(0,0,0,0.3);
}}
.detail-hero-meta {{
  display: flex; gap: var(--s3); flex-wrap: wrap; align-items: center;
  margin-top: var(--s4);
}}
.hero-tag {{
  background: rgba(255,255,255,0.12); backdrop-filter: blur(8px);
  padding: var(--s2) var(--s4); border-radius: var(--radius-full);
  font-size: var(--text-sm); font-weight: 500;
  border: 1px solid rgba(255,255,255,0.15); color: #fff;
  display: inline-flex; align-items: center; gap: var(--s1);
}}
.level-badge {{
  display: inline-block; padding: 2px 10px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 700; color: #fff;
  letter-spacing: 0.02em;
}}

/* ===== Breadcrumb ===== */
.breadcrumb {{
  max-width: var(--max-width); margin: calc(var(--nav-height) + var(--s4)) auto 0;
  padding: 0 var(--s6); font-size: var(--text-sm); color: var(--text-muted);
}}
.breadcrumb a {{ color: var(--text-muted); }}
.breadcrumb a:hover {{ color: var(--brand); }}
.breadcrumb .sep {{ margin: 0 var(--s2); opacity: 0.4; }}

/* ===== Main Content ===== */
.detail-main {{
  max-width: var(--max-width); margin: 0 auto; padding: var(--s8) var(--s6);
}}

/* Info Grid */
.info-grid {{
  display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s4);
  margin-bottom: var(--s8);
}}
.info-card {{
  background: var(--gray-50); border: 1px solid var(--border-light);
  border-radius: var(--radius); padding: var(--s5); text-align: center;
}}
.info-card-label {{
  font-size: var(--text-xs); color: var(--text-muted); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--s2);
}}
.info-card-value {{
  font-size: var(--text-base); font-weight: 700; color: var(--text);
  line-height: 1.4;
}}

/* Description */
.detail-desc {{
  font-size: var(--text-lg); line-height: 1.9; color: var(--text-secondary);
  margin-bottom: var(--s8); padding: var(--s6);
  background: var(--gray-50); border-radius: var(--radius-lg);
  border-left: 4px solid var(--brand);
}}

/* Sections */
.detail-section {{
  margin-bottom: var(--s8);
}}
.section-title {{
  font-size: var(--text-xl); font-weight: 800; color: var(--text);
  margin-bottom: var(--s5); display: flex; align-items: center; gap: var(--s3);
  padding-bottom: var(--s3); border-bottom: 2px solid var(--border-light);
}}
.section-title svg {{ color: var(--brand); flex-shrink: 0; }}

/* Highlights */
.highlights-list {{
  list-style: none; display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s3);
}}
.highlights-list li {{
  background: linear-gradient(135deg, rgba(26,115,232,0.04), rgba(26,115,232,0.08));
  border: 1px solid rgba(26,115,232,0.1); border-radius: var(--radius);
  padding: var(--s4) var(--s5); font-weight: 600; color: var(--text);
  font-size: var(--text-sm); display: flex; align-items: center; gap: var(--s3);
  transition: all var(--dur) var(--ease-out);
}}
.highlights-list li:hover {{
  background: linear-gradient(135deg, rgba(26,115,232,0.08), rgba(26,115,232,0.12));
  transform: translateY(-2px); box-shadow: var(--shadow-sm);
}}
.highlights-list li::before {{
  content: ''; width: 8px; height: 8px; border-radius: 50%;
  background: var(--brand); flex-shrink: 0;
}}

/* Tips Box */
.tips-box {{
  background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
  border: 1px solid rgba(26,115,232,0.15); border-radius: var(--radius-lg);
  padding: var(--s6);
}}
.tips-box p {{
  color: var(--text-secondary); line-height: 1.9; font-size: var(--text-base);
}}

/* Transport */
.detail-section p {{
  color: var(--text-secondary); line-height: 1.8;
}}

/* Booking Buttons */
.booking-buttons {{
  display: flex; gap: var(--s4); flex-wrap: wrap;
}}
.booking-btn {{
  display: inline-flex; align-items: center; justify-content: center; gap: var(--s2);
  padding: var(--s4) var(--s8); border-radius: var(--radius-full);
  font-size: var(--text-lg); font-weight: 700; text-decoration: none;
  transition: all var(--dur) var(--ease-spring); border: 2px solid transparent;
  min-width: 200px; text-align: center;
}}
.booking-btn:hover {{
  transform: translateY(-3px); box-shadow: var(--shadow-lg);
}}
.booking-ctrip {{
  background: linear-gradient(135deg, #FF6913, #FF8A50); color: #fff;
  box-shadow: 0 4px 16px rgba(255,105,19,0.3);
}}
.booking-ctrip:hover {{ box-shadow: 0 8px 28px rgba(255,105,19,0.4); color: #fff; }}
.booking-meituan {{
  background: linear-gradient(135deg, #FFC300, #FFD740); color: #333;
  box-shadow: 0 4px 16px rgba(255,195,0,0.3);
}}
.booking-meituan:hover {{ box-shadow: 0 8px 28px rgba(255,195,0,0.4); color: #333; }}
.booking-hotel {{
  background: linear-gradient(135deg, #1a73e8, #4a9af5); color: #fff;
  box-shadow: 0 4px 16px rgba(26,115,232,0.3);
}}
.booking-hotel:hover {{ box-shadow: 0 8px 28px rgba(26,115,232,0.4); color: #fff; }}

/* ===== Related ===== */
.related-section {{
  margin-top: var(--s12); padding-top: var(--s8);
  border-top: 2px solid var(--border-light);
}}
.related-section h2 {{
  font-size: var(--text-2xl); font-weight: 800; margin-bottom: var(--s6);
}}
.related-grid {{
  display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s5);
}}
.related-card {{
  background: #fff; border-radius: var(--radius-lg); overflow: hidden;
  border: 1px solid var(--border); transition: all var(--dur-slow) var(--ease-out);
  text-decoration: none; color: inherit;
}}
.related-card:hover {{
  transform: translateY(-4px); box-shadow: var(--shadow-lg); color: inherit;
}}
.related-card img {{
  width: 100%; height: 160px; object-fit: cover;
}}
.related-card-body {{ padding: var(--s4); }}
.related-tag {{
  display: inline-block; padding: 2px 10px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 600; margin-bottom: var(--s2);
}}
.related-card h4 {{
  font-size: var(--text-sm); font-weight: 700; margin-bottom: var(--s1);
  color: var(--text); line-height: 1.4;
}}
.related-rating {{
  font-size: var(--text-xs); color: var(--accent-sunset); font-weight: 600;
}}

/* ===== Footer ===== */
.footer {{
  background: var(--gray-900); color: rgba(255,255,255,0.55);
  padding: var(--s16) var(--s6) var(--s8); font-size: var(--text-sm);
  margin-top: var(--s12);
}}
.footer-inner {{ max-width: var(--max-width); margin: 0 auto; }}
.footer-grid {{
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: var(--s10);
  margin-bottom: var(--s12);
}}
.footer-brand h3 {{ color: #fff; font-size: var(--text-xl); font-weight: 800; margin-bottom: var(--s3); }}
.footer-brand p {{ line-height: 1.8; max-width: 340px; }}
.footer-col h4 {{
  color: #fff; font-size: var(--text-xs); font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: var(--s4);
}}
.footer-col a {{
  display: block; color: rgba(255,255,255,0.4); padding: var(--s1) 0;
  font-size: var(--text-sm); transition: color var(--dur) var(--ease-out);
}}
.footer-col a:hover {{ color: #fff; }}
.footer-bottom {{
  border-top: 1px solid rgba(255,255,255,0.06); padding-top: var(--s6);
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: var(--s4); font-size: var(--text-xs);
  color: rgba(255,255,255,0.3);
}}
.footer-bottom a {{ color: rgba(255,255,255,0.3); }}
.footer-bottom a:hover {{ color: rgba(255,255,255,0.6); }}

/* ===== Address bar ===== */
.address-bar {{
  display: flex; align-items: center; gap: var(--s3);
  background: var(--gray-50); border: 1px solid var(--border-light);
  border-radius: var(--radius); padding: var(--s4) var(--s5);
  margin-bottom: var(--s6); font-size: var(--text-sm); color: var(--text-secondary);
}}
.address-bar svg {{ color: var(--brand); flex-shrink: 0; }}

/* ===== Responsive ===== */
@media (max-width: 1024px) {{
  .info-grid {{ grid-template-columns: repeat(2, 1fr); }}
  .related-grid {{ grid-template-columns: repeat(2, 1fr); }}
  .footer-grid {{ grid-template-columns: 1fr 1fr; }}
  .nav-links {{
    display: none; position: absolute; top: var(--nav-height); left: 0; right: 0;
    background: rgba(255,255,255,0.96); backdrop-filter: blur(24px);
    flex-direction: column; padding: var(--s4);
    border-bottom: 1px solid var(--border); box-shadow: var(--shadow-md);
  }}
  .nav-links.open {{ display: flex; }}
  .nav-links li {{ width: 100%; }}
  .nav-links a {{
    display: block; padding: var(--s3) var(--s4); font-size: var(--text-base);
    border-radius: var(--radius-md); border-bottom: 1px solid var(--border-light);
  }}
  .hamburger {{ display: block; }}
  .nav-cta {{ display: none; }}
}}
@media (max-width: 768px) {{
  :root {{ --nav-height: 64px; }}
  .detail-hero {{ min-height: 45vh; padding-bottom: var(--s8); }}
  .detail-hero-content h1 {{ font-size: var(--text-2xl); }}
  .info-grid {{ grid-template-columns: repeat(2, 1fr); gap: var(--s3); }}
  .highlights-list {{ grid-template-columns: 1fr; }}
  .related-grid {{ grid-template-columns: 1fr 1fr; gap: var(--s4); }}
  .booking-buttons {{ flex-direction: column; }}
  .booking-btn {{ min-width: 100%; }}
  .footer-grid {{ grid-template-columns: 1fr; gap: var(--s8); }}
  .footer-bottom {{ flex-direction: column; text-align: center; }}
  .detail-main {{ padding: var(--s6) var(--s4); }}
}}
@media (max-width: 480px) {{
  .detail-hero {{ min-height: 40vh; }}
  .related-grid {{ grid-template-columns: 1fr; }}
  .info-grid {{ grid-template-columns: 1fr 1fr; }}
}}
</style>
</head>
<body>

<!-- Navbar -->
<nav class="navbar" id="navbar">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <svg class="nav-logo-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" fill="#1a73e8"/><path d="M8 18 Q11 10 14 8 Q17 10 20 18" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      秦皇岛旅游官网
    </a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/">首页</a></li>
      <li><a href="/attractions" class="active">景点</a></li>
      <li><a href="/map">地图</a></li>
      <li><a href="/itinerary">行程规划</a></li>
      <li><a href="/food">美食</a></li>
      <li><a href="/guide">旅游攻略</a></li>
      <li><a href="/about">关于我们</a></li>
    </ul>
    <a href="/itinerary" class="nav-cta">免费规划行程 <span style="display:inline-block;transition:transform 0.25s;">→</span></a>
    <button class="hamburger" id="hamburger" aria-label="菜单"><span></span><span></span><span></span></button>
  </div>
</nav>

<!-- Breadcrumb -->
<div class="breadcrumb" style="margin-bottom:var(--s2);">
  <a href="/">首页</a><span class="sep">›</span>
  <a href="/attractions">景点大全</a><span class="sep">›</span>
  <span style="color:var(--text);font-weight:600;">{esc(name)}</span>
</div>

<!-- Hero -->
<section class="detail-hero">
  <img class="detail-hero-bg" src="../{esc(spot['img'])}" alt="{esc(name)}" loading="eager" onerror="this.onerror=null;this.src='{FALLBACK_IMG}';">
  <div class="detail-hero-overlay"></div>
  <div class="detail-hero-content">
    <h1>{esc(name)}</h1>
    <div class="detail-hero-meta">
      {f'<span class="hero-tag" style="background:rgba(255,255,255,0.18);">{level_badge}</span>' if level_badge else ''}
      <span class="hero-tag">⭐ {esc(rating)}</span>
      <span class="hero-tag" style="color:{price_color};background:rgba(255,255,255,0.18);font-weight:700;">{esc(price)}</span>
      <span class="hero-tag">{cat_info['icon']} {cat_info['name']}</span>
      <span class="hero-tag">📍 {esc(area_info['name'])}</span>
    </div>
  </div>
</section>

{AD_SLOT}

<!-- Main Content -->
<main class="detail-main">
  <!-- Address -->
  <div class="address-bar">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
    {esc(spot.get('address', ''))}
  </div>

  <!-- Description -->
  <div class="detail-desc">
    {esc(spot.get('desc', ''))}
  </div>

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-card">
      <div class="info-card-label">开放时间</div>
      <div class="info-card-value">{esc(spot.get('openTime', '全天开放'))}</div>
    </div>
    <div class="info-card">
      <div class="info-card-label">最佳季节</div>
      <div class="info-card-value">{esc(spot.get('bestSeason', '全年皆宜'))}</div>
    </div>
    <div class="info-card">
      <div class="info-card-label">建议时长</div>
      <div class="info-card-value">{esc(spot.get('duration', '2-3小时'))}</div>
    </div>
    <div class="info-card">
      <div class="info-card-label">适合人群</div>
      <div class="info-card-value">{esc(spot.get('suitableFor', '全家出游'))}</div>
    </div>
  </div>

  {AD_SLOT}

  {highlights_section}

  {tips_section}

  {AD_SLOT}

  {transport_section}

  {booking_section}

  <!-- Related -->
  <div class="related-section">
    <h2>相关景点推荐</h2>
    <div class="related-grid">
      {related_html}
    </div>
  </div>
</main>

<!-- Footer -->
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>秦皇岛旅游官网</h3>
        <p>致力于为每一位来秦皇岛的游客，提供最实用、最全面的旅游攻略。</p>
      </div>
      <div class="footer-col">
        <h4>热门页面</h4>
        <a href="/">首页</a>
        <a href="/attractions">景点推荐</a>
        <a href="/itinerary">行程规划</a>
        <a href="/food">美食推荐</a>
      </div>
      <div class="footer-col">
        <h4>旅游攻略</h4>
        <a href="/guide">出行指南</a>
        <a href="/guide#transport">交通攻略</a>
        <a href="/guide#accommodation">住宿推荐</a>
        <a href="/guide#besttime">最佳时间</a>
      </div>
      <div class="footer-col">
        <h4>关于我们</h4>
        <a href="/about">关于官网</a>
        <a href="/about#cooperation">商务合作</a>
        <a href="/about#privacy">隐私政策</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 秦皇岛旅游官网 qhd-lv.vercel.app</span>
      <span>冀ICP备16026346号-2</span>
      <div>
        <a href="/about#privacy">隐私政策</a> ·
        <a href="/about#disclaimer">免责声明</a> ·
        <a href="/sitemap.xml">网站地图</a>
      </div>
    </div>
  </div>
</footer>

<script>
window.addEventListener('scroll', function() {{
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
}});
document.getElementById('hamburger').addEventListener('click', function() {{
  document.getElementById('navLinks').classList.toggle('open');
}});
</script>
</body>
</html>'''
    return page_html


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    data_path = os.path.join(project_dir, "data", "attractions.json")
    output_dir = os.path.join(project_dir, "attraction")

    os.makedirs(output_dir, exist_ok=True)

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    all_spots = [s for s in data["spots"] if s.get("visible", True)]
    generated = 0
    skipped = 0

    for spot in data["spots"]:
        if not spot.get("visible", True):
            skipped += 1
            continue

        page = generate_page(spot, all_spots)
        out_path = os.path.join(output_dir, f"{spot['id']}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(page)
        generated += 1
        print(f"  ✅ {spot['id']}.html — {spot['name']}")

    print(f"\n🎉 Done! Generated {generated} pages, skipped {skipped} (not visible)")


if __name__ == "__main__":
    main()
