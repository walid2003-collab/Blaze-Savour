# Spec: Resource Image Hardening

**Status:** Open  
**Priority:** HIGH  
**Effort:** 1 sprint

---

## Summary

`resource-image.liquid` (~120 lines) handles rendering of product images, collection images, and article featured images. It makes assumptions about data shape (content type, aspect ratio, placeholder existence) without robust error handling. This spec defines input contracts, error rules, and performance constraints.

---

## Goal / Why This Matters

1. **Reliability** – Currently fails silently if assumptions break (e.g., missing aspect ratio, unexpected content type)
2. **Performance** – Must not cause layout shift (CLS) or oversized image requests
3. **Fallback Strategy** – Clear placeholder behavior when image missing
4. **Responsive Design** – Image sizing must scale correctly at all breakpoints
5. **Accessibility** – Alt text must be present and descriptive

---

## User Story

**As a** website user  
**I want to** see product/collection/article images load quickly and responsively  
**So that** pages feel polished and load fast

**Acceptance:**
- Images load from CDN (Shopify-optimized, not full-res)
- Alt text is descriptive and accessible
- Placeholder shown if image missing (not broken image)
- Layout doesn't shift when image loads (correct aspect ratio set early)
- Images responsive at all screen sizes

---

## UX Contract

### Surfaces Touched

- Product cards (`/snippets/product-card.liquid`)
- Collection cards (`/snippets/collection-card.liquid`)
- Resource cards (`/snippets/resource-card.liquid`)
- Hero/featured images (various sections)
- Blog post featured images (`/sections/main-blog-post.liquid`)

### Required States

1. **Image exists** – Render with correct size, alt text, responsive srcset
2. **Image missing** – Show placeholder (gray box with icon or pattern)
3. **Wrong content type** – Fallback to generic placeholder (not error)
4. **Aspect ratio unknown** – Calculate from image dimensions; if unavailable, use default ratio
5. **Loading** – `loading="lazy"` for non-critical images; no visible lag
6. **Loaded** – Clean, sharp, no layout shift

---

## Data Contract

### Inputs

**For product image:**

```liquid
resource: product         # Shopify product object
field: 'featured_image'   # Image field name
alt_text: 'Winter coat'   # Fallback alt if resource.alt missing
size: '600x600'           # Desired CDN size
aspect_ratio: 1           # Width / height (optional)
placeholder: 'color'      # Placeholder type: 'color', 'svg', 'image'
lazy: true                # Lazy load (optional)
```

**For collection image:**

```liquid
resource: collection
field: 'image'
alt_text: 'Winter collection'
size: '400x400'
aspect_ratio: 1
placeholder: 'color'
```

**For article image:**

```liquid
resource: article
field: 'image'
alt_text: article.title   # Use article title as default
size: '800x600'
aspect_ratio: 1.33
placeholder: 'svg'
```

### Product Image Properties (Shopify)

```javascript
product.featured_image: {
  id: 123,
  src: "https://cdn.shopify.com/...",
  alt: "Product name",
  width: 1024,
  height: 1024,
  aspect_ratio: 1
}

product.images: [ /* array of above */ ]
```

**Available aspect ratios:** 1, 1.5, 2, 0.67, etc. (computed as width/height)

### Validation Rules

**Image must have:**
- `src` (URL)
- `alt` (text; or fallback provided)
- `width` and `height` (for aspect ratio calculation)

**CDN size requests:**
- Shopify supports: 100x100, 200x200, 300x300, 400x400, 500x500, 600x600, 800x800, 1000x1000, 1200x1200, 1500x1500, 1600x1600, 2000x2000, 2048x2048, 2560x2560, 3000x3000
- Must be a valid size pair
- Max size: 3000x3000 (too large wastes bandwidth)
- If requested size not in list, use nearest smaller or default to 600x600

**Content types supported:**
- `product`
- `collection`
- `article` (blog)
- `page` (generic)

**Aspect ratios:**
- Must be positive number
- Typically 0.5 (portrait) to 2 (landscape)
- Default fallback: 1 (square) if unknown

---

## Implementation Plan

### Phase 1: Input Validation (Week 1)

**Create `/snippets/resource-image-validate.liquid`:**

