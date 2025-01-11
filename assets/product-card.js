class ProductCard extends HTMLElement {
  constructor() {
    super();
    this.state = {
      loading: false,
      quantity: 0
    };
    this.setupImageLoading();
  }

  connectedCallback() {
    this.initializeElements();
    this.initializeEventListeners();
    this.initializeCartState();
  }

  initializeElements() {
    this.quantityContainer = this.querySelector('.product-card__quantity');
    this.quantityInput = this.querySelector('.quantity-input');
    this.plusButton = this.querySelector('.plus');
    this.minusButton = this.querySelector('.minus');
    this.wishlistButton = this.querySelector('.product-card__wishlist');
    
    this.variantId = this.quantityContainer?.dataset.variantId;
    this.maxInventory = parseInt(this.quantityContainer?.dataset.inventory) || 0;
  }

  initializeEventListeners() {
    this.plusButton?.addEventListener('click', () => this.handleQuantityChange(1));
    this.minusButton?.addEventListener('click', () => this.handleQuantityChange(-1));
    this.wishlistButton?.addEventListener('click', () => this.toggleWishlist());
  }

  async initializeCartState() {
    try {
      const response = await fetch('/cart.js');
      if (!response.ok) throw new Error('Błąd pobierania koszyka');
      
      const cart = await response.json();
      
      const cartItem = cart.items.find(
        item => item.variant_id.toString() === this.variantId
      );
      
      if (cartItem) {
        this.quantityInput.value = cartItem.quantity;
        this.quantityInput.dataset.itemKey = cartItem.key;
        this.state.quantity = cartItem.quantity;
      }
    } catch (error) {
      this.handleError('Błąd podczas inicjalizacji stanu koszyka');
    }
  }

  async handleQuantityChange(change) {
    if (this.state.loading) return;
    
    const newQuantity = Math.max(0, Math.min(this.state.quantity + change, this.maxInventory));
    if (newQuantity === this.state.quantity) return;

    this.state.loading = true;
    this.updateLoadingState(true);

    try {
      if (change > 0) {
        await this.addToCart(1);
      } else {
        await this.updateCartItemQuantity(newQuantity);
      }
      
      this.state.quantity = newQuantity;
      this.quantityInput.value = newQuantity;
    } catch (error) {
      this.handleError('Błąd podczas aktualizacji koszyka');
    } finally {
      this.state.loading = false;
      this.updateLoadingState(false);
    }
  }

  async addToCart(quantity) {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: this.variantId, quantity }]
      })
    });

    if (!response.ok) throw new Error('Błąd dodawania do koszyka');
    
    const data = await response.json();
    this.updateCartUI(data);
    return data;
  }

  async updateCartItemQuantity(quantity) {
    const itemKey = this.quantityInput.dataset.itemKey;
    if (!itemKey) return;

    const response = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemKey, quantity })
    });

    if (!response.ok) throw new Error('Błąd aktualizacji koszyka');
    
    const data = await response.json();
    this.updateCartUI(data);
    return data;
  }

  updateLoadingState(loading) {
    this.plusButton.disabled = loading;
    this.minusButton.disabled = loading;
    this.quantityInput.disabled = loading;
    
    if (loading) {
      this.classList.add('is-loading');
    } else {
      this.classList.remove('is-loading');
    }
  }

  updateCartUI(cartData) {
    const cartCounter = document.querySelector('.cart-counter');
    if (cartCounter) {
      cartCounter.textContent = cartData.item_count;
      cartCounter.classList.add('cart-counter--updated');
      setTimeout(() => cartCounter.classList.remove('cart-counter--updated'), 300);
    }
  }

  handleError(message) {
    console.error(message);
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('notification--hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  setupImageLoading() {
    const imageElement = this.querySelector('.product-card__image');
    if (!imageElement) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        imageElement.loading = entry.isIntersecting ? 'eager' : 'lazy';
        observer.disconnect();
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.2
    });

    observer.observe(this);
  }
}

customElements.define('product-card', ProductCard); 