async function refreshDrawerAndBubble() {
  
  const [drawerRes, bubbleRes] = await Promise.all([
    fetch('/?section_id=cart-drawer', { headers: { Accept: 'text/html' } }),
    fetch('/?section_id=cart-icon-bubble', { headers: { Accept: 'text/html' } })
  ]);

  const [drawerHTML, bubbleHTML] = await Promise.all([drawerRes.text(), bubbleRes.text()]);
  const drawerDoc = new DOMParser().parseFromString(drawerHTML, 'text/html');
  const bubbleDoc = new DOMParser().parseFromString(bubbleHTML, 'text/html');

  const freshDrawerSection = drawerDoc.querySelector('#shopify-section-cart-drawer');
  const oldDrawerSection   = document.querySelector('#shopify-section-cart-drawer');
  if (freshDrawerSection && oldDrawerSection) {
    oldDrawerSection.replaceWith(freshDrawerSection);
  }

  const freshBubble = bubbleDoc.querySelector('#cart-icon-bubble');
  const oldBubble   = document.getElementById('cart-icon-bubble');
  if (freshBubble && oldBubble) {
    oldBubble.replaceWith(freshBubble);
  }

  const drawerEl = document.querySelector('cart-drawer');
  drawerEl?.setHeaderCartIconAccessibility?.();

  const clearBtn = drawerEl?.querySelector('#CartDrawer-ClearAll');
  if (clearBtn && !clearBtn.dataset.bound) {
    clearBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('/cart/clear.js', { method: 'POST', headers: { Accept: 'application/json' } });
      await refreshDrawerAndBubble();
    });
    clearBtn.dataset.bound = '1';
  }

  drawerEl?.open?.();
  drawerEl?.querySelector?.('cart-drawer-items')?.scrollTo?.({ top: 0 });
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.pcard .qty__btn');
  if (!btn) return;

  const form = btn.closest('[data-quick-add]');
  const variantId = form?.dataset.variant;
  const input = form?.querySelector('.qty__input');
  if (!variantId || !input) return;

  const inc     = btn.hasAttribute('data-qty-inc');
  const current = parseInt(input.value || '0', 10) || 0;
  const newQty  = Math.max(0, current + (inc ? 1 : -1));

  await fetch('/cart/update.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ updates: { [variantId]: newQty } })
  });

  input.value = String(newQty);
  await refreshDrawerAndBubble();
});

document.addEventListener('change', async (e) => {
  const input = e.target.closest('#CartDrawer .quantity__input');
  if (!input) return;

  const variantId = input.dataset.quantityVariantId;
  if (!variantId) return;

  const qty = Math.max(0, parseInt(input.value || '0', 10) || 0);

  input.disabled = true;
  try {
    await fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ updates: { [variantId]: qty } })
    });
    await refreshDrawerAndBubble();
  } catch (err) {
    console.error('Drawer qty update failed', err);
  } finally {
    input.disabled = false;
  }
});

document.addEventListener('click', async (e) => {
  const clear = e.target.closest('#CartDrawer-ClearAll');
  if (!clear) return;

  e.preventDefault();
  clear.disabled = true;
  try {
    await fetch('/cart/clear.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    });
    await refreshDrawerAndBubble();
  } catch (err) {
    console.error('Clear all failed', err);
  } finally {
    clear.disabled = false;
  }
});
