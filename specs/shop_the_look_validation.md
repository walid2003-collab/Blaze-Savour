# Spec: Shop The Look Validation & Hardening

**Status:** Open  
**Priority:** HIGH  
**Effort:** 1–2 sprints

---

## Summary

`shop-the-look.js` (~380 lines) hardcodes 5 product slots (`product_1`–`product_5`) with no validation of product handles, data existence, or fallback UI. This spec defines how to validate inputs, handle missing products, and ensure accessible modal behavior.

---

## Goal / Why This Matters

1. **Robustness** – Currently fails silently if product handles are invalid or missing
2. **User Experience** – Customer sees blank modal or broken layout instead of helpful fallback
3. **Accessibility** – Modal focus trap and ARIA attributes not documented; behavior untested
4. **Configurability** – Hardcoded 5-slot limit; should be flexible or at least validated
5. **Data Sanitization** – Product handles concatenated without escaping; XSS risk if not careful

---

## User Story

**As a** store manager  
**I want to** curate "Shop The Look" bundles with multiple products  
**So that** customers can discover and purchase complete outfits

**Acceptance:**
- Modal opens with all products visible
- If a product is out of stock, shown with "Sold out" state
- If a product handle is invalid, shown with placeholder instead of blank
- "Add all to cart" button works; individual product buttons work
- Modal is keyboard-accessible (Tab, Enter, Escape)
- Screen reader announces modal title and instructions

---

## UX Contract

### Surfaces Touched

- Shop The Look section (`/sections/shop-the-look.liquid`)
- Look carousel cards (`/snippets/shop-look-modal.liquid`)
- Modal content (product grid, add-to-cart buttons)
- Cart integration (AJAX add, toast notification)

### Required States

1. **Closed** – Carousel of look cards visible; "View Look" button on each card
2. **Loading** – Modal opening, spinner shown, form disabled
3. **Loaded** – Modal open, carousel of products, focus trapped inside
4. **Product missing** – Slot shows placeholder image + "Product unavailable" text (not empty)
5. **Product out of stock** – "Sold out" badge, button disabled
6. **Success** – "Added X items to cart" toast notification
7. **Error** – "Couldn't add to cart" message, retry option
8. **Closed again** – Focus returns to "View Look" button, modal removed from DOM

### Accessibility Requirements

- Modal has `aria-modal="true"` and `aria-label="Shop The Look: [Look Name]"`
- Tab key cycles within modal only (focus trap)
- Escape key closes modal
- Focus returns to trigger button on close
- Product availability announced ("Sold out" is clear, not just visual)
- "Add all" button labeled clearly
- Carousel instructions announced ("Use arrow keys to navigate")
- Live region announces "Item added to cart" or error

---

## Data Contract

### Inputs

**From Liquid schema (per look):**

```liquid
"product_1": "winter-coat",       // Product handle (validated before render)
"product_2": "wool-scarf",
"product_3": "leather-gloves",
"product_4": "knit-hat",
"product_5": "boots-brown",
"look_name": "Winter Essentials"
```

**Product data (from Shopify):**

```javascript
{
  id: 123456,
  handle: "winter-coat",
  title: "Wool Winter Coat",
  image: { src: "...", alt: "..." },
  price: 9999,                    // In cents
  compare_at_price: 12999,
  available: true,
  variants: [
    { id: 1, title: "Small", available: true },
    { id: 2, title: "Medium", available: true },
    { id: 3, title: "Large", available: false }
  ]
}
```

### Validation Rules

**Product handles:**
- Must exist in Shopify (theme renders with product data, not as string)
- Must be non-empty string
- Allowed chars: a–z, 0–9, hyphen (standard Shopify handle format)
- Max length: 255 chars

**Slot limits:**
- Minimum: 1 product (only 1 item in look)
- Maximum: 10 products (configurable; default 5; merchant can set via schema)
- Fewer than max is OK (e.g., 3 products in a 5-slot look)
- Empty slots show placeholder

**Product status:**
- If handle invalid or doesn't resolve: show placeholder + "Product unavailable"
- If product available: show with price + add button
- If product out of stock: show "Sold out" badge; button disabled but clickable (shows error toast)

### Outputs

**On success:**

```javascript
{
  items_added: 5,
  cart_total: 29998,
  message: "Added 5 items to cart"
}
```

**On error:**

```javascript
{
  error: 'One or more products are out of stock',
  attempted_items: ['product_1', 'product_3'],
  failed_items: ['product_2'],
  code: 'PARTIAL_STOCK'
}
```