```liquid
{%- comment -%}
  Validates resource image inputs and returns safe data
  
  Input:
    - resource: object with image field
    - field: string (e.g., 'featured_image', 'image')
    - alt_text: fallback alt text
    - size: desired CDN size (e.g., '600x600')
    - aspect_ratio: optional ratio (width/height)
  
  Output:
    - src: image CDN URL
    - alt: descriptive alt text
    - aspect_ratio: computed or provided ratio
    - sizes: responsive sizes string
    - loading: 'lazy' or 'eager'
{%- endcomment -%}

{%- if resource[field] -%}
  {%- assign image = resource[field] -%}
  
  {%- comment -%} Validate image object {%- endcomment -%}
  {%- if image.src == blank -%}
    {%- comment -%} Image missing src; return placeholder {%- endcomment -%}
    {%- assign result = 'error' | json -%}
  {%- else -%}
    {%- comment -%} Image exists; validate fields {%- endcomment -%}
    
    {%- assign img_alt = image.alt | default: alt_text -%}
    {%- if img_alt == blank -%}
      {%- assign img_alt = 'Product image' -%}
    {%- endif -%}
    
    {%- comment -%} Compute aspect ratio {%- endcomment -%}
    {%- if aspect_ratio != blank -%}
      {%- assign img_aspect_ratio = aspect_ratio -%}
    {%- elsif image.aspect_ratio != blank -%}
      {%- assign img_aspect_ratio = image.aspect_ratio -%}
    {%- elsif image.width and image.height -%}
      {%- assign img_aspect_ratio = image.width | divided_by: image.height | round: 2 -%}
    {%- else -%}
      {%- assign img_aspect_ratio = 1 -%}
    {%- endif -%}
    
    {%- comment -%} Validate requested size {%- endcomment -%}
    {%- if size == blank -%}
      {%- assign size = '600x600' -%}
    {%- endif -%}
    
    {%- assign img_url = image.src | img_url: size -%}
    
    {%- capture result -%}
      {
        "src": "{{ img_url }}",
        "alt": "{{ img_alt }}",
        "aspect_ratio": {{ img_aspect_ratio }},
        "width": {{ image.width | default: 600 }},
        "height": {{ image.height | default: 600 }},
        "valid": true
      }
    {%- endcapture -%}
  {%- endif -%}
{%- else -%}
  {%- comment -%} Field doesn't exist on resource {%- endcomment -%}
  {%- assign result = '{"error":"image_missing","valid":false}' -%}
{%- endif -%}

{{- result -}}
```

**Usage in component:**

```liquid
{% assign validated = 'resource-image-validate' 
  | snippet: 
  resource: product,
  field: 'featured_image',
  alt_text: product.title,
  size: '600x600',
  aspect_ratio: 1
%}

{% if validated.valid %}
  <img src="{{ validated.src }}" alt="{{ validated.alt }}" />
{% else %}
  <div class="image-placeholder">No image available</div>
{% endif %}
```

### Phase 2: Error Handling & Placeholders (Week 1)

**Placeholder strategies:**

```liquid
{%- if image_missing -%}
  {%- if placeholder_type == 'color' -%}
    {%- comment -%} Solid color background with CSS aspect ratio {%- endcomment -%}
    <div 
      class="image-placeholder image-placeholder--color"
      style="aspect-ratio: {{ aspect_ratio }}"
    >
      <span class="image-placeholder__icon">📸</span>
    </div>
  
  {%- elsif placeholder_type == 'svg' -%}
    {%- comment -%} SVG placeholder with pattern {%- endcomment -%}
    <svg 
      class="image-placeholder image-placeholder--svg"
      style="aspect-ratio: {{ aspect_ratio }}"
      viewBox="0 0 100 100"
    >
      <rect fill="var(--color-border)" width="100" height="100" />
      <circle cx="50" cy="30" r="15" fill="var(--color-foreground-muted)" opacity="0.3" />
      <path d="M 0 70 L 50 40 L 100 70 L 100 100 L 0 100 Z" fill="var(--color-foreground-muted)" opacity="0.3" />
    </svg>
  
  {%- elsif placeholder_type == 'image' -%}
    {%- comment -%} Generic placeholder image from CDN {%- endcomment -%}
    <img 
      src="https://cdn.shopify.com/s/images/admin/placeholder-images/product-1.png"
      alt="Placeholder image"
      style="aspect-ratio: {{ aspect_ratio }}"
    />
  {%- endif -%}
{%- endif -%}
```

**CSS for aspect ratio:**

```css
.image-placeholder {
  display: block;
  width: 100%;
  aspect-ratio: var(--image-aspect-ratio, 1);
  background: var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-foreground-muted);
}

.image-placeholder__icon {
  font-size: 2rem;
}
```

### Phase 3: Responsive Sizing (Week 1–2)

**Responsive `sizes` attribute:**

```liquid
{%- comment -%}
  Generate responsive sizes string for srcset
  
  Breakpoints:
  - Mobile (< 750px): full width
  - Tablet (750px – 1024px): 50% width (2 columns)
  - Desktop (1024px+): 33% width (3 columns)
{%- endcomment -%}

{%- assign sizes = '
  (max-width: 749px) 100vw,
  (max-width: 1023px) 50vw,
  33vw
' | strip_newlines -%}

<img 
  src="{{ image.src | img_url: '600x600' }}"
  srcset="
    {{ image.src | img_url: '300x300' }} 300w,
    {{ image.src | img_url: '600x600' }} 600w,
    {{ image.src | img_url: '900x900' }} 900w
  "
  sizes="{{ sizes }}"
  alt="{{ image.alt }}"
  loading="lazy"
  width="600"
  height="600"
  style="aspect-ratio: 1"
/>
```

