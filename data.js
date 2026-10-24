/* ==========================================================================
   data.js — ALL replaceable content lives here.
   Company details, products, colours, sizes, methods, services, sample work.
   Nothing in this file is a verified fact about the real business:
   every [bracketed] value is a placeholder to be replaced.
   ========================================================================== */
(function () {
  const A = (window.Atelier = window.Atelier || {});

  /* ---------- Company configuration (replace with real details) ---------- */
  A.CONFIG = {
    brandName: 'ATELIER 233',                       // DEMO brand name — replace with real brand
    companyName: '[Company name — to be supplied]',
    tagline: 'Custom printing, embroidery & apparel',
    // International format, digits only, no "+" or spaces. e.g. '233XXXXXXXXX'.
    // Leave empty until supplied. The presenter can also enter it at runtime
    // (Demo settings) — that value is stored only in this browser.
    whatsappNumber: '',
    phoneDisplay: '[Phone number — to be supplied]',
    email: '[Email address — to be supplied]',
    address: '[Studio address — to be supplied]',
    city: '[City / area — to be supplied]',
    hours: [
      ['Monday – Friday', '[Opening hours — to be supplied]'],
      ['Saturday', '[Opening hours — to be supplied]'],
      ['Sunday', '[Opening hours — to be supplied]']
    ],
    currency: 'GHS',
    showPrices: false,            // flip to true once verified prices exist in PRODUCTS[].basePrice
    minQtyStudio: 1,              // placeholder minimums — confirm with the business
    minQtyBulk: 12,
    maxQtyTotal: 5000,
    maxQtyPerSize: 2000,
    storagePrefix: 'atelier.demo.v2.'
  };

  /* ---------- Fonts available in the studio (system stacks, no downloads) ---------- */
  A.FONTS = [
    { id: 'sans', name: 'Modern Sans', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif', bold: true },
    { id: 'serif', name: 'Classic Serif', stack: 'Georgia, "Times New Roman", serif', bold: false },
    { id: 'condensed', name: 'Condensed Bold', stack: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', bold: false },
    { id: 'rounded', name: 'Rounded', stack: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif', bold: true },
    { id: 'mono', name: 'Typewriter', stack: '"Courier New", Courier, monospace', bold: true },
    { id: 'script', name: 'Script', stack: '"Brush Script MT", "Segoe Script", cursive', bold: false }
  ];

  /* ---------- Decoration methods (examples — confirm the real list) ---------- */
  A.METHODS = {
    screen: { id: 'screen', name: 'Screen print', desc: 'Durable, vibrant ink. Best for bold artwork with few colours and larger runs.', caution: 'Fine gradients and photos are usually simplified.' },
    dtf: { id: 'dtf', name: 'DTF transfer', desc: 'Full-colour artwork with fine detail. Good for small runs and complex logos.', caution: '' },
    vinyl: { id: 'vinyl', name: 'Heat-transfer vinyl', desc: 'Crisp single-colour text, names and numbers.', caution: 'Best for simple shapes and lettering, not photos.' },
    embroidery: { id: 'embroidery', name: 'Embroidery', desc: 'Stitched, premium finish for logos and lettering.', caution: 'Fine detail, gradients and very small text are simplified to suit thread.' },
    sublimation: { id: 'sublimation', name: 'Sublimation', desc: 'Edge-to-edge colour on polyester. Ideal for jerseys.', caution: 'Works on light, polyester fabrics.' }
  };

  /* ---------- Colour library ---------- */
  A.COLORS = {
    black: { id: 'black', name: 'Black', hex: '#1b1b1c' },
    white: { id: 'white', name: 'White', hex: '#f3f1ec' },
    charcoal: { id: 'charcoal', name: 'Charcoal', hex: '#3d3f43' },
    grey: { id: 'grey', name: 'Heather Grey', hex: '#a3a5a8' },
    navy: { id: 'navy', name: 'Navy', hex: '#1d2d4d' },
    royal: { id: 'royal', name: 'Royal Blue', hex: '#2557b8' },
    red: { id: 'red', name: 'Red', hex: '#b7282e' },
    green: { id: 'green', name: 'Forest Green', hex: '#1f5a3a' },
    gold: { id: 'gold', name: 'Gold', hex: '#dba52f' },
    sand: { id: 'sand', name: 'Sand', hex: '#cfc0a0' },
    maroon: { id: 'maroon', name: 'Maroon', hex: '#6b1f2d' },
    orange: { id: 'orange', name: 'Orange', hex: '#d96a2b' }
  };

  /* ---------- Categories ---------- */
  A.CATEGORIES = [
    { id: 'all', name: 'All' },
    { id: 'everyday', name: 'Tees' },
    { id: 'outerwear', name: 'Hoodies' }
  ];

  /* ---------- Products (sample blanks — replace with the real range) ----------
     basePrice: null => "Quote required". Set a number + CONFIG.showPrices=true
     only when verified prices exist. */
  A.PRODUCTS = [
    {
      id: 'tee', name: 'Oversized Tee', category: 'everyday', tagline: 'Boxy, relaxed, built for big prints',
      desc: 'A boxy, drop-shoulder crew-neck tee — the most flexible blank for statement chest prints, back pieces and merchandise. Sample product: replace with the real blank and its specification.',
      colors: ['black', 'white', 'charcoal', 'grey', 'navy', 'royal', 'red', 'green', 'gold', 'sand'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
      views: ['front', 'back'],
      methods: ['screen', 'dtf', 'vinyl', 'embroidery'],
      basePrice: null
    },
    {
      id: 'croptee', name: 'Cropped Tee', category: 'everyday', tagline: 'Short, boxy, made for statement graphics',
      desc: 'A cropped, boxy tee with a rib collar and double-stitched hem, suited to chest graphics and small-batch fashion drops. Sample product: replace with the real blank and its specification.',
      colors: ['black', 'white', 'grey', 'sand', 'navy', 'red', 'maroon', 'green'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
      views: ['front', 'back'],
      methods: ['screen', 'dtf', 'vinyl', 'embroidery'],
      basePrice: null
    },
    {
      id: 'hoodie', name: 'Oversized Hoodie', category: 'outerwear', tagline: 'Heavy, boxy and ready for a back piece',
      desc: 'A full-volume pull-over hoodie with dropped shoulders and ribbed cuffs and hem, made for bold chest prints and back-piece artwork. Sample product: replace with the real blank and its specification.',
      colors: ['black', 'charcoal', 'grey', 'navy', 'maroon', 'green', 'sand', 'white'],
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      views: ['front', 'back'],
      methods: ['screen', 'dtf', 'embroidery'],
      basePrice: null
    }
  ];

  A.VIEW_LABELS = { front: 'Front', back: 'Back', sleeve: 'Sleeve' };

  /* ---------- Services (examples — confirm against the real offering) ---------- */
  A.SERVICES = [
    { id: 'printing', title: 'Custom Printing', text: 'Screen print, DTF and heat-transfer for tees, hoodies and merchandise.', icon: 'print' },
    { id: 'embroidery', title: 'Embroidery', text: 'Stitched logos and lettering for polos, caps and premium uniforms.', icon: 'needle' },
    { id: 'uniforms', title: 'Uniforms & Workwear', text: 'Consistent branded kit for staff, schools and churches.', icon: 'badge' },
    { id: 'jerseys', title: 'Team Jerseys', text: 'Names, numbers and crests for clubs, schools and events.', icon: 'jersey' },
    { id: 'merch', title: 'Branded Merchandise', text: 'Caps, tees and hoodies for brands, launches and giveaways.', icon: 'tag' },
    { id: 'bulk', title: 'Bulk & Event Orders', text: 'Size-by-size ordering with a quotation before anything is produced.', icon: 'stack' }
  ];

  A.STEPS = [
    { n: '01', title: 'Choose a garment', text: 'Pick a blank and colour from the range.' },
    { n: '02', title: 'Design it', text: 'Add text or upload a logo and position it on a live mockup.' },
    { n: '03', title: 'Request a quote', text: 'Add sizes and quantities, then send the request.' },
    { n: '04', title: 'Review & produce', text: 'The team reviews your artwork, confirms the quote, then produces.' }
  ];

  /* ---------- Sample portfolio (reference images, clearly labelled) ----------
     Each item is a crop of the supplied flat-lay photo (assets/source/work-flatlay.png,
     built into js/assets.js). They are reference images, NOT this business's own work —
     replace them with real completed-work photos.  `like` = the studio blank closest to
     the piece (null = no matching blank yet, so the page offers a contact enquiry). */
  A.WORK_CATEGORIES = ['All', 'Tees & tops', 'Hoodies & outerwear', 'Bottoms'];

  A.WORK = [
    { id: 'w1', cat: 'Hoodies & outerwear', title: 'Zip hoodie — chest and sleeve print', photo: 'work-ziphoodie', like: 'hoodie' },
    { id: 'w2', cat: 'Tees & tops', title: 'Washed long-sleeve — chest print', photo: 'work-longsleeve', like: 'tee' },
    { id: 'w3', cat: 'Tees & tops', title: 'Boxy tee — oval wordmark', photo: 'work-tee', like: 'tee' },
    { id: 'w4', cat: 'Tees & tops', title: 'Sleeveless top — stacked wordmark', photo: 'work-tank', like: 'tee' },
    { id: 'w5', cat: 'Hoodies & outerwear', title: 'Zip shirt — chest crest', photo: 'work-zipshirt', like: null },
    { id: 'w6', cat: 'Hoodies & outerwear', title: 'Hooded vest — oval print', photo: 'work-hoodvest', like: 'hoodie' },
    { id: 'w7', cat: 'Bottoms', title: 'Joggers — leg print', photo: 'work-joggers', like: null },
    { id: 'w8', cat: 'Bottoms', title: 'Denim shorts — leg print', photo: 'work-denim', like: null },
    { id: 'w9', cat: 'Bottoms', title: 'Mesh shorts — hem print', photo: 'work-meshshorts', like: null }
  ];

  /* Quick-start text presets used by the studio (text only) */
  A.PRESETS = {
    team: [{ text: 'TEAM NAME', font: 'condensed', size: 56 }],
    number: [{ text: '10', font: 'condensed', size: 150 }],
    business: [{ text: 'YOUR BRAND', font: 'sans', size: 38 }],
    slogan: [{ text: 'Made in Ghana', font: 'serif', size: 34, italic: true }]
  };

  A.QUOTE_STATUSES = ['New', 'Under Review', 'Quote Prepared', 'Approved', 'Declined'];
  A.PRODUCTION_STAGES = ['Awaiting Confirmation', 'In Production', 'Quality Check', 'Ready for Collection/Delivery', 'Completed'];
  A.ORG_TYPES = ['Business', 'School', 'Church', 'Sports team', 'Event organiser', 'Clothing brand', 'Other'];

  A.DISCLAIMER = 'Mockup preview only. Final artwork, print specifications and embroidery suitability require review by the business before production.';
  A.LOCAL_NOTE = 'Prototype data is stored only in this browser. Nothing is sent to the real business, and no payment is taken.';
})();
