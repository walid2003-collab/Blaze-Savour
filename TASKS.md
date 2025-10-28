# Blaze-Savour – Active Tasks & Technical Debt

## Open Tasks

Implementation specs linked below detail upcoming work. These are **prioritized**—highest impact first.

### Active Specs

1. **[Facets Refactor](/specs/facets_refactor.md)** – Decouple filtering, sorting, and currency logic in `facets.js` (~900 lines). Add error handling and accessibility support.

2. **[Shop The Look Validation](/specs/shop_the_look_validation.md)** – Harden `shop-the-look.js` with input validation, product slot bounds, and graceful fallback UI.

3. **[Resource Image Hardening](/specs/resource_image_hardening.md)** – Document contracts, error rules, and performance constraints for `resource-image.liquid`.

4. **[Theme Global Refactor](/specs/theme_global_refactor.md)** – Migrate away from implicit global `Theme` dependency. Document shape. Add runtime guards.

5. **[QR Code Audit](/specs/qr_code_audit.md)** – Identify all usages of `qr-code-generator.js` (~1,700 lines). If unused, archive it. If used, wrap behind an adapter.

---

## Technical Debt / High-Risk Areas

### Immediate Action Required

| Item | File(s) | Issue | Action |
|------|---------|-------|--------|
| **QR Code Generator** | `assets/qr-code-generator.js` | Legacy pre-ES6 code, ~1,700 lines, magic numbers, unclear purpose | See Spec 5: Audit & wrap or archive |
| **Facets Coupling** | `assets/facets.js` | ~900 lines: filtering, sorting, currency logic tangled together. Hardcoded currency data at bottom (~line 891). | See Spec 1: Split concerns, add tests |
| **Shop The Look Validation** | `assets/shop-the-look.js` | Hardcoded 5 product slots (`product_1`–`product_5`). No input sanitization. No fallback if products missing. | See Spec 2: Add validation & error UI |
| **Theme Global Dependency** | `assets/scripts.liquid`, all components | Implicit load-order coupling via global `Theme` object. Silent failures if undefined. | See Spec 4: Refactor to ES6 modules |
| **Resource Image Assumptions** | `snippets/resource-image.liquid` | ~120 lines assuming data shape (content type, aspect ratio, placeholders). If data missing, unclear behavior. | See Spec 3: Document contracts & error rules |

### High Priority (Non-Blocking)

| Item | File(s) | Issue | Action |
|------|---------|-------|--------|
| **Gift Card Form Accessibility** | `assets/gift-card-recipient-form.js` | Form errors require `liveRegion` element that may not exist. Date input uses pattern attr (poor mobile UX). Character counter not announced to screen readers. | Add ARIA live regions. Improve date input. Test with accessibility tools. |
| **Jumbo Text Resize Handling** | `assets/jumbo-text.js` | Binary search for font sizing. No visible debouncing on resize events. Risk of layout thrashing. | Add resize debounce. Profile performance. |
| **Component Ref Validation** | `assets/component.js` | `requiredRefs` checked in `connectedCallback` but doesn't prevent usage. Failure modes unclear. | Throw clear error if missing ref. Add logging. |
| **Facets No-Results State** | `assets/facets.js` | Network errors caught but component silently hidden. No feedback to user. | Add error UI with retry option. |
| **Shop The Look Modal Focus Trap** | `assets/shop-the-look.js` | Modal opens but focus trap behavior not documented. Tab-trapping untested. | Implement & test focus management per WAI-ARIA. |
| **Spacing Utilities Duplication** | `snippets/spacing-style.liquid`, `snippets/gap-style.liquid`, `snippets/size-style.liquid` | Similar logic copied across multiple snippets. Hard to maintain. | Extract shared utility. Define single source of truth. |

### Medium Priority (Nice to Have)

| Item | File(s) | Issue | Action |
|------|---------|-------|--------|
| **CSS Variables Documentation** | `assets/base.css` | Defines `--spacing-scale`, `--font-size`, etc. but undocumented. Hard to use consistently. | Document all vars. Add examples in `/docs/STYLE_GUIDE_UI.md`. |
| **Icon System Maintenance** | `snippets/icon.liquid` | 200+ line case/when with inline SVGs. Adding new icons is manual. | Consider SVG sprite or icon library. Document process. |
| **Missing Tests** | — | No test files found. Complex logic (QR code, facets, font sizing) lacks coverage. | Set up Jest/Vitest. Add tests for facets, shop-the-look, component.js. |
| **Meta Tags Coverage** | `snippets/meta-tags.liquid` | Missing schema.org structured data. No canonical URL handling for variants. | Add JSON-LD. Document meta tag strategy. |
| **Metadata / Comments** | Various | Many files lack JSDoc. Liquid snippets have sparse documentation. | Add/improve comments. Especially for complex Liquid logic. |

---

## Questions / Unknowns

_These items block decisions. They require confirmation via code review, merchant feedback, or testing._

### Critical Path Blockers

- **[TODO] Is `qr-code-generator.js` still used anywhere?**  
  ✓ _CONFIRMED: Yes – used in `/templates/gift_card.liquid` via `qr-code-image.js`_

- **[TODO] What is the expected max number of "Shop The Look" product slots?**  
  Currently hardcoded to 5. Should this be configurable? Validated by theme editor settings?

- **[TODO] Where does currency data come from in `facets.js` (line ~891)?**  
  Is it always injected from the server? Can it be undefined? What happens if it is?

- **[TODO] Does `resource-image.liquid` handle all possible Shopify content types?**  
  What are the failure modes if unsupported types are passed?

- **[TODO] What is the theme's target browser support?**  
  (Impacts decision to use CSS variables, ES6 classes, etc.)

### Development & DevOps

- **[TODO] How is this theme deployed to production?**  
  (Shopify CLI? Manual theme upload? CI/CD pipeline?)

- **[TODO] What is the Node version requirement for any build tooling?**  
  (I don't see a bundler in `/assets`, so likely raw ES6 modules.)

- **[TODO] Are there environment-specific configs?**  
  (Dev store vs production store URLs, API keys, etc.)

### Product / UX

- **[TODO] Are there any analytics/event tracking requirements?**  
  (E.g., "Shop The Look modal opened", "Filter applied", etc.)

- **[TODO] What is the expected fallback behavior for network errors?**  
  (E.g., if recommendations API fails, should recommendations section hide or show cached data?)

- **[TODO] Is there a performance budget?**  
  (E.g., JS bundle size, Core Web Vitals targets?)

---

## Related Documentation

- **[README.md](../README.md)** – Project overview, stack, top priorities
- **[/docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** – Directory structure, render/runtime pipelines
- **[/docs/PROJECT_GUIDE.md](./docs/PROJECT_GUIDE.md)** – Business context, experiences, out-of-scope
- **[/docs/SECURITY_MODEL.md](./docs/SECURITY_MODEL.md)** – Data handling guardrails

---

## How to Contribute

1. Pick a spec from the "Open Tasks" section above.
2. Read the full spec in `/specs/`.
3. Create a feature branch: `git checkout -b <spec-name>`
4. Implement changes per the spec's "Done Criteria".
5. Open a PR with reference to the spec file.
6. Once merged, update this file to mark the spec as `[DONE]`.
