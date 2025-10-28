# Security Model: Blaze-Savour

This document outlines data handling rules, guardrails, and access patterns for theme code.

---

## 1. Security Roles in Storefront Context

### Anonymous Shopper

**Who:** Anyone visiting the store (not logged in)

**Capabilities:**
- Browse products, collections, blog posts
- View prices and inventory
- Filter/search
- Add to cart, check out
- Subscribe to announcements

**Restrictions:**
- Cannot access customer account
- Cannot view order history
- Cannot modify products or store settings
- Cannot access admin data

### Logged-In Customer

**Who:** Registered customer with account

**Capabilities:**
- Everything anonymous shopper can do
- View order history
- Manage address book
- Update profile
- View wishlist (if implemented)

**Restrictions:**
- Cannot modify products or store settings
- Cannot access other customers' data
- Cannot view unpublished content

### Store Admin

**Who:** Shopify store owner or staff

**Capabilities:**
- Manage products, collections, pricing
- View all orders and customer data
- Configure theme settings
- Manage theme code

**Restrictions:**
- Admin actions happen in Shopify admin interface, not theme
- Theme JS **cannot** perform admin actions (Shopify blocks this)

---

## 2. Theme JavaScript Access Rules

### What Theme JS Can Do

✓ **Read public data:**
- Products, prices, inventory
- Collections, categories
- Blog posts, articles
- Store name, general settings

✓ **Display information:**
- Render product details, images
- Show prices, stock status
- Display personalized messages based on cart

✓ **Accept user input:**
- Search, filter, sort
- Form submissions (contact form, email signup, etc.)
- Cart interactions (add, remove, update quantity)

✓ **Store client-side data:**
- Recently viewed products (localStorage)
- Cart state (sessionStorage)
- User preferences (localStorage, with consent)

### What Theme JS CANNOT Do

✗ **Never trust user input for sensitive operations:**
- Price calculations (must be server-authoritative)
- Inventory availability (must be server-authoritative)
- Discounts (must be validated server-side)

✗ **Never expose secrets:**
- API keys
- Admin access tokens
- Webhook secrets
- Private customer data

✗ **Never assume write access:**
- Products (read-only)
- Customers (read-only; account page is Shopify-owned)
- Orders (read-only; checkout is Shopify-owned)
- Inventory (read-only; managed by Shopify)

✗ **Never intercept checkout:**
- Payment information is off-limits
- Shipping logic is Shopify-owned
- Tax calculation is Shopify-owned
- Use Shopify's built-in checkout, not custom

---

## 3. Cart API Guardrails

### What We Use (`/cart/add.js`, `/cart/update.js`)

**Safe endpoints:**
- `POST /cart/add.js` – Add product to cart
- `POST /cart/update.js` – Update cart quantities
- `DELETE /cart/remove.js` – Remove items
- `GET /cart.js` – Read cart contents

**Parameters sent:**
```javascript
{
  id: product_id,        // Product variant ID (public)
  quantity: 1,           // User input (validated client-side)
  properties: { ... }    // Custom properties (user-filled fields)
}
```

**Response contains:**
```javascript
{
  items: [ ... ],        // Current cart items
  total_price: 12345,    // Total in cents (NEVER trust client-side calc)
  item_count: 2,
  ...
}
```

### Validation Rules

**All user input must be validated:**

```javascript
// Example: facets.js filter parameter
const priceMin = parseInt(formData.get('filter.v.price.gte'));
const priceMax = parseInt(formData.get('filter.v.price.lte'));

// Validate: is it a number?
if (isNaN(priceMin) || isNaN(priceMax)) {
  throw new Error('Invalid price range');
}

// Validate: is it in reasonable bounds?
if (priceMin < 0 || priceMax > MAX_PRICE) {
  throw new Error('Price out of range');
}

// Send to server
const params = new URLSearchParams({
  'filter.v.price.gte': priceMin,
  'filter.v.price.lte': priceMax
});
```

**Key points:**
- Always sanitize/validate before sending to server
- Never trust value until server confirms it
- Never perform calculations that affect money (tax, shipping, total)

---

## 4. Customer Data Handling

### What We Can Access

**Public customer info (if logged in):**
- First name (often shown in greeting)
- Email (from forms user fills)

**Must NOT access:**
- Credit card information (Shopify owns checkout)
- Full address without explicit form
- Phone number (unless user provides)
- Order history (Shopify account page only)

### Form Handling

**Example: Gift Card Recipient Form** (`/assets/gift-card-recipient-form.js`)

```javascript
// Collect from user
const recipientEmail = formData.get('recipient_email');
const recipientName = formData.get('recipient_name');
const recipientMessage = formData.get('recipient_message');

// Validate (sanitize)
if (!isValidEmail(recipientEmail)) {
  throw new Error('Invalid email');
}

// Send to Shopify
// (Shopify stores it securely; we don't save it)
```

**Rules:**
- Only collect what you need
- Validate before sending
- Never log sensitive data (email, message, etc.) to console
- Shopify's server stores the data; don't re-store client-side

---

## 5. Third-Party Integrations

### Shopify APIs (First-Party)

✓ **Safe:**
- Storefront API (read products, cart, checkout)
- Section Rendering API (dynamic sections)
- Predictive Search API (search suggestions)