### Network Calls

**Fetch product data:**
```
GET /products/{handle}.json
→ Response: product object (Shopify Storefront API)
```

**Add all to cart:**
```
POST /cart/add.js
Body: [
  { id: variant_id_1, quantity: 1 },
  { id: variant_id_2, quantity: 1 },
  ...
]
Response: cart object
```

---

## Implementation Plan

### Phase 1: Input Validation (Week 1)

**Create `/assets/shop-the-look/validator.js`:**

```javascript
/**
 * Validates product handles and returns sanitized data
 * @param {Object} look - Look data from Liquid schema
 * @returns {Object} Validated look with product refs
 * @throws {Error} If look data invalid
 */
export async function validateLook(look) {
  // Validate look name
  if (!look.name || typeof look.name !== 'string') {
    throw new Error('Look must have a name');
  }

  // Validate product handles
  const products = [];
  const maxSlots = look.max_products || 5;
  
  for (let i = 1; i <= maxSlots; i++) {
    const key = `product_${i}`;
    const handle = look[key];
    
    if (!handle) {
      // Empty slot is OK; show placeholder
      products.push({ placeholder: true });
      continue;
    }
    
    // Validate handle format
    if (!isValidHandle(handle)) {
      throw new Error(`Invalid product handle: ${handle}`);
    }
    
    // Fetch product data
    try {
      const product = await fetchProduct(handle);
      products.push(product);
    } catch (error) {
      // Product doesn't exist; show placeholder
      products.push({ 
        placeholder: true, 
        attemptedHandle: handle,
        error: 'not_found'
      });
    }
  }
  
  return {
    name: look.name,
    products,
    totalSlots: maxSlots
  };
}

/**
 * Validates product handle format
 */
function isValidHandle(handle) {
  if (typeof handle !== 'string') return false;
  if (handle.length === 0 || handle.length > 255) return false;
  // Shopify handles: lowercase, alphanumeric, hyphen
  return /^[a-z0-9-]+$/.test(handle);
}

/**
 * Fetches product data from Shopify
 */
async function fetchProduct(handle) {
  const response = await fetch(`/products/${handle}.json`);
  if (!response.ok) throw new Error(`Product not found: ${handle}`);
  return response.json();
}
```

**Error handling:**

```javascript
// In shop-the-look.js connectedCallback
try {
  this.validatedLook = await validateLook(this.lookData);
} catch (error) {
  console.error('Shop The Look validation failed:', error);
  // Don't show modal; log error; show fallback message
  this.showError('This look is temporarily unavailable.');
  return;
}
```

### Phase 2: Modal UI & Rendering (Week 1–2)

**Modal structure with fallback:**

```html
<dialog ref="modal" aria-modal="true" aria-label="Shop The Look: {{ look.name }}">
  <div class="stl-modal__content">
    <!-- Header -->
    <div class="stl-modal__header">
      <h2 class="stl-modal__title">{{ look.name }}</h2>
      <button ref="closeBtn" class="stl-modal__close" aria-label="Close">
        × 
      </button>
    </div>
    
    <!-- Carousel of products -->
    <div class="stl-modal__carousel" role="region" aria-label="Product carousel">
      {% for product in look.products %}
        {% if product.placeholder %}
          <div class="stl-product-card stl-product-card--placeholder">
            <div class="stl-product-card__image">
              <span class="stl-product-card__placeholder-icon">?</span>
            </div>
            <div class="stl-product-card__info">
              <p class="stl-product-card__title">Product unavailable</p>
              <button class="stl-product-card__button" disabled>
                Not available
              </button>
            </div>
          </div>
        {% else %}
          <div class="stl-product-card">
            <div class="stl-product-card__image">
              <img 
                src="{{ product.featured_image | img_url: '300x300' }}"
                alt="{{ product.featured_image.alt | default: product.title }}"
              />
              {% if product.available == false %}
                <span class="stl-product-card__badge stl-product-card__badge--sold-out">
                  Sold out
                </span>
              {% endif %}
            </div>
            
            <div class="stl-product-card__info">
              <h3 class="stl-product-card__title">{{ product.title }}</h3>
              
              <div class="stl-product-card__price">
                {% if product.compare_at_price %}
                  <span class="stl-product-card__compare-price">
                    {{ product.compare_at_price | money }}
                  </span>
                {% endif %}
                <span class="stl-product-card__price-current">
                  {{ product.price | money }}
                </span>
              </div>
              
              <button 
                class="stl-product-card__button"
                data-product-id="{{ product.id }}"
                {% unless product.available %}
                  disabled
                  aria-label="Out of stock: {{ product.title }}"
                {% else %}
                  aria-label="Add {{ product.title }} to cart"
                {% endunless %}
              >
                {% if product.available %}
                  Add to cart
                {% else %}
                  Sold out
                {% endif %}
              </button>
            </div>
          </div>
        {% endif %}
      {% endfor %}
    </div>
    
    <!-- CTA: Add all -->
    <div class="stl-modal__footer">
      <button 
        ref="addAllBtn"
        class="button button--primary"
        aria-label="Add all items from {{ look.name }} to cart"
      >
        Add all to cart
      </button>
      <p class="stl-modal__instructions">
        Or select individual items above.
      </p>
    </div>
  </div>
</dialog>

<!-- Live region for announcements -->
<div 
  class="stl-modal__live-region"
  role="status"
  aria-live="polite"
  aria-atomic="true"
></div>
```

