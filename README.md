# Blaze-Savour Shopify Theme

**A custom Shopify storefront theme with interactive product discovery, dynamic merchandising, and localized shopping experiences.**

---

## Project Purpose

Blaze-Savour is a premium Shopify theme designed for merchants who want a rich, interactive storefront without rebuilding Shopify's core commerce functionality. It features advanced filtering, product bundling ("Shop The Look"), dynamic recommendations, and multilingual support—all built on Shopify's Liquid template engine and custom Web Components.

## Primary Users

- Shopify store merchants seeking elevated UX beyond default themes
- Store managers configuring sections/blocks via Shopify's theme editor
- Shoppers browsing products via faceted filtering, bundles, and recommendations

## Tech Stack

- **Shopify Liquid** – Server-side templates for layout, sections, and snippets
- **Custom Web Components** – ES6 classes extending `HTMLElement` for interactivity
- **CSS** – Custom properties, responsive scaling, color schemes
- **Global `Theme` singleton** – Config and bootstrap object injected at runtime

## Architecture Overview

### Render Flow
1. Shopify routes requests to `/templates/*.liquid` (e.g., `product.json`, `collection.json`)
2. Templates compose sections from `/sections/*.liquid` (configurable in theme editor)
3. Sections embed blocks (`/blocks/*.liquid`) and snippets (`/snippets/*.liquid`)
4. Shopify injects theme settings and product data as Liquid variables

### Runtime Flow
1. `/snippets/scripts.liquid` defines an import map and preloads critical JS modules
2. Custom Web Components in `/assets/*.js` extend the `Component` base class
3. Components attach to DOM elements with matching `data-*` selectors
4. A global `Theme` object (set via `scripts.liquid`) provides config and utilities
5. Components handle user interaction: filtering, modals, AJAX cart operations, etc.

### Key Experiences
- **Faceted Filtering** – `/assets/facets.js` + `/snippets/facets-*.liquid`
- **Shop The Look** – `/assets/shop-the-look.js` + `/sections/shop-the-look.liquid`
- **Product Recommendations** – `/assets/product-recommendations.js`
- **Stock Display** – `/assets/product-inventory.js`
- **Announcement Bar** – `/assets/announcement-bar.js` (rotating banners)
- **QR Code (Gift Cards)** – `/assets/qr-code-generator.js` + `/assets/qr-code-image.js`

## Project Status

**Actively developed private theme** – Not intended for general release. Used by hand-selected merchants.

## Current Top Priorities

1. **Refactor facets.js** – Decouple filtering logic from currency/sorting concerns; add comprehensive error handling
2. **Harden Shop The Look** – Add input validation, product slot limits, graceful fallback UI
3. **Stabilize Theme global** – Document required shape; add runtime guards; begin migration to ES6 modules
4. **Audit QR code usage** – Determine if legacy `qr-code-generator.js` is still necessary; if used, wrap behind adapter
5. **Add accessibility audits** – Especially gift card forms and dynamic content updates

---

## How to Use the Documentation

### I want to understand the project
👉 **Start here:** [`/docs/PROJECT_GUIDE.md`](./docs/PROJECT_GUIDE.md)  
This explains what Blaze-Savour does, who uses it, and why it matters.

### I'm a developer setting up my computer
👉 **Go here:** [`/docs/RUNBOOK_LOCAL_DEV.md`](./docs/RUNBOOK_LOCAL_DEV.md)  
Follow the steps to install everything and run the theme locally.

