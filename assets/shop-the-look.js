/**
 * Shop The Look Component
 * Handles carousel navigation, modal display, and AJAX cart functionality
 */

class ShopTheLook {
  constructor() {
    this.carousel = document.querySelector('[data-carousel]');
    this.cards = document.querySelectorAll('[data-look-id]');
    this.modal = document.querySelector('[data-modal]');
    this.modalOverlay = document.querySelector('[data-modal-overlay]');
    this.modalContent = document.querySelector('[data-modal-content]');
    this.modalClose = document.querySelector('[data-modal-close]');
    this.toast = document.querySelector('[data-toast]');
    this.prevBtn = document.querySelector('[data-carousel-prev]');
    this.nextBtn = document.querySelector('[data-carousel-next]');
    this.addAllBtn = document.querySelector('[data-add-all-to-bag]');
    this.currentProducts = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupSwipe();
  }

  setupEventListeners() {
    // Open modal when clicking look cards
    this.cards.forEach(card => {
      const button = card.querySelector('[data-open-modal]');
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openModal(card);
        });
      }
    });

    // Close modal
    if (this.modalClose) {
      this.modalClose.addEventListener('click', () => this.closeModal());
    }
    
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', () => this.closeModal());
    }

    // Add all to bag
    if (this.addAllBtn) {
      this.addAllBtn.addEventListener('click', () => this.addAllToCart());
    }

    // Carousel navigation
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.scroll('left'));
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.scroll('right'));
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  setupSwipe() {
    if (!this.carousel) return;

    let startX = 0;
    let scrollLeft = 0;

    this.carousel.addEventListener('touchstart', (e) => {
      startX = e.touches[0].pageX;
      scrollLeft = this.carousel.scrollLeft;
    });

    this.carousel.addEventListener('touchmove', (e) => {
      const x = e.touches[0].pageX;
      const walk = (startX - x) * 2;
      this.carousel.scrollLeft = scrollLeft + walk;
    });
  }

  scroll(direction) {
    if (!this.carousel) return;
    
    const scrollAmount = this.carousel.offsetWidth * 0.8;
    if (direction === 'left') {
      this.carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      this.carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  async openModal(card) {
    const lookData = card.dataset.lookProducts;

    console.log('Opening modal with data:', lookData);

    if (!lookData) {
      this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px;">No products linked to this look yet.</p>';
      this.showModal();
      return;
    }

    let products;
    try {
      products = JSON.parse(lookData);
      console.log('Parsed products:', products);
    } catch (e) {
      console.error('Error parsing look data:', e);
      this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px;">Error loading product data.</p>';
      this.showModal();
      return;
    }

    // Ensure we have an array
    if (!Array.isArray(products)) {
      console.error('Products is not an array:', products);
      this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px;">Error loading product data.</p>';
      this.showModal();
      return;
    }

    // Filter out any null/undefined products
    products = products.filter(product => product && product.id);

    console.log('Filtered products:', products);

    if (products.length === 0) {
      this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px;">No products linked to this look yet.</p>';
      this.showModal();
      return;
    }

    // Show modal with products
    this.showModal();
    this.modalContent.innerHTML = '';
    this.currentProducts = products;

    products.forEach(product => {
      const element = this.createProductElement(product);
      this.modalContent.appendChild(element);
    });

    // Initialize button text
    this.updateAddToCartButton();
  }

  async fetchProductData(handle) {
    try {
      const response = await fetch('/products/' + handle + '.js');
      if (!response.ok) throw new Error('Product not found');
      
      const product = await response.json();
      return {
        element: this.createProductElement(product),
        product: product
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  createProductElement(product) {
    const div = document.createElement('div');
    div.className = 'shop-look-product';
    div.dataset.productId = product.id;

    const hasNewTag = product.tags.includes('new') || product.tags.includes('NEW');
    const imageUrl = product.featured_image || (product.images && product.images[0]);

    // Build variant dropdowns (one for each option)
    let variantSelectors = '';
    if (product.options && product.options.length > 0) {
      const selectorsHTML = product.options.map((optionName, optionIndex) => {
        // Get unique values for this option
        const values = [...new Set(product.variants.map(v => v['option' + (optionIndex + 1)]))];
        
        const optionsHTML = values.map(value => {
          return '<option value="' + value + '">' + value + '</option>';
        }).join('');

        const placeholder = optionName === 'Size' || optionName.toLowerCase().includes('size') 
          ? 'Select Size' 
          : optionName === 'Color' || optionName === 'Colour' || optionName.toLowerCase().includes('color') 
          ? 'Select Colour' 
          : 'Select ' + optionName;

        return '<div class="shop-look-variant-selector">' +
          '<select class="shop-look-variant-select" data-option-index="' + optionIndex + '" data-option-name="' + optionName + '">' +
          '<option value="" disabled selected>' + placeholder + '</option>' +
          optionsHTML +
          '</select>' +
          '</div>';
      }).join('');

      variantSelectors = '<div class="shop-look-variant-selectors">' + selectorsHTML + '</div>';
    }

    div.innerHTML = '<div class="shop-look-product__image-wrapper">' +
      '<img src="' + imageUrl + '" alt="' + this.escapeHtml(product.title) + '" class="shop-look-product__image" loading="lazy">' +
      (hasNewTag ? '<span class="shop-look-badge">NEW</span>' : '') +
      '</div>' +
      '<div class="shop-look-product__info">' +
      '<h4 class="shop-look-product__title">' + this.escapeHtml(product.title) + '</h4>' +
      '<p class="shop-look-product__price">' + this.formatMoney(product.price) + '</p>' +
      variantSelectors +
      '</div>';

    // Add event listeners for variant selection
    const selects = div.querySelectorAll('[data-option-index]');
    selects.forEach(select => {
      select.addEventListener('change', () => {
        this.updateSelectedVariant(div, product);
      });
    });

    return div;
  }

  updateSelectedVariant(productEl, product) {
    const selects = productEl.querySelectorAll('[data-option-index]');
    const selectedOptions = [];

    selects.forEach(select => {
      selectedOptions.push(select.value);
    });

    // Find matching variant
    const variant = product.variants.find(v => {
      return selectedOptions.every((value, index) => {
        return v['option' + (index + 1)] === value;
      });
    });

    // Store the selected variant ID on the product element
    if (variant) {
      productEl.dataset.selectedVariantId = variant.id;
      productEl.dataset.variantAvailable = variant.available;
    }

    // Update button text with current count
    this.updateAddToCartButton();
  }

  countReadyProducts() {
    const productElements = this.modalContent.querySelectorAll('.shop-look-product');
    let count = 0;

    productElements.forEach((el, index) => {
      const product = this.currentProducts[index];
      if (!product) return;

      // Check if product has variants
      if (product.options && product.options.length > 0) {
        // Product has variants - check if all are selected
        const selects = el.querySelectorAll('[data-option-index]');
        const allSelected = Array.from(selects).every(select => select.value !== '');

        if (allSelected && el.dataset.selectedVariantId) {
          count++;
        }
      } else {
        // Product has no variants - always ready
        count++;
      }
    });

    return count;
  }

  updateAddToCartButton() {
    if (!this.addAllBtn) return;

    const count = this.countReadyProducts();

    if (count > 0) {
      this.addAllBtn.textContent = `ADD ${count} ITEM${count > 1 ? 'S' : ''} TO BAG`;
      this.addAllBtn.disabled = false;
    } else {
      this.addAllBtn.textContent = 'SELECT SIZE & COLOUR';
      this.addAllBtn.disabled = true;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async addAllToCart() {
    if (!this.currentProducts || this.currentProducts.length === 0) return;

    this.addAllBtn.disabled = true;
    this.addAllBtn.textContent = 'ADDING...';

    try {
      const items = [];

      // Collect only products with complete variant selections
      const productElements = this.modalContent.querySelectorAll('.shop-look-product');
      productElements.forEach((el, index) => {
        const product = this.currentProducts[index];
        if (!product) return;

        let variantId;

        // Check if product has variants
        if (product.options && product.options.length > 0) {
          // Only add if variant is selected
          if (el.dataset.selectedVariantId) {
            variantId = parseInt(el.dataset.selectedVariantId);
          } else {
            return; // Skip this product - no variant selected
          }
        } else {
          // No variants - use first (and only) variant
          variantId = product.variants[0].id;
        }

        items.push({
          id: variantId,
          quantity: 1
        });
      });

      if (items.length === 0) {
        this.addAllBtn.textContent = 'SELECT SIZE & COLOUR';
        this.addAllBtn.disabled = false;
        return;
      }

      // Add all items to cart
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: items })
      });

      if (response.ok) {
        this.addAllBtn.textContent = 'ADDED!';

        // Close modal
        setTimeout(() => {
          this.closeModal();
        }, 300);

        // Refresh and open cart drawer
        setTimeout(() => {
          this.refreshAndOpenCart();
        }, 400);
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.addAllBtn.textContent = 'ERROR - TRY AGAIN';
      this.addAllBtn.disabled = false;
    }
  }

  async refreshAndOpenCart() {
    try {
      // Step 1: Fetch the current cart state to get updated data
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();

      console.log('Cart state:', cart);

      // Step 2: Dispatch cart change events with the cart data
      document.dispatchEvent(new CustomEvent('cart:change', {
        detail: { cart }
      }));

      // Step 3: Fetch fresh cart drawer HTML with cache-busting timestamp
      const timestamp = new Date().getTime();
      const sectionsResponse = await fetch(`/?sections=cart-drawer&t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const sectionsData = await sectionsResponse.json();

      console.log('Sections data:', sectionsData);

      // Step 4: Find and update the cart drawer element
      const cartDrawer = document.querySelector('cart-drawer');

      if (cartDrawer && sectionsData['cart-drawer']) {
        // Replace the cart drawer's inner HTML with fresh content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sectionsData['cart-drawer'];
        const newCartDrawerContent = tempDiv.querySelector('cart-drawer');

        if (newCartDrawerContent) {
          cartDrawer.innerHTML = newCartDrawerContent.innerHTML;
          console.log('Cart drawer HTML updated');
        }
      }

      // Step 5: Update cart count in header
      const cartCount = document.querySelector('.header__icon--cart .cart-count-bubble span') ||
                       document.querySelector('[data-cart-count]');
      if (cartCount) {
        cartCount.textContent = cart.item_count;
      }

      // Step 6: Dispatch additional update events
      document.dispatchEvent(new CustomEvent('cart:refresh'));
      document.dispatchEvent(new CustomEvent('cart:updated'));

      // Step 7: Wait a bit longer for DOM and events to process, then open
      setTimeout(() => {
        this.openCartDrawer();
      }, 200);

    } catch (error) {
      console.error('Error refreshing cart:', error);
      // Fallback: just try to open the drawer
      this.openCartDrawer();
    }
  }

  openCartDrawer() {
    // Try multiple methods to open cart drawer (different themes use different approaches)

    // Method 1: Click on cart icon/button
    const cartButton = document.querySelector('[data-cart-icon]') ||
                      document.querySelector('.cart-icon') ||
                      document.querySelector('.header__icon--cart') ||
                      document.querySelector('[aria-label*="cart" i]') ||
                      document.querySelector('a[href*="cart"]');

    if (cartButton) {
      cartButton.click();
      return;
    }

    // Method 2: Dispatch cart open events
    document.dispatchEvent(new CustomEvent('cart:open'));
    document.dispatchEvent(new CustomEvent('cart:show'));
    window.dispatchEvent(new CustomEvent('cart:refresh'));

    // Method 3: Try to open cart drawer if it exists
    const cartDrawer = document.querySelector('cart-drawer') ||
                      document.querySelector('[id*="cart-drawer"]') ||
                      document.querySelector('[id*="CartDrawer"]');

    if (cartDrawer) {
      cartDrawer.classList.add('active', 'open');
      if (typeof cartDrawer.open === 'function') {
        cartDrawer.open();
      }
    }
  }

  showModal() {
    if (this.modal && this.modalOverlay) {
      this.modal.classList.add('active');
      this.modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal() {
    if (this.modal && this.modalOverlay) {
      this.modal.classList.remove('active');
      this.modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
      this.currentProducts = null;
    }
  }

  showToast() {
    if (this.toast) {
      this.toast.classList.add('active');
      setTimeout(() => {
        this.toast.classList.remove('active');
      }, 3000);
    }
  }

  formatMoney(cents) {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(dollars);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    new ShopTheLook();
  });
} else {
  new ShopTheLook();
}