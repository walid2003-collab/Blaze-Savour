# UI Style Guide: Blaze-Savour

This document enforces consistent UI patterns and design expectations across the theme.

---

## 1. Color System

### CSS Variables (defined in `/snippets/color-schemes.liquid`)

**Base Colors:**
- `--color-background` – Primary page background
- `--color-foreground` – Primary text color
- `--color-foreground-heading` – Heading text color

**Accent Colors:**
- `--color-primary` – Brand primary accent
- `--color-primary-hover` – Primary color on hover
- `--color-border` – Dividers, borders, lines
- `--color-shadow` – Drop shadow and depth

**Component-Specific:**
- `--color-primary-button-background` – Primary button background
- `--color-primary-button-text` – Primary button text
- `--color-secondary-button-background` – Secondary button background
- `--color-input-background` – Form input background
- `--color-input-border` – Form input border
- `--color-input-hover-background` – Form input hover state
- `--color-variant-background` – Product variant swatch background
- `--color-selected-variant-background` – Selected variant swatch background

**Opacity Helpers:**
- `--opacity-5-15` – Very subtle (5–15% opacity)
- `--opacity-10-25` – Subtle (10–25% opacity)
- `--opacity-35-55` – Moderate (35–55% opacity)
- `--opacity-40-60` – Strong (40–60% opacity)
- `--opacity-30-60` – Medium-strong (30–60% opacity)

Opacity values **adjust based on background brightness**. Light backgrounds use lower opacity; dark backgrounds use higher opacity for contrast.

### Color Schemes

Merchants select a color scheme in theme editor. Each scheme defines all the above variables.

**Included schemes:**
- Light (default)
- Dark
- Custom (customizable per merchant)

### Usage

```css
/* Good: Use CSS vars for theme-able colors */
.card {
  background: var(--color-background);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}

.button--primary {
  background: var(--color-primary-button-background);
  color: var(--color-primary-button-text);
}

/* Avoid: Hardcoded colors */
.card {
  background: #ffffff;
  color: #1a1a1a; /* Not theme-able */
}
```

---

## 2. Spacing & Sizing System

### Spacing Scale

Defined in **`/snippets/theme-styles-variables.liquid`** and injected as `--spacing-scale`.

**Base value:** Calculated at render time based on merchant settings (default: 8px)

**Scale multipliers:**

| Name | Base | Example CSS |
|------|------|------------|
| `xs` | 1x | `padding: max(4px, calc(var(--spacing-scale) * 4px))` |
| `sm` | 2x | `padding: max(8px, calc(var(--spacing-scale) * 8px))` |
| `md` | 3x | `padding: max(12px, calc(var(--spacing-scale) * 12px))` |
| `lg` | 5x | `padding: max(20px, calc(var(--spacing-scale) * 20px))` |
| `xl` | 8x | `padding: max(32px, calc(var(--spacing-scale) * 32px))` |
| `2xl` | 10x | `padding: max(40px, calc(var(--spacing-scale) * 40px))` |

### Responsive Sizing

**Responsive spacing utilities** in `/snippets/spacing-style.liquid`, `/snippets/gap-style.liquid`, `/snippets/size-style.liquid`.

**Example pattern:**

```liquid
{% if section.settings.spacing_mobile %}
  <style>
    .section {
      padding: 
        max(20px, calc(var(--spacing-scale) * {{ section.settings.spacing_mobile }}px))
    }
  </style>
{% endif %}

@media (min-width: 750px) {
  .section {
    padding: 
      max(28px, calc(var(--spacing-scale) * {{ section.settings.spacing_tablet }}px))
  }
}

@media (min-width: 1024px) {
  .section {
    padding: 
      max(36px, calc(var(--spacing-scale) * {{ section.settings.spacing_desktop }}px))
  }
}
```

### Typography Scale

Defined in `/snippets/typography-style.liquid`.

**Default font sizes:**
- `h1` – `max(28px, calc(var(--font-size-heading-h1) * 1px))` (responsive)
- `h2` – `max(24px, calc(var(--font-size-heading-h2) * 1px))`
- `h3` – `max(20px, calc(var(--font-size-heading-h3) * 1px))`
- `h4` – `max(18px, calc(var(--font-size-heading-h4) * 1px))`
- `body` – `max(14px, calc(var(--font-size-body) * 1px))`
- `small` – `max(12px, calc(var(--font-size-body-small) * 1px))`

**Usage:**

```css
/* Apply via class */
.heading-h1 {
  font: var(--font-h1);
  color: var(--color-foreground-heading);
}

/* Or use inline styles in Liquid */
<h1 class="heading-h1">{{ product.title }}</h1>
```

### TODO: Typography Scale Details

- [ ] Document exact `--font-size-*` variable values
- [ ] Clarify line-height multiplier for each heading level
- [ ] Document font-weight conventions (regular, bold, etc.)

---

## 3. Component Library

### Cards

#### Product Card

**Location:** `/snippets/product-card.liquid`

**Required elements:**
- Image (via `resource-image.liquid`)
- Title (linked to product)
- Price (sale + compare-at)
- Rating/review count (if enabled)
- Variant selection or quick-add button

