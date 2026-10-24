/* ==========================================================================
   ui.js — small UI toolkit: icons, escaping, toasts, dialogs, WhatsApp,
   and shared formatting helpers. No dependencies.
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- icons (inline SVG, stroke based) ---------- */
  const P = {
    menu: 'M4 7h16M4 12h16M4 17h16', close: 'M6 6l12 12M18 6L6 18', arrow: 'M5 12h14M13 6l6 6-6 6',
    check: 'M5 12.5l4.5 4.5L19 7.5', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3', redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
    copy: 'M9 9h10v10H9zM5 15V5h10', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
    text: 'M5 6V4h14v2M12 4v16M9 20h6', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6', center: 'M12 3v4M12 17v4M3 12h4M17 12h4M9 12a3 3 0 106 0 3 3 0 00-6 0', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
    save: 'M5 4h12l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
    print: 'M7 9V4h10v5M7 17H4v-7h16v7h-3M7 14h10v6H7z', needle: 'M4 20L18 6M18 6l2-2M14 8l4 4M6 18c-2 1-3 0-2-2', badge: 'M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z',
    jersey: 'M8 4L3 7l2 5 3-1v9h8v-9l3 1 2-5-5-3c-1 2-7 2-8 0z', tag: 'M3 12V4h8l10 10-8 8z', stack: 'M12 4l9 4-9 4-9-4zM3 12l9 4 9-4M3 16l9 4 9-4',
    wa: 'M20 12a8 8 0 01-11.7 7.1L4 20l1-4.2A8 8 0 1120 12zM9 8c0 4 3 7 7 7l1-2-2-1-1 1c-1 0-3-2-3-3l1-1-1-2z',
    warn: 'M12 4l9 16H3zM12 10v4M12 17v.5', info: 'M12 8v.5M12 11v6M3 12a9 9 0 1018 0 9 9 0 00-18 0', bars: 'M5 20V10M12 20V4M19 20v-7', layers: 'M12 4l9 5-9 5-9-5zM3 14l9 5 9-5'
  };
  const icon = (n, size) => '<svg class="ic" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (P[n] || '') + '"/></svg>';

  /* ---------- formatting ---------- */
  const fmtDate = ts => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDateTime = ts => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const ago = ts => {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    const d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
  };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');

  function priceLabel(product, qty) {
    if (A.CONFIG.showPrices && product && typeof product.basePrice === 'number') {
      return A.CONFIG.currency + ' ' + (product.basePrice * (qty || 1)).toLocaleString('en-GB', { minimumFractionDigits: 2 });
    }
    return 'Quote required';
  }

  /* ---------- toasts ---------- */
  function toast(msg, type) {
    const host = $('#toasts'); if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.innerHTML = icon(type === 'error' ? 'warn' : type === 'success' ? 'check' : 'info', 18) + '<span>' + esc(msg) + '</span>';
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, type === 'error' ? 5200 : 3200);
  }

  /* ---------- dialogs (native <dialog>) ---------- */
  function dialog(html, opts) {
    opts = opts || {};
    const d = document.createElement('dialog');
    d.className = 'dlg ' + (opts.cls || '');
    if (opts.label) d.setAttribute('aria-label', opts.label);
    d.innerHTML = '<div class="dlg-body">' + html + '</div>';
    document.body.appendChild(d);
    const close = v => { if (d.open) d.close(v); };
    d.addEventListener('close', () => { if (opts.onClose) opts.onClose(d.returnValue); setTimeout(() => d.remove(), 0); });
    d.addEventListener('click', e => { if (e.target === d && !opts.static) close('backdrop'); });
    d.addEventListener('click', e => { if (e.target.closest('[data-dlg-close]')) close('close'); });
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    return { el: d, close };
  }

  function confirmDialog(title, text, okLabel) {
    return new Promise(res => {
      const dlg = dialog(
        '<h2 class="dlg-title">' + esc(title) + '</h2><p>' + esc(text) + '</p>' +
        '<div class="dlg-actions"><button class="btn btn-ghost" data-dlg-close>Cancel</button><button class="btn btn-primary" data-ok>' + esc(okLabel || 'Confirm') + '</button></div>',
        { cls: 'dlg-sm', label: title, onClose: v => res(v === 'ok') }
      );
      dlg.el.querySelector('[data-ok]').addEventListener('click', () => dlg.close('ok'));
    });
  }

  /* ---------- lightbox ---------- */
  function lightbox(src, caption) {
    dialog('<button class="dlg-x" data-dlg-close aria-label="Close preview">' + icon('close') + '</button><figure class="lb"><img src="' + src + '" alt="' + esc(caption || 'Preview') + '"><figcaption>' + esc(caption || '') + '</figcaption></figure>', { cls: 'dlg-lb', label: caption || 'Preview' });
  }

  /* ---------- WhatsApp (configurable; opens only on user click) ---------- */
  function validWhatsapp(n) { return /^[1-9]\d{7,14}$/.test(String(n || '').replace(/[^\d]/g, '')); }

  function quoteMessage(q) {
    const it = q.item || {};
    const p = A.product(it.productId); const c = A.color(it.colorId);
    const sizes = Object.entries(it.sizes || {}).filter(([, v]) => v > 0).map(([k, v]) => k + ' x' + v).join(', ');
    return 'Hello! I would like to follow up on my demo quote request ' + q.id + '.\n' +
      '• ' + (it.total || 0) + ' x ' + (p ? p.name : 'garment') + ' (' + (c ? c.name : '') + ')\n' +
      '• Method: ' + ((A.METHODS[it.method] || {}).name || '—') + '\n' +
      (sizes ? '• Sizes: ' + sizes + '\n' : '') +
      '• Location: ' + ((q.customer || {}).location || '—');
  }

  function openSettings(afterSave) {
    const cur = A.Store.whatsapp();
    const dlg = dialog(
      '<button class="dlg-x" data-dlg-close aria-label="Close">' + icon('close') + '</button>' +
      '<p class="eyebrow">Demo settings</p><h2 class="dlg-title">WhatsApp number</h2>' +
      '<p>Enter the business WhatsApp number in <strong>international format</strong> (digits only, e.g. country code 233 followed by the number). It is stored only in this browser and used to build a pre-filled chat link. Nothing is sent until someone clicks the WhatsApp button and presses send in WhatsApp.</p>' +
      '<form id="wa-form" novalidate><label class="field"><span>WhatsApp number</span><input name="wa" inputmode="tel" autocomplete="off" placeholder="233XXXXXXXXX" value="' + esc(cur) + '"><small class="field-err" id="wa-err" role="alert"></small></label>' +
      '<div class="dlg-actions"><button type="button" class="btn btn-ghost" data-clear>Clear</button><button class="btn btn-primary" type="submit">Save number</button></div></form>' +
      '<p class="fine">Permanent setup: set <code>whatsappNumber</code> in <code>js/data.js</code>.</p>',
      { cls: 'dlg-sm', label: 'WhatsApp settings' }
    );
    const f = dlg.el.querySelector('#wa-form'), err = dlg.el.querySelector('#wa-err');
    f.addEventListener('submit', e => {
      e.preventDefault();
      const v = f.wa.value.replace(/[^\d]/g, '');
      if (!validWhatsapp(v)) { err.textContent = 'Enter 8–15 digits including the country code (not starting with 0 or +).'; f.wa.setAttribute('aria-invalid', 'true'); return; }
      A.Store.saveSettings({ whatsappNumber: v }); dlg.close(); toast('WhatsApp number saved locally', 'success'); if (afterSave) afterSave();
    });
    dlg.el.querySelector('[data-clear]').addEventListener('click', () => { A.Store.saveSettings({ whatsappNumber: '' }); dlg.close(); toast('WhatsApp number cleared', 'info'); });
  }

  /** Opens WhatsApp in a new tab ONLY when called from a user click. */
  function openWhatsApp(message) {
    const n = A.Store.whatsapp();
    if (!validWhatsapp(n)) { openSettings(() => openWhatsApp(message)); return false; }
    const url = 'https://wa.me/' + n + '?text=' + encodeURIComponent(message || 'Hello! I have an enquiry.');
    window.open(url, '_blank', 'noopener');
    return true;
  }
  const waConfigured = () => validWhatsapp(A.Store.whatsapp());

  /* ---------- shared view helpers ---------- */
  const statusClass = s => 'st-' + slug(s);
  const pill = s => '<span class="pill ' + statusClass(s) + '">' + esc(s) + '</span>';
  const demoTag = '<span class="demo-tag">DEMO</span>';

  function swatch(c, active) {
    return '<span class="sw' + (active ? ' on' : '') + '" style="--c:' + c.hex + '" title="' + esc(c.name) + '"></span>';
  }

  /** Production-stage tracker. `active` false = quote not approved yet (all steps greyed). */
  function tracker(stage, active) {
    const idx = A.PRODUCTION_STAGES.indexOf(stage);
    return '<ol class="tracker' + (active ? '' : ' idle') + '" aria-label="Production progress">' + A.PRODUCTION_STAGES.map((s, i) => {
      const st = !active ? '' : i < idx ? ' done' : i === idx ? ' current' : '';
      return '<li class="' + st.trim() + '"' + (st.includes('current') ? ' aria-current="step"' : '') + '><span class="tk-dot">' + (st.includes('done') ? icon('check', 12) : '') + '</span><span class="tk-l">' + esc(s) + '</span></li>';
    }).join('') + '</ol>';
  }

  /** First available design preview for a quote, falling back to a plain garment image. */
  function quoteThumb(q) {
    const views = Object.keys(q.previews || {});
    if (views.length) return q.previews[views[0]];
    const it = q.item || {};
    const c = A.COLORS[it.colorId];
    return c ? A.gimg(it.productId, 'front', it.colorId, { bg: '#ece8e0' }) : '';
  }

  A.UI = { esc, $, $$, icon, fmtDate, fmtDateTime, ago, slug, priceLabel, toast, dialog, confirmDialog, lightbox, openSettings, openWhatsApp, waConfigured, validWhatsapp, quoteMessage, statusClass, pill, demoTag, swatch, tracker, quoteThumb };
})();
