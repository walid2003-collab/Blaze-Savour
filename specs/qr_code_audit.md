# Spec: QR Code Audit & Modernization

**Status:** Open  
**Priority:** HIGH  
**Effort:** 1–2 sprints

---

## Summary

`qr-code-generator.js` (~1,700 lines) is a legacy, pre-ES6 library with unclear purpose and ownership. This spec defines how to audit its usage, decide whether to keep/replace/archive it, and if kept, wrap it behind a clean adapter module.

---

## Goal / Why This Matters

1. **Code Health** – Legacy code with magic numbers, unclear patterns, hard to maintain
2. **Usage Clarity** – Don't know if it's critical or dead code
3. **Maintenance Burden** – If used, should be modernized; if not, should be removed
4. **Security** – Unreviewed legacy code could have vulnerabilities
5. **Bundle Size** – 1,700 lines is significant; remove if unused

---

## Current State

### Files Involved

- **`/assets/qr-code-generator.js`** (~1,700 lines)
  - Pre-ES6 (uses prototypal inheritance, not classes)
  - No JSDoc comments
  - Magic numbers throughout (bit manipulation for encoding)
  - Licensed? Unknown

- **`/assets/qr-code-image.js`** (~30 lines)
  - Imports `qr-code-generator.js`
  - Defines `<qr-code-image>` custom element
  - Used only in gift card template

- **`/templates/gift_card.liquid`**
  - Imports `qr-code-image.js`
  - Renders `<qr-code-image>` element
  - Shows QR code for in-store scanning

- **`/config/settings_schema.json`**
  - May reference QR code settings

- **`/locales/*.json`**
  - May have QR-related copy ("qr_image_alt", etc.)

### Usage Confirmed

✓ **Confirmed used:**
- `/templates/gift_card.liquid` – QR code display
- `/assets/qr-code-image.js` – Adapter component
- Likely in gift card section

### Replacement Options

1. **Keep as-is** – Don't change; accept technical debt
2. **Wrap in adapter** – Keep QR generator but expose clean API
3. **Replace with library** – Use well-maintained QR library (e.g., `qrcode.js`, `jsQR`)
4. **Archive** – Move to `/archive/` if actually unused

---

## Implementation Plan

### Phase 1: Audit & Document (Week 1)

**Task: Find all usages**

```bash
grep -r "qr-code" . --include="*.js" --include="*.liquid" --include="*.json"
```

**Expected results:**

```
assets/qr-code-generator.js          # Definition
assets/qr-code-image.js              # Import
templates/gift_card.liquid            # Usage
config/settings_schema.json           # ?
locales/en.json                       # Copy ("qr_image_alt")
locales/de.json                       # Copy (German)
locales/nl.json                       # Copy (Dutch)
```

**Create `/docs/QR_CODE_STATUS.md`:**

```markdown
# QR Code Module Status

## Usage

- **Gift card template** – YES, used
- **Other templates** – NO
- **Storefront API** – NO
- **Admin API** – NO

## Decision: KEEP (for now) with modernization plan

### Why:
- Used in gift card page (critical for in-store scanning)
- Can't remove without feature regression

### What:
1. Wrap `qr-code-generator.js` behind clean adapter
2. Add error handling
3. Document API
4. Plan migration to maintained library

## Next Steps:
- [ ] Wrap in adapter module
- [ ] Add tests
- [ ] Document QR API
- [ ] Plan library replacement for future sprint
```

### Phase 2: Wrap in Adapter Module (Week 1–2)

**Create `/assets/qr-code/adapter.js`:**

