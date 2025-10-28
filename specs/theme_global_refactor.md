# Spec: Theme Global Refactor

**Status:** Open  
**Priority:** HIGH  
**Effort:** 2–3 sprints

---

## Summary

Many theme components depend on a global `Theme` object injected via `scripts.liquid`. This creates implicit load-order dependencies and hidden coupling: if `scripts.liquid` doesn't execute or executes after components try to use it, components silently fail with no error message.

This spec defines a short-term mitigation (runtime guards + documentation) and a long-term migration strategy (ES6 modules).

---

## Goal / Why This Matters

1. **Debugging** – Silent failures without clear error messages make debugging hard
2. **Dependency Clarity** – Implicit globals hide what components actually depend on
3. **Testability** – Components that depend on global state are hard to unit test
4. **Maintenance** – Refactoring the `Theme` object is risky (unknown consumers)
5. **Modularity** – True ES6 modules are cleaner than global state

---

## User Story

**As a** developer  
**I want to** understand what components depend on and what they expect  
**So that** I can debug issues and refactor without breaking things

**Acceptance:**
- If `Theme` is missing, component throws clear error with guidance
- All required `Theme` properties documented
- Components can access config without relying on global
- Unit tests can mock `Theme` easily

---

## Current State Analysis

### Global `Theme` Object

**Where it's set:** `/snippets/scripts.liquid`

```javascript
window.Theme = {
  settings: { /* merchant-configured */ },
  currency: { symbol: '$', ... },
  locale: 'en',
  paths: { cart: '/cart', ... },
  // ... more properties
};
```

**Who uses it:**
- `facets.js` – References `Theme.currency`
- `localization.js` – References `Theme.currency`, `Theme.locale`
- `product-recommendations.js` – References `Theme.paths`
- Possibly other components (search through codebase)

**Current issues:**
- If `scripts.liquid` doesn't load, global never set
- No error thrown; component just tries to access undefined property
- Adding new components requires knowing about global
- Difficult to test in isolation

---

## Implementation Plan

### Phase 1: Audit & Document (Week 1)

**Task: Identify all `Theme` usages**

```bash
grep -r "window.Theme\|Theme\." assets/*.js | grep -v "//"
```

**Create `/docs/THEME_GLOBALS.md`:**

```markdown
# Theme Global Object

## Properties

### Settings
- `Theme.settings` (Object) – Merchant-configured theme settings
  - Used by: sections (via Liquid), JS components

### Currency
- `Theme.currency.symbol` (String) – Currency symbol (e.g., '$', '€')
- `Theme.currency.code` (String) – Currency code (e.g., 'USD', 'EUR')
- `Theme.currency.min` (Number) – Minimum price in store
- `Theme.currency.max` (Number) – Maximum price in store
- Used by: `facets.js`, `localization.js`, currency formatting

### Locale
- `Theme.locale` (String) – Current locale code (e.g., 'en', 'fr', 'de')
- Used by: `localization.js`, date/time formatting

### Paths
- `Theme.paths.cart` (String) – Cart page path (e.g., '/cart')
- `Theme.paths.search` (String) – Search page path (e.g., '/search')
- Used by: Navigation, search components

### Utilities
- `Theme.moneyFormat` (String) – Format string for currency (e.g., '${{amount}}')
- Used by: Price formatting throughout

## Initialization Checklist

Before Theme is safe to use:
- [ ] `scripts.liquid` snippet included in `<head>`
- [ ] All modules in `/assets/` loaded
- [ ] No errors in console

## Failure Modes

- If `Theme` undefined: components try to access undefined.property → cryptic error
- If `Theme.currency` missing: price formatting breaks silently
- If `Theme.locale` wrong: translations not applied correctly
```

### Phase 2: Short-Term Mitigation (Week 1–2)

**Add runtime guard to all components that use `Theme`:**

```javascript
// In facets.js (before using Theme)
function ensureThemeLoaded() {
  if (typeof window.Theme === 'undefined') {
    throw new Error(
      'Theme global not initialized. ' +
      'Ensure snippets/scripts.liquid is included in template.' +
      'See /docs/THEME_GLOBALS.md'
    );
  }
  
  if (!window.Theme.currency) {
    throw new Error(
      'Theme.currency not found. ' +
      'Check that theme settings are properly loaded.'
    );
  }
}

export class FacetsFormComponent extends Component {
  connectedCallback() {
    try {
      ensureThemeLoaded();
    } catch (error) {
      console.error('[facets.js] Fatal error:', error.message);
      // Don't silently fail; log clearly
      this.innerHTML = '<p>Component failed to load. Check browser console.</p>';
      return;
    }
    
    super.connectedCallback();
    // ... rest of initialization
  }
}
```

