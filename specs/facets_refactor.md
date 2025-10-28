# Spec: Facets Refactor

**Status:** Open  
**Priority:** HIGH  
**Effort:** 2–3 sprints

---

## Summary

`facets.js` (~900 lines) tightly couples filtering, sorting, and currency formatting logic. This makes it hard to test, extend, and debug. This spec defines a plan to split concerns, add robust error handling, and establish patterns for future filter types.

---

## Goal / Why This Matters

1. **Testability** – Currently impossible to unit test individual filter concerns (price filter, tag filter, currency calc) in isolation
2. **Maintainability** – New filter types require touching a massive file; high risk of regression
3. **Error Handling** – Network failures are caught but component silently hides; user gets no feedback
4. **Accessibility** – No/low-results states lack ARIA announcements; filtering is opaque to screen readers
5. **Performance** – Currency data hardcoded at bottom of file; should be injected or fetched dynamically

---

## User Story

**As an** online shopper  
**I want to** filter and sort products without full page reload  
**So that** I can quickly find products I'm interested in

**Acceptance:**
- Filters update UI in < 500ms (or show loading state)
- If filter fails, UI shows error + retry button
- Screen reader users hear "Results updated" or error message
- No-results state is helpful (suggests clearing filters)

---

## UX Contract

### Surfaces Touched

- Collection pages (`/sections/main-collection.liquid`)
- Search pages (`/sections/search-results.liquid`)
- Facet form (`/snippets/facets-actions.liquid`)
- Product grid (`/snippets/product-grid.liquid`)
- Filter status display (`/snippets/filter-remove-buttons.liquid`)

### Required States

1. **Default** – Form ready, no filters applied
2. **Loading** – Spinner shown, form disabled, "Updating..." text
3. **Results loaded** – Grid updated, "12 of 48 products" text, results announced
4. **No results** – Empty state with message, "Try clearing filters" suggested
5. **Error** – Red error banner with "Retry" button, form remains editable
6. **No filters** – All checkboxes unchecked, price range empty

### Accessibility Requirements

- `aria-live="polite"` region updates with results count on filter change
- Error messages have `role="alert"` and announced immediately
- Form inputs labeled with `<label>` or `aria-label`
- Price inputs have `aria-label="Minimum price"`, etc.
- "No results" state announced with context ("No products match your filters")
- Focus management: focus returns to first product on results load

---

## Data Contract

### Inputs

**From form:**
```javascript
{
  'filter.v.size': ['M', 'L'],              // Multi-select
  'filter.v.price.gte': 0,                  // Min price (cents)
  'filter.v.price.lte': 10000,              // Max price (cents)
  'sort_by': 'price-ascending',             // Sort key
  'page': 1,                                // Pagination
  'q': 'winter coat'                        // Search query (if on search page)
}
```

**Validation rules:**
- `filter.v.*` keys must match whitelist (prevent injection)
- Price values must be non-negative integers
- Price min must be <= price max
- `sort_by` must be one of allowed values (defined by Shopify)
- `page` must be positive integer

### Outputs

**On success:**
```javascript
{
  products: [                // Updated product array
    { id, title, image, price, compare_at_price, variants, ... }
  ],
  total_products: 48,
  results_per_page: 12,
  current_page: 1,
  has_next_page: true,
  has_previous_page: false,
  sort_options: [ /* ... */ ]
}
```

**On error:**
```javascript
{
  error: 'Network timeout',  // User-friendly message
  code: 'FETCH_TIMEOUT',     // Machine-readable code
  retry: true                // Can user retry?
}
```

### Network Calls

**Request:**
```
GET /collections/winter-coats?filter.v.size=M&sort_by=price-ascending
```

**Response:**
- Shopify returns HTML (not JSON)
- Parse product data from HTML + extract pagination metadata

**Failure modes:**
- Network timeout (show retry button)
- Invalid filter key (server rejects, show error)
- No products match filters (show empty state, not error)

---

## Implementation Plan

### Phase 1: Module Structure (Week 1–2)

**Break apart `facets.js` into:**

