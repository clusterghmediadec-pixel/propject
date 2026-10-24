/* ==========================================================================
   account.js — DEMO customer area: saved designs, quote requests and a
   simulated order history. There is no login: it simply shows what this
   browser has saved. Status changes made in the demo business dashboard
   appear here (same local store).
   Route: #/account  (?tab=designs|requests|orders  &ref=<demo reference>)
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.pages = A.pages || {};
  const { esc, icon, toast, pill, ago, fmtDate } = A.UI;

  let root = null, S = null, unsubs = [];
  const $ = s => (root ? root.querySelector(s) : null);

  const mine = () => A.Store.quotes().filter(q => q.account).sort((a, b) => b.createdAt - a.createdAt);
  const orders = () => mine().filter(q => q.quoteStatus === 'Approved');

  function render() {
    return '<section class="page-head"><div class="wrap">' +
      '<p class="eyebrow">Demo customer area</p><h1 class="h1">My <em>designs &amp; orders</em></h1>' +
      '<div class="demo-banner" role="note">' + A.UI.demoTag + '<p><strong>Simulated account.</strong> There is no login: this page shows what has been saved in this browser. Orders and statuses are demonstration data, and the dashboard can change them live.</p></div>' +
      '</div></section>' +
      '<section class="pad-sm"><div class="wrap">' +
      '<div class="tabs" role="tablist" aria-label="Customer area sections" id="a-tabs"></div>' +
      '<div id="a-panel" role="tabpanel" tabindex="-1"></div></div></section>';
  }

  function tabs() {
    const defs = [['designs', 'Saved designs', A.Store.drafts().length], ['requests', 'Quote requests', mine().length], ['orders', 'Order history', orders().length]];
    $('#a-tabs').innerHTML = defs.map(([id, label, n]) =>
      '<button type="button" role="tab" class="tab" data-tab="' + id + '" aria-selected="' + (S.tab === id) + '">' + esc(label) + ' <span class="count">' + n + '</span></button>').join('');
  }

  const empty = (text, cta, href) => '<div class="empty"><p>' + text + '</p><a class="btn btn-primary" href="' + href + '">' + cta + '</a></div>';

  function designs() {
    const list = A.Store.drafts();
    if (!list.length) return empty('No saved designs yet. Save a draft in the Design Studio and it will wait here.', 'Open the Design Studio', '#/studio');
    return '<ul class="acards">' + list.map(d => {
      const p = A.product(d.productId) || { name: 'Garment' };
      const col = A.COLORS[d.colorId];
      return '<li class="acard"><img src="' + esc(d.preview || A.gimg(d.productId, 'front', d.colorId, { bg: '#ece8e0' })) + '" alt="Preview of ' + esc(d.name) + '">' +
        '<div class="acard-main"><h3>' + esc(d.name) + '</h3><p class="muted">' + esc(p.name) + (col ? ' · ' + esc(col.name) : '') + ' · saved ' + ago(d.updatedAt) + '</p>' +
        '<div class="btn-row"><a class="btn btn-primary btn-sm" href="#/studio?draft=' + esc(d.id) + '">Continue editing</a>' +
        '<button type="button" class="btn btn-ghost btn-sm danger" data-del-draft="' + esc(d.id) + '" aria-label="Delete draft ' + esc(d.name) + '">' + icon('trash', 16) + ' Delete</button></div></div></li>';
    }).join('') + '</ul>';
  }

  function qCard(q, withTracker) {
    const it = q.item || {}, p = A.product(it.productId) || { name: 'Garment' }, c = A.COLORS[it.colorId];
    const approved = q.quoteStatus === 'Approved';
    return '<li class="acard"><img src="' + esc(A.UI.quoteThumb(q)) + '" alt="Design preview for ' + esc(q.id) + '">' +
      '<div class="acard-main"><div class="acard-top"><code>' + esc(q.id) + '</code>' + (q.sample ? '<span class="chip">Sample record</span>' : '<span class="chip ok">You submitted</span>') + '</div>' +
      '<h3>' + esc((it.total || 0) + ' × ' + p.name) + (c ? ' <span class="muted small">' + esc(c.name) + '</span>' : '') + '</h3>' +
      '<p class="muted">' + esc((q.type === 'bulk' ? 'Bulk order' : 'Studio design') + ' · ' + fmtDate(q.createdAt)) + '</p>' +
      '<div class="pills">' + pill(q.quoteStatus) + (approved ? pill(q.productionStage) : '') + '</div>' +
      (withTracker ? A.UI.tracker(q.productionStage, approved) : '') +
      '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-view="' + esc(q.id) + '">View details</button></div></div></li>';
  }

  function requests() {
    const list = mine();
    if (!list.length) return empty('No quote requests yet. Design a garment, then choose Request a Quote.', 'Start designing', '#/studio');
    return '<ul class="acards">' + list.map(q => qCard(q, false)).join('') + '</ul>';
  }
  function ordersView() {
    const list = orders();
    if (!list.length) return empty('Orders appear here once a quote is approved. In the demo, approve one from the business dashboard.', 'Open business dashboard', '#/dashboard');
    return '<p class="muted">Simulated order history — progress is controlled from the demo business dashboard.</p><ul class="acards">' + list.map(q => qCard(q, true)).join('') + '</ul>';
  }

  function paint() {
    if (!root) return;
    tabs();
    $('#a-panel').innerHTML = S.tab === 'designs' ? designs() : S.tab === 'orders' ? ordersView() : requests();
  }

  function viewQuote(id) {
    const q = A.Store.quote(id); if (!q) { toast('That demo request was not found', 'error'); return; }
    const it = q.item || {}, p = A.product(it.productId) || { name: 'Garment' }, c = A.COLORS[it.colorId] || { name: '—', hex: '#ccc' };
    const views = Object.keys(q.previews || {});
    const approved = q.quoteStatus === 'Approved';
    const dlg = A.UI.dialog(
      '<button class="dlg-x" data-dlg-close aria-label="Close">' + icon('close') + '</button>' +
      '<p class="eyebrow">Demo request</p><h2 class="dlg-title">' + esc(q.id) + '</h2>' +
      '<div class="pills">' + pill(q.quoteStatus) + (approved ? pill(q.productionStage) : '') + '</div>' +
      (views.length ? '<div class="q-thumbs">' + views.map(v => '<figure><img src="' + esc(q.previews[v]) + '" alt="' + esc(A.VIEW_LABELS[v] + ' preview') + '"><figcaption>' + esc(A.VIEW_LABELS[v] || v) + '</figcaption></figure>').join('') + '</div>' : '') +
      '<dl class="q-lines"><div><dt>Garment</dt><dd>' + esc(p.name) + '</dd></div><div><dt>Colour</dt><dd>' + A.UI.swatch(c) + ' ' + esc(c.name) + '</dd></div>' +
      '<div><dt>Method</dt><dd>' + esc((A.METHODS[it.method] || {}).name || '—') + '</dd></div><div><dt>Sizes</dt><dd>' + esc(A.Quote.sizeText(it.sizes)) + '</dd></div>' +
      '<div><dt>Total quantity</dt><dd><strong>' + (it.total || 0) + '</strong></dd></div><div><dt>Price</dt><dd>' + esc(A.UI.priceLabel(p, it.total)) + '</dd></div></dl>' +
      '<h3 class="h5">Progress</h3>' + A.UI.tracker(q.productionStage, approved) +
      (approved ? '' : '<p class="fine">Production starts after the business approves the quote.</p>') +
      '<h3 class="h5">History</h3><ul class="timeline">' + (q.history || []).slice().reverse().map(h => '<li><span>' + esc(A.UI.fmtDateTime(h.ts)) + '</span>' + esc(h.text) + '</li>').join('') + '</ul>' +
      '<div class="dlg-actions"><a class="btn btn-ghost" href="#/dashboard?open=' + encodeURIComponent(q.id) + '" data-dlg-close>See in business dashboard</a><button class="btn btn-primary" data-dlg-close>Close</button></div>',
      { cls: 'dlg-md', label: 'Request ' + q.id });
    dlg.el.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => dlg.close()));
  }

  function mount(el, r) {
    root = el;
    const q = r.q || {};
    S = { tab: ['designs', 'requests', 'orders'].includes(q.tab) ? q.tab : (A.Store.drafts().length && !q.ref ? 'designs' : 'requests') };
    if (!q.tab && !A.Store.drafts().length) S.tab = 'requests';
    paint();
    root.addEventListener('click', async e => {
      let b;
      if ((b = e.target.closest('[data-tab]'))) { S.tab = b.dataset.tab; paint(); return; }
      if ((b = e.target.closest('[data-view]'))) { viewQuote(b.dataset.view); return; }
      if ((b = e.target.closest('[data-del-draft]'))) {
        const ok = await A.UI.confirmDialog('Delete this draft?', 'The saved design will be removed from this browser.', 'Delete');
        if (ok) { A.Store.deleteDraft(b.dataset.delDraft); toast('Draft deleted', 'info'); paint(); }
      }
    });
    unsubs = [A.bus.on('quotes', paint), A.bus.on('drafts', paint)];
    const onStorage = () => paint();
    window.addEventListener('storage', onStorage); unsubs.push(() => window.removeEventListener('storage', onStorage));
    if (q.ref) viewQuote(q.ref);
  }

  A.pages.account = { title: 'Demo customer area', render, mount, unmount() { unsubs.forEach(f => f()); unsubs = []; root = null; S = null; } };
})();
