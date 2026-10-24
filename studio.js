/* ==========================================================================
   studio.js — the Design Studio page: garment + colour picker, text / upload
   tools, property editing, method, size-by-size quantities, live summary,
   draft saving and the quote request.
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.pages = A.pages || {};
  const { esc, icon, toast } = A.UI;
  const G = A.Garments;
  const TEXT_COLORS = [['#1b1b1c', 'Black'], ['#f3f1ec', 'White'], ['#dba52f', 'Gold'], ['#b7282e', 'Red'], ['#2557b8', 'Blue'], ['#1f5a3a', 'Green'], ['#d96a2b', 'Orange'], ['#6b1f2d', 'Maroon']];

  let ed = null;            // current Editor
  let S = null;             // studio state outside the canvas
  let root = null;
  let cleanup = [];

  const $ = (sel) => (root ? root.querySelector(sel) : null);
  const $$ = (sel) => (root ? Array.from(root.querySelectorAll(sel)) : []);
  const live = () => !!(root && ed && root.isConnected);

  /* ------------------------------------------------------------------ markup */
  function render() {
    return '<section class="studio" id="studio">' +
      '<div class="wrap studio-head"><div><p class="eyebrow">Design Studio</p><h1 class="h2">Design your <em>garment</em></h1></div>' +
      '<div class="studio-head-actions"><button class="btn btn-ghost btn-sm" type="button" id="st-drafts">' + icon('save', 18) + ' Saved drafts</button></div></div>' +
      '<div class="wrap studio-grid">' +

      /* stage */
      '<div class="stage-col"><div class="stage-sticky">' +
      '<div class="toolbar" role="toolbar" aria-label="Editing tools">' +
      tb('undo', 'undo', 'Undo') + tb('redo', 'redo', 'Redo') + '<span class="tb-sep"></span>' +
      tb('duplicate', 'copy', 'Duplicate') + tb('delete', 'trash', 'Delete') + '<span class="tb-sep"></span>' +
      tb('forward', 'up', 'Bring forward') + tb('back', 'down', 'Send back') + tb('center', 'center', 'Centre') + '<span class="tb-sep"></span>' +
      '<button type="button" class="tb on" data-tb="guides" aria-pressed="true" title="Show print area" aria-label="Show print area">' + icon('eye', 18) + '<span class="tb-l">Guides</span></button></div>' +
      '<div class="views" role="tablist" aria-label="Garment view" id="views"></div>' +
      '<div class="canvas-wrap" id="canvas-wrap"><canvas id="cv" tabindex="0" role="application" aria-label="Garment design canvas. Select a design element, then use arrow keys to move it, Delete to remove it, Control Z to undo."></canvas>' +
      '<div class="cv-hint" id="cv-hint"><span>' + icon('plus', 22) + '</span><p>Add text or upload a logo to begin</p></div></div>' +
      '<p class="sr-only" id="cv-live" aria-live="polite"></p>' +
      '<p class="tip">Drag to move · corner handles resize · top handle rotates · double-click text to edit · designs stay inside the dashed print area.</p>' +
      '<p class="fine disclaimer">' + esc(A.DISCLAIMER) + '</p>' +
      '</div></div>' +

      /* controls */
      '<div class="ctrl-col">' +

      panel('1', 'Garment',
        '<div class="chips-prod" id="prod-chips" role="group" aria-label="Garment type">' +
        A.PRODUCTS.map(p => '<button type="button" class="pchip" data-prod="' + p.id + '" aria-pressed="false"><img src="' + A.gimg(p.id, 'front', p.colors[0]) + '" alt=""><span>' + esc(p.name) + '</span></button>').join('') + '</div>' +
        '<h3 class="h5">Colour: <span id="color-name"></span></h3><div class="swatches lg" id="color-sw" role="group" aria-label="Garment colour"></div>') +

      panel('2', 'Design',
        '<div class="btn-row"><button type="button" class="btn btn-primary" id="add-text">' + icon('text', 18) + ' Add text</button>' +
        '<label class="btn btn-ghost upload-btn" for="file-in">' + icon('upload', 18) + ' Upload logo / artwork</label><input type="file" id="file-in" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden></div>' +
        '<div class="upload-msg" id="upload-msg" role="status" aria-live="polite"></div>' +
        '<p class="fine">PNG, JPG, WebP, GIF or SVG · up to 5 MB. Transparent PNGs work best.</p>' +
        '<div class="quick"><span class="muted">Quick starts</span>' +
        [['team', 'Team name'], ['number', 'Number'], ['business', 'Business name'], ['slogan', 'Slogan']].map(([k, l]) => '<button type="button" class="fchip sm" data-preset="' + k + '">' + l + '</button>').join('') + '</div>' +
        '<h3 class="h5">Layers on <span id="layers-view">front</span></h3><ul class="layers" id="layers"></ul>' +
        /* properties */
        '<div class="props" id="props" hidden><h3 class="h5">Edit selected <span class="chip" id="props-type"></span></h3>' +
        '<div id="props-text">' +
        '<label class="field"><span>Text</span><textarea id="p-text" rows="2" maxlength="120"></textarea></label>' +
        '<div class="grid-2"><label class="field"><span>Font</span><select id="p-font">' + A.FONTS.map(f => '<option value="' + f.id + '">' + esc(f.name) + '</option>').join('') + '</select></label>' +
        '<div class="field"><span>Style &amp; alignment</span><div class="seg tight" role="group" aria-label="Text style"><button type="button" class="segb" data-al="left" aria-label="Align left" aria-pressed="false">L</button><button type="button" class="segb" data-al="center" aria-label="Align centre" aria-pressed="true">C</button><button type="button" class="segb" data-al="right" aria-label="Align right" aria-pressed="false">R</button><button type="button" class="segb b" data-st="bold" aria-label="Bold" aria-pressed="false">B</button><button type="button" class="segb i" data-st="italic" aria-label="Italic" aria-pressed="false">I</button></div></div></div>' +
        '<label class="field"><span>Size <output id="p-size-out"></output></span><input type="range" id="p-size" min="8" max="240" step="1"></label>' +
        '<div class="field"><span>Colour</span><div class="swatches" id="p-colors" role="group" aria-label="Text colour">' +
        TEXT_COLORS.map(([h, n]) => '<button type="button" class="swb" data-tc="' + h + '" aria-label="' + n + '" aria-pressed="false" title="' + n + '" style="--c:' + h + '"></button>').join('') +
        '<label class="swb custom" title="Custom colour"><input type="color" id="p-color" aria-label="Custom text colour"><span>+</span></label></div></div></div>' +
        '<div id="props-image"><label class="field"><span>Width <output id="p-w-out"></output></span><input type="range" id="p-w" min="10" max="100" step="1"></label></div>' +
        '<label class="field"><span>Rotation <output id="p-rot-out"></output></span><input type="range" id="p-rot" min="-180" max="180" step="1"></label>' +
        '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="center">' + icon('center', 16) + ' Centre</button><button type="button" class="btn btn-ghost btn-sm" data-act="duplicate">' + icon('copy', 16) + ' Duplicate</button><button type="button" class="btn btn-ghost btn-sm danger" data-act="delete">' + icon('trash', 16) + ' Delete</button></div></div>' +
        '<p class="fine" id="props-empty">Select a design element on the garment to edit it.</p>') +

      panel('3', 'Print or embroidery method',
        '<div class="methods" id="methods" role="radiogroup" aria-label="Decoration method"></div><div class="warn" id="method-warn" hidden role="status"></div>') +

      panel('4', 'Sizes &amp; quantities',
        '<div class="size-grid" id="size-grid"></div>' +
        '<div class="qty-total"><span>Total quantity</span><strong id="qty-total">0</strong></div>' +
        '<p class="field-err" id="qty-msg" role="alert"></p>' +
        '<p class="fine">Whole numbers only · up to ' + A.CONFIG.maxQtyPerSize + ' per size · ' + A.CONFIG.maxQtyTotal + ' in total. Minimum order <strong>' + A.CONFIG.minQtyStudio + '</strong> <em>(placeholder — confirm with the business)</em>. <button type="button" class="link-btn" id="qty-clear">Clear quantities</button></p>') +

      panel('5', 'Order summary',
        '<div class="sum-previews" id="sum-previews"></div>' +
        '<dl class="q-lines" id="sum-lines"></dl>' +
        '<div class="btn-row"><button type="button" class="btn btn-ghost" id="save-draft">' + icon('save', 18) + ' Save draft</button><button type="button" class="btn btn-primary btn-lg" data-quote>Request a Quote</button></div>' +
        '<p class="fine">' + esc(A.DISCLAIMER) + ' ' + esc(A.LOCAL_NOTE) + '</p>', 'sum') +
      '</div></div>' +

      '<div class="studio-bar"><div><strong id="bar-total">0 pcs</strong><small>Quote required</small></div><button type="button" class="btn btn-primary" data-quote>Request a Quote</button></div>' +
      '</section>';

    function tb(act, ic, label) { return '<button type="button" class="tb" data-tb="' + act + '" aria-label="' + label + '" title="' + label + '">' + icon(ic, 18) + '<span class="tb-l">' + label + '</span></button>'; }
    function panel(n, title, body, id) { return '<section class="panel"' + (id ? ' id="panel-' + id + '"' : '') + '><h2 class="panel-t"><span class="num">' + n + '</span>' + title + '</h2>' + body + '</section>'; }
  }

  /* -------------------------------------------------------------- state helpers */
  const total = () => Object.values(S.sizes).reduce((a, b) => a + b, 0);
  const cleanSizes = () => Object.fromEntries(Object.entries(S.sizes).filter(([, v]) => v > 0));

  /* ------------------------------------------------------------- UI refreshers */
  function refreshGarmentUI() {
    const p = ed.product;
    $$('#prod-chips .pchip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.prod === p.id)));
    $('#color-sw').innerHTML = p.colors.map(id => {
      const c = A.COLORS[id];
      return '<button type="button" class="swb" data-color="' + id + '" aria-label="' + esc(c.name) + '" aria-pressed="' + (id === ed.colorId) + '" title="' + esc(c.name) + '" style="--c:' + c.hex + '">' + icon('check', 14) + '</button>';
    }).join('');
    $('#color-name').textContent = ed.color.name;
    $('#views').innerHTML = p.views.map(v => '<button type="button" role="tab" class="vtab" data-view="' + v + '" aria-selected="' + (v === ed.view) + '">' + A.VIEW_LABELS[v] + (ed.layers[v].length ? ' <span class="dot" aria-label="has design"></span>' : '') + '</button>').join('');
    $('#layers-view').textContent = A.VIEW_LABELS[ed.view].toLowerCase();
  }

  function refreshMethods() {
    const p = ed.product;
    if (!p.methods.includes(S.method)) S.method = p.methods[0];
    ed.method = S.method;
    $('#methods').innerHTML = p.methods.map(id => {
      const m = A.METHODS[id];
      return '<label class="method' + (id === S.method ? ' on' : '') + '"><input type="radio" name="method" value="' + id + '"' + (id === S.method ? ' checked' : '') + '><span><strong>' + esc(m.name) + '</strong><small>' + esc(m.desc) + '</small></span></label>';
    }).join('');
    refreshMethodWarn(); ed.draw();
  }
  function refreshMethodWarn() {
    const m = A.METHODS[S.method], w = $('#method-warn'), msgs = [];
    if (!m || !w) return;   // called by the editor before a method is chosen / before the DOM is ready
    const hasImg = ed.hasImages();
    if (S.method === 'embroidery' && hasImg) msgs.push('Uploaded artwork may be simplified for embroidery — fine detail, gradients and photos do not stitch well. The team will confirm suitability.');
    else if (S.method === 'vinyl' && hasImg) msgs.push('Heat-transfer vinyl suits simple, flat-colour artwork. Complex images may need a different method.');
    else if (S.method === 'screen' && hasImg) msgs.push('Screen print works best with a few solid colours; photographic artwork may be simplified.');
    else if (m.caution) msgs.push(m.caution);
    w.hidden = !msgs.length; w.innerHTML = msgs.length ? icon('warn', 18) + '<p>' + esc(msgs[0]) + '</p>' : '';
  }

  function refreshSizes() {
    const p = ed.product;
    // keep only sizes that exist for this product
    Object.keys(S.sizes).forEach(k => { if (!p.sizes.includes(k)) delete S.sizes[k]; });
    p.sizes.forEach(sz => { if (S.sizes[sz] == null) S.sizes[sz] = 0; });
    $('#size-grid').innerHTML = p.sizes.map(sz => {
      const id = 'q-' + A.UI.slug(sz);
      return '<div class="size-cell"><label for="' + id + '">' + esc(sz) + '</label><div class="stepper"><button type="button" data-step="-1" data-size="' + esc(sz) + '" aria-label="Decrease ' + esc(sz) + '">' + icon('minus', 16) + '</button><input id="' + id + '" data-size="' + esc(sz) + '" inputmode="numeric" autocomplete="off" value="' + S.sizes[sz] + '"><button type="button" data-step="1" data-size="' + esc(sz) + '" aria-label="Increase ' + esc(sz) + '">' + icon('plus', 16) + '</button></div></div>';
    }).join('');
    refreshTotals();
  }
  function refreshTotals() {
    $('#qty-total').textContent = total();
    $('#bar-total').textContent = total() + (total() === 1 ? ' pc' : ' pcs');
    refreshSummary();
  }

  function syncToolbar() {
    const sel = !!ed.selected();
    const set = (a, dis) => { const b = $('[data-tb="' + a + '"]'); if (b) b.disabled = dis; };
    set('undo', !ed.canUndo()); set('redo', !ed.canRedo());
    ['duplicate', 'delete', 'forward', 'back', 'center'].forEach(a => set(a, !sel));
    $('#cv-hint').hidden = ed.list.length > 0;
  }

  function refreshLayers() {
    const ul = $('#layers');
    if (!ed.list.length) { ul.innerHTML = '<li class="layers-empty">No design elements on the ' + A.VIEW_LABELS[ed.view].toLowerCase() + ' yet.</li>'; return; }
    ul.innerHTML = [...ed.list].reverse().map(o => {
      const label = o.type === 'text' ? '“' + (o.text || '').replace(/\n/g, ' ').slice(0, 22) + '”' : (o.name || 'Image');
      return '<li><button type="button" class="layer' + (o.id === ed.sel ? ' on' : '') + '" data-layer="' + o.id + '" aria-pressed="' + (o.id === ed.sel) + '">' + icon(o.type === 'text' ? 'text' : 'layers', 16) + '<span>' + esc(label) + '</span></button></li>';
    }).join('');
  }

  function refreshPropsShell() {
    const o = ed.selected();
    $('#props').hidden = !o; $('#props-empty').hidden = !!o;
    if (!o) return;
    $('#props-type').textContent = o.type === 'text' ? 'Text' : 'Image';
    $('#props-text').hidden = o.type !== 'text';
    $('#props-image').hidden = o.type !== 'image';
    syncProps();
  }
  function syncProps() {
    const o = ed.selected(); if (!o) return;
    const act = document.activeElement;
    const setv = (sel, v) => { const el = $(sel); if (el && el !== act) el.value = v; };
    const rot = Math.round(A.Editor.deg(o.rot) * 1) ; const r = ((rot + 540) % 360) - 180;
    setv('#p-rot', r); $('#p-rot-out').textContent = r + '°';
    if (o.type === 'text') {
      setv('#p-text', o.text); setv('#p-font', o.font); setv('#p-size', Math.round(o.size)); $('#p-size-out').textContent = Math.round(o.size) + ' px';
      $$('[data-al]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.al === o.align)));
      $('[data-st="bold"]').setAttribute('aria-pressed', String(!!o.bold)); $('[data-st="italic"]').setAttribute('aria-pressed', String(!!o.italic));
      $$('#p-colors [data-tc]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tc.toLowerCase() === String(o.color).toLowerCase())));
      if (/^#[0-9a-f]{6}$/i.test(o.color)) setv('#p-color', o.color);
    } else {
      const pct = Math.round(o.w / ed.area.w * 100); setv('#p-w', Math.min(100, pct)); $('#p-w-out').textContent = pct + '%';
    }
  }

  let sumRaf = 0;
  function refreshSummary() {
    cancelAnimationFrame(sumRaf);
    sumRaf = requestAnimationFrame(() => {
      if (!live()) return;
      const p = ed.product, counts = ed.elementCounts(), views = p.views.filter(v => counts[v] || v === 'front');
      const host = $('#sum-previews');
      if (host) {
        if (host.children.length !== views.length || views.some((v, i) => host.children[i].dataset.v !== v)) {
          host.innerHTML = views.map(v => '<figure data-v="' + v + '"><canvas aria-label="' + A.VIEW_LABELS[v] + ' preview" role="img"></canvas><figcaption>' + A.VIEW_LABELS[v] + '</figcaption></figure>').join('');
        }
        views.forEach((v, i) => ed.renderTo(host.children[i].querySelector('canvas'), v, 220));
      }
      const m = A.METHODS[S.method] || A.METHODS[ed.product.methods[0]], sizes = A.Quote.sizeText(cleanSizes());
      const el = Object.entries(counts).map(([v, n]) => A.VIEW_LABELS[v] + ' (' + n + ')').join(', ') || 'None yet';
      $('#sum-lines').innerHTML =
        '<div><dt>Garment</dt><dd>' + esc(p.name) + '</dd></div>' +
        '<div><dt>Colour</dt><dd>' + A.UI.swatch(ed.color) + ' ' + esc(ed.color.name) + '</dd></div>' +
        '<div><dt>Method</dt><dd>' + esc(m.name) + '</dd></div>' +
        '<div><dt>Design elements</dt><dd>' + esc(el) + '</dd></div>' +
        '<div><dt>Sizes</dt><dd>' + esc(sizes) + '</dd></div>' +
        '<div><dt>Total quantity</dt><dd><strong>' + total() + '</strong></dd></div>' +
        '<div><dt>Price</dt><dd>' + esc(A.UI.priceLabel(p, total())) + '</dd></div>';
      $('#views') && $$('#views .vtab').forEach(b => { const v = b.dataset.view, has = ed.layers[v].length; const d = b.querySelector('.dot'); if (has && !d) b.insertAdjacentHTML('beforeend', ' <span class="dot" aria-label="has design"></span>'); else if (!has && d) d.remove(); });
    });
  }

  function refreshAll() {
    refreshGarmentUI(); refreshMethods(); refreshSizes(); refreshLayers(); refreshPropsShell(); syncToolbar(); refreshSummary();
  }

  /* --------------------------------------------------------------- quantities */
  function setQty(size, raw, announce) {
    const msg = $('#qty-msg'); msg.textContent = '';
    let n;
    if (typeof raw === 'number') n = raw;
    else {
      const t = String(raw).trim();
      if (t === '') n = 0;
      else if (/^\d+$/.test(t)) n = parseInt(t, 10);
      else { msg.textContent = 'Quantities must be whole numbers (0 or more).'; return false; }
    }
    if (n > A.CONFIG.maxQtyPerSize) { n = A.CONFIG.maxQtyPerSize; msg.textContent = 'Maximum ' + A.CONFIG.maxQtyPerSize + ' per size. For larger runs, use Bulk Orders or contact the team.'; }
    const others = total() - (S.sizes[size] || 0);
    if (others + n > A.CONFIG.maxQtyTotal) { n = Math.max(0, A.CONFIG.maxQtyTotal - others); msg.textContent = 'Total quantity is limited to ' + A.CONFIG.maxQtyTotal + ' in the studio.'; }
    S.sizes[size] = n;
    if (announce) { const inp = $('[data-size="' + size + '"]:not(button)'); if (inp) inp.value = n; }
    refreshTotals(); persistSession();
    return true;
  }

  /* ------------------------------------------------------------------- drafts */
  function persistSession() {
    if (!ed || !S) return;
    A._studioSession = { productId: ed.productId, method: S.method, sizes: Object.assign({}, S.sizes), view: ed.view, draftId: S.draftId, design: ed.exportDraft() };
  }

  async function saveDraftFlow() {
    const p = ed.product;
    const defName = p.name + ' · ' + ed.color.name + ' · ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const existing = S.draftId ? A.Store.draft(S.draftId) : null;
    const dlg = A.UI.dialog('<button class="dlg-x" data-dlg-close aria-label="Close">' + icon('close') + '</button><p class="eyebrow">Save draft</p><h2 class="dlg-title">Name your draft</h2>' +
      '<form id="draft-form" novalidate><label class="field"><span>Draft name</span><input name="n" maxlength="60" value="' + esc(existing ? existing.name : defName) + '"><small class="field-err" role="alert"></small></label>' +
      '<p class="fine">Saved in this browser only so you can restore it later. Large uploaded images may fill browser storage.</p>' +
      '<div class="dlg-actions"><button type="button" class="btn btn-ghost" data-dlg-close>Cancel</button><button class="btn btn-primary" type="submit">' + (existing ? 'Update draft' : 'Save draft') + '</button></div></form>', { cls: 'dlg-sm', label: 'Save draft' });
    const f = dlg.el.querySelector('#draft-form');
    setTimeout(() => f.n.select(), 40);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const name = f.n.value.trim();
      if (!name) { f.querySelector('.field-err').textContent = 'Please give the draft a name.'; return; }
      const id = S.draftId || A.Store.uid();
      let preview = ''; try { preview = await ed.previewDataURL('front', 240); } catch (x) { }
      const r = A.Store.saveDraft({ id, name, productId: ed.productId, colorId: ed.colorId, method: S.method, sizes: Object.assign({}, S.sizes), view: ed.view, design: ed.exportDraft(), preview });
      if (!r.ok) { f.querySelector('.field-err').textContent = 'Could not save: browser storage is full or blocked. Try removing a large image or deleting old drafts.'; toast('Draft not saved — storage problem', 'error'); return; }
      S.draftId = id; persistSession(); dlg.close();
      toast('Draft saved in this browser', 'success');
    });
  }

  async function loadDraft(d) {
    ed.setProduct(d.productId, d.colorId);
    await ed.importDraft(d.design);
    S.method = d.method; S.sizes = Object.assign({}, d.sizes); S.draftId = d.id;
    if (d.view && ed.product.views.includes(d.view)) ed.setView(d.view);
    refreshAll(); persistSession();
    toast('Draft “' + d.name + '” restored', 'success');
  }

  function draftsDialog() {
    const render = () => {
      const list = A.Store.drafts();
      return '<button class="dlg-x" data-dlg-close aria-label="Close">' + icon('close') + '</button><p class="eyebrow">Saved drafts</p><h2 class="dlg-title">Restore a design</h2>' +
        (list.length ? '<ul class="draft-list">' + list.map(d => '<li><img src="' + (d.preview || A.gimg(d.productId, 'front', d.colorId)) + '" alt=""><div><strong>' + esc(d.name) + '</strong><small>' + esc((A.product(d.productId) || {}).name) + ' · saved ' + A.UI.ago(d.updatedAt) + '</small></div><button class="btn btn-primary btn-sm" data-open="' + d.id + '">Open</button><button class="btn btn-ghost btn-sm" data-del="' + d.id + '" aria-label="Delete draft ' + esc(d.name) + '">' + icon('trash', 16) + '</button></li>').join('') + '</ul>'
          : '<div class="empty"><p>No saved drafts yet. Use <strong>Save draft</strong> in the order summary to keep a design in this browser.</p></div>');
    };
    const dlg = A.UI.dialog(render(), { cls: 'dlg-md', label: 'Saved drafts' });
    dlg.el.addEventListener('click', async e => {
      const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
      if (o) { const dr = A.Store.draft(o.dataset.open); dlg.close(); if (dr) await loadDraft(dr); }
      if (d) { A.Store.deleteDraft(d.dataset.del); if (S.draftId === d.dataset.del) S.draftId = null; dlg.el.querySelector('.dlg-body').innerHTML = render(); toast('Draft deleted', 'info'); }
    });
  }

  /* -------------------------------------------------------------------- quote */
  async function requestQuote() {
    const t = total();
    const msg = $('#qty-msg');
    if (t < A.CONFIG.minQtyStudio) {
      msg.textContent = 'Add at least ' + A.CONFIG.minQtyStudio + ' item — enter a quantity for one or more sizes.';
      toast('Please add sizes and quantities first', 'error');
      $('#panel-sum').previousElementSibling.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const first = $('#size-grid input'); if (first) first.focus({ preventScroll: true });
      return;
    }
    if (ed.totalElements() === 0) {
      const ok = await A.UI.confirmDialog('No design added yet', 'You have not added any text or artwork. Request a quote for the plain garment?', 'Continue');
      if (!ok) return;
    }
    A.Quote.open({
      type: 'studio',
      item: { productId: ed.productId, colorId: ed.colorId, method: S.method, sizes: cleanSizes(), total: t, elements: ed.elementCounts() },
      previews: () => ed.previews()
    });
  }

  /* -------------------------------------------------------------------- upload */
  async function handleUpload(file) {
    const msg = $('#upload-msg');
    msg.className = 'upload-msg'; msg.innerHTML = '<span class="spin sm" aria-hidden="true"></span> Processing image…';
    try {
      const rec = await A.Editor.processFile(file);
      ed.addImage(rec);
      msg.className = 'upload-msg ok'; msg.innerHTML = icon('check', 16) + ' “' + esc(rec.name) + '” added to the ' + A.VIEW_LABELS[ed.view].toLowerCase() + '.';
      refreshMethodWarn();
    } catch (e) {
      msg.className = 'upload-msg bad'; msg.innerHTML = icon('warn', 16) + ' ' + esc(e.message);
      toast(e.message, 'error');
    }
  }

  /* -------------------------------------------------------------------- mount */
  function mount(el, r) {
    root = el; cleanup = [];
    const q = r.q || {};
    S = { method: null, sizes: {}, draftId: null };

    ed = new A.Editor.Editor($('#cv'), {
      onChange: () => { if (!live()) return; syncToolbar(); refreshSummary(); syncProps(); },
      onHistory: () => { if (!live()) return; syncToolbar(); persistSession(); },
      onSelect: o => {
        if (!live()) return;
        refreshLayers(); refreshPropsShell(); syncToolbar();
        $('#cv-live').textContent = o ? 'Selected ' + (o.type === 'text' ? 'text: ' + o.text : 'image: ' + o.name) : 'Selection cleared';
        refreshMethodWarn();
      },
      onView: () => { if (!live()) return; refreshGarmentUI(); refreshLayers(); syncToolbar(); refreshSummary(); },
      onEditText: () => { if (!live()) return; const t = $('#p-text'); if (t) { t.focus(); t.select(); } }
    });

    const sess = A._studioSession;
    const hasParams = q.product || q.draft || q.work;
    if (q.draft && A.Store.draft(q.draft)) {
      const d = A.Store.draft(q.draft);
      ed.setProduct(d.productId, d.colorId);
      ed.importDraft(d.design).then(() => { S.method = d.method; S.sizes = Object.assign({}, d.sizes); S.draftId = d.id; if (d.view && ed.product.views.includes(d.view)) ed.setView(d.view); refreshAll(); });
    } else if (hasParams) {
      ed.setProduct(A.product(q.product) ? q.product : 'tee', q.color);
      if (q.work) {
        const w = A.WORK.find(x => x.id === q.work);
        if (w) {
          ed.setProduct(w.product, w.color);
          if (w.view !== 'front' && ed.product.views.includes(w.view)) ed.setView(w.view);
          if (ed.product.methods.includes(w.method)) S.method = w.method;
          (w.overlay || []).filter(i => i.k === 'text').forEach(i => ed.addText({ text: i.t, font: i.font, size: i.size, color: i.fill, fy: i.fy, italic: i.italic }));
          if (!ed.list.length) { /* badge-only samples start empty */ }
          ed.select(null);
        }
      }
    } else if (sess) {
      ed.setProduct(sess.productId);
      ed.importDraft(sess.design).then(() => { S.method = sess.method; S.sizes = Object.assign({}, sess.sizes); S.draftId = sess.draftId; if (sess.view && ed.product.views.includes(sess.view)) ed.setView(sess.view); refreshAll(); });
    } else { ed.setProduct('tee', 'black'); }

    refreshAll();
    $('#cv').setAttribute('data-ready', '1');

    /* ---- events ---- */
    const on = (sel, evt, fn) => { const n = $(sel); if (n) n.addEventListener(evt, fn); };

    root.addEventListener('click', e => {
      const t = e.target;
      let b;
      if ((b = t.closest('[data-tb]'))) {
        const a = b.dataset.tb;
        if (a === 'undo') ed.undo(); else if (a === 'redo') ed.redo(); else if (a === 'duplicate') ed.duplicate(); else if (a === 'delete') ed.remove();
        else if (a === 'forward') ed.reorder('forward'); else if (a === 'back') ed.reorder('back'); else if (a === 'center') ed.centerSelected();
        else if (a === 'guides') { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); ed.setGuides(on); }
        refreshLayers(); return;
      }
      if ((b = t.closest('[data-act]'))) { const a = b.dataset.act; if (a === 'center') ed.centerSelected(); else if (a === 'duplicate') ed.duplicate(); else if (a === 'delete') ed.remove(); return; }
      if ((b = t.closest('.vtab'))) { ed.setView(b.dataset.view); return; }
      if ((b = t.closest('.pchip'))) {
        if (b.dataset.prod === ed.productId) return;
        const had = ed.totalElements() > 0;
        ed.setProduct(b.dataset.prod); refreshAll(); persistSession();
        toast(had ? 'Switched garment — your design was re-fitted to the new print area' : 'Switched to ' + ed.product.name, 'info'); return;
      }
      if ((b = t.closest('#color-sw .swb'))) { ed.setColor(b.dataset.color); refreshGarmentUI(); return; }
      if ((b = t.closest('[data-layer]'))) { ed.select(b.dataset.layer); return; }
      if ((b = t.closest('[data-preset]'))) { const pr = A.PRESETS[b.dataset.preset]; pr.forEach(x => ed.addText(x)); return; }
      if ((b = t.closest('[data-al]'))) { ed.update({ align: b.dataset.al }); return; }
      if ((b = t.closest('[data-st]'))) { const o = ed.selected(); if (o) ed.update({ [b.dataset.st]: !o[b.dataset.st] }); return; }
      if ((b = t.closest('[data-tc]'))) { ed.update({ color: b.dataset.tc }); return; }
      if ((b = t.closest('[data-step]'))) { const sz = b.dataset.size; setQty(sz, Math.max(0, (S.sizes[sz] || 0) + parseInt(b.dataset.step, 10)), true); return; }
      if (t.closest('[data-quote]')) { requestQuote(); return; }
    });

    on('#add-text', 'click', () => { ed.addText({}); const tx = $('#p-text'); if (tx) setTimeout(() => { tx.focus(); tx.select(); }, 30); });
    on('#file-in', 'change', e => { const f = e.target.files[0]; if (f) handleUpload(f); e.target.value = ''; });
    on('#save-draft', 'click', saveDraftFlow);
    on('#st-drafts', 'click', draftsDialog);
    on('#qty-clear', 'click', () => { Object.keys(S.sizes).forEach(k => S.sizes[k] = 0); $$('#size-grid input').forEach(i => i.value = 0); $('#qty-msg').textContent = ''; refreshTotals(); persistSession(); });

    // method
    on('#methods', 'change', e => { if (e.target.name === 'method') { S.method = e.target.value; ed.method = S.method; $$('.method').forEach(m => m.classList.toggle('on', m.querySelector('input').checked)); refreshMethodWarn(); ed.draw(); refreshSummary(); persistSession(); } });

    // text + rotation + size controls
    on('#p-text', 'input', e => ed.update({ text: e.target.value }, false));
    on('#p-text', 'change', () => ed.commit());
    on('#p-font', 'change', e => ed.update({ font: e.target.value }));
    on('#p-size', 'input', e => { ed.update({ size: +e.target.value }, false); $('#p-size-out').textContent = e.target.value + ' px'; });
    on('#p-size', 'change', () => ed.commit());
    on('#p-w', 'input', e => { ed.update({ widthPct: +e.target.value }, false); $('#p-w-out').textContent = e.target.value + '%'; });
    on('#p-w', 'change', () => ed.commit());
    on('#p-rot', 'input', e => { ed.update({ rotDeg: +e.target.value }, false); $('#p-rot-out').textContent = e.target.value + '°'; });
    on('#p-rot', 'change', () => ed.commit());
    on('#p-color', 'input', e => ed.update({ color: e.target.value }, false));
    on('#p-color', 'change', () => ed.commit());

    // sizes
    on('#size-grid', 'input', e => { const i = e.target.closest('input[data-size]'); if (i) { const ok = setQty(i.dataset.size, i.value, false); if (!ok) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); } });
    on('#size-grid', 'change', e => { const i = e.target.closest('input[data-size]'); if (i) { i.value = S.sizes[i.dataset.size] || 0; i.removeAttribute('aria-invalid'); } });

    // dragging a file onto the canvas
    const wrap = $('#canvas-wrap');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drop'); }));
    ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drop'); }));
    wrap.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) handleUpload(f); });

    // keyboard shortcuts outside the canvas (undo/redo) when not typing
    const keyFn = e => {
      if (!root || !root.isConnected) return;
      const tag = (document.activeElement || {}).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && document.activeElement !== $('#cv')) { e.preventDefault(); e.shiftKey ? ed.redo() : ed.undo(); }
    };
    document.addEventListener('keydown', keyFn); cleanup.push(() => document.removeEventListener('keydown', keyFn));
    const unsub = A.bus.on('drafts', () => { }); cleanup.push(unsub);
  }

  function unmount() {
    persistSession();
    cleanup.forEach(fn => fn()); cleanup = [];
    cancelAnimationFrame(sumRaf);
    ed = null; root = null;
  }

  A.pages.studio = { title: 'Design Studio', render, mount, unmount };
  A.studioDebug = { get editor() { return ed; }, get state() { return S; } };   // handy for testing
})();
