/* ==========================================================================
   pages-public.js — Home, Shop, Product, Our Work, About, Contact.
   All copy that describes the business is placeholder / proposed content.
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.pages = A.pages || {};
  const { esc, icon, toast } = A.UI;
  const G = A.Garments;

  /* memoised garment image URIs */
  const memo = {};
  function gimg(pid, view, colorId, opts) {
    opts = opts || {};
    const key = [pid, view, colorId, opts.bg || '', opts.overlay ? JSON.stringify(opts.overlay) : ''].join('|');
    return memo[key] || (memo[key] = G.img(pid, view, A.COLORS[colorId].hex, opts));
  }
  A.gimg = gimg;

  const studioLink = (pid, cid, extra) => '#/studio?product=' + pid + (cid ? '&color=' + cid : '') + (extra || '');

  /* ---------- reusable fragments ---------- */
  function swatchButtons(p, active, label) {
    return '<div class="swatches" role="group" aria-label="' + esc(label || 'Colour options') + '">' +
      p.colors.map(id => {
        const c = A.COLORS[id];
        return '<button type="button" class="swb" data-color="' + id + '" aria-label="' + esc(c.name) + '" aria-pressed="' + (id === active) + '" title="' + esc(c.name) + '" style="--c:' + c.hex + '"></button>';
      }).join('') + '</div>';
  }

  function productCard(p, cid) {
    cid = cid || p.colors[0];
    return '<article class="pcard reveal" data-product="' + p.id + '">' +
      '<a class="pcard-img" href="#/product/' + p.id + '" aria-label="View ' + esc(p.name) + ' details"><img data-pimg src="' + gimg(p.id, 'front', cid) + '" alt="' + esc(p.name + ' in ' + A.COLORS[cid].name) + '" loading="lazy" width="600" height="700"></a>' +
      '<div class="pcard-body">' +
      '<div class="pcard-top"><h3>' + esc(p.name) + '</h3><span class="price">' + esc(A.UI.priceLabel(p)) + '</span></div>' +
      '<p class="muted">' + esc(p.tagline) + '</p>' +
      swatchButtons(p, cid, 'Colour options for ' + p.name) +
      '<p class="color-name" data-cname aria-live="polite">' + esc(A.COLORS[cid].name) + '</p>' +
      '<div class="pcard-actions"><a class="btn btn-primary btn-sm" data-customize href="' + studioLink(p.id, cid) + '">Customize</a><a class="btn btn-ghost btn-sm" href="#/product/' + p.id + '">Details</a></div>' +
      '</div></article>';
  }

  function bindProductCards(root) {
    root.querySelectorAll('.pcard').forEach(card => {
      const p = A.product(card.dataset.product);
      card.addEventListener('click', e => {
        const b = e.target.closest('.swb'); if (!b) return;
        const id = b.dataset.color;
        card.querySelectorAll('.swb').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        const img = card.querySelector('[data-pimg]');
        img.src = gimg(p.id, 'front', id); img.alt = p.name + ' in ' + A.COLORS[id].name;
        card.querySelector('[data-cname]').textContent = A.COLORS[id].name;
        card.querySelector('[data-customize]').href = studioLink(p.id, id);
      });
    });
  }

  function workTile(w) {
    return '<button type="button" class="wtile reveal" data-work="' + w.id + '" aria-label="Open ' + esc(w.title) + ' (reference image)">' +
      '<img loading="lazy" src="' + G.photo(w.photo) + '" alt="' + esc('Reference image: ' + w.title) + '" width="400" height="500">' +
      '<span class="wtag">Reference image</span>' +
      '<span class="wcap"><strong>' + esc(w.title) + '</strong><small>' + esc(w.cat) + '</small></span></button>';
  }

  function bindWork(root) {
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-work]'); if (!t) return;
      const w = A.WORK.find(x => x.id === t.dataset.work); if (!w) return;
      const like = w.like && A.product(w.like);
      const dlg = A.UI.dialog(
        '<button class="dlg-x" data-dlg-close aria-label="Close">' + icon('close') + '</button>' +
        '<div class="work-dlg"><img src="' + G.photo(w.photo) + '" alt="' + esc('Reference image: ' + w.title) + '">' +
        '<div><span class="chip">Reference image</span><h2 class="dlg-title">' + esc(w.title) + '</h2>' +
        '<dl class="q-lines"><div><dt>Category</dt><dd>' + esc(w.cat) + '</dd></div>' + (like ? '<div><dt>Closest blank</dt><dd>' + esc(like.name) + '</dd></div>' : '') + '</dl>' +
        '<p class="fine">A reference photo supplied for this prototype. It is not completed work by this business; real completed-work photos will replace it.</p>' +
        '<div class="dlg-actions">' + (like ? '<a class="btn btn-primary" href="' + studioLink(like.id) + '" data-dlg-close>Design something similar</a>' : '<a class="btn btn-primary" href="#/contact" data-dlg-close>Ask about something similar</a>') + '<button class="btn btn-ghost" data-dlg-close>Close</button></div></div></div>',
        { cls: 'dlg-lg', label: w.title }
      );
    });
  }

  function sectionHead(eyebrow, title, sub, link) {
    return '<div class="sec-head reveal"><div><p class="eyebrow">' + esc(eyebrow) + '</p><h2 class="h2">' + title + '</h2>' + (sub ? '<p class="lede">' + esc(sub) + '</p>' : '') + '</div>' + (link || '') + '</div>';
  }

  /* ==================================================================== HOME */
  A.pages[''] = {
    title: '',
    render() {
      const feat = A.PRODUCTS.slice(0, 4);
      const work = A.WORK.slice(0, 6);
      return '' +
        /* hero */
        '<section class="hero"><div class="wrap hero-grid">' +
        '<div class="hero-copy"><p class="eyebrow eyebrow-light">Custom printing · Embroidery · Apparel</p>' +
        '<h1 class="display">Your Vision.<br><em>Your Design.</em><br>Your Style.</h1>' +
        '<p class="lede lede-light">Design custom garments on a live mockup, request a quote in minutes and let the studio handle the rest — from a single hoodie to a full team kit.</p>' +
        '<div class="hero-actions"><a class="btn btn-accent btn-lg" href="#/studio">Start Designing ' + icon('arrow', 20) + '</a><a class="btn btn-outline-light btn-lg" href="#/work">Explore Our Work</a></div>' +
        '<ul class="hero-points"><li>' + icon('check', 16) + ' Live garment mockups</li><li>' + icon('check', 16) + ' Quote before production</li><li>' + icon('check', 16) + ' Teams &amp; bulk orders</li></ul></div>' +
        '<div class="hero-stage"><div class="stage-card"><span class="stage-tag">Reference photo</span>' +
        '<img class="stage-photo" src="' + G.photo('hero') + '" alt="Reference flat-lay of nine black streetwear pieces with chest, sleeve and leg prints" width="736" height="981">' +
        '</div></div></div></section>' +

        /* ticker */
        '<div class="strip" aria-hidden="true"><div class="wrap strip-in"><span>Screen printing</span><span>Embroidery</span><span>Hoodies &amp; tees</span><span>Uniforms</span><span>Branded merchandise</span><span>Bulk orders</span></div></div>' +

        /* featured */
        '<section class="pad"><div class="wrap">' +
        sectionHead('Featured garments', 'Start from a <em>blank canvas</em>', 'Sample range — the real catalogue replaces this.', '<a class="link-arrow" href="#/shop">Shop all ' + icon('arrow', 18) + '</a>') +
        '<div class="grid-products">' + feat.map(p => productCard(p)).join('') + '</div></div></section>' +

        /* services */
        '<section class="pad alt"><div class="wrap">' +
        sectionHead('Services', 'Everything a garment needs, <em>done in-house</em>', 'Example services shown for the prototype — confirm the real list with the business.') +
        '<div class="grid-services">' + A.SERVICES.map(s => '<article class="svc reveal"><span class="svc-ic">' + icon(s.icon, 26) + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></article>').join('') + '</div></div></section>' +

        /* gallery */
        '<section class="pad"><div class="wrap">' +
        sectionHead('Completed work', 'A look at <em>the finish</em>', 'Clearly-labelled sample work until real photography is supplied.', '<a class="link-arrow" href="#/work">View all work ' + icon('arrow', 18) + '</a>') +
        '<div class="grid-work" id="home-work">' + work.map(workTile).join('') + '</div></div></section>' +

        /* how it works */
        '<section class="pad dark"><div class="wrap">' +
        sectionHead('How it works', 'From idea to <em>finished garment</em> in four steps') +
        '<ol class="steps">' + A.STEPS.map(s => '<li class="step reveal"><span class="step-n">' + s.n + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></li>').join('') + '</ol>' +
        '<div class="center"><a class="btn btn-accent btn-lg" href="#/studio">Start Designing ' + icon('arrow', 20) + '</a></div></div></section>' +

        /* bulk */
        '<section class="pad"><div class="wrap"><div class="callout reveal">' +
        '<div><p class="eyebrow">Bulk orders</p><h2 class="h2">Outfitting a team, school, church or event?</h2><p class="lede">Choose a garment, enter size-by-size quantities, upload your artwork and request a quotation — no payment, no commitment.</p>' +
        '<div class="hero-actions"><a class="btn btn-primary btn-lg" href="#/bulk">Build a bulk order</a><a class="btn btn-ghost btn-lg" href="#/contact">Talk to the team</a></div></div>' +
        '<div class="callout-art" aria-hidden="true"><img src="' + gimg('tee', 'front', 'royal') + '" alt=""><img src="' + gimg('hoodie', 'front', 'white') + '" alt=""><img src="' + gimg('croptee', 'front', 'red') + '" alt=""></div></div></div></section>' +

        /* trust */
        '<section class="pad alt"><div class="wrap">' +
        sectionHead('Trust & information', 'What customers can <em>expect</em>', 'Proposed customer promises and placeholders — only the business can confirm the real figures.') +
        '<div class="grid-trust">' +
        '<article class="trust reveal">' + icon('badge', 26) + '<h3>Quote first, pay later</h3><p>Proposed process: every request gets a quotation before anything is produced. This prototype takes no payments.</p></article>' +
        '<article class="trust reveal">' + icon('eye', 26) + '<h3>Artwork reviewed</h3><p>Proposed process: the team checks artwork and embroidery suitability before production begins.</p></article>' +
        '<article class="trust reveal">' + icon('wa', 26) + '<h3>Chat on WhatsApp</h3><p>A configurable WhatsApp button lets customers continue the conversation — <span data-wa-status class="chip">Not configured</span></p></article>' +
        '<article class="trust ph reveal"><span class="chip">Placeholder</span><h3>[Turnaround time]</h3><p>Typical production time to be supplied by the business.</p></article>' +
        '<article class="trust ph reveal"><span class="chip">Placeholder</span><h3>[Years in business]</h3><p>Company story and achievements to be supplied.</p></article>' +
        '<article class="trust ph reveal"><span class="chip">Placeholder</span><h3>[Customer testimonials]</h3><p>Real reviews will appear here once collected. None are invented.</p></article>' +
        '</div></div></section>';
    },
    mount(root) { bindProductCards(root); bindWork(root); }
  };

  /* ==================================================================== SHOP */
  A.pages.shop = {
    title: 'Shop & Customize',
    render() {
      return '<section class="page-head"><div class="wrap"><p class="eyebrow">Shop &amp; Customize</p><h1 class="h1">Choose your <em>garment</em></h1>' +
        '<p class="lede">Pick a blank, preview colours, then open it in the Design Studio. Sample range — products, colours and prices live in <code>js/data.js</code>.</p></div></section>' +
        '<section class="pad-sm"><div class="wrap"><div class="filters" role="group" aria-label="Filter by category">' +
        A.CATEGORIES.map((c, i) => '<button type="button" class="fchip" data-cat="' + c.id + '" aria-pressed="' + (i === 0) + '">' + esc(c.name) + '</button>').join('') +
        '</div><p class="muted" id="shop-count" aria-live="polite"></p>' +
        '<div class="grid-products" id="shop-grid">' + A.PRODUCTS.map(p => productCard(p)).join('') + '</div>' +
        '<div class="callout slim reveal"><div><h2 class="h3">Ordering for a team or business?</h2><p>Use the bulk builder for size-by-size quantities and a quotation.</p></div><a class="btn btn-primary" href="#/bulk">Bulk orders</a></div></div></section>';
    },
    mount(root) {
      bindProductCards(root);
      const count = root.querySelector('#shop-count');
      function apply(cat) {
        let n = 0;
        root.querySelectorAll('.pcard').forEach(card => {
          const p = A.product(card.dataset.product), show = cat === 'all' || p.category === cat;
          card.hidden = !show; if (show) n++;
        });
        root.querySelectorAll('.fchip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
        count.textContent = n + (n === 1 ? ' garment' : ' garments') + (cat === 'all' ? '' : ' in ' + A.CATEGORIES.find(c => c.id === cat).name);
      }
      root.querySelector('.filters').addEventListener('click', e => { const b = e.target.closest('.fchip'); if (b) apply(b.dataset.cat); });
      apply('all');
    }
  };

  /* ================================================================== PRODUCT */
  A.pages.product = {
    title: r => (A.product(r.arg) || {}).name || 'Product',
    render(r) {
      const p = A.product(r.arg);
      if (!p) return '<section class="wrap pad center"><h1 class="h1">Garment not found</h1><p>That product is not in the sample range.</p><a class="btn btn-primary" href="#/shop">Back to shop</a></section>';
      const cid = (r.q.color && p.colors.includes(r.q.color)) ? r.q.color : p.colors[0];
      return '<section class="pad-sm"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a> / <span>' + esc(p.name) + '</span></nav>' +
        '<div class="pd" data-product="' + p.id + '">' +
        '<div class="pd-gallery"><div class="pd-main"><img id="pd-main" src="' + gimg(p.id, 'front', cid, { bg: '#ece8e0' }) + '" alt="' + esc(p.name + ' front view') + '"></div>' +
        '<div class="pd-thumbs" role="tablist" aria-label="Garment views">' + p.views.map((v, i) => '<button type="button" role="tab" class="pd-thumb" data-view="' + v + '" aria-selected="' + (i === 0) + '" aria-label="' + A.VIEW_LABELS[v] + ' view"><img data-tview="' + v + '" src="' + gimg(p.id, v, cid, { bg: '#ece8e0' }) + '" alt=""><span>' + A.VIEW_LABELS[v] + '</span></button>').join('') + '</div></div>' +
        '<div class="pd-info"><p class="eyebrow">' + esc(A.CATEGORIES.find(c => c.id === p.category).name) + '</p><h1 class="h1">' + esc(p.name) + '</h1>' +
        '<p class="price big">' + esc(A.UI.priceLabel(p)) + '</p><p class="lede">' + esc(p.desc) + '</p>' +
        '<h2 class="h4">Colour <span class="muted" id="pd-cname">' + esc(A.COLORS[cid].name) + '</span></h2>' + swatchButtons(p, cid, 'Colour options') +
        '<h2 class="h4">Sizes</h2><div class="size-chips">' + p.sizes.map(s => '<span>' + esc(s) + '</span>').join('') + '</div>' +
        '<h2 class="h4">Customization options</h2><ul class="method-list">' + p.methods.map(m => '<li><strong>' + esc(A.METHODS[m].name) + '</strong><span>' + esc(A.METHODS[m].desc) + '</span></li>').join('') + '</ul>' +
        '<p class="fine">Design areas: ' + p.views.map(v => esc(G.areaLabel(p.id, v))).join(' · ') + '.</p>' +
        '<div class="pd-actions"><a class="btn btn-primary btn-lg" id="pd-start" href="' + studioLink(p.id, cid) + '">Start Designing</a><a class="btn btn-ghost btn-lg" id="pd-bulk" href="#/bulk?product=' + p.id + '&color=' + cid + '">Order in bulk</a></div>' +
        '</div></div></div></section>' +
        '<section class="pad alt"><div class="wrap">' + sectionHead('More to explore', 'Other <em>garments</em>') + '<div class="grid-products">' + A.PRODUCTS.filter(x => x.id !== p.id).slice(0, 4).map(x => productCard(x)).join('') + '</div></div></section>';
    },
    mount(root, r) {
      bindProductCards(root);
      const p = A.product(r.arg); if (!p) return;
      const pd = root.querySelector('.pd');
      let cid = (r.q.color && p.colors.includes(r.q.color)) ? r.q.color : p.colors[0], view = 'front';
      const main = root.querySelector('#pd-main');
      function paint() {
        main.src = gimg(p.id, view, cid, { bg: '#ece8e0' }); main.alt = p.name + ' ' + A.VIEW_LABELS[view].toLowerCase() + ' view in ' + A.COLORS[cid].name;
        pd.querySelectorAll('[data-tview]').forEach(i => { i.src = gimg(p.id, i.dataset.tview, cid, { bg: '#ece8e0' }); });
        pd.querySelectorAll('.pd-thumb').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === view)));
        pd.querySelectorAll('.pd-info .swb').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === cid)));
        root.querySelector('#pd-cname').textContent = A.COLORS[cid].name;
        root.querySelector('#pd-start').href = studioLink(p.id, cid);
        root.querySelector('#pd-bulk').href = '#/bulk?product=' + p.id + '&color=' + cid;
      }
      pd.addEventListener('click', e => {
        const sw = e.target.closest('.pd-info .swb'); if (sw) { cid = sw.dataset.color; paint(); return; }
        const th = e.target.closest('.pd-thumb'); if (th) { view = th.dataset.view; paint(); }
      });
    }
  };

  /* ===================================================================== WORK */
  A.pages.work = {
    title: 'Our Work',
    render() {
      return '<section class="page-head"><div class="wrap"><p class="eyebrow">Our Work</p><h1 class="h1">Finished pieces, <em>up close</em></h1>' +
        '<p class="lede">A portfolio layout ready for real photography.</p>' +
        '<div class="notice">' + icon('info', 18) + '<p><strong>Reference images.</strong> These photos were supplied for the prototype and are not completed jobs by this business. Replace them with real work photos in <code>js/data.js</code>.</p></div></div></section>' +
        '<section class="pad-sm"><div class="wrap"><div class="filters" role="group" aria-label="Filter work by category">' +
        A.WORK_CATEGORIES.map((c, i) => '<button type="button" class="fchip" data-wcat="' + esc(c) + '" aria-pressed="' + (i === 0) + '">' + esc(c) + '</button>').join('') + '</div>' +
        '<p class="muted" id="work-count" aria-live="polite"></p>' +
        '<div class="grid-work" id="work-grid">' + A.WORK.map(workTile).join('') + '</div>' +
        '<div class="empty" id="work-empty" hidden><p>No reference images in this category yet.</p></div>' +
        '<div class="callout slim reveal"><div><h2 class="h3">Want something like this?</h2><p>Open any piece, then start a similar design in the studio.</p></div><a class="btn btn-primary" href="#/studio">Start Designing</a></div></div></section>';
    },
    mount(root) {
      bindWork(root);
      const count = root.querySelector('#work-count'), empty = root.querySelector('#work-empty');
      function apply(cat) {
        let n = 0;
        root.querySelectorAll('.wtile').forEach(t => {
          const w = A.WORK.find(x => x.id === t.dataset.work), show = cat === 'All' || w.cat === cat;
          t.hidden = !show; if (show) n++;
        });
        root.querySelectorAll('.fchip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wcat === cat)));
        count.textContent = n + (n === 1 ? ' reference piece' : ' reference pieces');
        empty.hidden = n > 0;
      }
      root.querySelector('.filters').addEventListener('click', e => { const b = e.target.closest('.fchip'); if (b) apply(b.dataset.wcat); });
      apply('All');
    }
  };

  /* ==================================================================== ABOUT */
  A.pages.about = {
    title: 'About & Services',
    render() {
      const c = A.CONFIG;
      const ph = (label, val) => '<div class="ph-row"><dt>' + esc(label) + '</dt><dd>' + esc(val) + ' <span class="chip">Placeholder</span></dd></div>';
      return '<section class="page-head"><div class="wrap"><p class="eyebrow">About &amp; Services</p><h1 class="h1">Craft, <em>made personal</em></h1>' +
        '<p class="lede">This page is structured for the real company story. Nothing below states facts about the business — every company detail is a labelled placeholder.</p></div></section>' +
        '<section class="pad-sm"><div class="wrap grid-about">' +
        '<div><h2 class="h3">Our story</h2><div class="ph-box"><span class="chip">Placeholder</span><p>[Company story — to be supplied by the business: who they are, when they started, what they stand for.]</p><p>[Team photo / workshop photo placeholder]</p></div>' +
        '<h2 class="h3">Services <span class="muted small">(examples — confirm)</span></h2><div class="grid-services tight">' + A.SERVICES.map(s => '<article class="svc"><span class="svc-ic">' + icon(s.icon, 24) + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></article>').join('') + '</div></div>' +
        '<aside class="card"><h2 class="h4">Company details</h2><dl class="ph-list">' +
        ph('Company name', c.companyName) + ph('Address', c.address) + ph('Phone', c.phoneDisplay) + ph('Email', c.email) + ph('Service area', '[Areas served — to be supplied]') +
        '</dl><h2 class="h4">Opening hours</h2><dl class="ph-list">' + c.hours.map(h => ph(h[0], h[1])).join('') + '</dl>' +
        '<a class="btn btn-primary btn-block" href="#/contact">Contact us</a></aside></div></section>';
    }
  };

  /* ================================================================== CONTACT */
  A.pages.contact = {
    title: 'Contact',
    render() {
      const c = A.CONFIG;
      return '<section class="page-head"><div class="wrap"><p class="eyebrow">Contact</p><h1 class="h1">Let’s make <em>something</em></h1><p class="lede">Send an enquiry, chat on WhatsApp or start designing straight away.</p></div></section>' +
        '<section class="pad-sm"><div class="wrap grid-contact">' +
        '<form class="card" id="contact-form" novalidate><h2 class="h4">Send an enquiry</h2>' +
        '<div class="grid-2"><label class="field"><span>Full name *</span><input name="name" autocomplete="name"><small class="field-err" role="alert"></small></label>' +
        '<label class="field"><span>Phone / WhatsApp *</span><input name="phone" inputmode="tel" autocomplete="tel"><small class="field-err" role="alert"></small></label>' +
        '<label class="field"><span>Email <em>(optional)</em></span><input name="email" type="email" autocomplete="email"><small class="field-err" role="alert"></small></label>' +
        '<label class="field"><span>Topic</span><select name="topic"><option>General enquiry</option><option>Custom design help</option><option>Bulk order</option><option>Embroidery question</option><option>Collection / delivery</option></select></label></div>' +
        '<label class="field"><span>Message *</span><textarea name="message" rows="5" maxlength="1000"></textarea><small class="field-err" role="alert"></small></label>' +
        '<p class="fine">' + esc(A.LOCAL_NOTE) + '</p><div class="form-error" id="c-error" role="alert" hidden></div>' +
        '<button class="btn btn-primary" type="submit" id="c-submit">Send demo enquiry</button></form>' +
        '<div class="stack">' +
        '<div class="card"><h2 class="h4">WhatsApp <span class="chip" data-wa-status>Not configured</span></h2><p>A pre-filled chat opens only when you click — you press send inside WhatsApp.</p>' +
        '<button class="btn btn-wa btn-block" type="button" data-wa-open>' + icon('wa', 20) + ' Chat on WhatsApp</button>' +
        '<button class="link-btn" type="button" data-open-settings>Set the WhatsApp number (demo setting)</button></div>' +
        '<div class="card"><h2 class="h4">Find us</h2><div class="map-ph" role="img" aria-label="Map placeholder"><span>' + icon('center', 28) + '</span><p>[Map / location — to be supplied]</p></div><p>' + esc(c.address) + ' <span class="chip">Placeholder</span></p>' +
        '<dl class="ph-list">' + c.hours.map(h => '<div class="ph-row"><dt>' + esc(h[0]) + '</dt><dd>' + esc(h[1]) + '</dd></div>').join('') + '</dl></div>' +
        '<div class="card"><h2 class="h4">What happens next</h2><ol class="next"><li>You send an enquiry or design request.</li><li>The team reviews it and replies by your preferred method.</li><li>You receive a quotation — nothing is produced until you approve it.</li></ol><a class="btn btn-ghost btn-block" href="#/studio">Start designing instead</a></div>' +
        '</div></div></section>';
    },
    mount(root) {
      const f = root.querySelector('#contact-form');
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const errs = {};
        if (f.name.value.trim().length < 2) errs.name = 'Please enter your name.';
        const digits = f.phone.value.replace(/[^\d]/g, '');
        if (digits.length < 7 || digits.length > 15) errs.phone = 'Enter a valid phone / WhatsApp number.';
        if (f.email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) errs.email = 'That email address does not look right.';
        if (f.message.value.trim().length < 5) errs.message = 'Please write a short message.';
        f.querySelectorAll('.field-err').forEach(x => x.textContent = '');
        Object.entries(errs).forEach(([n, m]) => { f[n].setAttribute('aria-invalid', 'true'); f[n].closest('.field').querySelector('.field-err').textContent = m; });
        if (Object.keys(errs).length) { f[Object.keys(errs)[0]].focus(); return; }
        const btn = root.querySelector('#c-submit'); btn.disabled = true; btn.classList.add('loading'); btn.textContent = 'Sending…';
        await new Promise(r => setTimeout(r, 700));
        const enq = A.Store.addEnquiry({ name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), topic: f.topic.value, message: f.message.value.trim() });
        f.innerHTML = '<div class="q-done"><div class="q-check">' + icon('check', 30) + '</div><p class="eyebrow">Demo enquiry saved</p><h2 class="h3">Thank you, ' + esc(enq.name.split(' ')[0]) + '.</h2>' +
          '<div class="ref"><code>' + esc(enq.id) + '</code></div>' +
          '<div class="notice">' + icon('info', 18) + '<p>' + esc(A.LOCAL_NOTE) + ' It now appears under <em>Contact enquiries</em> in the demo business dashboard.</p></div>' +
          '<div class="dlg-actions wrap-actions"><a class="btn btn-primary" href="#/dashboard?tab=enquiries">See it in the dashboard</a><button class="btn btn-ghost" type="button" id="c-wa">' + icon('wa', 18) + ' Continue on WhatsApp</button></div></div>';
        f.querySelector('#c-wa').addEventListener('click', () => A.UI.openWhatsApp('Hello! I just sent a demo enquiry (' + enq.id + ') about: ' + enq.topic + '.'));
      });
    }
  };
})();