**Create `/assets/theme-guard.js`:**

```javascript
/**
 * Validates that Theme global is initialized with required properties
 * @param {string[]} required - List of required properties (e.g., ['currency', 'locale'])
 * @throws {Error} If Theme or required properties missing
 */
export function validateTheme(required = []) {
  if (typeof window.Theme === 'undefined') {
    throw new Error(
      'Theme global not initialized. ' +
      'Ensure /snippets/scripts.liquid is included in layout template.'
    );
  }
  
  const missing = required.filter(prop => !(prop in window.Theme));
  if (missing.length > 0) {
    throw new Error(
      `Theme missing properties: ${missing.join(', ')}. ` +
      'Check /docs/THEME_GLOBALS.md for expected properties.'
    );
  }
}

/**
 * Safe getter with fallback
 * @param {string} path - Dot-notation path (e.g., 'currency.symbol')
 * @param {*} defaultValue - Fallback value if not found
 */
export function getThemeProp(path, defaultValue) {
  try {
    const parts = path.split('.');
    let value = window.Theme;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

// Usage:
// validateTheme(['currency', 'locale']);
// const symbol = getThemeProp('currency.symbol', '$');
```

### Phase 3: Long-Term Migration to ES6 (Week 2–3)

**Target structure:**

```
assets/
├── theme.js (singleton module)
│   - Exports Theme singleton
│   - Initializes from window.Theme or fetches config
│   - Validates on init
└── components/
    ├── facets.js
    │   - import { theme } from '../theme.js'
    │   - Uses: theme.currency, theme.locale
    └── localization.js
        - import { theme } from '../theme.js'
        - Uses: theme.locale, theme.currency
```

**New `/assets/theme.js`:**

```javascript
/**
 * Singleton Theme module
 * 
 * Replaces global window.Theme with proper ES6 module.
 * Initializes from window.Theme if available, or fetches from server.
 * Validates on first access.
 */

let themeInstance = null;

/**
 * Initialize theme from global or fetch from server
 */
async function initTheme() {
  // If already init, return
  if (themeInstance) return themeInstance;
  
  // Option 1: Use window.Theme (set by scripts.liquid)
  if (typeof window.Theme !== 'undefined') {
    themeInstance = window.Theme;
  } else {
    // Option 2: Fetch from server (future enhancement)
    const response = await fetch('/api/theme-config.json');
    themeInstance = await response.json();
  }
  
  // Validate
  validateThemeObject(themeInstance);
  
  return themeInstance;
}

/**
 * Validate theme object has required properties
 */
function validateThemeObject(theme) {
  const required = ['currency', 'locale', 'paths'];
  const missing = required.filter(prop => !(prop in theme));
  
  if (missing.length > 0) {
    throw new Error(
      `Theme object missing required properties: ${missing.join(', ')}`
    );
  }
}

/**
 * Get theme instance (synchronous if already loaded)
 * @throws {Error} If theme not initialized
 */
export function getTheme() {
  if (!themeInstance) {
    throw new Error(
      'Theme not initialized. Call initTheme() first or ensure ' +
      'window.Theme is set by scripts.liquid'
    );
  }
  return themeInstance;
}

/**
 * Initialize theme (should be called early, before components)
 */
export function initializeTheme() {
  return initTheme();
}

// For backwards compatibility, set window.theme reference
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'theme', {
    get: getTheme,
    configurable: true
  });
}
```

**Updated component (facets.js):**

```javascript
import { getTheme } from '@theme/theme';

export class FacetsFormComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    
    // Get theme safely
    const theme = getTheme();
    this.currency = theme.currency;
    this.locale = theme.locale;
    
    // ... rest of init
  }
}
```

**Updated Liquid (scripts.liquid):**

```liquid
<script>
  // Initialize Theme global (for backwards compat)
  window.Theme = {
    currency: { symbol: '$', code: 'USD' },
    locale: '{{ request.locale.iso_code }}',
    paths: { cart: '/cart', search: '/search' }
  };
</script>

<script type="module">
  import { initializeTheme } from '{{ "theme.js" | asset_url }}';
  
  // Initialize the theme module early
  initializeTheme().catch(error => {
    console.error('[Theme] Initialization failed:', error);
  });
</script>
```

### Phase 4: Testing & Migration (Week 3)

**Unit tests for theme module:**

