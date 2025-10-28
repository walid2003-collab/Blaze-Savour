# Architecture Guide: Blaze-Savour

This document explains how the codebase is organized and how data flows at both server (Liquid) and client (JavaScript) time.

---

## 1. Directory Map

### `/assets/` – JavaScript, CSS, and Utilities

**Purpose:** All client-side logic and styling.

#### JavaScript Modules (ES6)

- **`component.js`** – Base class for all custom Web Components
  - Manages `[ref]` attributes for DOM element lookups
  - Handles `requiredRefs` validation
  - Sets up mutation observers for dynamic DOM changes
  - All custom components extend this

- **`facets.js`** (~900 lines) – Faceted filtering & sorting
  - Converts form data to URL parameters
  - Sends AJAX requests to update collection views
  - Handles currency formatting
  - **HIGH RISK:** Tightly coupled; see `/specs/facets_refactor.md`

- **`shop-the-look.js`** (~380 lines) – Product bundle modal
  - Carousel navigation, modal open/close
  - AJAX cart functionality ("Add all to bag")
  - **HIGH RISK:** Hardcoded slots; no validation; see `/specs/shop_the_look_validation.md`

- **`product-recommendations.js`** – Dynamic recommendation carousel
  - Fetches recommendations via Shopify API
  - Gracefully hides if fetch fails
  - Uses `recently-viewed-products.js` to track history

- **`product-inventory.js`** – Real-time stock display
  - Updates inventory counts on product page
  - Shows "low stock" / "out of stock" warnings
  - Refreshes on variant selection

- **`announcement-bar.js`** – Rotating announcement carousel
  - Manages open/close state
  - Stores dismiss preference in session storage
  - Auto-rotates messages

- **`gift-card-recipient-form.js`** (~415 lines) – Gift card customization
  - Handles "send to me" vs "send to recipient" toggle
  - Validates recipient fields (email, name, message, date)
  - Character counter for message
  - **RISK:** Missing accessibility features; see `TASKS.md`

- **`qr-code-generator.js`** (~1,700 lines) – Legacy QR code library
  - Pre-ES6, heavy on magic numbers
  - Actively used in gift card template
  - **RISK:** Legacy code; see `/specs/qr_code_audit.md`

- **`qr-code-image.js`** – Web Component wrapping QR generator
  - Imports `qr-code-generator.js`
  - Defines `<qr-code-image>` custom element
  - Used in `/templates/gift_card.liquid`

- **`section-renderer.js`** – Dynamic section re-rendering (Shopify Section Rendering API)
  - Intelligently updates DOM on section changes
  - Uses morphdom-like strategy
  - Handles shadow root edge cases

- **`jumbo-text.js`** – Responsive font sizing
  - Binary search to find optimal font size for container
  - Applied to hero/jumbo headings
  - **RISK:** Potential layout thrashing on resize; no debounce visible

- **`variant-picker.js`** – Product variant selection UI
  - Swatches, dropdowns, or buttons
  - Updates product data on selection
  - Integrates with product form

- **`product-form.js`** – Add-to-cart logic
  - Handles quantity, variant selection, options
  - Posts to cart API
  - Shows success/error feedback

- **`media-gallery.js`** – Product image gallery
  - Lightbox / zoom on click
  - Swipe/keyboard navigation
  - Syncs with variant images

- **`slideshow.js`** – Generic carousel component
  - Used for hero sections, image galleries, testimonials
  - Keyboard navigation, auto-play optional
  - Responsive indicator dots

- **`quick-add.js`** – Add-to-cart from product cards
  - Mini product form overlay
  - Modal variant selector
  - Toast notification on success

- **`product-card.js`** – Product card interactive features
  - Hover states, image swaps, wishlist toggle
  - Integrates with `quick-add.js`

- **`recently-viewed-products.js`** – Track viewed products
  - Stores in localStorage with timestamp
  - Used by recommendations
  - Provides Recently Viewed section

- **`search-page-input.js`** – Search box with autocomplete
  - Integrates with predictive search
  - Handles form submission

- **`predictive-search.js`** – Real-time search dropdown
  - AJAX autocomplete as user types
  - Shows products, collections, articles
  - Keyboard navigation

