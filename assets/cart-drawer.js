class DVCartDrawer extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.onDrawerClick.bind(this));
  }

  connectedCallback() {
    this.overlay = this.querySelector('.cart-drawer__overlay');
    this.drawer = this.querySelector('.cart-drawer__content');
    this.closeButton = this.querySelector('.cart-drawer__close');
    this.cartItems = this.querySelector('.cart-drawer__items');
    this.cartSubtotal = this.querySelector('.cart-drawer__subtotal');
    
    // Bind event listeners
    if (this.closeButton) {
      this.closeButton.addEventListener('click', this.close.bind(this));
    }
    
    // Listen for add-to-cart events
    document.addEventListener('cart:add', this.onCartAdd.bind(this));
    
    // Listen for cart item updates/removes
    this.addEventListener('change', this.onQuantityChange.bind(this));
    this.addEventListener('click', this.onRemoveClick.bind(this));
  }

  onDrawerClick(event) {
    if (event.target === this.overlay) {
      this.close();
    }
  }

  open() {
    this.classList.add('cart-drawer--open');
    document.body.style.overflow = 'hidden';
    this.fetchCart();
  }

  close() {
    this.classList.remove('cart-drawer--open');
    document.body.style.overflow = '';
  }

  async onCartAdd(event) {
    const { variantId, quantity } = event.detail;
    
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: variantId,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }

      this.open();
      this.updateCartCount();
      
    } catch (error) {
      console.error('Error adding to cart: ', error);
    }
  }

  async fetchCart() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      this.renderCart(cart);
    } catch (error) {
      console.error('Error fetching cart: ', error);
    }
  }

  renderCart(cart) {
    if (cart.item_count === 0) {
      this.cartItems.innerHTML = '<p class="cart-drawer__empty">Your cart is empty</p>';
      this.cartSubtotal.textContent = this.formatMoney(0);
      return;
    }

    const itemsHTML = cart.items.map((item, index) => `
      <div class="cart-drawer__item" data-line-item="${item.key}">
        <div class="cart-drawer__item-image">
          <img src="${item.image}" alt="${item.title}" width="80" height="80">
        </div>
        <div class="cart-drawer__item-details">
          <h4 class="cart-drawer__item-title">${item.product_title}</h4>
          ${item.variant_title ? `<p class="cart-drawer__item-variant">${item.variant_title}</p>` : ''}
          <p class="cart-drawer__item-price">${this.formatMoney(item.final_line_price)}</p>
        </div>
        <div class="cart-drawer__item-quantity">
          <input 
            type="number" 
            value="${item.quantity}" 
            min="0" 
            data-line="${index + 1}"
            data-quantity-input
            class="cart-drawer__quantity-input"
          >
        </div>
        <button 
          class="cart-drawer__item-remove" 
          data-line="${index + 1}"
          data-remove-button
          aria-label="Remove ${item.product_title}"
        >
          &times;
        </button>
      </div>
    `).join('');

    this.cartItems.innerHTML = itemsHTML;
    this.cartSubtotal.textContent = this.formatMoney(cart.total_price);
    this.updateCartCountDisplay(cart.item_count);
  }

  async onQuantityChange(event) {
    if (!event.target.hasAttribute('data-quantity-input')) return;
    
    const line = event.target.dataset.line;
    const quantity = parseInt(event.target.value, 10);

    if (quantity === 0) {
      this.removeItem(line);
      return;
    }

    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line: line,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update cart');
      }

      const cart = await response.json();
      this.renderCart(cart);
      this.updateCartCount();
      
    } catch (error) {
      console.error('Error updating cart:', error);
      event.target.value = event.target.defaultValue;
    }
  }

  async onRemoveClick(event) {
    if (!event.target.hasAttribute('data-remove-button')) return;
    const line = event.target.dataset.line;
    this.removeItem(line);
  }

  async removeItem(line) {
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line: parseInt(line, 10),
          quantity: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      const cart = await response.json();
      this.renderCart(cart);
      this.updateCartCount();
      
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }

  updateCartCountDisplay(count) {
    document.querySelectorAll('[data-cart-count]').forEach(element => {
      element.textContent = count;
    });
  }

  async updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      this.updateCartCountDisplay(cart.item_count);
    } catch (error) {
      console.error('Error updating cart count:' , error);
    }
  }

  formatMoney(cents) {
    const dollars = (cents / 100).toFixed(2);
    return `$${dollars}`;
  }
}

customElements.define('dv-cart-drawer', DVCartDrawer);

document.addEventListener('click', (event) => {
  // Handle add-to-cart buttons
  const addButton = event.target.closest('[data-add-to-cart]');
  if (addButton) {
    event.preventDefault();
    const variantId = addButton.dataset.variantId;
    const quantityInput = document.querySelector(`[data-quantity-for="${variantId}"]`);
    const quantity = quantityInput ? parseInt(quantityInput.value, 10) : 1;
    
    const cartAddEvent = new CustomEvent('cart:add', {
      detail: { variantId, quantity },
      bubbles: true,
    });
    document.dispatchEvent(cartAddEvent);
    return;
  }
  
  // Handle open cart drawer buttons
  const openButton = event.target.closest('[data-open-cart-drawer]');
  if (openButton) {
    event.preventDefault();
    const drawer = document.querySelector('dv-cart-drawer');
    if (drawer) {
      drawer.open();
    }
    return;
  }
  
  // Handle quantity decrease buttons
  const decreaseButton = event.target.closest('[data-quantity-decrease]');
  if (decreaseButton) {
    event.preventDefault();
    const targetId = decreaseButton.dataset.quantityTarget;
    const input = document.getElementById(targetId);
    if (input) {
      const currentValue = parseInt(input.value, 10) || 1;
      const minValue = parseInt(input.min, 10) || 1;
      if (currentValue > minValue) {
        input.value = currentValue - 1;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    return;
  }
  
  // Handle quantity increase buttons
  const increaseButton = event.target.closest('[data-quantity-increase]');
  if (increaseButton) {
    event.preventDefault();
    const targetId = increaseButton.dataset.quantityTarget;
    const input = document.getElementById(targetId);
    if (input) {
      const currentValue = parseInt(input.value, 10) || 1;
      const maxValue = input.max ? parseInt(input.max, 10) : Infinity;
      if (currentValue < maxValue) {
        input.value = currentValue + 1;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    return;
  }
});
