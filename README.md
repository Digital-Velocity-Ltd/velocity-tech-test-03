# Velocity Tech Test

A **Dawn-based** Shopify theme customisation with a reworked cart drawer and quick-add flow. I used Dawn as the skeleton and layered changes where needed (drawer behaviour, quantity handling, **“Clear all”**, and some layout tweaks).

## Status at hand-off

- ✅ Core cart drawer works (opens, renders items, totals, supports quantity changes)
- ✅ **Clear all** button empties the cart
- ✅ Collection “quick add” buttons update the cart and open the drawer
- ✅ Drawer + header cart bubble refreshed via the Section Rendering API
- ✅ Custom styling preserved (cart items use your classes)

- ⚠️ Footer hasn’t been handled
- ⚠️ Performance is a bit slow (see **Performance** below)
- ⚠️ Relationship between the header cart and the drawer could be tighter (see **Cart/header coupling**)

## Files you’ll care about

### `assets/pcard-ajax.js`
Client-side logic for:
- Quick add (+/–) on collection/product cards  
- In-drawer quantity updates  
- **Clear all**  
- Refreshing the entire `cart-drawer` section and `cart-icon-bubble` section (Dawn-style replacement)

### `assets/cart-drawer.js`
Dawn’s drawer web component with light edits (kept behaviour intact where possible). Opens/closes drawer, focus trapping, and re-binds after re-render.

### `assets/global.js`, `assets/constants.js`, `assets/pubsub.js`
Dawn utilities (focus trapping, pub/sub, constants). `QuantityInput` is defined Dawn-style and listens for +/– and input change.

### `sections/cart-drawer.liquid`
The drawer’s markup. Keep the outer wrapper id as **`shopify-section-cart-drawer`** so one-shot replacement works.

## CSS

- `assets/component-cart-items.css` — cart item grid rules (your grid at the bottom; preserved)
- Other Dawn CSS components as usual

## Performance (why it feels slow and how to speed it up)

Current approach re-renders the **entire drawer section** after each change. Safe and Dawn-like, but heavy.

### Improvements to consider (in order)

1. **Batch quantity updates**  
   Debounce rapid +/– clicks (≈200–300 ms) and send one request to `/cart/update.js`.

2. **Avoid double-loading scripts**  
   Ensure `cart.js` / `cart-drawer.js` aren’t included twice in `theme.liquid`.

3. **Partial swaps when safe**  
   For non-empty → non-empty changes, swap only `<cart-drawer-items>` and `.drawer__footer`. Keep full replacement for empty ↔ non-empty.

4. **Minimise DOM work**  
   Parse HTML once; query exact nodes; prefer `.replaceWith()` over large `innerHTML` writes.

5. **Micro-UX**  
   Disable buttons during requests; show small row spinners (Dawn’s loading spinner exists).

## Cart/header coupling (making it feel tighter)

- Always replace the full `#cart-icon-bubble` from its section to keep counts in sync.  
- When opening the drawer programmatically:
  ```js
  const drawer = document.querySelector('cart-drawer');
  drawer.open();
  drawer.querySelector('cart-drawer-items')?.scrollTo({ top: 0 });
