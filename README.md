# Tapfeast

Tapfeast is a static restaurant website built with HTML, CSS, Bootstrap, and
JavaScript.

## Features

- Browse the restaurant menu by category.
- See a price for every dish and add or change quantities directly on menu cards.
- View item totals, subtotal, estimated delivery, and order total in the cart.
- Keep the cart in browser storage between visits.
- Enter delivery details and prepare an order email to
  `orderfood@tapfeast.com`.
- Use the site on mobile and desktop.

## Run locally

Open `index.html` in a browser, or serve this folder with a local static web
server. For example, with Python installed:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Order flow

The site does not process payments or send orders to a server. Checkout opens a
pre-filled email that the customer reviews and sends using their email app. The
restaurant confirms availability and the final amount.

## Sample prices

The prices in `menu-prices.js` and the delivery fee are demonstration values in
INR, not confirmed Tapfeast prices. Replace them with the restaurant's approved
prices before publishing or accepting orders. The page labels these as sample
prices, and the checkout email repeats the same notice.
