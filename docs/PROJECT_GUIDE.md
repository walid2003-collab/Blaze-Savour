# Project Guide: Blaze-Savour Shopify Theme

## 1. Problem This Theme Solves

Blaze-Savour addresses the need for **custom Shopify storefronts with richer merchandising and interactive product discovery**, without requiring a complete Shopify rebuild.

Specifically, it delivers:

- **Faceted filtering & sorting** for collections – More granular product discovery than default themes
- **"Shop The Look" bundles** – Curated product sets in a modal, allowing cross-sell and impulse purchases
- **Dynamic product recommendations** – AJAX-powered suggestions based on product/collection context
- **Inventory & stock messaging** – Real-time availability display with customer urgency/scarcity cues
- **Announcement bar** – Rotating marketing messages for promotions
- **Localization** – Multi-language support with translated UI and currency handling
- **Responsive media components** – Smart image serving with aspect ratio management and placeholders
- **QR codes** – For gift card scanning in-store

All of this is built on Shopify's stable Liquid templating + custom Web Components, minimizing vendor lock-in and allowing incremental feature additions.

---

## 2. Who It's For

**Primary Audience:**
- Shopify store merchants seeking a **premium storefront experience** beyond generic Shopify themes
- Stores with higher AOV (average order value) who benefit from thoughtful UX
- Merchants comfortable with code or willing to hire developers for customization

**Secondary:**
- Shopify agencies building custom experiences for clients
- Stores needing **multilingual/multi-region support**

---

## 3. Core Storefront Experiences

### Faceted Filtering & Sorting
- Collections and search pages display interactive filters (price ranges, product tags, inventory status)
- Users refine product listings without page reload (AJAX pagination)
- Results count and "no products found" state handled gracefully
- **Location:** `/assets/facets.js`, `/snippets/facets-*.liquid`, `/sections/main-collection.liquid`

### Shop The Look
- Merchants create "look" sections with up to 5 bundled products
- Customers click a "View Look" modal, seeing all products in a carousel
- Modal allows adding all products to cart at once or individually
- Enhances cross-sell and discovery
- **Location:** `/assets/shop-the-look.js`, `/sections/shop-the-look.liquid`, `/snippets/shop-look-modal.liquid`

### Dynamic Product Recommendations
- Powered by Shopify's recommendation API or custom logic
- Shows related products, recently viewed, or complementary items
- Fails gracefully if API is unavailable
- **Location:** `/assets/product-recommendations.js`, `/sections/product-recommendations.liquid`

### Stock / Availability Messaging
- Real-time inventory display (e.g., "Only 3 left in stock")
- Low stock warnings to create urgency
- Out-of-stock state with pre-order/notify options
- **Location:** `/assets/product-inventory.js`, `/snippets/product-card.liquid`

### Announcement Bar
- Top-of-page rotating banners for promotions, shipping info, alerts
- Configurable via theme editor
- Dismissible with session storage
- **Location:** `/assets/announcement-bar.js`, `/sections/header-announcements.liquid`

### Responsive Media Components
- Smart image loading with `srcset` and `sizes`
- Automatic aspect ratio detection and placeholder generation
- Responsive video embeds
- **Location:** `/snippets/resource-image.liquid`, `/snippets/media.liquid`, `/snippets/video.liquid`

### Localization
- Multi-language UI via `/locales/*.json`
- Currency formatting with `facets.js` currency data
- RTL support (framework present, test coverage TBD)
- **Location:** `/assets/localization.js`, `/locales/*.json`

### QR Code (Gift Cards)
- Gift card page generates scannable QR code for in-store redemption
- Powered by legacy `qr-code-generator.js` library
- **Location:** `/templates/gift_card.liquid`, `/assets/qr-code-generator.js`, `/assets/qr-code-image.js`

---

## 4. Out of Scope / Do Not Build

**Theme JS must NOT:**
- Implement custom checkout logic (Shopify owns checkout; use built-in payment gateways)
- Expose admin-only data (products, prices, customer data) to client-side code
- Assume write access to Shopify resources (theme is read-only for customers)
- Implement customer-to-customer messaging/chat
- Create multi-tenant theme manager (Shopify theme settings are the system of record)
- Replace Shopify's order tracking, account pages, or password reset flows

