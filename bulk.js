/* ==========================================================================
   bulk.js — Bulk Order builder for businesses, schools, churches, teams,
   event organisers and clothing brands. Size-by-size quantities, artwork
   upload, delivery/collection, validation and a quotation request.
   Pricing is never invented: "Quote required" unless prices are configured.
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.pages = A.pages || {};
  const { esc, icon, toast } = A.UI;
  const G = A.Garments;
  let root = null, S = null;

  const $ = s => (root ? root.querySelector(s) : null);
  const $$ = s => (root ? Array.from(root.querySelectorAll(s)) : []);
  const total = () => Object.values(S.sizes).reduce((a, b) => a + b, 0);

  function render() {
    const today = new Date().toISOString().slice(0, 10);
    return '<section class="page-head"><div class="wrap"><p class="eyebrow">Bulk Orders</p><h1 class="h1">Kit out the <em>whole team</em></h1>' +
      '<p class="lede">For businesses, schools, churches, sports teams, event organisers and clothing brands. Tell us what you need — you receive a quotation before anything is produced.</p></div></section>' +
      '<section class="pad-sm"><div class="wrap bulk-grid"><form id="bulk-form" novalidate class="bulk-form">' +

      '<section class="panel"><h2 class="panel-t"><span class="num">1</span>Who is this for?</h2>' +
      '<div class="chips-org" role="radiogroup" aria-label="Organisation type">' + A.ORG_TYPES.map((t, i) => '<label class="ochip"><input type="radio" name="org" value="' + esc(t) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(t) + '</span></label>').join('') + '</div>' +
      '<label class="field"><span>Organisation / group name *</span><input name="orgName" autocomplete="organization" placeholder="e.g. your school, church, team or company"><small class="field-err" role="alert"></small></label></section>' +

      '<section class="panel"><h2 class="panel-t"><span class="num">2</span>Garment, colour &amp; method</h2>' +
      '<div class="chips-prod" id="b-prod" role="radiogroup" aria-label="Garment">' + A.PRODUCTS.map(p => '<button type="button" class="pchip" data-prod="' + p.id + '" role="radio" aria-checked="false"><img src="' + A.gimg(p.id, 'front', p.colors[0]) + '" alt=""><span>' + esc(p.name) + '</span></button>').join('') + '</div>' +
      '<h3 class="h5">Colour: <span id="b-cname"></span></h3><div class="swatches lg" id="b-colors" role="group" aria-label="Garment colour"></div>' +
      '<label class="field"><span>Print / embroidery method</span><select name="method" id="b-method"></select></label><div class="warn" id="b-warn" hidden role="status"></div></section>' +

      '<section class="panel"><h2 class="panel-t"><span class="num">3</span>Sizes &amp; quantities</h2><div class="size-grid" id="b-sizes"></div>' +
      '<div class="qty-total"><span>Total quantity</span><strong id="b-total">0</strong></div><p class="field-err" id="b-qty-err" role="alert"></p>' +
      '<p class="fine">Whole numbers only. Minimum for bulk quotations <strong>' + A.CONFIG.minQtyBulk + '</strong> <em>(placeholder — confirm with the business)</em>, maximum ' + A.CONFIG.maxQtyTotal + ' per request. For one-offs and small runs use the <a href="#/studio">Design Studio</a>.</p></section>' +

      '<section class="panel"><h2 class="panel-t"><span class="num">4</span>Customization</h2>' +
      '<fieldset class="field"><legend>Where should the design go?</legend><div class="checks" id="b-places"></div></fieldset>' +
      '<div class="field"><span>Artwork / logo <em>(optional)</em></span><div class="btn-row"><label class="btn btn-ghost upload-btn" for="b-file">' + icon('upload', 18) + ' Upload artwork</label><input type="file" id="b-file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden><button type="button" class="btn btn-ghost btn-sm" id="b-file-clear" hidden>Remove</button></div>' +
      '<div class="upload-msg" id="b-upload-msg" role="status" aria-live="polite"></div><p class="fine">PNG, JPG, WebP, GIF or SVG, up to 5 MB. This prototype keeps only a small preview of the artwork. For precise placement, <a href="#/studio" id="b-studio-link">open the Design Studio</a>.</p></div>' +
      '<label class="field"><span>Customization requirements</span><textarea name="reqs" rows="3" maxlength="600" placeholder="Number of colours, names/numbers on the back, logo size, Pantone references…"></textarea></label></section>' +

      '<section class="panel"><h2 class="panel-t"><span class="num">5</span>Delivery or collection</h2>' +
      '<div class="seg" role="radiogroup" aria-label="Delivery or collection"><label><input type="radio" name="delivery" value="Collection" checked><span>Collection</span></label><label><input type="radio" name="delivery" value="Delivery"><span>Delivery</span></label></div>' +
      '<label class="field" id="b-addr-f" hidden><span>Delivery town / address *</span><input name="addr" autocomplete="street-address"><small class="field-err" role="alert"></small></label>' +
      '<label class="field"><span>Needed by <em>(optional)</em></span><input type="date" name="deadline" min="' + today + '"><small class="field-err" role="alert"></small></label>' +
      '<label class="field"><span>Anything else we should know?</span><textarea name="notes" rows="3" maxlength="600"></textarea></label></section>' +
      '</form>' +

      '<aside class="bulk-sum"><div class="card sticky"><h2 class="h4">Your bulk request</h2>' +
      '<div class="bp" id="bp"><img id="bp-garment" alt=""><img id="bp-art" alt="" hidden></div>' +
      '<dl class="q-lines" id="b-lines"></dl>' +
      '<button class="btn btn-primary btn-lg btn-block" type="button" id="b-submit">Request bulk quotation</button>' +
      '<p class="fine">' + esc(A.DISCLAIMER) + ' ' + esc(A.LOCAL_NOTE) + '</p></div></aside></div></section>';
  }

  function placements(p) {
    const map = { front: 'Front', back: 'Back', sleeve: 'Sleeve' };
    return p.views.map(v => [v, map[v]]);
  }

  function refresh() {
    const p = A.product(S.productId);
    $$('#b-prod .pchip').forEach(b => { const on = b.dataset.prod === p.id; b.setAttribute('aria-checked', String(on)); b.setAttribute('aria-pressed', String(on)); });
    if (!p.colors.includes(S.colorId)) S.colorId = p.colors[0];
    $('#b-colors').innerHTML = p.colors.map(id => { const c = A.COLORS[id]; return '<button type="button" class="swb" data-color="' + id + '" aria-label="' + esc(c.name) + '" aria-pressed="' + (id === S.colorId) + '" title="' + esc(c.name) + '" style="--c:' + c.hex + '">' + icon('check', 14) + '</button>'; }).join('');
    $('#b-cname').textContent = A.COLORS[S.colorId].name;
    if (!p.methods.includes(S.method)) S.method = p.methods[0];
    $('#b-method').innerHTML = p.methods.map(m => '<option value="' + m + '"' + (m === S.method ? ' selected' : '') + '>' + esc(A.METHODS[m].name) + '</option>').join('');
    // sizes
    Object.keys(S.sizes).forEach(k => { if (!p.sizes.includes(k)) delete S.sizes[k]; });
    p.sizes.forEach(sz => { if (S.sizes[sz] == null) S.sizes[sz] = 0; });
    $('#b-sizes').innerHTML = p.sizes.map(sz => { const id = 'bq-' + A.UI.slug(sz); return '<div class="size-cell"><label for="' + id + '">' + esc(sz) + '</label><div class="stepper"><button type="button" data-step="-1" data-size="' + esc(sz) + '" aria-label="Decrease ' + esc(sz) + '">' + icon('minus', 16) + '</button><input id="' + id + '" data-size="' + esc(sz) + '" inputmode="numeric" autocomplete="off" value="' + S.sizes[sz] + '"><button type="button" data-step="1" data-size="' + esc(sz) + '" aria-label="Increase ' + esc(sz) + '">' + icon('plus', 16) + '</button></div></div>'; }).join('');
    // placements
    const keep = S.places;
    $('#b-places').innerHTML = placements(p).map(([v, l], i) => '<label class="check"><input type="checkbox" name="place" value="' + esc(l) + '"' + ((keep.length ? keep.includes(l) : i === 0) ? ' checked' : '') + '><span>' + esc(l) + '</span></label>').join('');
    S.places = $$('#b-places input:checked').map(i => i.value);
    $('#b-studio-link').href = '#/studio?product=' + p.id + '&color=' + S.colorId;
    warn(); paint();
  }

  function warn() {
    const m = A.METHODS[S.method], w = $('#b-warn');
    let msg = m.caution;
    if (S.art && S.method === 'embroidery') msg = 'Uploaded artwork may be simplified for embroidery. The team will confirm suitability.';
    w.hidden = !msg; w.innerHTML = msg ? icon('warn', 18) + '<p>' + esc(msg) + '</p>' : '';
  }

  function paint() {
    const p = A.product(S.productId), col = A.COLORS[S.colorId];
    $('#bp-garment').src = A.gimg(p.id, 'front', S.colorId, { bg: '#ece8e0' }); $('#bp-garment').alt = p.name + ' in ' + col.name;
    const art = $('#bp-art');
    if (S.art) {
      const a = G.area(p.id, 'front'), r = Math.min((a.w * .72) / S.art.nw, (a.h * .72) / S.art.nh), w = S.art.nw * r, h = S.art.nh * r;
      art.hidden = false; art.src = S.art.src; art.alt = 'Uploaded artwork preview';
      art.style.cssText = 'left:' + ((a.x + a.w / 2 - w / 2) / 6) + '%;top:' + ((a.y + a.h / 2 - h / 2) / 7) + '%;width:' + (w / 6) + '%;height:' + (h / 7) + '%';
    } else art.hidden = true;
    const t = total();
    $('#b-total').textContent = t;
    $('#b-lines').innerHTML =
      '<div><dt>Organisation</dt><dd>' + esc((S.orgName ? S.orgName + ' · ' : '') + S.org) + '</dd></div>' +
      '<div><dt>Garment</dt><dd>' + esc(p.name) + '</dd></div>' +
      '<div><dt>Colour</dt><dd>' + A.UI.swatch(col) + ' ' + esc(col.name) + '</dd></div>' +
      '<div><dt>Method</dt><dd>' + esc(A.METHODS[S.method].name) + '</dd></div>' +
      '<div><dt>Sizes</dt><dd>' + esc(A.Quote.sizeText(Object.fromEntries(Object.entries(S.sizes).filter(([, v]) => v > 0)))) + '</dd></div>' +
      '<div><dt>Total quantity</dt><dd><strong>' + t + '</strong></dd></div>' +
      '<div><dt>Artwork</dt><dd>' + esc(S.art ? S.art.name : 'None uploaded') + '</dd></div>' +
      '<div><dt>Price</dt><dd>' + esc(A.UI.priceLabel(p, t)) + '</dd></div>';
  }

  function setQty(size, raw) {
    const err = $('#b-qty-err'); err.textContent = '';
    let n;
    if (typeof raw === 'number') n = raw;
    else { const t = String(raw).trim(); if (t === '') n = 0; else if (/^\d+$/.test(t)) n = parseInt(t, 10); else { err.textContent = 'Quantities must be whole numbers (0 or more).'; return false; } }
    if (n > A.CONFIG.maxQtyPerSize) { n = A.CONFIG.maxQtyPerSize; err.textContent = 'Maximum ' + A.CONFIG.maxQtyPerSize + ' per size.'; }
    const others = total() - (S.sizes[size] || 0);
    if (others + n > A.CONFIG.maxQtyTotal) { n = Math.max(0, A.CONFIG.maxQtyTotal - others); err.textContent = 'A single request is limited to ' + A.CONFIG.maxQtyTotal + ' items. Contact the team for larger runs.'; }
    S.sizes[size] = n; paint(); return true;
  }

  const fieldErr = (f, name, msg) => { const el = f[name]; if (!el) return; el.setAttribute('aria-invalid', 'true'); const e = el.closest('.field').querySelector('.field-err'); if (e) e.textContent = msg; };

  async function submit() {
    const f = $('#bulk-form'); const errs = [];
    f.querySelectorAll('.field-err').forEach(e => e.textContent = ''); f.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
    $('#b-qty-err').textContent = '';
    if (f.orgName.value.trim().length < 2) { fieldErr(f, 'orgName', 'Please enter your organisation or group name.'); errs.push(f.orgName); }
    const t = total();
    if (t < A.CONFIG.minQtyBulk) { $('#b-qty-err').textContent = 'Bulk quotations start at ' + A.CONFIG.minQtyBulk + ' items — you have ' + t + '. Add more, or use the Design Studio for smaller orders.'; errs.push($('#b-sizes input')); }
    if (t > A.CONFIG.maxQtyTotal) { $('#b-qty-err').textContent = 'Please keep a single request to ' + A.CONFIG.maxQtyTotal + ' items or fewer.'; errs.push($('#b-sizes input')); }
    if (S.delivery === 'Delivery' && f.addr.value.trim().length < 3) { fieldErr(f, 'addr', 'Please enter the delivery town or address.'); errs.push(f.addr); }
    if (f.deadline.value) { const d = new Date(f.deadline.value + 'T00:00:00'), td = new Date(); td.setHours(0, 0, 0, 0); if (isNaN(d) || d < td) { fieldErr(f, 'deadline', 'Choose a date from today onwards.'); errs.push(f.deadline); } }
    if (errs.length) { errs[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); errs[0].focus({ preventScroll: true }); toast('Please fix the highlighted items', 'error'); return; }

    const sizes = Object.fromEntries(Object.entries(S.sizes).filter(([, v]) => v > 0));
    const places = $$('#b-places input:checked').map(i => i.value);
    const notes = [f.reqs.value.trim() && ('Requirements: ' + f.reqs.value.trim()), f.notes.value.trim()].filter(Boolean).join('\n');
    A.Quote.open({
      type: 'bulk', orgLabel: f.orgName.value.trim(), notes,
      item: { productId: S.productId, colorId: S.colorId, method: S.method, sizes, total: t, elements: S.art ? { front: 1 } : {} },
      bulk: { orgType: S.org, delivery: S.delivery, deliveryNote: S.delivery === 'Delivery' ? f.addr.value.trim() : '', deadline: f.deadline.value, artwork: S.art ? S.art.name : '', placements: places },
      previews: async () => {
        const ed = new A.Editor.Editor(document.createElement('canvas'), {});
        ed.setProduct(S.productId, S.colorId);
        if (S.art) { const rec = A.Editor.Images.map[S.art.id]; if (rec) ed.addImage(rec); }
        return ed.previews();
      }
    });
  }

  async function upload(file) {
    const msg = $('#b-upload-msg');
    msg.className = 'upload-msg'; msg.innerHTML = '<span class="spin sm" aria-hidden="true"></span> Processing image…';
    try {
      const rec = await A.Editor.processFile(file);
      S.art = rec; $('#b-file-clear').hidden = false;
      msg.className = 'upload-msg ok'; msg.innerHTML = icon('check', 16) + ' “' + esc(rec.name) + '” attached.';
      warn(); paint();
    } catch (e) { msg.className = 'upload-msg bad'; msg.innerHTML = icon('warn', 16) + ' ' + esc(e.message); toast(e.message, 'error'); }
  }

  function mount(el, r) {
    root = el;
    const q = r.q || {};
    S = { productId: A.product(q.product) ? q.product : 'tee', colorId: q.color, method: null, sizes: {}, places: [], art: null, org: 'Business', orgName: '', delivery: 'Collection' };
    refresh();

    root.addEventListener('click', e => {
      let b;
      if ((b = e.target.closest('#b-prod .pchip'))) { S.productId = b.dataset.prod; S.colorId = null; S.places = []; refresh(); return; }
      if ((b = e.target.closest('#b-colors .swb'))) { S.colorId = b.dataset.color; refresh(); return; }
      if ((b = e.target.closest('[data-step]'))) { const sz = b.dataset.size; setQty(sz, Math.max(0, (S.sizes[sz] || 0) + parseInt(b.dataset.step, 10))); const inp = $('input[data-size="' + sz + '"]'); if (inp) inp.value = S.sizes[sz]; return; }
      if (e.target.closest('#b-submit')) { submit(); return; }
      if (e.target.closest('#b-file-clear')) { S.art = null; $('#b-file-clear').hidden = true; $('#b-upload-msg').textContent = ''; warn(); paint(); }
    });
    root.addEventListener('input', e => {
      const i = e.target.closest('input[data-size]');
      if (i) { const ok = setQty(i.dataset.size, i.value); if (!ok) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }
      if (e.target.name === 'orgName') { S.orgName = e.target.value.trim(); paint(); }
    });
    root.addEventListener('change', e => {
      const t = e.target;
      const i = t.closest('input[data-size]'); if (i) { i.value = S.sizes[i.dataset.size] || 0; i.removeAttribute('aria-invalid'); return; }
      if (t.id === 'b-method') { S.method = t.value; warn(); paint(); }
      else if (t.name === 'org') { S.org = t.value; paint(); }
      else if (t.name === 'delivery') { S.delivery = t.value; $('#b-addr-f').hidden = t.value !== 'Delivery'; }
      else if (t.id === 'b-file') { const f = t.files[0]; if (f) upload(f); t.value = ''; }
      else if (t.name === 'place') { S.places = $$('#b-places input:checked').map(x => x.value); }
    });
  }

  A.pages.bulk = { title: 'Bulk Orders', render, mount, unmount() { root = null; S = null; } };
})();
