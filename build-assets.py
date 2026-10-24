#!/usr/bin/env python3
"""Builds js/assets.js from the real source images in assets/source/.
Run:  python3 tools/build-assets.py      (needs Pillow, numpy, scipy)

Blank garments (sketches / photo) become 600x700 RGB "layer" PNGs:
  R = garment mask, G = shadow / line ink, B = highlight.
The studio recolours them at runtime, so every colour swatch is a real change.
The flat-lay photo is cropped into the hero and Our Work images."""
import base64, io, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = lambda n: os.path.join(ROOT, 'assets', 'source', n)
W, H = 600, 700

def b64(img, fmt, **kw):
    buf = io.BytesIO(); img.save(buf, fmt, **kw)
    return 'data:image/%s;base64,%s' % ('jpeg' if fmt == 'JPEG' else 'png', base64.b64encode(buf.getvalue()).decode())

def split_pieces(gray, axis):
    """Split a sheet that holds a front and a back view along its widest blank band."""
    dark = (gray < 235)
    prof = dark.sum(axis=1 - axis if axis == 0 else 0) if False else (dark.sum(axis=1) if axis == 0 else dark.sum(axis=0))
    n = len(prof); lo, hi = int(n * .3), int(n * .7)
    best, run, start = (0, lo), 0, lo
    for i in range(lo, hi):
        if prof[i] == 0:
            if run == 0: start = i
            run += 1
            if run > best[0]: best = (run, start)
        else: run = 0
    cut = best[1] + best[0] // 2
    return cut

def piece_layers(gray_piece, kind):
    """-> mask, shadow, highlight float arrays (same shape) for one view."""
    g = gray_piece.astype(np.float32)
    light = g >= 236
    lab, _ = ndi.label(light)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    exterior = np.isin(lab, list(border))
    mask = ~exterior
    mask = ndi.binary_fill_holes(mask)
    mask = ndi.binary_opening(mask, iterations=1)
    if kind == 'photo':   # photo edges are JPEG-noisy: round them off before use
        mask = ndi.gaussian_filter(mask.astype(np.float32), 2.2) > 0.5
    lum = g / 255.0
    if kind == 'sketch':
        shadow = np.clip(1 - lum, 0, 1)
        high = np.zeros_like(shadow)
    else:  # photo of a dark garment: stretch the faint folds so they survive recolouring
        sm = ndi.gaussian_filter(lum, 3.2)
        vals = sm[mask]
        lo, hi = np.percentile(vals, 3), np.percentile(vals, 99.7)
        n = np.clip((sm - lo) / max(hi - lo, 1e-3), 0, 1)
        med = np.median(n[mask])
        shadow = np.clip((med - n) * 1.1, 0, 0.4)
        high = np.clip((n - med) * 1.1, 0, 0.5)
        # soft rim so pale colours still read against a light background
        er = ndi.distance_transform_edt(mask)
        rim = np.clip(1 - er / 7.0, 0, 1) * mask
        shadow = np.maximum(shadow, rim * 0.55)
    return mask, shadow, high

def fit(views, pad_x=40, pad_top=60, pad_bot=60):
    """views: list of (mask, shadow, high) cropped to bbox. Common scale, placed on 600x700."""
    scale = min((W - 2 * pad_x) / max(m.shape[1] for m, _, _ in views), (H - pad_top - pad_bot) / max(m.shape[0] for m, _, _ in views))
    out = []
    for m, s, h in views:
        nh, nw = round(m.shape[0] * scale), round(m.shape[1] * scale)
        def rs(a, soft=False):
            im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
            return np.asarray(im.resize((nw, nh), Image.LANCZOS)).astype(np.float32) / 255
        m2, s2, h2 = rs(ndi.gaussian_filter(m.astype(np.float32), .7)), rs(s), rs(h)
        ox, oy = (W - nw) // 2, pad_top + (H - pad_top - pad_bot - nh) // 2
        canvas = np.zeros((H, W, 3), np.float32)
        canvas[oy:oy + nh, ox:ox + nw, 0] = m2
        canvas[oy:oy + nh, ox:ox + nw, 1] = s2 * (m2 > 0.02)
        canvas[oy:oy + nh, ox:ox + nw, 2] = h2 * (m2 > 0.02)
        out.append((canvas, [ox, oy, nw, nh]))
    return out

