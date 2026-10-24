/* ==========================================================================
   editor.js — custom Canvas 2D garment editor (Fabric.js could not be
   installed in this environment, so this is the functional alternative).

   Features: text + image layers, select / move / resize / rotate,
   duplicate / delete / reorder, undo / redo, print-area constraints,
   keyboard control, front/back/sleeve designs, preview export, drafts.
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  const G = A.Garments;
  const W = 600, H = 700;
  const ACCENT = '#dba52f';

  /* ---------- uploaded image registry ---------- */
  const Images = {
    map: {},
    load(src) {
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(new Error('This image could not be read. Try a different file.'));
        img.src = src;
      });
    },
    async add(name, src, id) {
      const img = await Images.load(src);
      const rec = { id: id || A.Store.uid(), name, src, img, nw: img.naturalWidth || 800, nh: img.naturalHeight || 800 };
      Images.map[rec.id] = rec;
      return rec;
    }
  };

  function readAsDataURL(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(new Error('The file could not be read.'));
      fr.readAsDataURL(file);
    });
  }

  /** Validates + downsizes an uploaded file. Throws Error with a friendly message. */
  async function processFile(file) {
    const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!file) throw new Error('No file selected.');
    if (!ok.includes(file.type)) throw new Error('Unsupported file type. Please upload a PNG, JPG, WebP, GIF or SVG image.');
    if (file.size === 0) throw new Error('That file is empty.');
    if (file.size > 5 * 1024 * 1024) throw new Error('That file is larger than 5 MB. Please upload a smaller image.');
    const raw = await readAsDataURL(file);
    const img = await Images.load(raw);
    const nw = img.naturalWidth || 800, nh = img.naturalHeight || 800;
    const s = Math.min(1, 1000 / Math.max(nw, nh));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(nw * s)); c.height = Math.max(1, Math.round(nh * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const out = c.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9);
    return Images.add(file.name, out);
  }

  /* ---------- helpers ---------- */
  const fontOf = id => A.FONTS.find(f => f.id === id) || A.FONTS[0];
  const rad = d => d * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;

  class Editor {
    constructor(canvas, hooks) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.hooks = hooks || {};
      this.productId = 'tee';
      this.colorId = 'black';
      this.view = 'front';
      this.layers = { front: [], back: [], sleeve: [] };
      this.sel = null;
      this.guides = true;
      this.hist = []; this.hi = -1;
      this.drag = null;
      this.cache = {};
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * this.dpr; canvas.height = H * this.dpr;
      this._bind();
      this.draw();
    }

    /* ---------- accessors ---------- */
    get product() { return A.product(this.productId); }
    get color() { return A.color(this.colorId); }
    get list() { return this.layers[this.view]; }
    get area() { return G.area(this.productId, this.view); }
    selected() { return this.list.find(o => o.id === this.sel) || null; }
    k() { const w = this.cv.getBoundingClientRect().width; return w > 0 ? w / W : 1; }
    notify() { if (this.hooks.onChange) this.hooks.onChange(this); }

    /* ---------- garment images ---------- */
    _gkey(view, colorId) { return this.productId + '|' + view + '|' + colorId; }
    garmentImg(view) {
      const key = this._gkey(view, this.colorId);
      let c = this.cache[key];
      if (!c) {
        c = this.cache[key] = { loaded: false };
        c.img = new Image();
        c.img.onload = () => { c.loaded = true; if (this._gkey(this.view, this.colorId) === key) this.draw(); this.notify(); };
        c.img.src = G.img(this.productId, view, this.color.hex);
      }
      return c.loaded ? c.img : null;
    }
    loadGarment(view) {
      return new Promise(res => {
        const done = () => { const g = this.garmentImg(view); if (g) res(g); else setTimeout(done, 25); };
        done();
      });
    }

    /* ---------- product / colour / view ---------- */
    setProduct(id, colorId) {
      const p = A.product(id); if (!p) return;
      this.productId = id;
      if (colorId && p.colors.includes(colorId)) this.colorId = colorId;
      else if (!p.colors.includes(this.colorId)) this.colorId = p.colors[0];
      if (!p.views.includes(this.view)) this.view = 'front';
      this.sel = null;
      p.views.forEach(v => this.layers[v].forEach(o => this.fit(o, v)));
      this.resetHistory();
      this.draw(); this.notify();
      if (this.hooks.onSelect) this.hooks.onSelect(null);
      if (this.hooks.onView) this.hooks.onView(this.view);
    }
    setColor(id, commit) {
      if (!this.product.colors.includes(id)) return;
      this.colorId = id;
      this.draw();
      if (commit !== false) this.commit(); else this.notify();
    }
    setView(v) {
      if (!this.product.views.includes(v)) return;
      this.view = v; this.sel = null;
      this.draw(); this.notify();
      if (this.hooks.onSelect) this.hooks.onSelect(null);
      if (this.hooks.onView) this.hooks.onView(v);
    }
    setGuides(on) { this.guides = !!on; this.draw(); }

    /* ---------- geometry ---------- */
    measure(o) {
      if (o.type !== 'text') return;
      const c = this.ctx; c.save();
      c.font = this.fontString(o);
      const lines = String(o.text || ' ').split('\n');
      o.w = Math.max(20, ...lines.map(l => c.measureText(l || ' ').width));
      o.h = Math.max(o.size, lines.length * o.size * 1.18);
      c.restore();
    }
    fontString(o) { return (o.italic ? 'italic ' : '') + (o.bold ? '700 ' : '400 ') + o.size + 'px ' + fontOf(o.font).stack; }
    extents(o) {
      const c = Math.abs(Math.cos(o.rot)), s = Math.abs(Math.sin(o.rot));
      return { ex: c * o.w / 2 + s * o.h / 2, ey: s * o.w / 2 + c * o.h / 2 };
    }
    scaleObj(o, f) {
      if (o.type === 'text') { o.size = Math.max(6, o.size * f); this.measure(o); }
      else { o.w *= f; o.h *= f; }
    }
    /** keeps an object inside the print area (shrinks it if it is too big). */
    fit(o, view) {
      const a = G.area(this.productId, view || this.view);
      let { ex, ey } = this.extents(o);
      const f = Math.min(1, a.w / (2 * ex), a.h / (2 * ey));
      if (f < 1) { this.scaleObj(o, f); ({ ex, ey } = this.extents(o)); }
      o.x = Math.min(Math.max(o.x, a.x + ex), a.x + a.w - ex);
      o.y = Math.min(Math.max(o.y, a.y + ey), a.y + a.h - ey);
    }
    corners(o) {
      const hw = o.w / 2, hh = o.h / 2, c = Math.cos(o.rot), s = Math.sin(o.rot);
      return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => ({ x: o.x + x * c - y * s, y: o.y + x * s + y * c }));
    }
    rotHandle(o) {
      const off = o.h / 2 + 26 / Math.max(this.k(), 0.45);
      return { x: o.x + (0 * Math.cos(o.rot) - (-off) * Math.sin(o.rot)), y: o.y + (0 * Math.sin(o.rot) + (-off) * Math.cos(o.rot)) };
    }
    hit(o, p) {
      const dx = p.x - o.x, dy = p.y - o.y, c = Math.cos(o.rot), s = Math.sin(o.rot);
      const lx = dx * c + dy * s, ly = -dx * s + dy * c;
      const pad = 6 / Math.max(this.k(), 0.45);
      return Math.abs(lx) <= o.w / 2 + pad && Math.abs(ly) <= o.h / 2 + pad;
    }
    hitHandle(p) {
      const o = this.selected(); if (!o) return null;
      const r = 14 / Math.max(this.k(), 0.45);
      const rh = this.rotHandle(o);
      if (Math.hypot(p.x - rh.x, p.y - rh.y) <= r) return 'rotate';
      const cs = this.corners(o);
      for (let i = 0; i < 4; i++) if (Math.hypot(p.x - cs[i].x, p.y - cs[i].y) <= r) return 'resize';
      return null;
    }

    /* ---------- layer actions ---------- */
    contrastText() { return G.lum(this.color.hex) > 0.5 ? '#1b1b1c' : '#f3f1ec'; }
    addText(opts) {
      opts = opts || {};
      const f = fontOf(opts.font || 'sans');
      const a = this.area;
      const o = {
        id: A.Store.uid(), type: 'text', text: opts.text || 'Your text', font: f.id, size: opts.size || 40,
        color: opts.color || this.contrastText(), align: opts.align || 'center',
        bold: opts.bold != null ? opts.bold : f.bold, italic: !!opts.italic,
        x: a.x + a.w / 2, y: a.y + a.h * (opts.fy != null ? opts.fy : Math.min(0.2 + this.list.length * 0.18, 0.8)), rot: 0, w: 10, h: 10
      };
      this.measure(o); this.fit(o);
      this.list.push(o); this.sel = o.id;
      this.draw(); this.commit(); this._emitSelect();
      return o;
    }
    addImage(rec) {
      const a = this.area;
      const r = Math.min((a.w * 0.72) / rec.nw, (a.h * 0.72) / rec.nh);
      const o = { id: A.Store.uid(), type: 'image', imgId: rec.id, name: rec.name, x: a.x + a.w / 2, y: a.y + a.h / 2, rot: 0, w: rec.nw * r, h: rec.nh * r };
      this.fit(o);
      this.list.push(o); this.sel = o.id;
      this.draw(); this.commit(); this._emitSelect();
      return o;
    }
    duplicate() {
      const o = this.selected(); if (!o) return;
      const d = JSON.parse(JSON.stringify(o)); d.id = A.Store.uid(); d.x += 14; d.y += 14;
      this.fit(d);
      this.list.push(d); this.sel = d.id;
      this.draw(); this.commit(); this._emitSelect();
    }
    remove() {
      const i = this.list.findIndex(o => o.id === this.sel); if (i < 0) return;
      this.list.splice(i, 1); this.sel = null;
      this.draw(); this.commit(); this._emitSelect();
    }
    reorder(dir) {
      const arr = this.list, i = arr.findIndex(o => o.id === this.sel); if (i < 0) return;
      const j = dir === 'forward' ? i + 1 : i - 1;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      this.draw(); this.commit();
    }
    centerSelected() {
      const o = this.selected(); if (!o) return;
      o.x = this.area.x + this.area.w / 2; o.y = this.area.y + this.area.h / 2;
      this.fit(o); this.draw(); this.commit();
    }
    select(id) { this.sel = id; this.draw(); this._emitSelect(); }
    _emitSelect() {
      this.cv.style.touchAction = this.sel ? 'none' : 'pan-y';
      if (this.hooks.onSelect) this.hooks.onSelect(this.selected());
      this.notify();
    }
    /** change properties of the selected layer; commit=false while a slider is dragging */
    update(props, commit) {
      const o = this.selected(); if (!o) return;
      if ('rotDeg' in props) { o.rot = rad(props.rotDeg); delete props.rotDeg; }
      if ('widthPct' in props) { const f = (this.area.w * props.widthPct / 100) / o.w; this.scaleObj(o, f); delete props.widthPct; }
      Object.assign(o, props);
      if (o.type === 'text') {
        if (props.font && props.bold === undefined) o.bold = fontOf(props.font).bold;
        this.measure(o);
      }
      this.fit(o);
      this.draw();
      if (commit === false) this.notify(); else this.commit();
    }
    nudge(dx, dy) {
      const o = this.selected(); if (!o) return;
      o.x += dx; o.y += dy; this.fit(o); this.draw(); this.commit();
    }

    /* ---------- history ---------- */
    serialize() { return JSON.stringify({ colorId: this.colorId, layers: this.layers }); }
    commit() {
      const s = this.serialize();
      if (this.hist[this.hi] !== s) {
        this.hist = this.hist.slice(0, this.hi + 1);
        this.hist.push(s);
        if (this.hist.length > 80) this.hist.shift();
        this.hi = this.hist.length - 1;
      }
      if (this.hooks.onHistory) this.hooks.onHistory(this);
      this.notify();
    }
    resetHistory() { this.hist = []; this.hi = -1; this.commit(); }
    canUndo() { return this.hi > 0; }
    canRedo() { return this.hi < this.hist.length - 1; }
    undo() { if (this.canUndo()) { this.hi--; this._restore(this.hist[this.hi]); } }
    redo() { if (this.canRedo()) { this.hi++; this._restore(this.hist[this.hi]); } }
    _restore(s) {
      const o = JSON.parse(s);
      this.colorId = o.colorId; this.layers = Object.assign({ front: [], back: [], sleeve: [] }, o.layers);
      if (!this.selected()) this.sel = null;
      this.draw();
      if (this.hooks.onHistory) this.hooks.onHistory(this);
      this._emitSelect();
    }

    /* ---------- drafts ---------- */
    exportDraft() {
      const images = {};
      Object.values(this.layers).flat().forEach(o => { if (o.type === 'image' && Images.map[o.imgId]) images[o.imgId] = { name: Images.map[o.imgId].name, src: Images.map[o.imgId].src }; });
      return { colorId: this.colorId, layers: JSON.parse(JSON.stringify(this.layers)), images };
    }
    async importDraft(d) {
      for (const [id, im] of Object.entries(d.images || {})) { if (!Images.map[id]) await Images.add(im.name, im.src, id); }
      this.colorId = this.product.colors.includes(d.colorId) ? d.colorId : this.product.colors[0];
      this.layers = Object.assign({ front: [], back: [], sleeve: [] }, JSON.parse(JSON.stringify(d.layers || {})));
      this.sel = null;
      this.resetHistory(); this.draw();
      this._emitSelect();
    }
    clearAll() { this.layers = { front: [], back: [], sleeve: [] }; this.sel = null; this.commit(); this.draw(); this._emitSelect(); }

    /* ---------- counts / export ---------- */
    elementCounts() {
      const out = {};
      this.product.views.forEach(v => { const n = this.layers[v].length; if (n) out[v] = n; });
      return out;
    }
    totalElements() { return Object.values(this.elementCounts()).reduce((a, b) => a + b, 0); }
    hasImages() { return this.product.views.some(v => this.layers[v].some(o => o.type === 'image')); }

    /** draws a clean preview (no guides / handles) of a view onto any canvas */
    renderTo(canvas, view, size, bg) {
      const w = size || 360, h = Math.round(w * H / W);
      canvas.width = w; canvas.height = h;
      const c = canvas.getContext('2d');
      c.setTransform(w / W, 0, 0, h / H, 0, 0);
      this._paint(c, view, { bg: bg || '#ece8e0', guides: false, selection: false });
    }
    async previewDataURL(view, size) {
      await this.loadGarment(view);
      const cv = document.createElement('canvas');
      this.renderTo(cv, view, size || 360);
      return cv.toDataURL('image/jpeg', 0.82);
    }
    /** previews for the front view and every view that has design elements */
    async previews() {
      const out = {};
      const views = this.product.views.filter(v => v === 'front' || this.layers[v].length);
      for (const v of views) out[v] = await this.previewDataURL(v);
      return out;
    }

    /* ---------- drawing ---------- */
    draw() {
      const c = this.ctx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._paint(c, this.view, { guides: this.guides, selection: true });
    }
    _paint(c, view, o) {
      c.clearRect(0, 0, W, H);
      if (o.bg) { c.fillStyle = o.bg; c.fillRect(0, 0, W, H); }
      const g = this.garmentImg(view);
      if (g) c.drawImage(g, 0, 0, W, H);
      this.layers[view].forEach(l => this._layer(c, l));
      if (o.guides) this._area(c, view);
      if (o.selection && this.sel && view === this.view) this._handles(c);
    }
    _layer(c, o) {
      c.save();
      c.translate(o.x, o.y); c.rotate(o.rot);
      if (o.type === 'image') {
        const rec = Images.map[o.imgId];
        if (rec) c.drawImage(rec.img, -o.w / 2, -o.h / 2, o.w, o.h);
      } else {
        c.font = this.fontString(o); c.fillStyle = o.color; c.textBaseline = 'middle'; c.textAlign = o.align;
        const lines = String(o.text || '').split('\n'), lh = o.size * 1.18;
        const ax = o.align === 'left' ? -o.w / 2 : o.align === 'right' ? o.w / 2 : 0;
        lines.forEach((ln, i) => c.fillText(ln, ax, (i - (lines.length - 1) / 2) * lh));
        if (this.method === 'embroidery') {
          c.setLineDash([2, 1.6]); c.lineWidth = 0.7; c.strokeStyle = 'rgba(0,0,0,.28)';
          lines.forEach((ln, i) => c.strokeText(ln, ax, (i - (lines.length - 1) / 2) * lh));
        }
      }
      c.restore();
    }
    _area(c, view) {
      const a = G.area(this.productId, view), k = Math.max(this.k(), 0.45);
      c.save();
      c.fillStyle = 'rgba(219,165,47,.06)'; c.fillRect(a.x, a.y, a.w, a.h);
      c.setLineDash([7 / k * 0.7, 5 / k * 0.7]); c.lineWidth = 1.4 / k * 0.7;
      c.strokeStyle = 'rgba(30,30,30,.55)'; c.strokeRect(a.x, a.y, a.w, a.h);
      c.setLineDash([]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.8; c.strokeRect(a.x + 1, a.y + 1, a.w - 2, a.h - 2);
      const label = G.areaLabel(this.productId, view), fs = 11 / k * 0.75;
      c.font = '600 ' + fs + 'px "Helvetica Neue", Arial, sans-serif';
      const tw = c.measureText(label).width + 12;
      c.fillStyle = 'rgba(22,22,23,.78)'; c.fillRect(a.x, a.y - fs - 9, tw, fs + 8);
      c.fillStyle = '#f3f1ec'; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillText(label, a.x + 6, a.y - fs / 2 - 5);
      c.restore();
    }
    _handles(c) {
      const o = this.selected(); if (!o) return;
      const k = Math.max(this.k(), 0.45), r = 7 / k, cs = this.corners(o), rh = this.rotHandle(o);
      c.save();
      const path = () => { c.beginPath(); cs.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); };
      path(); c.lineWidth = 3.5 / k; c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke();
      path(); c.lineWidth = 1.6 / k; c.strokeStyle = ACCENT; c.stroke();
      const mid = { x: (cs[0].x + cs[1].x) / 2, y: (cs[0].y + cs[1].y) / 2 };
      c.beginPath(); c.moveTo(mid.x, mid.y); c.lineTo(rh.x, rh.y); c.lineWidth = 1.4 / k; c.strokeStyle = ACCENT; c.stroke();
      const dot = (p, round) => {
        c.beginPath(); if (round) c.arc(p.x, p.y, r, 0, Math.PI * 2); else c.rect(p.x - r * 0.8, p.y - r * 0.8, r * 1.6, r * 1.6);
        c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.8 / k; c.strokeStyle = '#161617'; c.stroke();
      };
      cs.forEach(p => dot(p, false)); dot(rh, true);
      c.restore();
    }

    /* ---------- pointer + keyboard ---------- */
    pt(e) { const r = this.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
    _bind() {
      const cv = this.cv;
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('pointerdown', e => this._down(e));
      cv.addEventListener('pointermove', e => this._move(e));
      cv.addEventListener('pointerup', e => this._up(e));
      cv.addEventListener('pointercancel', e => this._up(e));
      cv.addEventListener('dblclick', e => {
        const p = this.pt(e), o = [...this.list].reverse().find(x => this.hit(x, p));
        if (o && o.type === 'text' && this.hooks.onEditText) this.hooks.onEditText(o);
      });
      cv.addEventListener('keydown', e => this._key(e));
      window.addEventListener('resize', () => this.draw());
    }
    _down(e) {
      if (e.button != null && e.button > 0) return;
      const p = this.pt(e);
      this.cv.focus({ preventScroll: true });
      const h = this.hitHandle(p);
      const o = this.selected();
      if (h && o) {
        e.preventDefault(); this.cv.setPointerCapture(e.pointerId);
        this.drag = { type: h, d0: Math.max(10, Math.hypot(p.x - o.x, p.y - o.y)), w0: o.w, h0: o.h, size0: o.size, moved: false };
        return;
      }
      const hitObj = [...this.list].reverse().find(x => this.hit(x, p));
      if (hitObj) {
        e.preventDefault(); this.cv.setPointerCapture(e.pointerId);
        if (this.sel !== hitObj.id) { this.sel = hitObj.id; this._emitSelect(); }
        this.drag = { type: 'move', dx: hitObj.x - p.x, dy: hitObj.y - p.y, moved: false };
        this.draw();
      } else if (this.sel) { this.sel = null; this.draw(); this._emitSelect(); }
    }
    _move(e) {
      const p = this.pt(e), o = this.selected();
      if (!this.drag) {
        const h = this.hitHandle(p);
        this.cv.style.cursor = h === 'rotate' ? 'grab' : h === 'resize' ? 'nwse-resize' : [...this.list].some(x => this.hit(x, p)) ? 'move' : 'default';
        return;
      }
      if (!o) return;
      const d = this.drag; d.moved = true;
      if (d.type === 'move') { o.x = p.x + d.dx; o.y = p.y + d.dy; }
      else if (d.type === 'resize') {
        const f = Math.hypot(p.x - o.x, p.y - o.y) / d.d0;
        if (o.type === 'text') { o.size = Math.min(320, Math.max(8, d.size0 * f)); this.measure(o); }
        else { const nw = Math.max(24, d.w0 * f); o.h = d.h0 * (nw / d.w0); o.w = nw; }
      } else if (d.type === 'rotate') {
        let a = deg(Math.atan2(p.y - o.y, p.x - o.x)) + 90;
        a = ((a + 540) % 360) - 180;
        const snap = Math.round(a / 90) * 90; if (Math.abs(a - snap) < 3) a = snap;
        o.rot = rad(a);
      }
      this.fit(o); this.draw(); this.notify();
    }
    _up(e) {
      if (!this.drag) return;
      const moved = this.drag.moved; this.drag = null;
      try { this.cv.releasePointerCapture(e.pointerId); } catch (x) { }
      if (moved) this.commit();
    }
    _key(e) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); this.duplicate(); return; }
      if (!this.sel) return;
      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.remove(); }
      else if (e.key === 'Escape') { this.select(null); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.nudge(-step, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.nudge(step, 0); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.nudge(0, -step); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this.nudge(0, step); }
    }
  }

  A.Editor = { Editor, Images, processFile, fontOf, deg, W, H };
})();