```javascript
/**
 * QR Code Adapter
 * 
 * Wraps legacy qr-code-generator.js library behind a clean, modern API.
 * Provides error handling and clear contracts.
 * 
 * DEPRECATION: This module depends on legacy code. Plan to replace with
 * a maintained QR library (e.g., qrcode.js). See /docs/QR_CODE_STATUS.md
 */

import { QRCode as LegacyQRCode } from '@theme/qr-code-generator';

/**
 * Generates a QR code from data
 * 
 * @param {string} data - Data to encode (e.g., gift card code)
 * @param {Object} options - Generation options
 * @param {number} [options.size=300] - Canvas size in pixels
 * @param {number} [options.errorCorrection='M'] - Error correction level: 'L', 'M', 'H', 'Q'
 * @returns {Canvas} Canvas element with QR code
 * @throws {Error} If data invalid or generation fails
 * 
 * @example
 * const canvas = generateQRCode('ABC123XYZ', { size: 300 });
 * container.appendChild(canvas);
 */
export function generateQRCode(data, options = {}) {
  // Validate input
  if (typeof data !== 'string' || !data.trim()) {
    throw new Error('QR code data must be non-empty string');
  }
  
  if (data.length > 2953) { // QR code max capacity
    throw new Error('QR code data too long (max 2953 characters)');
  }
  
  const size = options.size || 300;
  const errorCorrection = options.errorCorrection || 'M';
  
  // Validate error correction level
  const validLevels = ['L', 'M', 'H', 'Q'];
  if (!validLevels.includes(errorCorrection)) {
    throw new Error(`Invalid error correction level. Expected one of: ${validLevels.join(', ')}`);
  }
  
  try {
    // Use legacy QRCode library
    const qr = new LegacyQRCode();
    qr.setTypeNumber(getTypeNumberForData(data));
    qr.setErrorCorrectLevel(errorCorrectionToLevel(errorCorrection));
    qr.addData(data);
    qr.make();
    
    // Generate canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Draw QR code
    drawQRCodeOnCanvas(ctx, qr, size);
    
    return canvas;
  } catch (error) {
    if (error.message.includes('QR code')) {
      // Rethrow validation errors
      throw error;
    }
    
    // Wrap other errors
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Generates QR code as data URL (base64-encoded PNG)
 * @param {string} data - Data to encode
 * @param {Object} options - Same as generateQRCode
 * @returns {string} Data URL (data:image/png;base64,...)
 */
export function generateQRCodeDataURL(data, options = {}) {
  const canvas = generateQRCode(data, options);
  return canvas.toDataURL('image/png');
}

/**
 * Generates QR code and appends to container
 * @param {string} data - Data to encode
 * @param {Element} container - DOM element to append canvas to
 * @param {Object} options - Same as generateQRCode
 */
export function renderQRCodeToContainer(data, container, options = {}) {
  if (!container || !(container instanceof Element)) {
    throw new Error('Container must be a valid DOM element');
  }
  
  const canvas = generateQRCode(data, options);
  
  // Add CSS class and attributes
  canvas.className = 'qr-code__canvas';
  canvas.setAttribute('aria-label', `QR code for: ${data.substring(0, 50)}`);
  canvas.setAttribute('role', 'img');
  
  container.appendChild(canvas);
}

// ============================================================================
// Internal Helpers (Legacy Library Utilities)
// ============================================================================

/**
 * Determines QR type number based on data length
 * Legacy library uses type numbers 1-40 (capacity increases with type)
 */
function getTypeNumberForData(data) {
  // Simplified mapping; real impl based on data length
  if (data.length <= 41) return 1;
  if (data.length <= 77) return 2;
  if (data.length <= 127) return 3;
  if (data.length <= 187) return 4;
  if (data.length <= 255) return 5;
  if (data.length <= 322) return 6;
  if (data.length <= 370) return 7;
  // ... more types up to 40
  return 10; // Safe default for medium data
}

/**
 * Converts error correction string to legacy library constant
 */
function errorCorrectionToLevel(level) {
  // Map: L → 1, M → 0, Q → 3, H → 2 (legacy library constants)
  const mapping = { L: 1, M: 0, Q: 3, H: 2 };
  return mapping[level] ?? 0;
}

/**
 * Draws QR code on canvas context
 */
function drawQRCodeOnCanvas(ctx, qr, size) {
  const moduleCount = qr.getModuleCount();
  const moduleSize = Math.floor(size / moduleCount);
  
  // Fill background (white)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Draw modules (black squares for 1s)
  ctx.fillStyle = '#000000';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(
          col * moduleSize,
          row * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }
}
```

### Phase 3: Update Component to Use Adapter (Week 2)

**Refactor `/assets/qr-code-image.js`:**

