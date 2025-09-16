(() => {
  const root = document.getElementById('cart-drawer');
  if (!root) return;
  const panel = () => root.querySelector('aside');
  const countEls = () => document.querySelectorAll('[data-cart-count]');
  let lastFocus = null;

  function open() { lastFocus = document.activeElement; root.hidden = false; panel()?.focus(); }
  function close() { root.hidden = true; lastFocus?.focus?.(); }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-open]')) open();
    if (e.target.closest('[data-cart-close],[data-cart-overlay]')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !root.hidden) close(); });

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[action="/cart/add"]');
    if (!form) return;
    e.preventDefault();
    try {
      await fetch('/cart/add.js', { method: 'POST', body: new FormData(form) });
      await refreshDrawer();
      open();
    } catch (err) { console.error(err); alert('Could not add to cart.'); }
  });

  document.addEventListener('click', async (e) => {
    const item = e.target.closest('[data-key]');
    if (!item) return;
    const key = item.getAttribute('data-key');
    const input = item.querySelector('input[aria-label="Quantity"]');
    if (e.target.matches('[data-inc]')) input.value = (+input.value || 1) + 1;
    if (e.target.matches('[data-dec]')) input.value = Math.max(0, (+input.value || 1) - 1);
    if (e.target.matches('[data-remove]')) input.value = 0;
    if (e.target.matches('[data-inc],[data-dec],[data-remove]')) {
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type':'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id: key, quantity: input.value })
      });
      await refreshDrawer();
    }
  });

  async function refreshDrawer() {
    const url = new URL(location.href);
    url.searchParams.set('section_id', 'cart-drawer');
    const html = await fetch(url.toString()).then(r => r.text());
    const temp = document.createElement('div'); temp.innerHTML = html;
    const next = temp.querySelector('#cart-drawer');
    root.replaceWith(next);
    const nextCount = (temp.querySelector('[data-cart-count]') || {}).textContent || '0';
    countEls().forEach(el => (el.textContent = nextCount));
  }
})();
