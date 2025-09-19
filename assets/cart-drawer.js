class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay')?.addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
    this.bindClearAll();
  }

  setHeaderCartIconAccessibility() {
    const attach = (el) => {
      if (!el || el.dataset.cartBound) return;
      el.dataset.cartBound = '1';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-haspopup', 'dialog');
      el.addEventListener('click', (event) => { event.preventDefault(); this.open(el); });
      el.addEventListener('keydown', (event) => {
        const k = event.key || event.code;
        if (k === 'Enter' || k === ' ' || (k && k.toUpperCase() === 'SPACE')) {
          event.preventDefault(); this.open(el);
        }
      });
    };
    document.querySelectorAll('#cart-icon-bubble, [data-cart-trigger]').forEach(attach);
  }

  bindClearAll() {
    const btn = this.querySelector('#CartDrawer-ClearAll');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/cart/clear.js', { method: 'POST', headers: { Accept: 'application/json' } });
        if (typeof window.refreshDrawerAndBubble === 'function') {
          await window.refreshDrawerAndBubble();
        } else {
          const res = await fetch(`${routes.cart_url}?sections=cart-drawer,cart-icon-bubble`);
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const src = doc.querySelector('#CartDrawer');
          const tgt = document.querySelector('#CartDrawer');
          if (src && tgt) tgt.innerHTML = src.innerHTML;
          const newBubble = doc.getElementById('cart-icon-bubble');
          const oldBubble = document.getElementById('cart-icon-bubble');
          if (newBubble && oldBubble) oldBubble.outerHTML = newBubble.outerHTML;
        }
        this.classList.add('is-empty');
        this.open(); 
      } catch (err) {
        console.error('Clear all failed', err);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);

    setTimeout(() => { this.classList.add('animate', 'active'); });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    const inner = this.querySelector('.drawer__inner');
    if (inner && inner.classList.contains('is-empty')) inner.classList.remove('is-empty');

    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay')?.addEventListener('click', this.close.bind(this));
      this.bindClearAll();
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      { id: 'cart-drawer', selector: '#CartDrawer' },
      { id: 'cart-icon-bubble' },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}
customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      { id: 'CartDrawer', section: 'cart-drawer', selector: '.drawer__inner' },
      { id: 'cart-icon-bubble', section: 'cart-icon-bubble', selector: '.shopify-section' },
    ];
  }
}
customElements.define('cart-drawer-items', CartDrawerItems);
