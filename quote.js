/* ==========================================================================
   quote.js — shared "Request a quote" dialog used by the Design Studio and
   the Bulk Order builder. Validates, saves to local demo state, shows a
   unique DEMO reference. Nothing is sent to any real business.
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  const { esc, icon, toast } = A.UI;

  const sizeText = sizes => Object.entries(sizes || {}).filter(([, v]) => v > 0).map(([k, v]) => k + ' × ' + v).join(' · ') || '—';

  function summaryHTML(p) {
    const it = p.item, prod = A.product(it.productId), col = A.color(it.colorId);
    const views = Object.keys(p.previews || {});
    return '<div class="q-sum">' +
      '<div class="q-thumbs">' + views.map(v => '<figure><img src="' + p.previews[v] + '" alt="' + esc(prod.name + ' ' + v + ' preview') + '"><figcaption>' + esc(A.VIEW_LABELS[v] || v) + '</figcaption></figure>').join('') + '</div>' +
      '<dl class="q-lines">' +
      '<div><dt>Garment</dt><dd>' + esc(prod.name) + '</dd></div>' +
      '<div><dt>Colour</dt><dd>' + A.UI.swatch(col, false) + ' ' + esc(col.name) + '</dd></div>' +
      '<div><dt>Method</dt><dd>' + esc((A.METHODS[it.method] || {}).name || '—') + '</dd></div>' +
      '<div><dt>Sizes</dt><dd>' + esc(sizeText(it.sizes)) + '</dd></div>' +
      '<div><dt>Total quantity</dt><dd><strong>' + it.total + '</strong></dd></div>' +
      '<div><dt>Price</dt><dd>' + esc(A.UI.priceLabel(prod, it.total)) + '</dd></div>' +
      '</dl></div>';
  }

  function validate(f) {
    const errs = {};
    const v = n => (f[n] ? String(f[n].value).trim() : '');
    if (v('name').length < 2) errs.name = 'Please enter your name.';
    const digits = v('phone').replace(/[^\d]/g, '');
    if (!/^[+\d][\d\s()+-]*$/.test(v('phone')) || digits.length < 7 || digits.length > 15) errs.phone = 'Enter a valid phone / WhatsApp number (7–15 digits).';
    if (v('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) errs.email = 'That email address does not look right.';
    if (v('location').length < 2) errs.location = 'Please tell us your town or area.';
    if (v('notes').length > 600) errs.notes = 'Notes are limited to 600 characters.';
    if (!f.consent.checked) errs.consent = 'Please confirm you understand this is a demo.';
    return errs;
  }

  async function open(payload) {
    const loading = A.UI.dialog(
      '<div class="q-loading" role="status"><span class="spin" aria-hidden="true"></span><p>Preparing your design preview…</p></div>',
      { cls: 'dlg-md', label: 'Preparing quote request', static: true }
    );
    let previews;
    try { previews = typeof payload.previews === 'function' ? await payload.previews() : payload.previews; }
    catch (e) { loading.close(); toast('Could not prepare the preview: ' + e.message, 'error'); return; }
    loading.close();
    const p = Object.assign({}, payload, { previews: previews || {} });
    const last = A.Store.settings().lastCustomer || {};
    const pre = Object.assign({}, last, p.prefill || {});

    const dlg = A.UI.dialog(
      '<button class="dlg-x" data-dlg-close aria-label="Close">' + icon('close') + '</button>' +
      '<div id="q-form-view">' +
      '<p class="eyebrow">Request a quote · demo</p><h2 class="dlg-title">Where should we send your quote?</h2>' +
      summaryHTML(p) +
      '<form id="q-form" novalidate>' +
      '<div class="grid-2">' +
      '<label class="field"><span>Full name *</span><input name="name" autocomplete="name" value="' + esc(pre.name || '') + '"><small class="field-err" role="alert"></small></label>' +
      '<label class="field"><span>Phone / WhatsApp *</span><input name="phone" inputmode="tel" autocomplete="tel" placeholder="e.g. 024 000 0000" value="' + esc(pre.phone || '') + '"><small class="field-err" role="alert"></small></label>' +
      '<label class="field"><span>Email <em>(optional)</em></span><input name="email" type="email" autocomplete="email" value="' + esc(pre.email || '') + '"><small class="field-err" role="alert"></small></label>' +
      '<label class="field"><span>Location *</span><input name="location" autocomplete="address-level2" placeholder="Town / area for delivery or collection" value="' + esc(pre.location || '') + '"><small class="field-err" role="alert"></small></label>' +
      '</div>' +
      '<fieldset class="field"><legend>Preferred contact method</legend><div class="seg">' +
      ['WhatsApp', 'Call', 'Email'].map((c, i) => '<label><input type="radio" name="contact" value="' + c + '"' + ((pre.contact || 'WhatsApp') === c ? ' checked' : '') + '><span>' + c + '</span></label>').join('') + '</div></fieldset>' +
      '<label class="field"><span>Notes <em>(optional)</em></span><textarea name="notes" rows="3" maxlength="620" placeholder="Deadline, colours, where the logo should go…">' + esc(p.notes || '') + '</textarea><small class="field-err" role="alert"></small></label>' +
      '<label class="check"><input type="checkbox" name="consent"><span>I understand this is a prototype: my details are saved only in this browser and are <strong>not</strong> sent to any business.</span></label><small class="field-err" data-for="consent" role="alert"></small>' +
      '<p class="fine">' + esc(A.DISCLAIMER) + '</p>' +
      '<div class="form-error" id="q-error" role="alert" hidden></div>' +
      '<div class="dlg-actions"><button type="button" class="btn btn-ghost" data-dlg-close>Back to design</button><button class="btn btn-primary" type="submit" id="q-submit">Submit demo quote request</button></div>' +
      '</form></div>' +
      '<div id="q-done-view" hidden></div>',
      { cls: 'dlg-md', label: 'Request a quote' }
    );

    const root = dlg.el, form = root.querySelector('#q-form');
    const showErrs = errs => {
      form.querySelectorAll('.field-err').forEach(el => { el.textContent = ''; });
      form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
      Object.entries(errs).forEach(([n, m]) => {
        if (n === 'consent') { root.querySelector('[data-for="consent"]').textContent = m; return; }
        const input = form[n]; input.setAttribute('aria-invalid', 'true');
        input.closest('.field').querySelector('.field-err').textContent = m;
      });
      const first = Object.keys(errs)[0]; if (first && first !== 'consent') form[first].focus();
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const errs = validate(form);
      showErrs(errs);
      if (Object.keys(errs).length) return;
      const btn = root.querySelector('#q-submit'), err = root.querySelector('#q-error');
      err.hidden = true; btn.disabled = true; btn.classList.add('loading'); btn.textContent = 'Saving…';
      await new Promise(r => setTimeout(r, 750));   // simulated network delay (no real network call)
      const customer = { name: form.name.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim(), location: form.location.value.trim(), contact: form.contact.value };
      const res = A.Store.addQuote({
        type: p.type, customer, item: p.item, previews: p.previews, notes: form.notes.value.trim(),
        orgLabel: p.orgLabel || '', bulk: p.bulk || null, account: true
      });
      if (!res.ok) {
        btn.disabled = false; btn.classList.remove('loading'); btn.textContent = 'Try again';
        err.hidden = false; err.textContent = 'Your browser blocked saving this demo request (storage may be full or disabled). Free up space with “Reset demo data” in the footer, or try again.';
        return;
      }
      A.Store.saveSettings({ lastCustomer: { name: customer.name, phone: customer.phone, email: customer.email, location: customer.location, contact: customer.contact } });
      done(res.quote);
      if (p.onSaved) p.onSaved(res.quote);
    });

    function done(q) {
      root.querySelector('#q-form-view').hidden = true;
      const v = root.querySelector('#q-done-view'); v.hidden = false;
      const waOk = A.UI.waConfigured();
      v.innerHTML =
        '<div class="q-done">' +
        '<div class="q-check">' + icon('check', 30) + '</div>' +
        '<p class="eyebrow">Demo quote request saved</p><h2 class="dlg-title">Thank you, ' + esc(q.customer.name.split(' ')[0]) + '.</h2>' +
        '<p class="muted">Your demo reference</p>' +
        '<div class="ref"><code id="ref-code">' + esc(q.id) + '</code><button class="btn btn-ghost btn-sm" type="button" id="ref-copy">' + icon('copy', 16) + ' Copy</button></div>' +
        '<div class="notice">' + icon('info', 18) + '<p><strong>This is a prototype.</strong> ' + esc(A.LOCAL_NOTE) + ' In the finished website the business would be notified of new requests (for example by email, WhatsApp or a live dashboard).</p></div>' +
        '<ol class="next"><li>The request now appears in the <strong>demo business dashboard</strong>.</li><li>You can track it in the <strong>demo customer area</strong>.</li><li>Optionally open WhatsApp with a pre-filled message (you must press send yourself).</li></ol>' +
        '<div class="dlg-actions wrap-actions">' +
        '<button class="btn btn-primary" type="button" data-go="#/dashboard?open=' + encodeURIComponent(q.id) + '">Open in business dashboard</button>' +
        '<button class="btn btn-ghost" type="button" data-go="#/account?tab=requests">View in my account</button>' +
        '<button class="btn btn-ghost" type="button" id="q-wa">' + icon('wa', 18) + ' WhatsApp ' + (waOk ? '' : '<span class="chip">set number</span>') + '</button>' +
        '</div></div>';
      v.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { dlg.close(); location.hash = b.dataset.go; }));
      v.querySelector('#q-wa').addEventListener('click', () => A.UI.openWhatsApp(A.UI.quoteMessage(q)));
      v.querySelector('#ref-copy').addEventListener('click', async ev => {
        try { await navigator.clipboard.writeText(q.id); toast('Reference copied', 'success'); }
        catch (x) { const r = document.createRange(); r.selectNode(v.querySelector('#ref-code')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Press Ctrl/Cmd+C to copy', 'info'); }
      });
      root.querySelector('.dlg-x').focus();
    }
    setTimeout(() => form.name.focus(), 50);
  }

  A.Quote = { open, sizeText };
})();
