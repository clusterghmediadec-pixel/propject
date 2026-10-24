/* ==========================================================================
   dashboard.js — DEMO business dashboard.
   Shows quote requests saved in this browser (sample records + anything
   submitted through the site), lets the presenter change the quote status and
   production stage, and reflects those changes in the customer area.
   Nothing here is a real customer record or a live integration.
   Route: #/dashboard  (?open=<demo ref>  &tab=requests|production|enquiries)
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.pages = A.pages || {};
  const { esc, icon, toast, pill, ago, fmtDateTime } = A.UI;

  let root = null, S = null, unsubs = [];
  const $ = s => (root ? root.querySelector(s) : null);
  const desktop = () => window.matchMedia('(min-width: 1000px)').matches;
  const quotes = () => A.Store.quotes().sort((a, b) => b.createdAt - a.createdAt);

  /* ------------------------------------------------------------------ shell */
  function render() {
    return '<section class="page-head"><div class="wrap">' +
      '<p class="eyebrow">Business view</p><h1 class="h1">Demo <em>dashboard</em></h1>' +
      '<div class="demo-banner" role="note">' + A.UI.demoTag + '<p><strong>Demonstration only.</strong> These are not real customer records. Sample requests are fictional; anything you submit on this site appears here from this browser only. In the finished website the business would see real requests like these.</p></div>' +
      '</div></section>' +
      '<section class="pad-sm"><div class="wrap">' +
      '<div class="stats" id="d-stats"></div>' +
      '<div class="tabs" role="tablist" aria-label="Dashboard sections" id="d-tabs"></div>' +
      '<div id="d-body"></div></div></section>';
  }

  function stats() {
    const q = quotes();
    const pending = q.filter(x => x.quoteStatus === 'New' || x.quoteStatus === 'Under Review').length;
    const prepared = q.filter(x => x.quoteStatus === 'Quote Prepared').length;
    const inProd = q.filter(x => x.quoteStatus === 'Approved' && ['In Production', 'Quality Check'].includes(x.productionStage)).length;
    const pieces = q.reduce((n, x) => n + ((x.item || {}).total || 0), 0);
    const card = (n, l, hint, tone) => '<div class="stat ' + (tone || '') + '"><strong>' + n + '</strong><span>' + esc(l) + '</span><small>' + esc(hint) + '</small></div>';
    $('#d-stats').innerHTML =
      card(q.length, 'Demo requests', 'all time, this browser') +
      card(pending, 'Pending quotes', 'New or under review', pending ? 'hot' : '') +
      card(prepared, 'Awaiting customer', 'quote prepared') +
      card(inProd, 'In production', 'production or quality check') +
      card(pieces.toLocaleString('en-GB'), 'Pieces requested', 'across all requests');
  }

  function tabs() {
    const enq = A.Store.enquiries();
    const defs = [['requests', 'Quote requests', quotes().length], ['production', 'Production board', quotes().filter(q => q.quoteStatus === 'Approved').length], ['enquiries', 'Contact enquiries', enq.length]];
    $('#d-tabs').innerHTML = defs.map(([id, l, n]) => '<button type="button" role="tab" class="tab" data-tab="' + id + '" aria-selected="' + (S.tab === id) + '">' + esc(l) + ' <span class="count">' + n + '</span></button>').join('');
  }

  /* --------------------------------------------------------------- requests */
  function filtered() {
    const term = S.search.trim().toLowerCase();
    return quotes().filter(q =>
      (S.status === 'All' || q.quoteStatus === S.status) &&
      (S.type === 'all' || q.type === S.type) &&
      (!term || [q.id, (q.customer || {}).name, q.orgLabel, (A.product((q.item || {}).productId) || {}).name].join(' ').toLowerCase().includes(term)));
  }

  function row(q) {
    const it = q.item || {}, p = A.product(it.productId) || { name: 'Garment' };
    return '<li><button type="button" class="req" data-open="' + esc(q.id) + '" aria-pressed="' + (S.sel === q.id) + '">' +
      '<img src="' + esc(A.UI.quoteThumb(q)) + '" alt="">' +
      '<span class="req-main"><span class="req-top"><code>' + esc(q.id) + '</code>' + (q.sample ? '' : '<span class="chip ok">New from site</span>') + '</span>' +
      '<strong>' + esc((q.customer || {}).name || 'Unknown') + '</strong>' +
      '<span class="muted">' + esc((it.total || 0) + ' × ' + p.name + ' · ' + (q.type === 'bulk' ? 'Bulk' : 'Studio') + ' · ' + ago(q.createdAt)) + '</span>' +
      '<span class="pills">' + pill(q.quoteStatus) + (q.quoteStatus === 'Approved' ? pill(q.productionStage) : '') + '</span></span></button></li>';
  }

  function requestsView() {
    const all = quotes();
    const list = filtered();
    if (!S.sel && desktop() && list.length) S.sel = list[0].id;
    if (S.sel && !all.some(q => q.id === S.sel)) S.sel = null;
    const chips = ['All'].concat(A.QUOTE_STATUSES).map(s => {
      const n = s === 'All' ? all.length : all.filter(q => q.quoteStatus === s).length;
      return '<button type="button" class="fchip sm" data-status="' + esc(s) + '" aria-pressed="' + (S.status === s) + '">' + esc(s) + ' <span class="count">' + n + '</span></button>';
    }).join('');
    return '<div class="dash' + (S.sel && !desktop() ? ' has-detail' : '') + '" id="dash">' +
      '<div class="dash-list"><div class="dash-tools">' +
      '<label class="field"><span class="sr-only">Search requests</span><input type="search" id="d-search" placeholder="Search by name, reference or garment" value="' + esc(S.search) + '"></label>' +
      '<div class="filters" role="group" aria-label="Filter by quote status">' + chips + '</div>' +
      '<div class="seg tight" role="group" aria-label="Filter by type">' + [['all', 'All'], ['studio', 'Studio'], ['bulk', 'Bulk']].map(([v, l]) => '<button type="button" class="segb" data-type="' + v + '" aria-pressed="' + (S.type === v) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div id="req-wrap">' + listHTML(list) + '</div>' +
      '</div><div class="dash-detail" id="d-detail" tabindex="-1"></div></div>';
  }
  function listHTML(list) {
    return list.length ? '<ul class="req-list" id="req-list">' + list.map(row).join('') + '</ul>'
      : '<div class="empty"><p>No requests match these filters.</p><button type="button" class="btn btn-ghost btn-sm" data-clear-filters>Clear filters</button></div>';
  }

  function detail(id) {
    const host = $('#d-detail'); if (!host) return;
    const q = id && A.Store.quote(id);
    if (!q) { host.innerHTML = '<div class="empty big"><p>Select a request to see the customer, design preview and status controls.</p></div>'; return; }
    const it = q.item || {}, p = A.product(it.productId) || { name: 'Garment' }, c = A.COLORS[it.colorId] || { name: '—', hex: '#ccc' };
    const cu = q.customer || {}, b = q.bulk;
    const views = Object.keys(q.previews || {});
    const approved = q.quoteStatus === 'Approved';
    host.innerHTML =
      '<div class="dd">' +
      '<button type="button" class="btn btn-ghost btn-sm dd-back" data-back>' + icon('arrow', 16).replace('<svg ', '<svg style="transform:scaleX(-1)" ') + ' All requests</button>' +
      '<div class="dd-head"><div><p class="eyebrow">' + (q.type === 'bulk' ? 'Bulk quotation request' : 'Studio design request') + '</p><h2 class="h3"><code>' + esc(q.id) + '</code></h2>' +
      '<p class="muted">' + (q.sample ? 'Sample record (fictional)' : 'Submitted from this browser') + ' · ' + esc(fmtDateTime(q.createdAt)) + '</p></div>' + A.UI.demoTag + '</div>' +

      '<div class="dd-previews">' + (views.length ? views.map(v => '<button type="button" class="dd-prev" data-zoom="' + v + '" aria-label="Enlarge ' + esc(A.VIEW_LABELS[v] || v) + ' preview"><img src="' + esc(q.previews[v]) + '" alt="' + esc(p.name + ' ' + v + ' design preview') + '"><span>' + esc(A.VIEW_LABELS[v] || v) + '</span></button>').join('') :
        '<p class="fine">No design preview was stored for this request' + (q.previewsDropped ? ' (browser storage was full)' : '') + '.</p>') + '</div>' +

      '<section class="dd-sec"><h3 class="h5">Quote status</h3><div class="statusbtns" role="group" aria-label="Quote status">' +
      A.QUOTE_STATUSES.map(s => '<button type="button" class="stbtn ' + A.UI.statusClass(s) + '" data-qs="' + esc(s) + '" aria-pressed="' + (q.quoteStatus === s) + '">' + esc(s) + '</button>').join('') + '</div></section>' +

      '<section class="dd-sec"><h3 class="h5">Production stage</h3>' + A.UI.tracker(q.productionStage, approved) +
      '<div class="statusbtns" role="group" aria-label="Production stage">' + A.PRODUCTION_STAGES.map(s => '<button type="button" class="stbtn ' + A.UI.statusClass(s) + '" data-ps="' + esc(s) + '" aria-pressed="' + (approved && q.productionStage === s) + '"' + (approved ? '' : ' disabled') + '>' + esc(s) + '</button>').join('') + '</div>' +
      (approved ? '' : '<p class="fine">Production stages unlock once the quote is Approved.</p>') + '</section>' +

      '<div class="dd-cols"><section class="dd-sec"><h3 class="h5">Customer</h3><dl class="q-lines">' +
      '<div><dt>Name</dt><dd>' + esc(cu.name || '—') + '</dd></div><div><dt>Phone</dt><dd>' + esc(cu.phone || '—') + '</dd></div><div><dt>Email</dt><dd>' + esc(cu.email || '—') + '</dd></div>' +
      '<div><dt>Location</dt><dd>' + esc(cu.location || '—') + '</dd></div><div><dt>Prefers</dt><dd>' + esc(cu.contact || '—') + '</dd></div>' + (q.orgLabel ? '<div><dt>Group</dt><dd>' + esc(q.orgLabel) + '</dd></div>' : '') + '</dl></section>' +
      '<section class="dd-sec"><h3 class="h5">Order</h3><dl class="q-lines">' +
      '<div><dt>Garment</dt><dd>' + esc(p.name) + '</dd></div><div><dt>Colour</dt><dd>' + A.UI.swatch(c) + ' ' + esc(c.name) + '</dd></div>' +
      '<div><dt>Method</dt><dd>' + esc((A.METHODS[it.method] || {}).name || '—') + '</dd></div><div><dt>Total quantity</dt><dd><strong>' + (it.total || 0) + '</strong></dd></div>' +
      '<div><dt>Price</dt><dd>' + esc(A.UI.priceLabel(p, it.total)) + '</dd></div>' +
      (b ? '<div><dt>Organisation</dt><dd>' + esc(b.orgType || '—') + '</dd></div><div><dt>' + esc(b.delivery || 'Collection') + '</dt><dd>' + esc(b.deliveryNote || '—') + '</dd></div>' + (b.deadline ? '<div><dt>Needed by</dt><dd>' + esc(b.deadline) + '</dd></div>' : '') + '<div><dt>Artwork file</dt><dd>' + esc(b.artwork || 'None') + '</dd></div>' + (b.placements && b.placements.length ? '<div><dt>Placement</dt><dd>' + esc(b.placements.join(', ')) + '</dd></div>' : '') : '') +
      '</dl></section></div>' +

      '<section class="dd-sec"><h3 class="h5">Size breakdown</h3><table class="sizes"><thead><tr>' + Object.keys(it.sizes || {}).map(k => '<th scope="col">' + esc(k) + '</th>').join('') + '<th scope="col">Total</th></tr></thead><tbody><tr>' +
      Object.values(it.sizes || {}).map(v => '<td>' + v + '</td>').join('') + '<td><strong>' + (it.total || 0) + '</strong></td></tr></tbody></table></section>' +

      '<section class="dd-sec"><h3 class="h5">Customer notes</h3><p class="note-box">' + (q.notes ? esc(q.notes).replace(/\n/g, '<br>') : '<span class="muted">No notes.</span>') + '</p></section>' +
      '<section class="dd-sec"><h3 class="h5">Activity</h3><ul class="timeline">' + (q.history || []).slice().reverse().map(h => '<li><span>' + esc(fmtDateTime(h.ts)) + '</span>' + esc(h.text) + '</li>').join('') + '</ul></section>' +
      '<div class="btn-row"><button type="button" class="btn btn-ghost" data-copy="' + esc(q.id) + '">' + icon('copy', 16) + ' Copy summary</button>' +
      '<a class="btn btn-ghost" href="#/account?ref=' + encodeURIComponent(q.id) + '">View as customer</a>' +
      (q.sample ? '' : '<button type="button" class="btn btn-ghost danger" data-delete="' + esc(q.id) + '">' + icon('trash', 16) + ' Delete demo record</button>') + '</div>' +
      '<p class="fine">Changing a status here updates the customer area in this browser only. No message is sent to anyone.</p></div>';
  }

  /* ------------------------------------------------------------- production */
  function productionView() {
    const list = quotes().filter(q => q.quoteStatus === 'Approved');
    if (!list.length) return '<div class="empty"><p>No approved orders yet. Approve a quote in the Quote requests tab to see it move through production.</p><button class="btn btn-primary" data-tab="requests">Go to quote requests</button></div>';
    return '<div class="board">' + A.PRODUCTION_STAGES.map(stage => {
      const col = list.filter(q => q.productionStage === stage);
      return '<section class="board-col"><h3>' + esc(stage) + ' <span class="count">' + col.length + '</span></h3>' +
        (col.length ? col.map(q => {
          const it = q.item || {}, p = A.product(it.productId) || { name: 'Garment' };
          const i = A.PRODUCTION_STAGES.indexOf(stage);
          return '<article class="bcard"><button type="button" class="bcard-open" data-open="' + esc(q.id) + '" data-goto="requests"><img src="' + esc(A.UI.quoteThumb(q)) + '" alt=""><span><code>' + esc(q.id) + '</code><strong>' + esc((q.customer || {}).name || '') + '</strong><small>' + esc((it.total || 0) + ' × ' + p.name) + '</small></span></button>' +
            '<div class="bcard-actions">' + (i > 0 ? '<button type="button" class="btn btn-ghost btn-sm" data-move="-1" data-id="' + esc(q.id) + '" aria-label="Move ' + esc(q.id) + ' back one stage">←</button>' : '') +
            (i < A.PRODUCTION_STAGES.length - 1 ? '<button type="button" class="btn btn-primary btn-sm" data-move="1" data-id="' + esc(q.id) + '">Next stage →</button>' : '<span class="chip ok">Done</span>') + '</div></article>';
        }).join('') : '<p class="fine board-empty">Nothing here</p>') + '</section>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------- enquiries */
  function enquiriesView() {
    const list = A.Store.enquiries();
    if (!list.length) return '<div class="empty"><p>No contact enquiries yet. Send one from the Contact page and it will appear here.</p><a class="btn btn-primary" href="#/contact">Open contact page</a></div>';
    return '<ul class="enq-list">' + list.map(e =>
      '<li class="enq"><div class="enq-top"><strong>' + esc(e.name) + '</strong><code>' + esc(e.id) + '</code>' + (e.sample ? '<span class="chip">Sample</span>' : '<span class="chip ok">New from site</span>') + pill(e.status) + '</div>' +
      '<p class="muted">' + esc(e.topic) + ' · ' + esc(e.phone) + (e.email ? ' · ' + esc(e.email) : '') + ' · ' + ago(e.createdAt) + '</p><p>' + esc(e.message) + '</p>' +
      '<div class="statusbtns" role="group" aria-label="Enquiry status">' + ['New', 'Replied', 'Closed'].map(s => '<button type="button" class="stbtn ' + A.UI.statusClass(s) + '" data-es="' + s + '" data-id="' + esc(e.id) + '" aria-pressed="' + (e.status === s) + '">' + s + '</button>').join('') + '</div></li>').join('') + '</ul>';
  }

  /* ---------------------------------------------------------------- painting */
  function paint(keepScroll) {
    if (!root) return;
    const y = window.scrollY;
    stats(); tabs();
    const body = $('#d-body');
    body.innerHTML = S.tab === 'production' ? productionView() : S.tab === 'enquiries' ? enquiriesView() : requestsView();
    if (S.tab === 'requests') detail(S.sel);
    if (keepScroll) window.scrollTo(0, y);
  }
  /* repaint the list + detail but keep the search box focused while typing */
  function paintList() {
    const w = $('#req-wrap'); if (w) w.innerHTML = listHTML(filtered());
  }

  function setQuoteStatus(id, s) {
    const q = A.Store.quote(id); if (!q || q.quoteStatus === s) return;
    const patch = { quoteStatus: s };
    if (s !== 'Approved') patch.productionStage = 'Awaiting Confirmation';
    A.Store.updateQuote(id, patch, 'Status set to ' + s);
    toast('Quote status: ' + s, 'success'); paint(true);
  }
  function setStage(id, s) {
    const q = A.Store.quote(id); if (!q || q.productionStage === s) return;
    A.Store.updateQuote(id, { productionStage: s }, 'Production stage: ' + s);
    toast('Production stage: ' + s, 'success'); paint(true);
  }

  function summaryText(q) {
    const it = q.item || {}, p = A.product(it.productId) || { name: 'Garment' }, c = A.COLORS[it.colorId] || { name: '' }, cu = q.customer || {};
    return ['DEMO REQUEST ' + q.id, 'Customer: ' + cu.name + ' (' + cu.phone + ')', 'Location: ' + cu.location,
      'Garment: ' + it.total + ' × ' + p.name + ', ' + c.name, 'Method: ' + ((A.METHODS[it.method] || {}).name || '—'), 'Sizes: ' + A.Quote.sizeText(it.sizes),
      'Status: ' + q.quoteStatus + ' / ' + q.productionStage, q.notes ? 'Notes: ' + q.notes : ''].filter(Boolean).join('\n');
  }

  function mount(el, r) {
    root = el;
    const q = r.q || {};
    S = { tab: ['requests', 'production', 'enquiries'].includes(q.tab) ? q.tab : 'requests', sel: q.open || null, status: 'All', type: 'all', search: '' };
    paint();
    if (S.sel) setTimeout(() => { const d = $('#d-detail'); if (d) d.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);

    root.addEventListener('click', async e => {
      let b;
      if ((b = e.target.closest('[data-tab]'))) { S.tab = b.dataset.tab; paint(); return; }
      if ((b = e.target.closest('[data-open]'))) {
        S.sel = b.dataset.open;
        if (b.dataset.goto) S.tab = b.dataset.goto;
        paint(); const d = $('#d-detail'); if (d && !desktop()) { d.focus({ preventScroll: true }); window.scrollTo({ top: d.getBoundingClientRect().top + scrollY - 80 }); } return;
      }
      if (e.target.closest('[data-back]')) { S.sel = null; paint(); return; }
      if ((b = e.target.closest('[data-status]'))) { S.status = b.dataset.status; paint(true); return; }
      if ((b = e.target.closest('[data-type]'))) { S.type = b.dataset.type; paint(true); return; }
      if (e.target.closest('[data-clear-filters]')) { S.status = 'All'; S.type = 'all'; S.search = ''; paint(true); return; }
      if ((b = e.target.closest('[data-qs]'))) { setQuoteStatus(S.sel, b.dataset.qs); return; }
      if ((b = e.target.closest('[data-ps]'))) { setStage(S.sel, b.dataset.ps); return; }
      if ((b = e.target.closest('[data-move]'))) {
        const qq = A.Store.quote(b.dataset.id); if (!qq) return;
        const i = A.PRODUCTION_STAGES.indexOf(qq.productionStage) + parseInt(b.dataset.move, 10);
        if (i >= 0 && i < A.PRODUCTION_STAGES.length) setStage(qq.id, A.PRODUCTION_STAGES[i]); return;
      }
      if ((b = e.target.closest('[data-es]'))) { A.Store.updateEnquiry(b.dataset.id, { status: b.dataset.es }); toast('Enquiry marked ' + b.dataset.es, 'success'); paint(true); return; }
      if ((b = e.target.closest('[data-zoom]'))) { const qq = A.Store.quote(S.sel); if (qq) A.UI.lightbox(qq.previews[b.dataset.zoom], (A.VIEW_LABELS[b.dataset.zoom] || '') + ' preview · ' + qq.id); return; }
      if ((b = e.target.closest('[data-copy]'))) {
        const qq = A.Store.quote(b.dataset.copy);
        try { await navigator.clipboard.writeText(summaryText(qq)); toast('Summary copied', 'success'); } catch (x) { toast('Copy is blocked in this browser — select the text manually', 'error'); }
        return;
      }
      if ((b = e.target.closest('[data-delete]'))) {
        const ok = await A.UI.confirmDialog('Delete this demo record?', 'It will also disappear from the demo customer area.', 'Delete');
        if (ok) {
          const list = A.Store.quotes().filter(x => x.id !== b.dataset.delete); A.Store.saveQuotes(list); A.bus.emit('quotes', list);
          S.sel = null; toast('Demo record deleted', 'info'); paint();
        }
      }
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'd-search') { S.search = e.target.value; paintList(); }
    });

    unsubs = [A.bus.on('quotes', () => paint(true)), A.bus.on('enquiries', () => { if (S) paint(true); })];
    const onStorage = () => paint(true);
    window.addEventListener('storage', onStorage); unsubs.push(() => window.removeEventListener('storage', onStorage));
  }

  A.pages.dashboard = { title: 'Demo business dashboard', render, mount, unmount() { unsubs.forEach(f => f()); unsubs = []; root = null; S = null; } };
})();