- **`focusable.js`** – Focus management utilities
  - Trap focus inside modals/drawers
  - Restore focus on close
  - Used by modals, drawers, popovers

- **`localization.js`** – Multi-language support
  - Currency switching
  - Number/date formatting per locale
  - Fallback text if translation missing

- **`utilities.js`** – Shared helpers
  - `debounce()`, `throttle()`, `formatMoney()`
  - `startViewTransition()` for view transitions API
  - `requestIdleCallback()` polyfill

- **`critical.js`** – Performance optimizations
  - Lazy loading setup
  - `DeclarativeShadowElement` base class
  - Critical rendering path optimizations

- **Other utilities:** `scrolling.js`, `performance.js`, `theme-editor.js`, `events.js`, etc.

#### Stylesheets

- **`base.css`** (~4,286 lines) – Global styles
  - CSS custom properties (variables) for colors, spacing, typography
  - Hover effects, transitions, responsive scaling
  - Reset + base element styles
  - **Note:** Color schemes set dynamically via `color-schemes.liquid`

- **`overflow-list.css`** – Utility for truncating long lists
- **`template-giftcard.css`** – Gift card page-specific styles

#### Configuration

- **`jsconfig.json`** – Path aliases (e.g., `@theme/component`)
- **`global.d.ts`** – TypeScript type definitions for `Theme` global and Shopify objects

---

### `/sections/` – Full Page/Content Sections

**Purpose:** Large, configurable sections (theme editor drops these in)

Common sections:

- **`main-collection.liquid`** – Collection page with facets + product grid
- **`main-product.liquid`** – Product page with media, variant picker, recommendations
- **`main-blog.liquid`** – Blog listing
- **`main-blog-post.liquid`** – Individual blog post
- **`shop-the-look.liquid`** – Shop The Look carousel section
- **`slideshow.liquid`** – Hero slideshow section
- **`hero.liquid`** – Static hero banner
- **`product-list.liquid`** – Generic product grid
- **`product-recommendations.liquid`** – Recommendation carousel
- **`featured-product.liquid`** – Single product showcase
- **`footer.liquid`** – Footer with settings
- **`header.liquid`** – Navigation + logo
- **`marquee.liquid`** – Scrolling ticker text

Each section has:
- Schema defining settings & blocks (for theme editor)
- Liquid markup
- Optional CSS (scoped with section ID)
- Optional JS initialization

---

### `/blocks/` – Reusable Building Blocks

**Purpose:** Smaller components that nest inside sections

**Convention:** Files prefixed with `_` are considered "private/internal" blocks not meant to be dropped directly in theme editor by merchants.

Examples:

- `_accordion-row.liquid` – Accordion item (used inside `_accordion.liquid`)
- `_blog-post-card.liquid` – Blog card (used inside section)
- `_blog-post-content.liquid` – Blog content container
- `_collection-card.liquid` – Collection card (used in grids)
- `_collection-link.liquid` – Collection menu link
- `_content.liquid` – Generic content wrapper with spacing
- `_divider.liquid` – Horizontal divider
- `_featured-blog-posts-card.liquid` – Featured blog card

Public blocks (no `_` prefix):

- `accordion.liquid` – Accordion section
- `announcement.liquid` – Announcement banner
- `media.liquid` – Media (image/video) block
- `video.liquid` – Video block
- `text.liquid` – Text/rich-text block
- `button.liquid` – CTA button block

---

### `/snippets/` – Reusable Liquid Fragments

**Purpose:** DRY up templates by extracting repeated Liquid logic

#### Rendering / Layout

- **`section.liquid`** – Wrapper for section schema & rendering
- **`product-grid.liquid`** – Renders a grid of product cards
- **`resource-list.liquid`** – Generic resource (product/collection/article) list
- **`resource-card.liquid`** – Generic resource card with image + metadata
- **`product-card.liquid`** – Product card with image, price, rating, quick-add
- **`collection-card.liquid`** – Collection card

#### Media / Images

- **`resource-image.liquid`** (~120 lines) – Smart image rendering
  - Detects content type (product, collection, article, blog)
  - Calculates responsive sizes
  - Generates placeholder
  - Sets aspect ratio
  - **HIGH RISK:** Assumes data shape; see `/specs/resource_image_hardening.md`