```javascript
import { generateQRCode } from '@theme/qr-code/adapter';

/**
 * <qr-code-image>
 * 
 * Web Component for rendering QR codes
 * 
 * Usage:
 *   <qr-code-image data="ABC123XYZ" size="300"></qr-code-image>
 * 
 * Attributes:
 *   - data (required): String data to encode
 *   - size (optional): Canvas size in pixels (default: 300)
 *   - error-correction (optional): Error correction level (L|M|H|Q, default: M)
 */
class QRCodeImage extends HTMLElement {
  connectedCallback() {
    this.render();
  }
  
  /**
   * Re-renders QR code (called when attributes change)
   */
  render() {
    const data = this.getAttribute('data');
    const size = parseInt(this.getAttribute('size') || '300');
    const errorCorrection = this.getAttribute('error-correction') || 'M';
    
    // Validate
    if (!data) {
      this.showError('QR code data attribute is required');
      return;
    }
    
    try {
      // Clear previous canvas
      this.innerHTML = '';
      
      // Generate QR code
      const canvas = generateQRCode(data, { size, errorCorrection });
      
      // Add styling
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      canvas.style.border = '1px solid #ccc';
      
      this.appendChild(canvas);
    } catch (error) {
      console.error('[qr-code-image]', error);
      this.showError('Failed to generate QR code');
    }
  }
  
  showError(message) {
    const div = document.createElement('div');
    div.className = 'qr-code-image--error';
    div.textContent = message;
    this.innerHTML = '';
    this.appendChild(div);
  }
  
  /**
   * Called when attributes change
   */
  attributeChangedCallback() {
    this.render();
  }
  
  static get observedAttributes() {
    return ['data', 'size', 'error-correction'];
  }
}

if (!customElements.get('qr-code-image')) {
  customElements.define('qr-code-image', QRCodeImage);
}
```

### Phase 4: Add Tests (Week 2–3)

**Unit tests:**

```javascript
// tests/qr-code/adapter.test.js

import { generateQRCode, generateQRCodeDataURL } from '../assets/qr-code/adapter.js';

describe('QR Code Adapter', () => {
  test('generates QR code canvas from data', () => {
    const canvas = generateQRCode('ABC123XYZ');
    
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.width).toBe(300); // default size
    expect(canvas.height).toBe(300);
  });
  
  test('respects size option', () => {
    const canvas = generateQRCode('ABC123XYZ', { size: 500 });
    
    expect(canvas.width).toBe(500);
    expect(canvas.height).toBe(500);
  });
  
  test('rejects empty data', () => {
    expect(() => generateQRCode('')).toThrow('non-empty string');
    expect(() => generateQRCode('   ')).toThrow('non-empty string');
  });
  
  test('rejects data that\'s too long', () => {
    const tooLong = 'a'.repeat(3000);
    expect(() => generateQRCode(tooLong)).toThrow('too long');
  });
  
  test('rejects invalid error correction level', () => {
    expect(() => generateQRCode('data', { errorCorrection: 'X' })).toThrow('Invalid');
  });
  
  test('generates data URL', () => {
    const url = generateQRCodeDataURL('ABC123XYZ');
    
    expect(url).toMatch(/^data:image\/png;base64,/);
  });
});

// tests/qr-code-image.test.js
import './qr-code-image.js';

describe('<qr-code-image>', () => {
  test('renders QR code when data provided', async () => {
    const element = document.createElement('qr-code-image');
    element.setAttribute('data', 'ABC123XYZ');
    document.body.appendChild(element);
    
    // Wait for component to render
    await new Promise(r => setTimeout(r, 100));
    
    const canvas = element.querySelector('canvas');
    expect(canvas).toBeTruthy();
    
    document.body.removeChild(element);
  });
  
  test('shows error if data missing', () => {
    const element = document.createElement('qr-code-image');
    document.body.appendChild(element);
    
    const error = element.querySelector('.qr-code-image--error');
    expect(error).toBeTruthy();
    expect(error.textContent).toContain('required');
    
    document.body.removeChild(element);
  });
  
  test('updates when attributes change', async () => {
    const element = document.createElement('qr-code-image');
    element.setAttribute('data', 'ABC123XYZ');
    document.body.appendChild(element);
    
    // Change size
    element.setAttribute('size', '500');
    await new Promise(r => setTimeout(r, 100));
    
    const canvas = element.querySelector('canvas');
    expect(canvas.width).toBe(500);
    
    document.body.removeChild(element);
  });
});
```

### Phase 5: Documentation (Week 3)

**Create `/docs/QR_CODE_API.md`:**

```markdown
# QR Code API Documentation

## Adapter Module (`/assets/qr-code/adapter.js`)

### generateQRCode(data, options)

Generates a QR code canvas from text data.

**Parameters:**
- `data` (string, required) – Text to encode (max 2953 chars)
- `options.size` (number, default: 300) – Canvas size in pixels
- `options.errorCorrection` (string, default: 'M') – Error correction: 'L'|'M'|'H'|'Q'

**Returns:** HTMLCanvasElement

**Example:**
```javascript
import { generateQRCode } from '@theme/qr-code/adapter';

