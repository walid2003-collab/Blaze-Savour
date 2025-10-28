# Local Development Runbook: Blaze-Savour

This document covers how to set up, run, and test the theme locally.

---

## Prerequisites

- **Shopify Account:** Access to a development store or preview store
- **Shopify CLI:** Installed and authenticated (`shopify --version` to check)
  - Installation: https://shopify.dev/docs/themes/tools/cli/install
  - Authentication: `shopify auth login` and select development store
- **Code Editor:** VS Code or similar (with Liquid, JavaScript, CSS language support)
- **Git:** Version control (for branching, commits, PR workflow)

### Optional

- **Node.js:** (if build tooling is added in future)
- **curl / REST client:** For testing API endpoints

### TODO: Determine Node.js Requirement

- [ ] Are there any build/bundling steps for `/assets`?
- [ ] If yes, what is the minimum Node version?
- [ ] Should be documented here once confirmed.

---

## Project Structure Reminder

```
Blaze-Savour/
├── assets/              # JS, CSS, images
├── blocks/              # Reusable blocks
├── config/              # Theme settings
├── docs/                # Documentation (you are here)
├── locales/             # i18n translations
├── sections/            # Full page sections
├── snippets/            # Reusable Liquid fragments
├── templates/           # Page-level templates
├── README.md            # Project overview
├── TASKS.md             # Open tasks & tech debt
└── specs/               # Implementation specs
```

See `/docs/ARCHITECTURE.md` for detailed layout.

---

## Setting Up Locally

### 1. Clone the Repository

```bash
git clone https://github.com/walid2003-collab/Blaze-Savour.git
cd Blaze-Savour
```

### 2. Authenticate with Shopify CLI

```bash
shopify auth login
```

Select your development store from the list. This stores credentials in your local machine.

### 3. (Optional) Create a Feature Branch

```bash
git checkout -b feature/my-change
```

### 4. Start Theme Dev Server

```bash
shopify theme dev
```

**Output should show:**

```
✓ Uploading theme files...
✓ Build started
✓ Generated CSS bundled successfully

Viewing theme:
  - Development: https://your-store.myshopify.com/?preview_theme_id=YOUR_THEME_ID
  - Editor: https://your-store.myshopify.com/admin/themes/YOUR_THEME_ID/editor

Listening for file changes...
```

### 5. Open Dev Store

Visit the development URL in your browser. All local file changes auto-reload.

---

## Development Workflow

### File Changes

1. **Edit Liquid templates** in `/sections/*.liquid`, `/snippets/*.liquid`, etc.
   - Changes reload automatically
   - Errors shown in console

2. **Edit CSS** in `/assets/*.css`
   - Changes reload automatically
   - Browser dev tools show errors

3. **Edit JavaScript** in `/assets/*.js`
   - Changes reload automatically
   - Check browser console for errors
   - Use `console.log()` for debugging

4. **Edit theme settings** in `/config/settings_data.json`
   - Changes take effect on save
   - Visible in theme editor

### Testing Changes

**In browser:**
- Open browser dev tools (F12)
- Check Console tab for errors
- Check Network tab for API calls
- Verify UI renders correctly at multiple breakpoints

**On mobile:**
- Use device's IP: `http://<YOUR_MACHINE_IP>:9292`
- Or use Chrome DevTools device emulation

**Performance:**
- Use Lighthouse (Chrome DevTools) to audit performance
- Check Core Web Vitals
- Profile JS execution in Performance tab

### Reverting Changes

If you make a mistake, revert the file:

```bash
git checkout -- path/to/file.liquid
```

---

## Theme Structure & Editing

### Sections (Full Page Areas)

Edit `/sections/*.liquid`. These are theme editor-configurable.

**Schema at top of file:**

```liquid
{% schema %}
{
  "name": "My Section",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Section Heading"
    }
  ]
}
{% endschema %}
```

Changes to schema appear in theme editor immediately.

### Blocks (Reusable Components)

Edit `/blocks/*.liquid`. Blocks nest inside sections.

**Schema format same as sections.**

### Snippets (Reusable Fragments)

Edit `/snippets/*.liquid`. Use via `{% render 'snippet-name' with param: value %}`.

**No schema needed** (snippets are not directly theme editor configurable).

### Liquid Filters & Tags

See Shopify Liquid documentation: https://shopify.dev/api/liquid

Common filters used in this theme:
- `| t` – Translate (i18n)
- `| money` – Format currency
- `| img_url` – Shopify image CDN URL
- `| strip_html` – Remove HTML tags
- `| split` – Split string by delimiter

### Accessing Data in Liquid

**Global variables:**

```liquid
{{ product }}          <!-- Product object (on product pages) -->
{{ collection }}       <!-- Collection object (on collection pages) -->
{{ settings }}         <!-- Theme settings from config/settings_data.json -->
{{ request.locale }}   <!-- Current language (e.g., "en") -->
{{ request.design_mode }} <!-- True if merchant viewing theme editor -->
```

**Passing data to components:**

```liquid
{% render 'product-card' with product: product, show_rating: true %}
```

### CSS in Liquid

Scope CSS to section to avoid conflicts:

```liquid
{% style %}
  #shopify-section-{{ section.id }} .my-element {
    background: var(--color-primary);
  }
{% endstyle %}
```

---

## Testing

### Manual Testing

1. **Browse storefront** at different screen sizes (mobile, tablet, desktop)
2. **Test interactions:**
   - Add products to cart
   - Filter collections
   - Open modals (Shop The Look, Quick Add)
   - Submit forms
3. **Test on real devices** (phone, tablet) if possible
4. **Test with accessibility tools:**
   - Keyboard-only navigation (Tab, Enter, Escape)
   - Screen reader (NVDA on Windows, VoiceOver on Mac/iOS)
   - Browser accessibility audit (Chrome DevTools)

---

## Debugging

### Browser Console

```javascript
// Check if Theme object exists
console.log(window.Theme);

// Check component refs
const component = document.querySelector('my-component');
console.log(component.refs);

// Check for errors
// (Console tab shows all JS errors)
```

### Network Tab

- Check API responses from AJAX calls
- Verify image CDN requests
- Look for failed requests (red = error)

### React DevTools / Vue DevTools

Not applicable (this theme uses vanilla Web Components).

### Shopify Debugger

Shopify CLI includes a debugger. Run:

```bash
shopify theme pull --only=templates
```

To sync with live store settings.

---

## Deployment

### TODO: Document Theme Deployment

- [ ] How are themes deployed to production?
- [ ] Is there a CI/CD pipeline?
- [ ] What is the process for theme updates?
- [ ] Are there staging/production environments?

**Typical flow:**

```bash
# Create feature branch
git checkout -b feature/my-change

# Make changes locally
# Test in dev store
shopify theme dev

# Commit and push
git add .
git commit -m "feat: add my change"
git push origin feature/my-change

# Create PR
# After review/approval, merge to main

# Deploy to production store
shopify theme push --live
```

---

## Environment & Secrets

### No Secrets in Git

Theme code must **never** contain:
- API keys
- Webhook secrets
- Admin tokens
- Customer data

If environment-specific config is needed, store in:
- Shopify theme settings (`/config/settings_data.json`)
- Shopify metafields
- Environment variables (not committed to git)

### Multi-Environment Notes

**Development store** (local)
- Used for testing changes
- Isolated from production

**Staging store** (optional)
- Used for pre-production testing
- More realistic data

**Production store** (live)
- Real customers
- Active sales
- Deploy with caution

---

## Troubleshooting

### Dev Server Won't Start

**Error:** `Connection refused`

**Solution:**
```bash
shopify auth logout
shopify auth login
shopify theme dev
```

### Changes Not Reloading

**Error:** Local changes show but browser doesn't update

**Solution:**
1. Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Check console for errors
3. Restart dev server (`Ctrl+C` then `shopify theme dev`)

### Liquid Errors on Page

**Error:** `Liquid syntax error` shown on storefront

**Solution:**
1. Check `/assets/critical.js` console output
2. Read error message (often points to line number)
3. Verify Liquid syntax (tags closed, filters valid)
4. Reference Shopify Liquid docs

### JavaScript Not Running

**Error:** Component not initialized; no console errors

**Solution:**
1. Check that `<script>` tags in template/section reference correct file
2. Verify import map in `/snippets/scripts.liquid` has correct URL
3. Check Network tab – is JS file requested?
4. Look for module parse errors in console

### Styles Not Applied

**Error:** CSS changes don't show on page

**Solution:**
1. Hard refresh browser
2. Check CSS rule specificity (more specific rules win)
3. Check that CSS is in correct file or `{% style %}` tag
4. Verify class names match Liquid markup

---

## Performance & Optimization Tips

### Image Optimization

- Use Shopify image CDN (via `| img_url` filter)
- Provide multiple sizes (responsive `srcset`)
- Lazy load non-critical images

### CSS / JavaScript Bundle

- Use dynamic `import()` for section-specific JS (already done for most)
- Tree-shake unused code (tools like Vite/Rollup)
- TODO: Measure current bundle size; set targets

### Monitoring

- Use Chrome Lighthouse for audit
- Check Core Web Vitals (LCP, FID, CLS)
- Profile in DevTools Performance tab
- Set performance budget (e.g., < 100KB JS)

---

## Resources

- **Shopify Liquid Docs:** https://shopify.dev/api/liquid
- **Shopify Theme Development:** https://shopify.dev/docs/themes
- **Shopify CLI:** https://shopify.dev/docs/themes/tools/cli
- **Web Components:** https://developer.mozilla.org/en-US/docs/Web/Web_Components
- **CSS Variables:** https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- **Accessibility (WCAG):** https://www.w3.org/WAI/WCAG21/quickref/

---

## Getting Help

1. **Check this runbook** – Start here
2. **Read `/docs/ARCHITECTURE.md`** – Understand how code is organized
3. **Search codebase** – Look for similar patterns
4. **Check `/TASKS.md`** – Known issues and solutions
5. **Ask team** – Pair programming or code review

---

## Next Steps

After setting up locally:

1. Read `/docs/ARCHITECTURE.md` to understand code flow
2. Pick a task from `/TASKS.md`
3. Create a feature branch and start coding
4. Test locally in dev store
5. Submit PR for review

Happy coding!