**States:**
- **Default** – Image, title, price visible
- **Hover** – Lift effect or image zoom; quick-add button shows
- **No image** – Placeholder image
- **Out of stock** – "Sold out" badge; button disabled
- **Sale** – "Sale" badge; strikethrough compare-at price
- **Low stock** – "Only X left" warning text

**Accessibility:**
- Product link has focus style
- Quick-add button has focus + hover style
- Price currency spelled out (not just `$`)
- Out-of-stock state communicated to screen readers (aria-disabled)

**CSS classes:**
```
.product-card
  .product-card__image
  .product-card__title
  .product-card__price
  .product-card__rating
  .product-card__badges
  .product-card__quick-add
```

#### Collection Card

**Location:** `/snippets/collection-card.liquid`

**Similar to product card:**
- Image (via `resource-image.liquid`)
- Title (linked to collection)
- Product count badge

#### Resource Card

**Generic card** for blog posts, pages, etc.

**Location:** `/snippets/resource-card.liquid`

**Elements:**
- Image / featured media
- Title
- Description / excerpt
- Author / date (for blog)
- CTA button

### Buttons

**Location:** `/snippets/button.liquid`

**Types:**
- `button--primary` – Brand color, solid fill
- `button--secondary` – Outline or inverse
- `button--tertiary` – Text-only link style
- `button--small` – Compact size

**States:**
- **Default**
- **Hover** – Lift, scale, or color change
- **Active** – Pressed appearance
- **Disabled** – Greyed out; not clickable
- **Loading** – Spinner icon; button disabled

**Accessibility:**
- Focus style visible (2px outline min)
- Text content clear ("Add to Cart" not "Submit")
- Buttons have `type="button"` or `type="submit"`
- Disabled buttons have `disabled` attr + aria-disabled

### Forms & Inputs

**Location:** `/snippets/input.liquid`, `/snippets/checkbox.liquid`, etc.

**Elements per input:**
- `<label>` with clear text
- `<input>` or `<textarea>` or `<select>`
- Error message container (if validation)
- Helper text (optional)

**States:**
- **Default** – Border, normal background
- **Focus** – Border color change, outline
- **Error** – Red border, error message visible
- **Disabled** – Greyed out
- **Readonly** – Border but no interaction

**Accessibility:**
- Label associated with input via `for="id"`
- Error messages linked via `aria-describedby`
- Invalid inputs have `aria-invalid="true"`
- Required fields marked with `aria-required="true"` + visual indicator
- Radio/checkbox groups wrapped in `<fieldset><legend>`

### Modals / Dialogs

**Locations:**
- `/snippets/dialog.js` – JS controller
- `/snippets/quick-add-modal.liquid` – Quick-add product form
- `/snippets/shop-look-modal.liquid` – Shop The Look carousel

**Structure:**

```html
<dialog ref="modal" aria-label="Modal Title">
  <div class="modal__content">
    <button class="modal__close" aria-label="Close">
      {% render 'icon' with name: 'close' %}
    </button>
    
    <!-- Modal content -->
  </div>
</dialog>
```