```
assets/facets.js (main orchestrator)
├── assets/facets/filter-validator.js
│   ├─ Validate filter keys (whitelist)
│   ├─ Validate price ranges (min <= max, non-negative)
│   └─ Throw error if invalid
├── assets/facets/currency-formatter.js
│   ├─ Format money (currently hardcoded at bottom of facets.js)
│   └─ Accept currency from settings or props
├── assets/facets/results-renderer.js
│   ├─ Parse HTML response
│   ├─ Extract product data + pagination
│   └─ Diff with old DOM, apply morphdom updates
├── assets/facets/accessibility.js
│   ├─ Announce "Results updated" to screen readers
│   ├─ Set focus to first product or error message
│   └─ Manage aria-live regions
└── assets/facets/error-handler.js
    ├─ Categorize error type (network vs validation vs not-found)
    ├─ Generate user-friendly message
    └─ Provide retry option if applicable
```

**File structure:**

```
assets/
├── facets.js (280 lines after refactor, down from 900)
│   - Main FacetsFormComponent class
│   - Orchestrates filter, render, announce, error handle
│   - Integrates modules above
└── facets/
    ├── filter-validator.js (80 lines)
    ├── currency-formatter.js (40 lines)
    ├── results-renderer.js (120 lines)
    ├── accessibility.js (60 lines)
    └── error-handler.js (70 lines)
```

### Phase 2: Testing (Week 2–3)

**Unit tests** (Jest):

```javascript
// tests/facets/filter-validator.test.js
test('accepts whitelisted filter keys', () => {
  expect(validateFilters({ 'filter.v.size': 'M' })).toPass();
});

test('rejects unknown filter keys', () => {
  expect(validateFilters({ 'filter.v.evil': 'hack' })).toThrow();
});

test('validates price range', () => {
  expect(validateFilters({ 
    'filter.v.price.gte': 0,
    'filter.v.price.lte': 10000
  })).toPass();
  
  expect(validateFilters({
    'filter.v.price.gte': 10000,
    'filter.v.price.lte': 0  // Invalid
  })).toThrow();
});
```

```javascript
// tests/facets/currency-formatter.test.js
test('formats price with currency symbol', () => {
  expect(formatMoney(1999, 'USD')).toBe('$19.99');
  expect(formatMoney(1999, 'EUR')).toBe('€19,99');
});
```

```javascript
// tests/facets/error-handler.test.js
test('categorizes network error', () => {
  const error = new TypeError('Failed to fetch');
  expect(categorizeError(error)).toEqual({
    type: 'NETWORK',
    userMessage: 'Connection failed. Please try again.',
    canRetry: true
  });
});
```

**Integration tests** (Cypress):

```javascript
// cypress/e2e/facets.cy.js
describe('Facet Filtering', () => {
  it('filters by size and shows results', () => {
    cy.visit('/collections/winter-coats');
    
    cy.get('[data-facet-value="M"]').click();
    cy.contains('Updating...').should('be.visible');
    cy.contains('12 products found').should('be.visible');
    cy.get('[role="alert"]').should('contain', 'Results updated');
  });
  
  it('shows no-results state', () => {
    cy.visit('/collections/winter-coats');
    
    cy.get('[data-filter-price-max]').type('1');
    cy.get('[data-apply-filters]').click();
    cy.contains('No products found').should('be.visible');
    cy.contains('Try clearing your filters').should('be.visible');
  });
  
  it('shows error on network failure', () => {
    cy.intercept('GET', '/collections/*', { statusCode: 500 });
    
    cy.visit('/collections/winter-coats');
    cy.get('[data-facet-value="M"]').click();
    
    cy.contains('Something went wrong').should('be.visible');
    cy.get('[data-retry-button]').click();
    cy.contains('12 products found').should('be.visible');
  });
});
```

### Phase 3: Error Handling & Accessibility (Week 3)

**Error UI:**

```html
<!-- Error banner (dismissible) -->
<div class="facets__error" role="alert" aria-live="assertive">
  <span class="facets__error-icon">⚠</span>
  <span class="facets__error-message">{{ error.message }}</span>
  {% if error.canRetry %}
    <button data-retry-button class="facets__retry">
      Retry
    </button>
  {% endif %}
</div>
```

**Accessibility features:**

