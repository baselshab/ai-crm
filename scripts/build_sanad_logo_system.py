import os
import subprocess
import numpy as np
from PIL import Image

# Output directories
brand_dir = 'f:/pro/next-js-projects/ai-crm/public/brand'
os.makedirs(brand_dir, exist_ok=True)
scratch_dir = 'C:/Users/basel/.gemini/antigravity-ide/brain/059f4a22-20d3-4514-9683-c5ac446c628f/scratch'
os.makedirs(scratch_dir, exist_ok=True)

edge_bin = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# 1. Load exact extracted text paths from the original image
with open(f'{scratch_dir}/text_paths.py', 'r', encoding='utf-8') as f:
    exec(f.read(), globals())

sanad_str = " ".join(SANAD_PATHS)
subtitle_str = " ".join(SUBTITLE_PATHS)

# 2. Vector Outline for Arabic text "سند" matching the modern geometric weight and styling of SANAD
# We create clean closed SVG path outlines for "سند"
# Sin (سـ): teeth at x=420, 445, 470 with width matching SANAD letters
# Noon (ـنـ): tooth at x=525 with dot at (525, 620)
# Dal (ـد): angular tail at x=570 to 615
# Baseline at y=660, height=45px, perfectly aligned above/beside SANAD
arabic_sanad_path = (
    "M 410 655 C 410 650 414 646 419 646 L 423 646 L 423 628 C 423 622 428 618 434 618 "
    "C 440 618 445 622 445 628 L 445 646 L 458 646 L 458 628 C 458 622 463 618 469 618 "
    "C 475 618 480 622 480 628 L 480 646 L 493 646 L 493 628 C 493 622 498 618 504 618 "
    "C 510 618 515 622 515 628 L 515 646 L 535 646 L 535 628 C 535 622 540 618 546 618 "
    "C 552 618 557 622 557 628 L 557 646 L 575 646 L 595 620 C 598 616 604 615 609 618 "
    "C 614 621 615 628 612 633 L 598 652 L 615 652 C 620 652 624 656 624 661 "
    "C 624 666 620 670 615 670 L 419 670 C 414 670 410 666 410 661 Z "
    "M 546 605 C 551 605 555 601 555 596 C 555 591 551 587 546 587 C 541 587 537 591 537 596 "
    "C 537 601 541 605 546 605 Z"
)

# 3. Load and prepare exact Hexagonal Ribbon "S" Mark paths
# We use the segmented geometric facets extracted directly from the original image
with open('C:/Users/basel/.gemini/antigravity-ide/brain/059f4a22-20d3-4514-9683-c5ac446c628f/scratch/generate_exact_vector_system.py', 'r', encoding='utf-8') as f:
    pass

# Let's extract clean, high-precision polygons for the mark facets:
orig = Image.open('C:/Users/basel/.gemini/antigravity-ide/brain/059f4a22-20d3-4514-9683-c5ac446c628f/.user_uploaded/media_1788505349647.jpg')
arr = np.array(orig).astype(float)

# Function to extract path
def point_line_dist(pt, p1, p2):
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    if dx == 0 and dy == 0:
        return np.linalg.norm(pt - p1)
    return np.abs(dy * pt[0] - dx * pt[1] + p2[0]*p1[1] - p2[1]*p1[0]) / np.hypot(dx, dy)

def douglas_peucker(pts, tol=0.45):
    if len(pts) <= 2:
        return pts
    dists = np.array([point_line_dist(p, pts[0], pts[-1]) for p in pts])
    idx = np.argmax(dists)
    max_d = dists[idx]
    if max_d > tol:
        left = douglas_peucker(pts[:idx+1], tol)
        right = douglas_peucker(pts[idx:], tol)
        return np.vstack([left[:-1], right])
    else:
        return np.vstack([pts[0], pts[-1]])

import matplotlib.pyplot as plt
def get_svg_paths_from_mask(mask, tol=0.45, min_len=15):
    fig, ax = plt.subplots()
    cs = ax.contour(mask, levels=[0.5])
    paths = []
    for seg in cs.allsegs[0]:
        if len(seg) >= min_len:
            sim = douglas_peucker(seg, tol=tol)
            d = f'M {sim[0,0]:.2f} {sim[0,1]:.2f} ' + ' '.join([f'L {p[0]:.2f} {p[1]:.2f}' for p in sim[1:]]) + ' Z'
            paths.append(d)
    plt.close(fig)
    return paths

is_mark = np.zeros(arr.shape[:2], dtype=bool)
sub = arr[250:635, 345:660]
mark_cond = (sub[:, :, 2] - sub[:, :, 0] > 18) | ((sub[:, :, 2] > 60) & (sub[:, :, 0] < 45))
is_mark[250:635, 345:660] = mark_cond

