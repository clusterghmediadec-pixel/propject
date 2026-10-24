/* ==========================================================================
   store.js — prototype-only persistence in this browser (localStorage).
   Nothing here talks to a server. Includes: quotes, drafts, settings, seeds.
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  const P = () => A.CONFIG.storagePrefix;

  /* ---------- tiny event bus ---------- */
  const handlers = {};
  A.bus = {
    on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); return () => { handlers[evt] = (handlers[evt] || []).filter(f => f !== fn); }; },
    emit(evt, data) { (handlers[evt] || []).slice().forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
  };

  /* ---------- storage with in-memory fallback ---------- */
  const mem = {};
  let storageOk = true;
  try { localStorage.setItem(P() + 'probe', '1'); localStorage.removeItem(P() + 'probe'); } catch (e) { storageOk = false; }

  function read(key, fallback) {
    try {
      const raw = storageOk ? localStorage.getItem(P() + key) : mem[key];
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    const raw = JSON.stringify(val);
    try {
      if (storageOk) localStorage.setItem(P() + key, raw); else mem[key] = raw;
      return { ok: true };
    } catch (e) { return { ok: false, error: e }; }
  }

  /* ---------- helpers ---------- */
  const uid = () => Math.random().toString(36).slice(2, 10);
  function makeRef(existing) {
    const d = new Date();
    const stamp = String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let ref;
    do {
      ref = 'DEMO-' + stamp + '-' + Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
    } while (existing.some(q => q.id === ref));
    return ref;
  }

  /* ---------- quotes ---------- */
  const Store = {
    storageOk,
    uid,

    quotes() { return read('quotes', []); },
    saveQuotes(list) { return write('quotes', list); },
    quote(id) { return Store.quotes().find(q => q.id === id); },

    addQuote(q) {
      const list = Store.quotes();
      q.id = makeRef(list);
      q.createdAt = Date.now();
      q.quoteStatus = 'New';
      q.productionStage = 'Awaiting Confirmation';
      q.sample = false;
      q.history = [{ ts: Date.now(), text: 'Request submitted by visitor (demo)' }];
      list.unshift(q);
      const r = Store.saveQuotes(list);
      if (!r.ok) {
        // storage full: retry without heavy previews so the demo flow still works
        q.previews = {};
        q.previewsDropped = true;
        const r2 = Store.saveQuotes(list);
        if (!r2.ok) { list.shift(); return { ok: false, error: r2.error }; }
      }
      A.bus.emit('quotes', list);
      return { ok: true, quote: q };
    },

    updateQuote(id, patch, logText) {
      const list = Store.quotes();
      const q = list.find(x => x.id === id);
      if (!q) return null;
      Object.assign(q, patch);
      if (logText) q.history.push({ ts: Date.now(), text: logText });
      Store.saveQuotes(list);
      A.bus.emit('quotes', list);
      return q;
    },

    /* ---------- contact enquiries ---------- */
    enquiries() { return read('enquiries', []); },
    addEnquiry(e) {
      const list = Store.enquiries();
      e.id = 'DEMO-E-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      e.createdAt = Date.now(); e.status = 'New'; e.sample = false;
      list.unshift(e); write('enquiries', list); A.bus.emit('enquiries', list);
      return e;
    },
    updateEnquiry(id, patch) {
      const list = Store.enquiries(); const e = list.find(x => x.id === id); if (!e) return;
      Object.assign(e, patch); write('enquiries', list); A.bus.emit('enquiries', list);
    },

    /* ---------- drafts ---------- */
    drafts() { return read('drafts', []); },
    draft(id) { return Store.drafts().find(d => d.id === id); },
    saveDraft(d) {
      const list = Store.drafts();
      const i = list.findIndex(x => x.id === d.id);
      d.updatedAt = Date.now();
      if (i >= 0) list[i] = d; else list.unshift(d);
      const r = write('drafts', list);
      if (r.ok) A.bus.emit('drafts', list);
      return r;
    },
    deleteDraft(id) {
      const list = Store.drafts().filter(d => d.id !== id);
      write('drafts', list);
      A.bus.emit('drafts', list);
    },

    /* ---------- settings (runtime overrides of CONFIG) ---------- */
    settings() { return read('settings', {}); },
    saveSettings(s) { const r = write('settings', Object.assign(Store.settings(), s)); A.bus.emit('settings', Store.settings()); return r; },
    whatsapp() {
      const raw = (Store.settings().whatsappNumber != null ? Store.settings().whatsappNumber : A.CONFIG.whatsappNumber) || '';
      return String(raw).replace(/[^\d]/g, '');
    },

    /* ---------- reset ---------- */
    resetDemo() {
      ['quotes', 'drafts', 'enquiries', 'seeded'].forEach(k => { try { storageOk ? localStorage.removeItem(P() + k) : delete mem[k]; } catch (e) { } });
      Store.ensureSeeds();
      A.bus.emit('quotes', Store.quotes());
      A.bus.emit('drafts', Store.drafts());
    },

    /* ---------- demo seed records (fictional, always labelled DEMO) ---------- */
    ensureSeeds() {
      if (read('seeded', false) && Store.quotes().length) return;
      const day = 86400000, now = Date.now();
      const G = A.Garments;
      const prev = (pid, cid, view, overlay) => G.img(pid, view, A.COLORS[cid].hex, { bg: '#ece8e0', overlay });
      const T = (t, font, size, fill, fy, extra) => Object.assign({ k: 'text', t, font, size, fill, fx: .5, fy }, extra || {});
      const mk = (o) => Object.assign({ sample: true, history: [], previews: {}, notes: '', bulk: null }, o);

      const seeds = [
        mk({
          id: 'DEMO-SAMPLE-01', type: 'studio', createdAt: now - 0.2 * day, quoteStatus: 'New', productionStage: 'Awaiting Confirmation',
          customer: { name: 'Nana Ama Boateng', phone: '+233 00 000 0001', email: 'demo1@example.com', location: 'Sample Town, Greater Accra', contact: 'WhatsApp' },
          item: { productId: 'tee', colorId: 'white', method: 'screen', sizes: { M: 8, L: 10, XL: 6 }, total: 24, elements: { front: 2 } },
          orgLabel: 'Sample choir group', notes: 'Choir anniversary tees. Need them before the anniversary weekend (demo note).',
          previews: { front: prev('tee', 'white', 'front', [T('SAMPLE', 'condensed', 52, '#b7282e', .3), T('CHOIR 2026', 'sans', 24, '#1b1b1c', .52)]) },
          history: [{ ts: now - 0.2 * day, text: 'Request submitted by visitor (demo)' }]
        }),
        mk({
          id: 'DEMO-SAMPLE-02', type: 'studio', createdAt: now - 1.1 * day, quoteStatus: 'Under Review', productionStage: 'Awaiting Confirmation',
          customer: { name: 'Kojo Mensimah', phone: '+233 00 000 0002', email: '', location: 'Sample City, Ashanti', contact: 'Call' },
          item: { productId: 'tee', colorId: 'red', method: 'screen', sizes: { S: 4, M: 6, L: 6, XL: 2 }, total: 18, elements: { front: 2, back: 2 } },
          orgLabel: 'Sample football club', notes: 'Supporter tees with names and numbers on the back please (demo note).',
          previews: {
            front: prev('tee', 'red', 'front', [{ k: 'badge', fx: .5, fy: .22, r: 32, fill: '#f3f1ec', stroke: '#dba52f', t: 'FC', tsize: 28, tfill: '#b7282e' }, T('SAMPLE FC', 'condensed', 40, '#f3f1ec', .5)]),
            back: prev('tee', 'red', 'back', [T('MENSAH', 'condensed', 36, '#f3f1ec', .2), T('7', 'condensed', 160, '#f3f1ec', .5)])
          },
          history: [{ ts: now - 1.1 * day, text: 'Request submitted by visitor (demo)' }, { ts: now - 0.9 * day, text: 'Status set to Under Review' }]
        }),
        mk({
          id: 'DEMO-SAMPLE-03', type: 'bulk', createdAt: now - 3 * day, quoteStatus: 'Quote Prepared', productionStage: 'Awaiting Confirmation',
          customer: { name: 'Efua Owusu-Demo', phone: '+233 00 000 0003', email: 'demo3@example.com', location: 'Sample District, Central', contact: 'Email' },
          item: { productId: 'hoodie', colorId: 'navy', method: 'embroidery', sizes: { S: 10, M: 20, L: 20, XL: 8, '2XL': 2 }, total: 60, elements: { front: 1 } },
          orgLabel: 'Sample senior high school', bulk: { orgType: 'School', delivery: 'Delivery', deliveryNote: 'Sample School, Sample District', deadline: '', artwork: 'school-crest-demo.png' },
          notes: 'Staff and prefect hoodies with school crest on the chest (demo note).',
          previews: { front: prev('hoodie', 'navy', 'front', [{ k: 'badge', fx: .5, fy: .42, r: 30, fill: '#dba52f', stroke: '#f3f1ec', t: 'S', tsize: 34, tfill: '#1d2d4d', stitch: true }]) },
          history: [{ ts: now - 3 * day, text: 'Bulk quotation requested (demo)' }, { ts: now - 2 * day, text: 'Status set to Under Review' }, { ts: now - 1 * day, text: 'Status set to Quote Prepared' }]
        }),
        mk({
          id: 'DEMO-SAMPLE-04', type: 'bulk', createdAt: now - 6 * day, quoteStatus: 'Approved', productionStage: 'In Production',
          customer: { name: 'Yaw Frimpong', phone: '+233 00 000 0004', email: 'demo4@example.com', location: 'Sample Estate, Greater Accra', contact: 'WhatsApp' },
          item: { productId: 'hoodie', colorId: 'black', method: 'embroidery', sizes: { M: 12, L: 14, XL: 10, '2XL': 4 }, total: 40, elements: { front: 1, back: 1 } },
          orgLabel: 'Sample clothing brand', bulk: { orgType: 'Clothing brand', delivery: 'Collection', deliveryNote: '', deadline: '', artwork: 'brand-mark-demo.svg' },
          notes: 'First capsule hoodie run (demo note).',
          previews: {
            front: prev('hoodie', 'black', 'front', [T('SAMPLE', 'serif', 26, '#dba52f', .4, { italic: true, stitch: true })]),
            back: prev('hoodie', 'black', 'back', [T('SAMPLE', 'condensed', 64, '#f3f1ec', .2), T('STUDIO', 'sans', 22, '#dba52f', .34)])
          },
          history: [{ ts: now - 6 * day, text: 'Bulk quotation requested (demo)' }, { ts: now - 4 * day, text: 'Status set to Quote Prepared' }, { ts: now - 3 * day, text: 'Status set to Approved' }, { ts: now - 2 * day, text: 'Production stage: In Production' }]
        }),
        mk({
          id: 'DEMO-SAMPLE-05', type: 'bulk', createdAt: now - 9 * day, quoteStatus: 'Approved', productionStage: 'Quality Check',
          customer: { name: 'Adwoa Sarpong', phone: '+233 00 000 0005', email: 'demo5@example.com', location: 'Sample Venue, Eastern', contact: 'WhatsApp' },
          item: { productId: 'tee', colorId: 'black', method: 'dtf', sizes: { M: 20, L: 30, XL: 20, '2XL': 10 }, total: 80, elements: { front: 2 } },
          orgLabel: 'Sample event organiser', bulk: { orgType: 'Event organiser', delivery: 'Delivery', deliveryNote: 'Sample Venue, Eastern', deadline: '', artwork: '' },
          notes: 'Festival crew tees (demo note).',
          previews: { front: prev('tee', 'black', 'front', [T('SAMPLE', 'sans', 30, '#dba52f', .28), T('FEST', 'sans', 30, '#f3f1ec', .5)]) },
          history: [{ ts: now - 9 * day, text: 'Bulk quotation requested (demo)' }, { ts: now - 7 * day, text: 'Status set to Approved' }, { ts: now - 1 * day, text: 'Production stage: Quality Check' }]
        }),
        mk({
          id: 'DEMO-SAMPLE-06', type: 'studio', createdAt: now - 40 * day, quoteStatus: 'Approved', productionStage: 'Completed', account: true,
          customer: { name: 'Demo Visitor', phone: '+233 00 000 0000', email: 'visitor@example.com', location: 'Sample Town', contact: 'WhatsApp' },
          item: { productId: 'croptee', colorId: 'grey', method: 'embroidery', sizes: { M: 6, L: 6 }, total: 12, elements: { front: 1 } },
          orgLabel: 'Sample past order', notes: 'Example of a completed past order for the demo customer area.',
          previews: { front: prev('croptee', 'grey', 'front', [T('DEMO', 'sans', 18, '#1b1b1c', .45, { stitch: true })]) },
          history: [{ ts: now - 40 * day, text: 'Request submitted (demo)' }, { ts: now - 30 * day, text: 'Status set to Approved' }, { ts: now - 22 * day, text: 'Production stage: Completed' }]
        }),
        mk({
          id: 'DEMO-SAMPLE-07', type: 'studio', createdAt: now - 75 * day, quoteStatus: 'Approved', productionStage: 'Completed', account: true,
          customer: { name: 'Demo Visitor', phone: '+233 00 000 0000', email: 'visitor@example.com', location: 'Sample Town', contact: 'WhatsApp' },
          item: { productId: 'tee', colorId: 'charcoal', method: 'dtf', sizes: { S: 8, M: 12, L: 10 }, total: 30, elements: { front: 1, back: 1 } },
          orgLabel: 'Sample past order', notes: 'Example of a completed past order for the demo customer area.',
          previews: { front: prev('tee', 'charcoal', 'front', [T('SAMPLE', 'condensed', 56, '#f3f1ec', .3)]) },
          history: [{ ts: now - 75 * day, text: 'Request submitted (demo)' }, { ts: now - 66 * day, text: 'Status set to Approved' }, { ts: now - 58 * day, text: 'Production stage: Completed' }]
        }),
        mk({
          id: 'DEMO-SAMPLE-08', type: 'studio', createdAt: now - 12 * day, quoteStatus: 'Declined', productionStage: 'Awaiting Confirmation',
          customer: { name: 'Samuel Tetteh', phone: '+233 00 000 0008', email: '', location: 'Sample Town, Volta', contact: 'Call' },
          item: { productId: 'tee', colorId: 'royal', method: 'screen', sizes: { L: 1 }, total: 1, elements: { front: 1 } },
          orgLabel: 'Sample individual', notes: 'Artwork was a low-resolution photo (demo note).',
          previews: { front: prev('tee', 'royal', 'front', [T('PHOTO?', 'sans', 40, '#f3f1ec', .3)]) },
          history: [{ ts: now - 12 * day, text: 'Request submitted by visitor (demo)' }, { ts: now - 11 * day, text: 'Status set to Declined' }]
        })
      ];
      write('quotes', seeds);
      write('seeded', true);
      if (!read('enquiries', []).length) {
        write('enquiries', [
          { id: 'DEMO-E-SMP1', sample: true, createdAt: now - 0.5 * day, status: 'New', name: 'Akosua Demo', phone: '+233 00 000 0011', email: '', topic: 'Embroidery question', message: 'Can you embroider a small crest onto school polos? (demo enquiry)' },
          { id: 'DEMO-E-SMP2', sample: true, createdAt: now - 2 * day, status: 'Replied', name: 'Kwabena Demo', phone: '+233 00 000 0012', email: 'demo@example.com', topic: 'Collection / delivery', message: 'Do you deliver outside the city for event orders? (demo enquiry)' }
        ]);
      }
    }
  };

  A.Store = Store;
})();