```html
<!-- Live region for status updates -->
<div
  class="facets__status"
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  <!-- Updated by JS: "Showing 12 of 48 products" -->
</div>

<!-- Price filter with labels -->
<fieldset>
  <legend>Price Range</legend>
  <div class="facets__price-inputs">
    <label for="price-min">Minimum price</label>
    <input id="price-min" type="number" name="filter.v.price.gte" />
    
    <label for="price-max">Maximum price</label>
    <input id="price-max" type="number" name="filter.v.price.lte" />
  </div>
</fieldset>
```

**Focus management:**

```javascript
// In accessibility.js
export function manageFocusAfterUpdate(container, resultCount) {
  if (resultCount === 0) {
    // Focus on "No results" message
    const noResults = container.querySelector('[data-no-results]');
    noResults?.focus();
  } else {
    // Focus on first product
    const firstProduct = container.querySelector('[data-product-id]');
    firstProduct?.focus();
  }
}
```

### Phase 4: Remove Hardcoded Currency (Week 4)

**Before:**

```javascript
// facets.js line 891 (hardcoded)
const CURRENCY_DATA = {
  USD: { symbol: '$', position: 'before' },
  EUR: { symbol: '€', position: 'after' },
  // ...
};
```

**After:**

```javascript
// Injected from Liquid at render time
const currencyData = window.Theme.currency;

// Or fetched dynamically if not available
async function getCurrencyData() {
  if (window.Theme?.currency) return window.Theme.currency;
  const response = await fetch('/currency-config.json');
  return response.json();
}
```

---

## Done Criteria

### Code Quality

- [ ] `facets.js` reduced from ~900 to ~280 lines
- [ ] Each module < 150 lines
- [ ] No circular imports between modules
- [ ] All JSDoc comments added
- [ ] No eslint warnings

### Testing

- [ ] All filter validation has unit tests (100% coverage)
- [ ] Currency formatting has unit tests
- [ ] Error handling has unit tests
- [ ] Integration tests cover happy path + error case + no-results state
- [ ] All tests pass in CI/CD

### Accessibility

- [ ] Form inputs all have labels
- [ ] Error messages announced via `aria-live`
- [ ] Status updates announced ("Results updated")
- [ ] Focus management tested with keyboard-only navigation
- [ ] Screen reader tested (NVDA or VoiceOver)
- [ ] No axe violations

### Documentation

- [ ] README in `/assets/facets/` explaining module structure
- [ ] JSDoc comments on all exports
- [ ] Error codes documented (NETWORK, VALIDATION, NO_RESULTS, etc.)
- [ ] Example usage in module README

### Backwards Compatibility

- [ ] Existing Liquid templates unchanged (public API same)
- [ ] Component selector (e.g., `<facets-form>`) unchanged
- [ ] No breaking changes to `Theme` global

---

## Risk Mitigation

### Risk: Regression on Collection Pages

**Mitigation:**
- Keep existing public API stable
- Comprehensive integration tests before merge
- Manual testing on staging store before production deploy

### Risk: Network Errors Not Handled

**Mitigation:**
- All fetch calls wrapped in try/catch
- Error categorization handles timeouts, 4xx, 5xx
- Retry button tested

### Risk: Accessibility Not Tested

**Mitigation:**
- Automated axe tests in CI/CD
- Manual screen reader testing (VoiceOver/NVDA)
- Keyboard-only navigation tested (no mouse)

---

## Questions & TODOs

- [ ] What currency codes does Shopify support? (USD, EUR, GBP, etc.)
- [ ] How should we handle currency symbols in other languages? (€ = euros, but other regions use different symbols)
- [ ] Should price ranges be configurable by merchant? (Min/max bounds)
- [ ] Are there other filter types we should support? (Brand, condition, rating, etc.)
- [ ] What is the acceptable latency for filter updates? (< 500ms?)
- [ ] Should we cache filter results? (e.g., localStorage for quick re-apply)

---

## Related Tasks

- See `/TASKS.md` for related items
- Blocking: **None**
- Blocked by: **None**
- Related to: Pagination in faceted views; sort options display

---

## Success Metrics

**After this refactor:**
- [ ] Developers can add new filter types in < 2 hours
- [ ] Time to fix filter-related bugs < 30 minutes (vs currently hours)
- [ ] Test coverage for filter logic > 80%
- [ ] Zero accessibility violations in automated tests
- [ ] Customer feedback: filtering is clearer and errors helpful