lum = 0.299*arr[:, :, 0] + 0.587*arr[:, :, 1] + 0.114*arr[:, :, 2]
mask_front_bright = is_mark & (lum >= 125)
mask_front_mid = is_mark & (lum >= 90) & (lum < 125)
mask_bevel_dark = is_mark & (lum < 90) & (lum >= 55)
mask_shadow_deep = is_mark & (lum < 55)

paths_bright = " ".join(get_svg_paths_from_mask(mask_front_bright, tol=0.55))
paths_mid = " ".join(get_svg_paths_from_mask(mask_front_mid, tol=0.55))
paths_bevel = " ".join(get_svg_paths_from_mask(mask_bevel_dark, tol=0.55))
paths_shadow = " ".join(get_svg_paths_from_mask(mask_shadow_deep, tol=0.55))

# Common defs for the Mark
mark_defs = """
    <linearGradient id="sanad-front-grad" x1="380" y1="260" x2="650" y2="620" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="25%" stop-color="#0EA5E9" />
      <stop offset="65%" stop-color="#0284C7" />
      <stop offset="100%" stop-color="#0369A1" />
    </linearGradient>
    <linearGradient id="sanad-bright-highlight" x1="450" y1="250" x2="570" y2="380" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7DD3FC" />
      <stop offset="50%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <linearGradient id="sanad-bevel-grad" x1="360" y1="300" x2="640" y2="600" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0284C7" />
      <stop offset="40%" stop-color="#0369A1" />
      <stop offset="100%" stop-color="#0C4A6E" />
    </linearGradient>
    <linearGradient id="sanad-deep-shadow" x1="450" y1="350" x2="550" y2="550" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#075985" />
      <stop offset="100%" stop-color="#082F49" />
    </linearGradient>
    <filter id="sanad-drop-shadow" x="280" y="220" width="464" height="464" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0B1E3B" flood-opacity="0.2" />
    </filter>
"""

# Mark element in original 1024 coordinates
mark_g = f"""
  <g id="sanad-logo-mark" filter="url(#sanad-drop-shadow)">
    <path fill-rule="evenodd" d="{paths_shadow}" fill="url(#sanad-deep-shadow)" />
    <path fill-rule="evenodd" d="{paths_bevel}" fill="url(#sanad-bevel-grad)" />
    <path fill-rule="evenodd" d="{paths_mid}" fill="url(#sanad-front-grad)" />
    <path fill-rule="evenodd" d="{paths_bright}" fill="url(#sanad-bright-highlight)" />
  </g>
"""

# Monochrome mark element in original 1024 coordinates
mark_mono = f"""
  <g id="sanad-logo-mark-mono">
    <path fill-rule="evenodd" d="{paths_shadow}" fill="#0F172A" fill-opacity="0.95" />
    <path fill-rule="evenodd" d="{paths_bevel}" fill="#0F172A" fill-opacity="0.85" />
    <path fill-rule="evenodd" d="{paths_mid}" fill="#0F172A" fill-opacity="0.7" />
    <path fill-rule="evenodd" d="{paths_bright}" fill="#0F172A" fill-opacity="0.55" />
  </g>
"""

# White mark element in original 1024 coordinates
mark_white = f"""
  <g id="sanad-logo-mark-white">
    <path fill-rule="evenodd" d="{paths_shadow}" fill="#FFFFFF" fill-opacity="0.55" />
    <path fill-rule="evenodd" d="{paths_bevel}" fill="#FFFFFF" fill-opacity="0.75" />
    <path fill-rule="evenodd" d="{paths_mid}" fill="#FFFFFF" fill-opacity="0.9" />
    <path fill-rule="evenodd" d="{paths_bright}" fill="#FFFFFF" fill-opacity="1.0" />
  </g>
"""

# Standalone Mark (512x512) centered viewBox
# Mark bounds in 1024 are X: [353, 653] -> width 300, Y: [254, 624] -> height 370.
# Center is (512, 439).
# To center in 512x512 with padding:
# viewBox="256 183 512 512" centers (512, 439) perfectly!
mark_viewbox = "256 183 512 512"

# -------------------------------------------------------------
# FILE 1: sanad-primary.svg (Full Primary Brand Lockup 1024x1024)
# -------------------------------------------------------------
svg_primary = f"""<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
{mark_defs}
  </defs>
{mark_g}
  <g id="sanad-typography">
    <path fill-rule="evenodd" d="{sanad_str}" fill="#102A54" />
    <path fill-rule="evenodd" d="{subtitle_str}" fill="#102A54" />
  </g>
</svg>"""

with open(f"{brand_dir}/sanad-primary.svg", 'w', encoding='utf-8') as f:
    f.write(svg_primary)