**Requirements:**
- `<dialog>` element (native or polyfilled)
- Modal-scoped focus trap (focus doesn't escape)
- Escape key closes modal
- Click outside modal closes (if configured)
- Restore focus to trigger button on close
- `aria-modal="true"` on dialog

### Announcement Bar

**Location:** `/assets/announcement-bar.js`, `/sections/header-announcements.liquid`

**Features:**
- Rotating announcements
- Auto-play (optional)
- Dismiss button (session storage)
- Keyboard navigation (arrow keys)

**CSS classes:**
```
.announcement-bar
  .announcement-bar__slide (hidden until active)
  .announcement-bar__text
  .announcement-bar__cta (optional button)
  .announcement-bar__close
  .announcement-bar__controls (dots/pagination)
```

### Icon System

**Location:** `/snippets/icon.liquid`

**Includes:** 200+ SVG icons as inline SVG

**Usage:**

```liquid
{% render 'icon' with name: 'cart', class: 'icon-small', aria_label: 'Shopping Cart' %}
```

**Output:**

```html
<svg class="icon icon-small icon--cart" aria-label="Shopping Cart" viewBox="...">
  <!-- SVG paths -->
</svg>
```

**Accessibility:**
- Icons must have `aria-label` if no adjacent text
- Decorative icons get `aria-hidden="true"`

### TODO: Icon System Maintenance

- [ ] Document process for adding new icons
- [ ] Consider SVG sprite or symbol approach
- [ ] Document icon sizing convention (small, medium, large)

---

## 4. Accessibility Expectations

**All new components must meet these standards.**

### Interactive Elements

- **Focus style:** Visible outline (min 2px, not removed)
- **Keyboard navigation:** Tab through, Enter/Space to activate
- **Touch targets:** Min 44×44px for mobile buttons

### Forms

- **Labels:** Every input has associated `<label>` or aria-label
- **Error messages:** Linked via `aria-describedby`, announced to screen readers
- **Validation:** Errors shown before submission (client-side validation)
- **Required fields:** Marked with `aria-required="true"` + visual indicator
- **Live regions:** Dynamic updates announced via `aria-live="polite"` or `aria-live="assertive"`

### Images

- **Alt text:** Descriptive for content images, empty (`alt=""`) for decorative
- **Linked images:** Link destination should be clear from alt text

### Color

- **Contrast:** Text meets WCAG AA minimum (4.5:1 for normal, 3:1 for large)
- **Color not sole indicator:** "Required (red star)" not just red star
- **Links:** Underlined or other visual distinction, not color alone

### Dynamic Content

- **Loading states:** Clear feedback (spinner, "Loading...")
- **Error states:** Error message + retry option
- **Toast notifications:** Announced via live region
- **Pagination:** "Page X of Y" announced on update

### Modals / Dialogs

- **Focus trap:** Focus stays within modal
- **Restore focus:** Focus returns to trigger button on close
- **Escape key:** Closes modal
- **Announcement:** Modal title announced on open

### TODO: Accessibility Gaps

- [ ] Test gift card form with screen reader (verify live regions exist)
- [ ] Audit "Shop The Look" modal for focus trap
- [ ] Verify all color scheme variants meet WCAG AA contrast
- [ ] Test facets filtering with keyboard-only navigation
- [ ] Add accessibility testing to CI/CD

---

## 5. Responsive Design

### Breakpoints

(Inferred from CSS; TODO: confirm exact values)

- **Mobile:** < 750px
- **Tablet:** 750px – 1024px
- **Desktop:** ≥ 1024px

### Mobile-First Approach

All styles start at mobile, then override for larger screens:

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 750px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Image Sizing

**Product grid:**
- Mobile: 1 column, full width
- Tablet: 2 columns
- Desktop: 3–4 columns (configurable)

**Hero:**
- Mobile: Full viewport width, capped height
- Desktop: Full viewport width + height

**TODO: Document responsive image sizing strategy**

- [ ] What image resizes does Shopify CDN support?
- [ ] What is the max image width? (e.g., 2400px?)
- [ ] How are srcset breakpoints chosen?

---

## 6. Hover & Interaction States

### Cards

**Default:** Shadow none or subtle  
**Hover:** Lift up (transform: translateY(-4px)) or scale (1.03)  
**Active:** No additional change

(Controlled by `--card-hover-effect` setting in theme editor)

### Buttons

**Default:** Solid fill  
**Hover:** Color shift or slight scale (1.02)  
**Active:** Darker or pressed appearance  
**Disabled:** 50% opacity, no interaction

### Inputs

**Default:** Border visible, background color  
**Focus:** Border color change, outline  
**Hover:** Background color shift (subtle)  
**Error:** Red border, error message visible

### Links

**Default:** Underline (or inherit color)  
**Hover:** Color change, underline (if not already)  
**Visited:** Slightly different color (optional)

---

## 7. Animation & Motion

### Enabled by Default

(Can be disabled in theme settings for `prefers-reduced-motion`)

- Hover lift/scale on cards (250ms ease-out)
- Transitions on color/background changes (300ms)
- Smooth scroll (browser default)
- View transitions on navigation (if enabled)

### Disabled Automatically

If user has `prefers-reduced-motion: reduce`, animations disable.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Dark Mode Support

### Approach

Color scheme system (in `/snippets/color-schemes.liquid`) defines all colors per scheme.

User can select light/dark in theme editor or via picker (if implemented).

### Variables Change

When `.color-dark` class applied:
- `--color-background` → Dark value
- `--color-foreground` → Light text
- `--color-border` → Light border
- Opacity values recalculated for contrast

### No CSS Media Query

`prefers-color-scheme` is **not used** for automatic dark mode. Merchant chooses explicitly.

(TODO: If automatic dark mode needed, add `@media (prefers-color-scheme: dark)` support)

---

## 9. Known Limitations & TODO

### Spacing Utilities Duplication

- [ ] **Issue:** `spacing-style.liquid`, `gap-style.liquid`, `size-style.liquid` repeat similar logic
- [ ] **Action:** Extract shared utility; define single source of truth

### CSS Variables Not Fully Documented

- [ ] **Issue:** Many `--font-size-*` and `--spacing-*` vars lack documentation
- [ ] **Action:** Add inline comments or reference table in this guide

### Icon System Hard to Extend

- [ ] **Issue:** 200+ line case/when in `icon.liquid`; adding icons is manual
- [ ] **Action:** Consider SVG sprite, symbol approach, or icon library

### Accessibility Test Coverage Missing

- [ ] No automated accessibility testing in CI/CD
- [ ] Manual screen reader testing not documented
- [ ] [ ] Action:** Set up axe or similar; document testing process

---

## 10. Contributing to This Guide

- Found a gap or unclear guidance? Add a `TODO:` section with details.
- Adding a new component? Document it here with structure, states, accessibility, classes.
- Changing colors/spacing? Update this guide first, then implement.

**Remember:** This guide is the source of truth for UI consistency. Keep it updated.