- **`media.liquid`** – Render image/video/embed
- **`card-gallery.liquid`** – Image gallery with thumbnails
- **`image.liquid`** – Single image with srcset
- **`video.liquid`** – Video embed (YouTube, Vimeo, etc.)
- **`background-image.liquid`** – CSS background image
- **`background-video.liquid`** – CSS background video

#### Forms

- **`input.liquid`** – Text input with label, error state
- **`checkbox.liquid`** – Checkbox with label
- **`contact-form.liquid`** – Contact form with validation
- **`gift-card-recipient-form.liquid`** – Gift card customization form
- **`localization-form.liquid`** – Language/currency selector
- **`cart-note.liquid`** – Special instructions for order

#### Navigation & Menu

- **`header-drawer.liquid`** – Mobile menu drawer
- **`header-menu.liquid`** – Desktop main menu
- **`mega-menu.liquid`** – Multi-column dropdown menu
- **`sortable.liquid`** – Sorting controls
- **`filter-remove-buttons.liquid`** – Active filters display
- **`facets-actions.liquid`** – Filter form controls

#### Utilities / Styling

- **`color-schemes.liquid`** – Inject CSS variables per color scheme
  - Defines `--color-background`, `--color-foreground`, `--color-primary`, etc.
  - Calculates opacity values based on background brightness
  - Applied via `.color-<scheme-id>` class

- **`spacing-style.liquid`** – Inject spacing (padding/margin) CSS
- **`gap-style.liquid`** – Inject gap CSS for grid/flex
- **`size-style.liquid`** – Inject width/height CSS
- **`typography-style.liquid`** – Font size, line-height CSS
- **`theme-styles-variables.liquid`** – All CSS var definitions

#### Meta / Scripts

- **`scripts.liquid`** – Import map, modulepreload links, critical JS
  - Sets up `@theme/*` import aliases
  - Preloads common modules
  - Conditionally loads section-specific JS

- **`stylesheets.liquid`** – Link tags for CSS
- **`fonts.liquid`** – Font preload/load
- **`meta-tags.liquid`** – OG, Twitter cards, structured data
  - **RISK:** Missing schema.org; see `TASKS.md`

#### Other

- **`icon.liquid`** – Icon SVG rendering (200+ case/when)
- **`overlay.liquid`** – Semi-transparent overlay
- **`divider.liquid`** – Horizontal divider element
- **`text.liquid`** – Formatted text block
- **`button.liquid`** – Styled button element
- **`disclosure-trigger.liquid`** – Details/summary trigger
- **`disclosure-content.liquid`** – Details/summary content

---

### `/templates/` – Page-Level Layouts

**Purpose:** Shopify system pages, bound to resource types

- **`index.json`** – Homepage (sections config)
- **`product.json`** – Product page (sections config)
- **`collection.json`** – Collection page (sections config)
- **`blog.json`** – Blog listing (sections config)
- **`article.json`** – Blog post (sections config)
- **`cart.json`** – Cart page (sections config)
- **`page.json`** – Generic static page (sections config)
- **`search.json`** – Search results page (sections config)
- **`404.json`** – 404 page (sections config)
- **`list-collections.json`** – Collections listing
- **`gift_card.liquid`** – Gift card page (not JSON)
  - Shows gift card code, balance, QR code
  - Uses `qr-code-image.js` custom element

Each `.json` template is a Shopify "theme settings" schema that defines which sections can appear.

---

### `/locales/` – Internationalization (i18n)

- **`en.json`** – English (default)
- **`de.json`** – German
- **`nl.json`** – Dutch
- **`fr.json`** – French
- etc.

Each file contains nested JSON with translation keys:

```json
{
  "general": {
    "404": { "title": "Page Not Found", "subtext": "..." },
    "search": { "title": "Search", "no_results": "..." }
  },
  "products": { "title": "Products", ... },
  "cart": { "title": "Shopping Cart", ... }
}
```

Used in templates via `{{ 'key.path' | t }}` Liquid filter.

---

### `/config/` – Theme Configuration

- **`settings_schema.json`** – Theme editor settings (colors, fonts, spacing)
- **`settings_data.json`** – Current theme setting values (merchant-configurable)

---