### Phase 3: Focus Management & Keyboard Nav (Week 2)

**Focus trap on modal open:**

```javascript
// In shop-the-look.js

openModal() {
  this.refs.modal.showModal();
  
  // Set focus to first focusable element
  const firstFocusable = this.refs.modal.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  firstFocusable?.focus();
  
  // Trap focus within modal
  this.refs.modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      this.handleTabKey(e);
    } else if (e.key === 'Escape') {
      this.closeModal();
    }
  });
}

handleTabKey(event) {
  const focusableElements = Array.from(
    this.refs.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  );
  
  const currentIndex = focusableElements.indexOf(document.activeElement);
  const isShifting = event.shiftKey;
  
  if (isShifting && currentIndex === 0) {
    event.preventDefault();
    focusableElements[focusableElements.length - 1].focus();
  } else if (!isShifting && currentIndex === focusableElements.length - 1) {
    event.preventDefault();
    focusableElements[0].focus();
  }
}

closeModal() {
  this.refs.modal.close();
  // Restore focus to trigger button
  this.triggerButton?.focus();
}
```

### Phase 4: Accessibility & Testing (Week 2–3)

**Automated tests (Jest):**

```javascript
// tests/shop-the-look/validator.test.js
test('validates product handles', () => {
  expect(isValidHandle('winter-coat')).toBe(true);
  expect(isValidHandle('Winter-Coat')).toBe(false); // Uppercase not allowed
  expect(isValidHandle('winter coat')).toBe(false); // Spaces not allowed
  expect(isValidHandle('')).toBe(false);
  expect(isValidHandle('a'.repeat(256))).toBe(false); // Too long
});

test('handles missing products gracefully', async () => {
  const look = {
    name: 'My Look',
    product_1: 'valid-product',
    product_2: 'invalid-product',
    product_3: 'another-valid'
  };
  
  const validated = await validateLook(look);
  
  expect(validated.products[0].title).toBe('Valid Product');
  expect(validated.products[1].placeholder).toBe(true);
  expect(validated.products[2].title).toBe('Another Valid');
});
```

**Integration tests (Cypress):**

```javascript
// cypress/e2e/shop-the-look.cy.js
describe('Shop The Look', () => {
  it('opens modal and displays products', () => {
    cy.visit('/');
    cy.get('[data-look-id="winter"]').within(() => {
      cy.get('[data-open-modal]').click();
    });
    
    cy.get('[data-modal]').should('be.visible');
    cy.contains('Winter Essentials').should('be.visible');
    cy.get('[data-product-id]').should('have.length', 5);
  });
  
  it('closes on Escape key', () => {
    cy.visit('/');
    cy.get('[data-open-modal]').click();
    
    cy.get('[data-modal]').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('[data-modal]').should('not.exist');
  });
  
  it('shows placeholder for missing products', () => {
    cy.visit('/');
    cy.get('[data-open-modal]').click();
    
    cy.get('.stl-product-card--placeholder').should('exist');
    cy.contains('Product unavailable').should('be.visible');
  });
  
  it('disables button for out-of-stock products', () => {
    cy.visit('/');
    cy.get('[data-open-modal]').click();
    
    cy.get('[data-product-id]').first().then(($btn) => {
      if ($btn.attr('aria-label').includes('Out of stock')) {
        cy.wrap($btn).should('be.disabled');
      }
    });
  });
  
  it('adds all items to cart', () => {
    cy.visit('/');
    cy.get('[data-open-modal]').click();
    cy.get('[data-add-all]').click();
    
    cy.get('[role="status"]').should('contain', 'Added 5 items to cart');
    cy.get('[data-cart-count]').should('contain', '5');
  });
});
```