**Do not expand these without explicit confirmation:**
- QR code features beyond gift cards (legacy code, unclear scope)
- Recommendation algorithm customization (use Shopify's API as-is)
- Payment processing customization (use Shopify Payments or approved partners)

---

## 5. Known Pain / Friction

### Code-Level Friction

1. **Facets Logic is Tightly Coupled** (~900 lines in one file)
   - Filtering, sorting, and currency formatting live together
   - Hard to test individual concerns
   - Currency data embedded at bottom (~line 891)
   - **Impact:** New filter types require touching a huge file; bugs affect multiple features

2. **Shop The Look is Fragile**
   - Hardcoded product slots 1–5 with no validation
   - No input sanitization; assumes product handles are safe
   - Falls apart if fewer than 5 products provided or a handle is invalid
   - **Impact:** Modal fails silently; customer sees nothing instead of fallback

3. **Global Theme Object = Silent Failures**
   - Implicit load-order dependency; many components assume `window.Theme` exists
   - If `scripts.liquid` doesn't execute, components break
   - No error message; UI just doesn't work
   - **Impact:** Hard to debug; new developers don't know why code fails

4. **Resource Image Assumptions**
   - `resource-image.liquid` assumes data shape (aspect ratio, placeholder, content type)
   - If assumptions break, fallback behavior unclear
   - ~120 lines of logic tied to Shopify product structure
   - **Impact:** Changes to Shopify data shape could break image rendering across entire site

5. **Gift Card Form Accessibility Gaps**
   - Error display relies on `liveRegion` element that may not exist in DOM
   - Date input uses HTML5 `pattern` attr (poor mobile UX)
   - Character counter isn't announced to screen readers
   - **Impact:** Screen reader users miss validation feedback; date picker frustrating on mobile

### Process-Level Friction

6. **No Test Suite**
   - Complex logic (font sizing binary search, QR code generation, facet filtering) untested
   - Regression risk on refactors
   - **Impact:** Slow iteration; fear of breaking changes

7. **Spacing/Sizing Utilities Duplicated**
   - `spacing-style.liquid`, `gap-style.liquid`, `size-style.liquid` repeat similar logic
   - **Impact:** Changes to spacing scale require updates in 3+ places

8. **Icon System Manual**
   - 200+ line `case/when` with inline SVGs
   - Adding new icons is tedious
   - **Impact:** Icon requests pile up; icon system hard to extend

9. **No Architecture/Intent Documentation**
   - Theme structure unclear to new devs
   - Why is code organized this way? What are conventions?
   - **Impact:** Slow onboarding; inconsistent new code

---

## 6. Design Principles

While building on Blaze-Savour, follow these:

1. **Stability over Features** – Fix known fragility (facets, shop-the-look, global Theme) before adding new features
2. **Progressive Enhancement** – JS is an enhancement; core functionality works without it (where appropriate)
3. **Merchant Control** – Settings in theme editor > hardcoded values
4. **Accessibility First** – WCAG 2.1 AA is table stakes; test with screen readers
5. **Performance Conscious** – Track bundle size; profile rendering; avoid layout thrashing
6. **Documentation Counts** – Comments > clever code; intent must be clear

---

## 7. Success Metrics

A healthy theme codebase has:
- ✓ Clear architecture with documented conventions
- ✓ Isolated, testable components
- ✓ Error handling that degrades gracefully
- ✓ Accessibility baked in (not bolted on)
- ✓ Test coverage for complex logic
- ✓ Onboarding docs for new developers

Today, Blaze-Savour is missing most of these. **That is the work ahead.**

---

## 8. Related Documents

- **[README.md](../README.md)** – Project overview & tech stack
- **[TASKS.md](../TASKS.md)** – Open tasks & technical debt
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** – How code is organized & data flows
- **[SECURITY_MODEL.md](./SECURITY_MODEL.md)** – Data guardrails & access rules