def crop_bbox(gray, mask_src=None):
    ys, xs = np.where(gray < 235)
    return ys.min(), ys.max() + 1, xs.min(), xs.max() + 1

def process(path, kind, axis, order):
    gray = np.asarray(Image.open(path).convert('L'))
    cut = split_pieces(gray, axis)
    parts = [gray[:cut], gray[cut:]] if axis == 0 else [gray[:, :cut], gray[:, cut:]]
    views = []
    for p in parts:
        y0, y1, x0, x1 = crop_bbox(p)
        p = p[y0:y1, x0:x1]
        views.append(piece_layers(p, kind))
    fitted = fit(views)
    res = {}
    for name, (canvas, bbox) in zip(order, fitted):
        img = Image.fromarray((canvas * 255).astype(np.uint8), 'RGB')
        res[name] = {'png': b64(img, 'PNG', optimize=True), 'bbox': bbox}
    return res

assets = {
    'croptee': dict(kind='sketch', views=process(SRC('sketch-croptee.png'), 'sketch', 0, ['front', 'back'])),
    'hoodie': dict(kind='sketch', views=process(SRC('sketch-hoodie.png'), 'sketch', 1, ['front', 'back'])),
    # photo: the top shot is the back of the tee, the bottom shot is the front (visible neckline)
    'tee': dict(kind='photo', views=process(SRC('photo-tee.png'), 'photo', 0, ['back', 'front'])),
}

# ---- flat-lay crops (hero + Our Work) ----
flat = Image.open(SRC('work-flatlay.png')).convert('RGB')
fw, fh = flat.size
CELLS = {  # id: (x0, y0, x1, y1) garment bounding box in the 736x981 flat-lay
    'longsleeve': (15, 125, 250, 312), 'tank': (288, 108, 462, 312), 'tee': (480, 128, 722, 312),
    'zipshirt': (15, 400, 258, 578), 'ziphoodie': (272, 342, 478, 598), 'hoodvest': (516, 390, 690, 590),
    'denim': (42, 636, 232, 816), 'joggers': (294, 608, 456, 872), 'meshshorts': (504, 648, 700, 802),
}
photos = {'hero': b64(flat, 'JPEG', quality=88, optimize=True)}
for k, (x0, y0, x1, y1) in CELLS.items():
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    bw, bh = (x1 - x0), (y1 - y0)
    side_h = max(bh * 1.05, bw * 1.05 * 5 / 4); side_w = side_h * 4 / 5
    l, t = cx - side_w / 2, cy - side_h / 2
    l = min(max(0, l), fw - side_w); t = min(max(0, t), fh - side_h)
    c = flat.crop((round(l), round(t), round(l + side_w), round(t + side_h)))
    c = c.resize((round(c.width * 1.6), round(c.height * 1.6)), Image.LANCZOS)
    photos['work-' + k] = b64(c, 'JPEG', quality=86, optimize=True)

js = '/* GENERATED by tools/build-assets.py from assets/source/*. Do not edit by hand. */\n(function(){var A=(window.Atelier=window.Atelier||{});\nA.ASSETS=' + json.dumps({'garments': assets, 'photos': photos}, separators=(',', ':')) + ';})();\n'
open(os.path.join(ROOT, 'js', 'assets.js'), 'w').write(js)
print('js/assets.js', round(len(js) / 1024), 'KB')
for k, v in assets.items():
    for n, d in v['views'].items(): print(k, n, 'bbox', d['bbox'])
