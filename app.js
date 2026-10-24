/* ==========================================================================
   app.js — hash router, shell (nav, footer, WhatsApp button) and boot.
   Routes: #/  #/shop  #/product/<id>  #/studio  #/work  #/bulk
           #/about  #/contact  #/account  #/dashboard
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  const { esc, icon, $, $$ } = A.UI;
  A.pages = A.pages || {};

  const NAV = [
    ['', 'Home'], ['shop', 'Shop & Customize'], ['studio', 'Design Studio'],
    ['work', 'Our Work'], ['bulk', 'Bulk Orders'], ['about', 'About'], ['contact', 'Contact']
  ];

  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    return { name: parts[0] || '', arg: parts[1] || '', q: Object.fromEntries(new URLSearchParams(qs || '')) };
  }

  /* ---------- shell ---------- */
  function buildNav() {
    const link = (p, t) => '<li><a href="#/' + p + '" data-route="' + p + '">' + esc(t) + '</a></li>';
    $('#nav-list').innerHTML = NAV.map(([p, t]) => link(p, t)).join('');
    $('#mobile-list').innerHTML = NAV.map(([p, t]) => link(p, t)).join('') +
      '<li class="mm-sep"></li><li><a href="#/account" data-route="account">Demo customer area</a></li><li><a href="#/dashboard" data-route="dashboard">Demo business dashboard</a></li>';
    $('#menu-btn').innerHTML = icon('menu', 24);
    $('#nav-account').innerHTML = icon('user', 22);
    $('#wa-fab').innerHTML = icon('wa', 24) + '<span>WhatsApp</span>';
    $('#brand-name').textContent = A.CONFIG.brandName;
  }

  function buildFooter() {
    const c = A.CONFIG;
    $('#footer').innerHTML =
      '<div class="foot"><div class="wrap foot-grid">' +
      '<div class="foot-brand"><a class="brand brand-light" href="#/"><span class="brand-mark" aria-hidden="true">A</span><span class="brand-name">' + esc(c.brandName) + '</span></a>' +
      '<p>' + esc(c.tagline) + '. This site is an interactive prototype — brand name, contact details and content are placeholders.</p></div>' +
      '<div><h3>Explore</h3><ul>' + NAV.map(([p, t]) => '<li><a href="#/' + p + '">' + esc(t) + '</a></li>').join('') + '</ul></div>' +
      '<div><h3>Contact <span class="chip">placeholders</span></h3><ul class="plain">' +
      '<li>' + esc(c.companyName) + '</li><li>' + esc(c.address) + '</li><li>' + esc(c.phoneDisplay) + '</li><li>' + esc(c.email) + '</li>' +
      '<li><button class="link-btn" type="button" data-wa-open>' + icon('wa', 16) + ' WhatsApp</button></li></ul></div>' +
      '<div><h3>Prototype tools</h3><ul>' +
      '<li><a href="#/account">Demo customer area</a></li><li><a href="#/dashboard">Demo business dashboard</a></li>' +
      '<li><button class="link-btn" type="button" data-open-settings>Set WhatsApp number</button></li>' +
      '<li><button class="link-btn" type="button" data-reset-demo>Reset demo data</button></li></ul></div>' +
      '</div><div class="wrap foot-base"><p>© <span id="yr"></span> Prototype — not a live business website. ' + esc(A.LOCAL_NOTE) + '</p></div></div>';
    $('#yr').textContent = new Date().getFullYear();
  }

  /* ---------- global click handlers (delegated) ---------- */
  document.addEventListener('click', async e => {
    const wa = e.target.closest('[data-wa-open]');
    if (wa) { e.preventDefault(); A.UI.openWhatsApp('Hello! I have an enquiry about custom clothing printing / embroidery.'); return; }
    if (e.target.closest('#wa-fab')) { A.UI.openWhatsApp('Hello! I have an enquiry about custom clothing printing / embroidery.'); return; }
    if (e.target.closest('[data-open-settings]')) { A.UI.openSettings(refreshWaStatus); return; }
    if (e.target.closest('[data-reset-demo]')) {
      const ok = await A.UI.confirmDialog('Reset demo data?', 'This clears quote requests and saved drafts made in this browser and restores the sample records.', 'Reset');
      if (ok) { A.Store.resetDemo(); A.UI.toast('Demo data reset', 'success'); route(); }
      return;
    }
    if (e.target.closest('#menu-btn')) { toggleMenu(); return; }
    if (e.target.closest('#mobile-menu a')) toggleMenu(false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });

  function toggleMenu(force) {
    const m = $('#mobile-menu'), b = $('#menu-btn');
    const open = typeof force === 'boolean' ? force : m.hidden;
    m.hidden = !open;
    b.setAttribute('aria-expanded', String(open));
    b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    b.innerHTML = icon(open ? 'close' : 'menu', 24);
    document.body.classList.toggle('menu-open', open);
  }

  function refreshWaStatus() { $$('[data-wa-status]').forEach(el => { el.textContent = A.UI.waConfigured() ? 'Configured' : 'Not configured'; el.classList.toggle('ok', A.UI.waConfigured()); }); }

  /* ---------- router ---------- */
  let current = null;
  function route() {
    const r = parse();
    const page = A.pages[r.name];
    if (current && current.unmount) { try { current.unmount(); } catch (e) { console.error(e); } }
    current = null;
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (e) {} });
    // Fresh container per route: drops every listener a previous page attached to #app,
    // so revisiting a page can never stack duplicate click handlers.
    const stale = $('#app'), app = stale.cloneNode(false);
    stale.replaceWith(app);
    document.body.dataset.page = page ? r.name || 'home' : 'notfound';
    $$('[data-route]').forEach(a => { const on = a.dataset.route === r.name; if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    toggleMenu(false);

    if (!page) {
      app.innerHTML = '<section class="wrap pad center"><p class="eyebrow">404</p><h1 class="h1">Page not found</h1><p>That page does not exist in this prototype.</p><p><a class="btn btn-primary" href="#/">Back to home</a></p></section>';
      document.title = 'Not found — ' + A.CONFIG.brandName;
      return;
    }
    try {
      app.innerHTML = page.render(r);
      document.title = (page.title ? (typeof page.title === 'function' ? page.title(r) : page.title) + ' — ' : '') + A.CONFIG.brandName + ' (Prototype)';
      current = page;
      if (page.mount) page.mount(app, r);
    } catch (err) {
      console.error(err);
      app.innerHTML = '<section class="wrap pad center"><p class="eyebrow">Something went wrong</p><h1 class="h1">This page could not load</h1><p>' + esc(err.message) + '</p><p><a class="btn btn-primary" href="#/">Back to home</a></p></section>';
    }
    window.scrollTo(0, 0);
    const h1 = app.querySelector('h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    refreshWaStatus();
    observeReveals();
  }

  /* gentle reveal-on-scroll (disabled by CSS under prefers-reduced-motion) */
  let io = null;
  function observeReveals() {
    const els = $$('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  }

  A.refreshWaStatus = refreshWaStatus;
  A.route = route;

  /* ---------- boot ---------- */
  function boot() {
    // Garment mockups are built from real images, so wait until they are decoded.
    A.Garments.ready.then(() => {
      A.Store.ensureSeeds();
      buildNav(); buildFooter();
      window.addEventListener('hashchange', route);
      route();
    }).catch(err => {
      console.error(err);
      document.getElementById('app').innerHTML = '<section class="wrap pad center"><h1 class="h1">Images could not load</h1><p>' + esc(err.message) + '</p></section>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