### Phase 4: Performance & CLS Prevention (Week 2)

**Prevent layout shift:**

```html
<!-- Use CSS aspect-ratio + explicit width/height -->
<img
  src="..."
  width="600"
  height="600"
  style="aspect-ratio: 1; width: 100%; height: auto;"
  alt="..."
/>

<!-- Or use container padding hack (older browsers) -->
<div style="position: relative; padding-bottom: 100%; height: 0;">
  <img
    src="..."
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    alt="..."
  />
</div>
```

**Lazy loading:**

```liquid
{%- if is_critical_image -%}
  loading="eager"
  fetchpriority="high"
{%- else -%}
  loading="lazy"
  fetchpriority="auto"
{%- endif -%}
```

### Phase 5: Testing (Week 2–3)

**Liquid unit tests (pseudocode):**

```javascript
// tests/snippets/resource-image-validate.test.js

test('validates product with image', () => {
  const product = {
    featured_image: {
      src: 'https://cdn.shopify.com/...',
      alt: 'Winter coat',
      width: 1024,
      height: 1024,
      aspect_ratio: 1
    }
  };
  
  const result = validateResourceImage({
    resource: product,
    field: 'featured_image'
  });
  
  expect(result.valid).toBe(true);
  expect(result.src).toContain('img_url');
  expect(result.alt).toBe('Winter coat');
  expect(result.aspect_ratio).toBe(1);
});

test('returns placeholder for missing image', () => {
  const product = { featured_image: null };
  
  const result = validateResourceImage({
    resource: product,
    field: 'featured_image',
    alt_text: 'Fallback'
  });
  
  expect(result.valid).toBe(false);
  expect(result.error).toBe('image_missing');
});

test('computes aspect ratio from dimensions', () => {
  const product = {
    featured_image: {
      src: '...',
      width: 800,
      height: 600
    }
  };
  
  const result = validateResourceImage({ resource: product });
  
  expect(result.aspect_ratio).toBeCloseTo(1.33, 2);
});
```

**Performance tests (Lighthouse):**

```javascript
// Measure CLS, LCP, FID
// - CLS must be < 0.1 (no layout shift)
// - LCP must include image time
// - Image should not block rendering
```

---

## Done Criteria

### Validation

- [ ] Image object validated before render
- [ ] Missing images don't cause errors (show placeholder)
- [ ] Alt text always present (or fallback provided)
- [ ] Aspect ratio computed or provided
- [ ] CDN sizes validated (use nearest supported if invalid)

### Error Handling

- [ ] Missing image field → placeholder shown
- [ ] Null/undefined image → placeholder shown
- [ ] Wrong content type → generic placeholder
- [ ] No console errors; graceful degradation

### Performance

- [ ] Aspect ratio set early (no CLS)
- [ ] Responsive srcset + sizes
- [ ] Lazy loading for non-critical images
- [ ] Lighthouse performance score unchanged or improved

### Accessibility

- [ ] All images have descriptive alt text
- [ ] Placeholder images have alt text ("Image placeholder")
- [ ] SVG placeholders have `aria-label` or `role="img"`

### Documentation

- [ ] Input/output contract documented
- [ ] Error codes documented
- [ ] Examples for different content types
- [ ] Performance guidelines documented

### Testing

- [ ] Unit tests for validation logic (100% coverage)
- [ ] Edge cases tested (missing alt, missing dimensions, etc.)
- [ ] Performance tested (no CLS)
- [ ] Accessibility tested (alt text verified)

---

## Risk Mitigation

### Risk: Layout Shift (CLS)

**Mitigation:**
- Always set `aspect-ratio` CSS property early
- Use `width` / `height` attributes on `<img>`
- Set container size before image loads

### Risk: Broken Images

**Mitigation:**
- Validate image object before rendering
- Show placeholder if any field missing
- Test with images disabled in dev tools

### Risk: Accessibility

**Mitigation:**
- Always include `alt` text (never empty unless decorative)
- Test with screen reader
- Use ARIA labels for SVG placeholders

---

## Questions & TODOs

- [ ] **TODO:** Should we support WebP format? (Shopify CDN supports it)
- [ ] **TODO:** What is the max acceptable CDN size? (Currently 3000x3000; waste bandwidth if too large)
- [ ] **TODO:** Should we cache placeholder images or generate dynamically?
- [ ] **TODO:** How should we handle animated GIFs? (Preserve animation or convert to PNG)
- [ ] **TODO:** Should we add `decoding="async"` for performance?

---

## Related Tasks

- See `/TASKS.md` for related items
- Blocking: **None**
- Blocked by: **None**
- Related to: Product card rendering; collection card rendering

---

## Success Metrics

**After this hardening:**
- [ ] Zero image-related errors in error logs
- [ ] Lighthouse CLS score stays < 0.1
- [ ] Page load time unchanged
- [ ] Developer time to add new image fields < 5 minutes