const canvas = generateQRCode('GC-ABC-123-XYZ', { size: 300, errorCorrection: 'M' });
document.body.appendChild(canvas);
```

### generateQRCodeDataURL(data, options)

Generates QR code as base64-encoded PNG data URL.

**Returns:** string (data:image/png;base64,...)

### renderQRCodeToContainer(data, container, options)

Generates QR code and appends to DOM container.

**Parameters:**
- `container` (HTMLElement) – Where to append the canvas

## Web Component (`<qr-code-image>`)

### Usage

```html
<qr-code-image
  data="GC-ABC-123-XYZ"
  size="300"
  error-correction="M"
></qr-code-image>
```

### Attributes

- `data` (required) – Text to encode
- `size` (optional, default: 300) – Canvas size in pixels
- `error-correction` (optional, default: M) – Error correction level

### Events

None (renders synchronously)

### Styling

Add CSS:
```css
qr-code-image {
  display: inline-block;
  padding: 1rem;
  background: white;
}

qr-code-image canvas {
  border: 1px solid #ccc;
}

qr-code-image .qr-code-image--error {
  color: red;
  font-size: 0.875rem;
}
```

## Deprecation Notice

This adapter wraps a legacy QR code library. We plan to replace it with a maintained library in a future sprint.

**Current library:** `/assets/qr-code-generator.js` (1,700 lines, pre-ES6, unmaintained)
**Planned replacement:** `qrcode` npm package or similar maintained library
**Timeline:** Q2/Q3 2024 (TBD)

Users of this API will not need to change code when the underlying library is replaced.
```

### Phase 6: Plan Migration (Week 3)

**Future sprint: Replace with maintained library**

```markdown
# Future: QR Code Library Replacement

## Options

1. **qrcode** (npm package)
   - Pros: Well-maintained, modern, small bundle
   - Cons: Requires npm/build step (currently not using)

2. **jsQR** (npm package)
   - Pros: Can decode AND encode
   - Cons: Slightly larger bundle

3. **comlink** (pure JS)
   - Pros: No dependencies, canvas-based
   - Cons: No longer maintained

## Decision: TBD (requires team discussion)

## Migration Path

1. Install chosen library in future sprint
2. Create new adapter module wrapping new library
3. Existing component API stays same
4. Remove old `/assets/qr-code-generator.js`
5. Tests verify behavior identical
```

---

## Done Criteria

### Audit

- [ ] All QR code usages found and documented
- [ ] Decision made: keep, replace, or archive
- [ ] `/docs/QR_CODE_STATUS.md` created

### Implementation (If Keeping)

- [ ] `/assets/qr-code/adapter.js` created with clean API
- [ ] `/assets/qr-code-image.js` refactored to use adapter
- [ ] Error handling comprehensive (no silent failures)
- [ ] Commented with deprecation notice

### Testing

- [ ] Unit tests for adapter (100% coverage)
- [ ] Integration tests for component
- [ ] Edge cases tested (empty data, max length, invalid correction level)
- [ ] All tests pass in CI/CD

### Documentation

- [ ] `/docs/QR_CODE_API.md` – Public API documented
- [ ] `/docs/QR_CODE_STATUS.md` – Status and future plan
- [ ] `/docs/QR_CODE_MIGRATION_PLAN.md` – How to replace library in future
- [ ] Inline comments on adapter functions (JSDoc)

### Quality

- [ ] No eslint warnings
- [ ] No console errors
- [ ] Backwards compatible (component API unchanged)

---

## Risk Mitigation

### Risk: Breaking Gift Card QR Codes

**Mitigation:**
- Comprehensive tests before deploy
- Manual test of gift card page
- Keep old code until new version verified

### Risk: Quality of Adapter

**Mitigation:**
- Document all assumptions about legacy library
- Test error cases extensively
- Add error handling to component

---

## Questions & TODOs

- [ ] **TODO:** Is `qr-code-generator.js` licensed? Check for license header.
- [ ] **TODO:** Are there performance concerns with 1,700-line library? Profile bundle size.
- [ ] **TODO:** Should we support QR code scanning (decode) in addition to generation?
- [ ] **TODO:** Should we add color customization to QR codes?

---

## Related Tasks

- See `/TASKS.md` for related items
- Blocking: **None**
- Blocked by: **None**
- Related to: Gift card template updates

---

## Success Metrics

**After this audit:**
- [ ] QR code usage clear and documented
- [ ] No silent failures (all errors logged)
- [ ] API clean and modern
- [ ] Plan in place for future modernization
- [ ] Gift card QR codes work reliably