```javascript
// tests/theme.test.js

import { getTheme, initializeTheme } from '../assets/theme.js';

describe('Theme Module', () => {
  beforeEach(() => {
    // Reset global
    delete window.Theme;
  });
  
  test('initializes from window.Theme', async () => {
    window.Theme = { currency: { symbol: '$' }, locale: 'en' };
    
    await initializeTheme();
    const theme = getTheme();
    
    expect(theme.currency.symbol).toBe('$');
    expect(theme.locale).toBe('en');
  });
  
  test('throws if Theme not initialized', () => {
    expect(() => getTheme()).toThrow('Theme not initialized');
  });
  
  test('validates required properties', () => {
    window.Theme = { /* missing properties */ };
    
    expect(initializeTheme()).rejects.toThrow('missing required properties');
  });
});
```

**Integration test:**

```javascript
// cypress/e2e/theme-init.cy.js

describe('Theme Initialization', () => {
  it('theme loads before components', () => {
    cy.visit('/');
    
    // Check that Theme is available
    cy.window().then(win => {
      expect(win.Theme).toBeDefined();
      expect(win.Theme.currency).toBeDefined();
    });
    
    // Check that components can access it
    cy.get('[data-facets-form]').should('exist'); // If facets fails, it won't render
  });
});
```

### Phase 5: Remove Global `scripts.liquid` Dependency (Week 4)

**Goal:** Components no longer need to wait for `window.Theme` global.

**Update all components:**

```javascript
// Before:
class FacetsFormComponent {
  connectedCallback() {
    this.currency = window.Theme.currency; // Global dependency
  }
}

// After:
import { getTheme } from '@theme/theme';

class FacetsFormComponent {
  connectedCallback() {
    const theme = getTheme(); // Module dependency (explicit, testable)
    this.currency = theme.currency;
  }
}
```

**Remove window.Theme global** (after migration complete):

```liquid
{%- # scripts.liquid -%}

{%- # Theme is now a module; no need for global window.Theme -%}
{%- # window.Theme = { ... } -%}
```

---

## Done Criteria

### Short-Term (Weeks 1–2)

- [ ] All `Theme` usages documented in `/docs/THEME_GLOBALS.md`
- [ ] Runtime guard added to all components using `Theme`
- [ ] Clear error messages if `Theme` missing
- [ ] Error message points to documentation
- [ ] No silent failures (all errors logged)
- [ ] `/assets/theme-guard.js` module created with utility functions

### Long-Term (Weeks 2–4)

- [ ] `/assets/theme.js` module created
- [ ] All components refactored to use `import { theme } from '@theme/theme'`
- [ ] Backwards compatibility maintained (window.Theme still works)
- [ ] Unit tests for theme module (100% coverage)
- [ ] Integration tests verify initialization order
- [ ] `/docs/THEME_GLOBALS.md` updated with migration guide

### Quality

- [ ] No circular imports between modules
- [ ] JSDoc comments on all exports
- [ ] No eslint warnings
- [ ] Initialization tested in CI/CD

### Documentation

- [ ] `/docs/THEME_GLOBALS.md` – All properties documented
- [ ] README in `/assets/` – Explains theme module
- [ ] Migration guide – How to move from global to module
- [ ] Error codes – What each error means and how to fix

---

## Risk Mitigation

### Risk: Breaking Existing Components

**Mitigation:**
- Maintain backwards compatibility (window.Theme still accessible)
- Gradual migration (refactor one component at a time)
- Test each refactored component thoroughly

### Risk: Initialization Order Issues

**Mitigation:**
- Theme module loaded early (in `<head>` or with `modulepreload`)
- Components wait for theme init before using it
- Integration tests verify order

### Risk: External Code Depending on window.Theme

**Mitigation:**
- Keep window.Theme global (don't remove it)
- Proxy to module internally
- Document that window.Theme is deprecated

---

## Questions & TODOs

- [ ] **TODO:** Are there external Shopify apps that depend on window.Theme?
- [ ] **TODO:** Should we add a server endpoint to fetch theme config dynamically?
- [ ] **TODO:** Should theme be mutable (can components update it)?
- [ ] **TODO:** Should we cache theme config in localStorage?

---

## Related Tasks

- See `/TASKS.md` for related items
- Blocking: **None**
- Blocked by: **None**
- Related to: Facets refactor, localization module

---

## Success Metrics

**After this refactor:**
- [ ] Component debugging time reduced (clear error messages)
- [ ] New components easier to write (explicit dependencies)
- [ ] Unit tests easier to write (mockable theme)
- [ ] Theme changes lower risk (known consumers)
- [ ] Zero silent failures related to Theme