## 2. Render Pipeline (Liquid → HTML)

### Request Flow

1. **Shopify routes request** to appropriate template based on URL
   - `/products/{handle}` → `templates/product.json`
   - `/collections/{handle}` → `templates/collection.json`
   - `/` → `templates/index.json`
   - etc.

2. **Shopify injects data** as Liquid variables
   - `{{ product }}` – Current product object
   - `{{ collection }}` – Current collection
   - `{{ settings }}` – Theme settings from `config/settings_data.json`
   - `{{ request }}` – Request metadata (locale, device, etc.)

3. **Template includes sections** via `{% section ... %}`
   - Each section has its own schema (color, layout options, etc.)
   - Shopify passes section settings as `section.settings`

4. **Sections render blocks** via `{% for block in section.blocks %}`
   - Each block receives `block.settings` and `block.type`

5. **Blocks/snippets inject markup and CSS**
   - CSS is scoped to section ID or uses global classes
   - Liquid `{% style %}` tags embedded in HTML

6. **Snippets included via `{% render ... %}`**
   - Isolated scope (variables not leaked)
   - Can pass parameters

7. **Final HTML + inline CSS/JS** sent to browser

### Example: Collection Page

```
templates/collection.json
  ├─ schema: which sections allowed
  ├─ sections/main-collection.liquid
  │  ├─ section.settings.enable_filters
  │  ├─ snippets/facets-actions.liquid (filter form)
  │  ├─ snippets/product-grid.liquid
  │  │  └─ product-card.liquid (repeated per product)
  │  │     └─ snippets/resource-image.liquid
  │  │     └─ snippets/price.liquid
  │  └─ <script src="facets.js"></script>
  ├─ sections/header.liquid (appears on all pages)
  ├─ sections/footer.liquid (appears on all pages)
```

---

## 3. Runtime Pipeline (JavaScript)

### Boot Sequence

1. **Browser parses HTML** (emitted by Liquid render)
2. **`scripts.liquid` snippet executed**
   - Defines `<script type="importmap">` for `@theme/*` aliases
   - Preloads critical modules (`critical.js`, `utilities.js`, etc.)
   - Injects global `Theme` object with config
   - **RISK:** Load-order dependency; see `/specs/theme_global_refactor.md`

3. **Critical JS loads** (before page interactive)
   - `critical.js` – Perf optimizations, shadow DOM setup
   - `utilities.js` – Shared helpers

4. **Deferred JS loads** (after interactive)
   - Section-specific components (facets, shop-the-look, product form, etc.)
   - Uses dynamic `import()` where possible

### Component Lifecycle

Each custom Web Component follows this pattern:

```javascript
class MyComponent extends Component {
  requiredRefs = ['formElement', 'submitButton'];

  connectedCallback() {
    super.connectedCallback();
    // Component is attached to DOM
    this.refs.submitButton.addEventListener('click', () => {
      this.#handleSubmit();
    });
  }

  #handleSubmit() {
    // User interaction logic
  }

  disconnectedCallback() {
    // Cleanup (remove listeners, timers, etc.)
  }
}

customElements.define('my-component', MyComponent);
```

### Data Flow Example: Faceted Filtering

1. **User selects a filter** (checkbox, price range, etc.)
2. **Change event fires** on form input
3. **`facets.js` catches event**, calls `createURLParameters()`
4. **New URL built** with filter params (e.g., `?filter.v.size=M&filter.v.price.lte=50`)
5. **AJAX request sent** to collection URL with filters
6. **Shopify renders filtered collection HTML**
7. **`section-renderer.js` diffs** old DOM vs new, updates in-place
8. **Browser history updated** with new URL (without full page reload)

### Data Flow Example: Shop The Look Modal

1. **User clicks "View Look" on look card**
2. **`shop-the-look.js` finds product handles** (e.g., `product_1`, `product_2`, ...)
3. **Modal renders** with product carousel
4. **User clicks product** → navigates to product page OR clicks "Add to Cart"
5. **AJAX POST** to `/cart/add.js` with product ID + variant
6. **Shopify adds to cart**, returns JSON response
7. **Toast notification shown** (success / error)
8. **Cart icon updates** with new count

### Event System

Custom events defined in `/assets/events.js`:

- **`FilterUpdateEvent`** – Fired when facet filter changes
- **`CartAddEvent`** – Fired when product added to cart
- **`CartErrorEvent`** – Fired on cart API error
- etc.

Components subscribe to these via:

```javascript
document.addEventListener('cart-add', (event) => {
  console.log('Product added:', event.detail);
});
```

---

## 4. Styling Architecture

### CSS Variable System

**Defined in `/snippets/color-schemes.liquid`:**

- `--color-background` – Primary background color
- `--color-foreground` – Text color
- `--color-primary` – Brand accent color
- `--color-primary-button-background` – Button background
- `--color-input-background` – Form input background
- `--color-border` – Border color
- etc.

**Dynamically applied** based on color scheme selected in theme editor:

```css
.color-light {
  --color-background: #ffffff;
  --color-foreground: #1a1a1a;
  /* ... */
}

.color-dark {
  --color-background: #1a1a1a;
  --color-foreground: #ffffff;
  /* ... */
}
```

**Opacity helpers** calculated at render time:

```css
--opacity-5-15: 0.05;    /* Light background */
--opacity-10-25: 0.1;
--color-border: rgb(var(--color-foreground-rgb) / var(--opacity-10-25));
```

### Responsive Scaling

**Spacing scale** defined per breakpoint:

```liquid
{% if request.design_mode %}
  {% assign spacing_scale_mobile = ... %}
  {% assign spacing_scale_tablet = ... %}
  {% assign spacing_scale_desktop = ... %}
{% endif %}

<style>
  .section {
    padding: max(20px, calc(var(--spacing-scale) * 20px));
  }
</style>
```

**`max()`** function ensures minimum pixel value while scaling.

---

## 5. Data Contracts

### Product Data (Liquid)

Shopify provides `product` object with:

```liquid
product.id
product.handle
product.title
product.vendor
product.images[0].url
product.featured_image
product.price (in cents)
product.compare_at_price
product.variants[0] { id, title, price, ... }
product.collections[*].handle
product.metafields { key: value }
```

### Collection Data (Liquid)

```liquid
collection.id
collection.handle
collection.title
collection.image
collection.products_count
collection.sort_options (for filtering)
```

### Settings Data (Liquid)

```liquid
settings.color_schemes[*] { id, label, settings: { ... } }
settings.spacing_scale
settings.font_scale
settings.enable_animations
settings.cart_type (drawer vs page)
```

---

## 6. Performance Considerations

### Critical Rendering Path

1. **HTML** – Sent early
2. **CSS** – Inline in `<head>` for critical styles (`critical.js`)
3. **JS** – Deferred or async; only critical modules in `<head>`

### Code Splitting

- **Critical modules preloaded:** `critical.js`, `utilities.js`, `component.js`, `section-renderer.js`
- **Section-specific modules loaded on-demand:** `facets.js` loaded only on collection page

### Image Optimization

- **`resource-image.liquid`** generates `srcset` and `sizes` attrs
- Shopify CDN handles image resizing
- Lazy loading with `loading="lazy"`

### Caching

- **Browser cache** – CSS/JS cached for 1 year (versioned by Shopify)
- **Section state** – Section Rendering API caches rendered sections
- **Recently viewed** – Stored in localStorage

---

## 7. Security Model

**Theme JS is client-side and runs in user's browser.**

### What is Safe

- Reading product data, prices, inventory (public anyway)
- Rendering UI based on user preferences
- Form submission (to Shopify's safe endpoints)
- Storing non-sensitive data in localStorage

### What is Risky

- **Never trust user input** – Facets must sanitize filter parameters before injecting into requests
- **Never expose admin secrets** – API keys, webhooks, etc. stay server-side
- **Never trust client-side calculations** – Price, inventory, stock always server-authoritative
- **Never assume write access** – Theme can't modify products, customers, orders (Shopify blocks this)

### Checkout Security

- Shopify owns checkout (not theme)
- Theme can style checkout but not access payment data
- Theme must not intercept credit card information

---

## 8. See Also

- **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)** – Business context & experiences
- **[SECURITY_MODEL.md](./SECURITY_MODEL.md)** – Data guardrails
- **[TASKS.md](../TASKS.md)** – Known risks & refactoring work