### Phase 5: Error Handling & Retry (Week 3)

**Error states:**

```javascript
// In shop-the-look.js
async addAllToCart() {
  this.showLoading(true);
  
  try {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      body: JSON.stringify(this.cartPayload)
    });
    
    if (!response.ok) {
      throw new Error('Cart API error');
    }
    
    this.announceSuccess('Added 5 items to cart');
    this.closeModal();
  } catch (error) {
    this.showError('Couldn\'t add items to cart. Please try again.');
    console.error('Add to cart failed:', error);
  } finally {
    this.showLoading(false);
  }
}

showError(message) {
  const liveRegion = this.refs.modal.querySelector('[role="status"]');
  liveRegion.textContent = message;
  liveRegion.setAttribute('aria-live', 'assertive'); // Interrupt polite announcements
  
  // Reset after announcement
  setTimeout(() => {
    liveRegion.setAttribute('aria-live', 'polite');
  }, 100);
}
```

---

## Done Criteria

### Code Quality

- [ ] `/assets/shop-the-look.js` refactored; validator extracted to module
- [ ] No console.log calls in production code
- [ ] JSDoc comments on all exports
- [ ] No eslint warnings

### Validation

- [ ] Product handles validated per Shopify spec (lowercase, alphanumeric, hyphen)
- [ ] Empty slots handled (show placeholder)
- [ ] Missing products handled (fetch fails, show placeholder)
- [ ] Stock status checked and displayed
- [ ] Max slot limit enforced (default 5, configurable)

### Accessibility

- [ ] Modal has `aria-modal="true"` and clear `aria-label`
- [ ] Focus trap tested (Tab key cycles within modal)
- [ ] Escape key closes modal
- [ ] Focus restored to trigger button on close
- [ ] "Sold out" state announced to screen readers
- [ ] "Add all" CTA has clear label
- [ ] Live region announces success/error messages
- [ ] Screen reader tested (NVDA or VoiceOver)
- [ ] No axe violations

### Testing

- [ ] Unit tests for handle validation (100% coverage)
- [ ] Integration tests cover: open, close, add one item, add all, error
- [ ] Focus trap tested with keyboard-only navigation
- [ ] Mobile tested (touch interactions work)
- [ ] All tests pass in CI/CD

### UX

- [ ] Modal opens smoothly (< 300ms)
- [ ] Placeholder UI clear (not confusing as missing vs loading)
- [ ] Error messages helpful ("Item sold out" not just "Error")
- [ ] Success toast shows item count ("Added 5 items")
- [ ] No silent failures (all errors visible to user)

### Documentation

- [ ] README in `/assets/shop-the-look/` explaining validation flow
- [ ] Error codes documented
- [ ] Liquid template commented (especially placeholder logic)
- [ ] Accessibility features documented

---

## Risk Mitigation

### Risk: XSS from Product Handles

**Mitigation:**
- Validate handle format strictly (alphanumeric + hyphen only)
- Use template literals with proper escaping in Liquid
- Never concatenate untrusted data into HTML

### Risk: Missing Products Break Experience

**Mitigation:**
- Fetch all product data before showing modal
- Show placeholder for missing products (not empty)
- User sees clear "Product unavailable" instead of confusion

### Risk: Modal Accessibility Broken

**Mitigation:**
- Focus trap tested with keyboard-only nav
- Screen reader tested before deploy
- Axe automated checks in CI/CD
- Manual accessibility audit

---

## Questions & TODOs

- [ ] Can merchant configure max product slots per look? (Currently hardcoded to 5)
- [ ] Should we support variant selection per product in modal? (Or just use default variant)
- [ ] What if a product is available but variants are all out of stock?
- [ ] Should we show variant selector or just one option per product?
- [ ] How should we handle products with multiple images?
- [ ] Should we cache product data or always fetch fresh?

---

## Related Tasks

- See `/TASKS.md` for related items
- Blocking: **None**
- Blocked by: **None**
- Related to: Cart API integration; product recommendations

---

## Success Metrics

**After this refactor:**
- [ ] Shop The Look modal works reliably on all products
- [ ] Zero accessibility violations
- [ ] Faster modal load (all validations parallelized)
- [ ] Developer time to add new looks < 10 minutes
- [ ] Customer feedback: fewer "broken" experience reports