### I need to know how the code is organized
👉 **Go here:** [`/docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)  
This shows every folder, how the pages load, and how data flows through the system.

### I'm building a new component or page
👉 **Go here:** [`/docs/STYLE_GUIDE_UI.md`](./docs/STYLE_GUIDE_UI.md)  
Copy colors, spacing, and component patterns from here.

### I'm worried about security or safety
👉 **Go here:** [`/docs/SECURITY_MODEL.md`](./docs/SECURITY_MODEL.md)  
This explains what's dangerous and what rules to follow.

### I need to write copy or messages for the store
👉 **Go here:** [`/docs/COMMS_TONE.md`](./docs/COMMS_TONE.md)  
This shows the voice and style for all messages.

### I need to fix or improve a specific area
👉 **Go here:** [`/specs/`](./specs/)  
Pick a file that matches your task:
- `facets_refactor.md` – Improve product filtering
- `shop_the_look_validation.md` – Fix product bundles
- `resource_image_hardening.md` – Fix images that break
- `theme_global_refactor.md` – Clean up the Theme object
- `qr_code_audit.md` – Work with QR codes

### I want to see all the work that needs to be done
👉 **Go here:** [`TASKS.md`](./TASKS.md)  
This lists everything to fix, improve, and investigate.

---

## How to Write a PRD (Product Requirements Document) in Markdown

A **PRD** is a document that describes a new feature or change. Use this template for all new work:

### 1. Create the file
```
/specs/feature-name.md
```

### 2. Use this template

```markdown
# Feature: [Name of the feature]

## What is it?
Explain in 2–3 sentences what this does.

## Why do we need it?
Why is this important? What problem does it solve?

## Who uses it?
Shoppers? Store managers? Developers?

## How it works (simple version)
Draw a simple picture with words:
1. User does X
2. System does Y
3. Result is Z

## What we're changing
- What's broken now?
- What will be different after this is done?

## How to build it (steps)
1. First step (1–2 weeks)
2. Second step (1–2 weeks)
3. Third step

## How to test it
- What should work?
- How do we know it's working?

## Done when...
- [ ] Tests pass
- [ ] No error messages
- [ ] Works on phone and computer
- [ ] Accessible (screen readers work)

## Risks or problems
- What could go wrong?
- How do we fix it?

## Questions
- Anything we're not sure about?

## Related docs
- Link to ARCHITECTURE.md section if relevant
- Link to STYLE_GUIDE_UI.md if building UI
- Link to SECURITY_MODEL.md if it involves data
```

### 3. Keep it simple
- Use short sentences
- Explain technical words
- Use bullet points instead of long paragraphs
- Add examples when possible
- Draw ASCII diagrams if helpful

### 4. Add it to TASKS.md
After creating your PRD, add it to [`TASKS.md`](./TASKS.md) under "Open Tasks" so everyone knows it exists.

### Example PRD

```markdown
# Feature: Dark Mode

## What is it?
Add a button so shoppers can switch the store to dark colors at night.

## Why do we need it?
Shoppers say the bright white hurts their eyes after dark. Dark mode helps.

## Who uses it?
Shoppers browsing the store on their phones or computers.

## How it works
1. Shopper clicks a moon icon in the header
2. Everything turns dark (white → black, black → light gray)
3. The choice is saved so it's dark next time they visit

## What we're changing
- Add moon/sun button to header
- Change CSS colors when "dark mode" is on
- Save choice in browser memory (localStorage)

## How to build it
1. Add button to header.liquid (1 day)
2. Add CSS dark mode styles to base.css (2 days)
3. Add JavaScript to toggle and save (1 day)
4. Test on phone and desktop (1 day)

## How to test it
- Click the button → colors change
- Refresh page → dark mode stays on
- Open on different device → still light mode (not saved there)

## Done when
- [ ] Button visible in header
- [ ] All colors change correctly
- [ ] Choice saved between visits
- [ ] Works on phone, tablet, and computer
- [ ] Accessible (button has label for screen readers)

## Risks
- Colors might not have enough contrast (could hurt accessibility)
- Old browsers might not support localStorage

## Questions
- Should we auto-detect if shopper uses dark mode on their device?
- What about product images – should they change too?
```

---

**For detailed architecture, see [`/docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)**  
**For open tasks and tech debt, see [`TASKS.md`](./TASKS.md)**
