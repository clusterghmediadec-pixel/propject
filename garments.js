/* ==========================================================================
   garments.js — garment mockups built from the REAL images in assets/source/
   (sketch flats and a blank-tee photo, processed by tools/build-assets.py).

   Each garment view is a 600x700 layer: R = garment mask, G = shadow / line ink,
   B = highlight. compose() recolours it from the swatch hex, so every colour
   option is a genuine visible change while the real linework / folds stay.
   Public API (unchanged): G.img(productId, view, hex, {bg, overlay}) -> image URI.
   Call G.ready (a Promise) before first use; app.js does this at boot.
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  const SRC = (A.ASSETS && A.ASSETS.garments) || {};

  /* ---------- colour helpers ---------- */
  function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
  function hex(r) { return '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); }
  function shade(c, p) { return p < 0 ? mix(c, '#000000', -p) : mix(c, '#ffffff', p); }
  function lum(c) { const [r, g, b] = rgb(c).map(v => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

  /* ---------- print areas ----------
     Fractions of the garment's own bounding box (fx, fy, fw, fh), converted to the
     600 x 700 mockup space below. Tune these if you swap in different blanks. */
  const FRAC = {
    tee: { front: [.29, .12, .42, .56], back: [.29, .06, .42, .70] },
    croptee: { front: [.30, .16, .40, .55], back: [.27, .12, .46, .62] },
    hoodie: { front: [.31, .37, .38, .30], back: [.28, .33, .44, .42] }
  };
  const AREA_LABEL = {
    tee: { front: 'Chest print area', back: 'Back print area' },
    croptee: { front: 'Chest print area', back: 'Back print area' },
    hoodie: { front: 'Chest print area', back: 'Back print area' }
  };
  function area(p, v) {
    const g = SRC[p]; if (!g) return null;
    const view = g.views[v] || g.views.front, f = (FRAC[p] || {})[v] || FRAC[p].front, b = view.bbox;
    return { x: Math.round(b[0] + f[0] * b[2]), y: Math.round(b[1] + f[1] * b[3]), w: Math.round(f[2] * b[2]), h: Math.round(f[3] * b[3]) };
  }

  /* ---------- layer decoding ---------- */
  const layers = {};
  const ready = Promise.all(Object.keys(SRC).flatMap(p => Object.keys(SRC[p].views).map(v => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = 600; c.height = 700;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      layers[p + '|' + v] = x.getImageData(0, 0, 600, 700).data; res();
    };
    im.onerror = () => rej(new Error('Garment image failed to load: ' + p + ' ' + v));
    im.src = SRC[p].views[v].png;
  }))));

  /* ---------- recolouring ---------- */
  const garmentCache = {};
  function compose(productId, view, hexColor) {
    const key = productId + '|' + view + '|' + hexColor;
    if (garmentCache[key]) return garmentCache[key];
    const g = SRC[productId]; if (!g) return null;
    const v = g.views[view] ? view : 'front';
    const L = layers[productId + '|' + v]; if (!L) return null;
    const c = rgb(hexColor), l = lum(hexColor), sketch = g.kind === 'sketch';
    const ink = sketch ? (l > 0.35 ? c.map(x => x * 0.38) : c.map(x => x + (255 - x) * 0.5)) : null;
    const cv = document.createElement('canvas'); cv.width = 600; cv.height = 700;
    const cx = cv.getContext('2d'), out = cx.createImageData(600, 700), o = out.data;
    for (let i = 0; i < L.length; i += 4) {
      const m = L[i] / 255; if (m < 0.004) continue;
      const s = L[i + 1] / 255, h = L[i + 2] / 255;
      for (let k = 0; k < 3; k++) {
        let val;
        if (sketch) val = c[k] * (1 - s) + ink[k] * s;
        else { val = c[k] * (1 - s * 0.75); val += (255 - val) * h * 0.30; }
        o[i + k] = val;
      }
      o[i + 3] = m * 255;
    }
    // soft contact shadow, then the garment
    const b = g.views[v].bbox, sh = document.createElement('canvas'); sh.width = 600; sh.height = 700;
    const sx = sh.getContext('2d'); sx.fillStyle = 'rgba(0,0,0,.14)'; sx.beginPath();
    sx.ellipse(300, b[1] + b[3] + 10, b[2] * 0.42, 9, 0, 0, Math.PI * 2); sx.fill();
    cx.drawImage(sh, 0, 0);
    const tmp = document.createElement('canvas'); tmp.width = 600; tmp.height = 700; tmp.getContext('2d').putImageData(out, 0, 0);
    cx.drawImage(tmp, 0, 0);
    return (garmentCache[key] = cv);
  }

  /* ---------- overlay renderer (static SVG artwork for Our Work, seeds, etc.) ---------- */
  function fontStack(id) { const f = A.FONTS.find(x => x.id === id); return f ? f.stack : 'sans-serif'; }
  function xml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function overlaySVG(productId, view, items) {
    const a = area(productId, view);
    if (!a || !items) return '';
    return items.map(it => {
      const cx = a.x + a.w * it.fx, cy = a.y + a.h * it.fy;
      const stitch = it.stitch ? ' stroke="rgba(0,0,0,.28)" stroke-width=".7" stroke-dasharray="2 1.6" paint-order="stroke"' : '';
      if (it.k === 'text') {
        const f = A.FONTS.find(x => x.id === it.font) || A.FONTS[0];
        return '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" font-family="' + xml(f.stack) + '" font-size="' + it.size + '" font-weight="' + (f.bold ? 700 : 400) + '" font-style="' + (it.italic ? 'italic' : 'normal') + '" fill="' + it.fill + '"' + stitch + '>' + xml(it.t) + '</text>';
      }
      if (it.k === 'badge') {
        let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + it.r + '" fill="' + (it.fill || 'none') + '" stroke="' + (it.stroke || 'none') + '" stroke-width="3"' + (it.stitch ? ' stroke-dasharray="5 2.5"' : '') + '/>';
        if (it.t) s += '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" font-family="' + xml(fontStack('condensed')) + '" font-size="' + (it.tsize || 30) + '" fill="' + (it.tfill || '#000') + '"' + stitch + '>' + xml(it.t) + '</text>';
        return s;
      }
      if (it.k === 'rect') return '<rect x="' + (cx - it.w / 2) + '" y="' + (cy - it.h / 2) + '" width="' + it.w + '" height="' + it.h + '" rx="' + (it.rx || 0) + '" fill="' + it.fill + '"/>';
      return '';
    }).join('');
  }

  /* ---------- public API ---------- */
  const uriCache = {};
  function bare(productId, view, hexColor, bg) {
    const key = productId + '|' + view + '|' + hexColor + '|' + (bg || '');
    if (uriCache[key]) return uriCache[key];
    const g = compose(productId, view, hexColor); if (!g) return '';
    if (!bg) return (uriCache[key] = g.toDataURL('image/png'));
    // with a background: small JPEG (keeps localStorage previews light)
    const cv = document.createElement('canvas'); cv.width = 360; cv.height = 420;
    const x = cv.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 360, 420); x.drawImage(g, 0, 0, 360, 420);
    return (uriCache[key] = cv.toDataURL('image/jpeg', 0.86));
  }
  function uri(svgString) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString); }
  function img(productId, view, hexColor, opts) {
    opts = opts || {};
    const base = bare(productId, view, hexColor, opts.bg);
    if (!opts.overlay) return base;
    const ov = overlaySVG(productId, view, opts.overlay);
    return uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700" width="600" height="700"><image href="' + base + '" width="600" height="700"/>' + ov + '</svg>');
  }

  A.Garments = {
    ready, img, uri, shade, mix, lum,
    area: (p, v) => area(p, v),
    areaLabel: (p, v) => ((AREA_LABEL[p] || {})[v]) || 'Print area',
    overlaySVG,
    photo: id => (A.ASSETS && A.ASSETS.photos && A.ASSETS.photos[id]) || ''
  };

  /* convenience: look-ups used by pages */
  A.product = id => A.PRODUCTS.find(p => p.id === id);
  A.color = id => A.COLORS[id];
})();