✗ **Never use from client:**
- Admin API (requires authentication)
- Webhook API (server-only)

### External Services

If integrating (e.g., analytics, image CDN, payment):

**Do:**
- Use official SDKs
- Document why external service is needed
- Review privacy policy
- Get merchant consent (mention in theme description)

**Don't:**
- Send PII (personally identifiable info) to third parties without consent
- Use tracking pixels without opt-in
- Store sensitive data in third-party services

---

## 6. High-Risk Code Areas

### **[HIGH RISK] Facets Filtering** (`/assets/facets.js`)

**Issue:** Form parameters injected into URL without strict validation

```javascript
// Current (risky):
let newParameters = new URLSearchParams(formData);
// User can inject arbitrary parameters
```

**Mitigation needed:**
- Whitelist allowed filter keys (e.g., `filter.v.size`, `filter.v.price.lte`)
- Validate each value type (number, text, enum)
- Throw error on unexpected keys
- See `/specs/facets_refactor.md`

### **[HIGH RISK] Shop The Look** (`/assets/shop-the-look.js`)

**Issue:** Product handles concatenated without validation

```javascript
// Current (risky):
const productHandle = `product_${index}`;
// If merchant provides malicious handle, could break rendering
```

**Mitigation needed:**
- Validate product handles (allowed chars, length)
- Escape in HTML/URL contexts
- See `/specs/shop_the_look_validation.md`

### **[MEDIUM RISK] Resource Image** (`/snippets/resource-image.liquid`)

**Issue:** Assumes data shape without error handling

```liquid
<!-- Current (risky): -->
{% assign aspect_ratio = resource.image.aspect_ratio %}
<!-- If resource.image missing, breaks silently -->
```

**Mitigation needed:**
- Add error handling for missing fields
- Provide fallback placeholder
- See `/specs/resource_image_hardening.md`

---

## 7. Checkout Security

**Store does NOT:**
- Capture credit card information (Shopify Payments handles it)
- Access checkout form data (customer enters in Shopify-hosted checkout)
- Modify order totals or shipping (server-calculated)

**Theme CAN:**
- Style checkout appearance (CSS theming)
- Add custom post-purchase messaging
- Reference order data after purchase (not during)

**Theme CANNOT:**
- Intercept payment information
- Modify shipping costs
- Change tax calculations
- Access customer addresses (unless in account form)

---

## 8. Secrets Management

### Secrets That Must NEVER Be in Theme Code

- Shopify Admin API tokens
- Webhook signing keys
- Third-party API keys
- Payment processor credentials
- Database credentials
- Private encryption keys

### If You Need Secrets

Use Shopify's **Private Apps** or **Custom Apps** instead:

- Store credentials on Shopify's secure server
- Expose endpoint that theme JS calls
- Endpoint validates request, performs action

Example:

```javascript
// Theme JS (public, safe)
fetch('/apps/my-app/send-email', {
  method: 'POST',
  body: JSON.stringify({ email: userEmail })
});

// Backend (private, has secrets)
// - Validates email
// - Uses SendGrid API key (stored securely)
// - Sends email
// - Returns success/error
```

---

## 9. Data Privacy & Compliance

### GDPR / Privacy Laws

**Theme JS must respect:**
- Cookie consent (don't track without opt-in)
- Email opt-in (don't email without permission)
- Data deletion (provide way to delete customer data)
- Privacy policy (link in footer)

### Analytics

If tracking user behavior:
- Get consent first (banner or form)
- Document in privacy policy
- Only send anonymized data (not PII)
- Allow users to opt-out

### Email

Before subscribing customer to emails:
- Get explicit consent (checkbox)
- Provide unsubscribe link in every email
- Honor unsubscribe immediately
- Don't sell email list

---

## 10. Audit Checklist

When adding new features, verify:

- [ ] All user input is validated (client-side + server-side)
- [ ] No API keys or secrets in code
- [ ] No sensitive data logged to console
- [ ] PII (email, name, address) only collected when necessary
- [ ] PII not sent to third parties without consent
- [ ] Error messages don't leak sensitive info
- [ ] Checkout logic doesn't touch payment data
- [ ] Cart calculations validated server-side
- [ ] All external services documented and approved
- [ ] Privacy policy updated if tracking added
- [ ] Accessibility tested (keyboard, screen reader)
- [ ] HTTPS is enforced (handled by Shopify)

---

## 11. Response to Security Issues

**If you find a security vulnerability:**

1. **Do NOT post publicly** (GitHub issue, Slack, etc.)
2. **Email security contact** (TBD: add email here)
3. **Provide details:** What is the risk? How to reproduce? Suggested fix?
4. **Wait for response** before disclosing

**We will:**
- Investigate immediately
- Create patch
- Deploy fix to live stores
- Credit you (if desired)

---

## 12. Related Documents

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** – How data flows through system
- **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)** – Business context & out-of-scope
- **[TASKS.md](../TASKS.md)** – Known risks & refactoring work
- **[Shopify Security Best Practices](https://shopify.dev/docs/themes/best-practices/security)**

---

## 13. Questions / Unknowns

- [ ] **TODO:** Who is security contact for vulnerability reports?
- [ ] **TODO:** Do we perform security audits? How often?
- [ ] **TODO:** Is there a bug bounty program?
- [ ] **TODO:** What is the data retention policy for customer info?