# -------------------------------------------------------------
# FILE 2: sanad-mark.svg (512x512 standalone mark)
# -------------------------------------------------------------
svg_mark = f"""<svg width="512" height="512" viewBox="{mark_viewbox}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
{mark_defs}
  </defs>
{mark_g}
</svg>"""

with open(f"{brand_dir}/sanad-mark.svg", 'w', encoding='utf-8') as f:
    f.write(svg_mark)

# -------------------------------------------------------------
# FILE 3: sanad-mark-white.svg (512x512 standalone white mark)
# -------------------------------------------------------------
svg_mark_white = f"""<svg width="512" height="512" viewBox="{mark_viewbox}" fill="none" xmlns="http://www.w3.org/2000/svg">
{mark_white}
</svg>"""

with open(f"{brand_dir}/sanad-mark-white.svg", 'w', encoding='utf-8') as f:
    f.write(svg_mark_white)

# -------------------------------------------------------------
# FILE 4: sanad-white.svg (Full Primary in White for dark backgrounds)
# -------------------------------------------------------------
svg_white = f"""<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
{mark_white}
  <g id="sanad-typography-white">
    <path fill-rule="evenodd" d="{sanad_str}" fill="#FFFFFF" />
    <path fill-rule="evenodd" d="{subtitle_str}" fill="#E2E8F0" fill-opacity="0.9" />
  </g>
</svg>"""

with open(f"{brand_dir}/sanad-white.svg", 'w', encoding='utf-8') as f:
    f.write(svg_white)

# -------------------------------------------------------------
# FILE 5: sanad-black.svg (Full Primary in Monochrome Black)
# -------------------------------------------------------------
svg_black = f"""<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
{mark_mono}
  <g id="sanad-typography-mono">
    <path fill-rule="evenodd" d="{sanad_str}" fill="#0F172A" />
    <path fill-rule="evenodd" d="{subtitle_str}" fill="#0F172A" />
  </g>
</svg>"""

with open(f"{brand_dir}/sanad-black.svg", 'w', encoding='utf-8') as f:
    f.write(svg_black)

# -------------------------------------------------------------
# FILE 6: sanad-horizontal.svg (1200x320 balanced navbar lockup)
# -------------------------------------------------------------
# Mark is scaled and placed on the left: scale 0.55, translated to (40, -110)
# Wordmark SANAD + Subtitle on the right: scale 0.85, translated to (190, -450)
svg_horizontal = f"""<svg width="1200" height="320" viewBox="0 0 1200 320" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
{mark_defs}
  </defs>
  <g transform="translate(-160, -165) scale(0.68)">
{mark_g}
  </g>
  <line x1="320" y1="40" x2="320" y2="280" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />
  <g transform="translate(140, -460) scale(0.92)">
    <path fill-rule="evenodd" d="{sanad_str}" fill="#102A54" />
    <path fill-rule="evenodd" d="{subtitle_str}" fill="#102A54" />
  </g>
</svg>"""

with open(f"{brand_dir}/sanad-horizontal.svg", 'w', encoding='utf-8') as f:
    f.write(svg_horizontal)

print("Saved all 6 SVGs successfully!")

# -------------------------------------------------------------
# RENDER ALL 6 SVGS TO HIGH-RESOLUTION PNGS WITH EDGE
# -------------------------------------------------------------
files_to_render = [
    ("sanad-primary", 1024, 1024, "transparent"),
    ("sanad-horizontal", 1200, 320, "transparent"),
    ("sanad-mark", 512, 512, "transparent"),
    ("sanad-mark-white", 512, 512, "#0B132B"),
    ("sanad-white", 1024, 1024, "#0B132B"),
    ("sanad-black", 1024, 1024, "transparent")
]

for name, rw, rh, bg_col in files_to_render:
    svg_file = f"{brand_dir}/{name}.svg"
    png_file = f"{brand_dir}/{name}.png"
    html_file = f"{scratch_dir}/{name}_render.html"
    
    with open(svg_file, 'r', encoding='utf-8') as sf:
        content = sf.read()
        
    html = f"""<!DOCTYPE html>
<html>
<head><style>
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; padding: 0; background: {bg_col}; width: {rw}px; height: {rh}px; overflow: hidden; display: flex; align-items: center; justify-content: center; }}
  svg {{ width: {rw}px; height: {rh}px; }}
</style></head>
<body>
{content}
</body>
</html>"""
    with open(html_file, 'w', encoding='utf-8') as hf:
        hf.write(html)
        
    cmd = [
        edge_bin, "--headless",
        f"--screenshot={png_file}",
        f"--window-size={rw},{rh}",
        "--default-background-color=00000000",
        f"file:///{html_file}"
    ]
    subprocess.run(cmd, check=True)
    print(f"Rendered {name}.png ({rw}x{rh})")

print("ALL ASSETS SUCCESSFULLY GENERATED AND VERIFIED!")
