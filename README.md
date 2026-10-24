# ATELIER 233 — custom printing & embroidery website prototype

An interactive, **demonstration-only** prototype for a Ghanaian custom clothing printing,
embroidery and apparel customization business. "ATELIER 233" is a placeholder brand.
Nothing here is a real company record, and nothing is sent to anyone.

## Run it
No build step, no dependencies. Serve the folder with any static server:

    cd atelier-prototype
    python3 -m http.server 8765      # then open http://localhost:8765

(Opening `index.html` directly also works (or use the single-file `atelier-prototype-standalone.html`) in most browsers; a server is more reliable.)

## Structure
    index.html            shell: header, mobile menu, footer, scripts
    css/styles.css        design tokens + public pages (edit colours/fonts at the top)
    css/app.css           Design Studio, bulk builder, customer area, dashboard
    js/data.js            CONFIG (company details, WhatsApp), products, colours, sizes, methods, statuses
    js/assets.js          GENERATED from assets/source/* by tools/build-assets.py (garment layers + photos)
    js/garments.js        recolours the real garment images per swatch; print areas
    assets/source/        your original images (flat-lay photo, tee sketch, hoodie sketch, black-tee photo)
    tools/                build-assets.py (regenerate js/assets.js), build-standalone.py (single-file bundle)
    js/store.js           localStorage persistence + demo seed records (labelled sample/fictional)
    js/editor.js          custom Canvas 2D editor (move/resize/rotate, undo/redo, print area)
    js/studio.js          Design Studio page      js/quote.js     shared quote dialog
    js/bulk.js            Bulk order builder      js/account.js   demo customer area
    js/dashboard.js       demo business dashboard js/pages-public.js  home, shop, product, work, about, contact
    js/app.js             hash router + shell

Fabric.js could not be installed in the build environment, so the editor is a purpose-built
Canvas 2D implementation (no external dependencies, works offline).

## Replace the placeholders
- **Company name, address, phone, email, hours, tagline:** `js/data.js` → `CONFIG`.
- **WhatsApp:** set `CONFIG.whatsappNumber` (international digits, e.g. `233501234567`), or use
  the footer link "Set WhatsApp number" to try it live. The link opens only when clicked and the
  customer must press send; the prototype never claims an order was delivered to WhatsApp.
- **Products, colours, sizes, methods, prices:** `js/data.js`. Prices stay hidden ("Quote required") until `CONFIG.showPrices` is true and `basePrice` values are filled in.
- **Real photos / portfolio:** `A.WORK` in `js/data.js` lists the gallery. To change the images, replace the files in
  `assets/source/` (or edit the crop boxes in `tools/build-assets.py`) and run `python3 tools/build-assets.py`.
- **Add a garment:** drop a front/back sketch or photo on a white background into `assets/source/`, add it to
  `tools/build-assets.py` and to `A.PRODUCTS`, set its print area in `FRAC` in `js/garments.js`, then rebuild.

## Demo script for the business owner (about 5 minutes)
1. **Home** – hero, services, bulk callout. Note the PROTOTYPE ribbon.
2. **Shop & Customize** → pick the hoodie → **Customize**.
3. **Design Studio** – change colour, add text (font/size/align/colour), upload a logo, drag/resize/rotate,
   undo/redo, switch Front/Back, choose Embroidery, enter sizes (e.g. M 5, L 7). Watch the summary update.
4. **Save draft**, then **Request a Quote** → submit with empty fields to show validation, then fill in and submit.
   Point out the unique **DEMO-…** reference and the honest "stored in this browser only" message.
5. **Open in business dashboard** – the new request is at the top with the design preview. Set the quote to
   **Approved**, then move the production stage forward.
6. **Demo customer area** – the same request shows the updated status and stage.
7. **Bulk Orders** – school/church/team form with size breakdown, total, "Quote required".
8. Footer → **Set WhatsApp number** to show the prefilled enquiry. **Reset demo data** restores a clean state.

## Honest limitations
- Data lives in this browser's localStorage only; there is no backend, email, WhatsApp or payment integration.
- Garment mockups come from the supplied sketches and blank-tee photo, recoloured in the browser, so they look like
  technical flats, not studio photography. Only three blanks exist so far (oversized tee, cropped tee, oversized
  hoodie). Polo, jersey and cap are removed until blank images for them are supplied.
- The Our Work and hero photos are the supplied flat-lay. They carry another brand's logos and are labelled
  "Reference image"; replace them with the business's own work before showing them as its portfolio.
- Previews are not production artwork; final artwork, print specs and embroidery suitability need business review.
