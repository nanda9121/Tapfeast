(function () {
    "use strict";

    var storageKey = "tapfeast-order-cart";
    var cart = new Map();
    var cartItems = document.querySelector("[data-cart-items]");
    var cartCount = document.querySelector("[data-cart-count]");
    var cartStatus = document.querySelector("[data-cart-status]");
    var cartSummary = document.querySelector("[data-cart-summary]");
    var checkoutForm = document.querySelector("[data-checkout-form]");
    var cartModal = $("#tapfeastCartModal");
    var menuPrices = window.TAPFEAST_MENU_PRICES;
    var deliveryFee = window.TAPFEAST_DELIVERY_FEE;
    var currency = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    });

    function formatPrice(amount) {
        return currency.format(amount);
    }

    function announce(message) {
        cartStatus.textContent = message;
    }

    function saveCart() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(cart.values())));
            return true;
        } catch (error) {
            return false;
        }
    }

    function restoreCart() {
        var savedCart;
        var savedItems;

        try {
            savedCart = localStorage.getItem(storageKey);
        } catch (error) {
            announce("Your cart is available for this visit, but this browser could not load saved items.");
            return;
        }

        if (!savedCart) {
            return;
        }

        try {
            savedItems = JSON.parse(savedCart);
            if (!Array.isArray(savedItems)) {
                throw new Error("Saved cart is not a list.");
            }
        } catch (error) {
            try {
                localStorage.removeItem(storageKey);
            } catch (error) {
                announce("A saved cart could not be read. You can start a new order.");
                return;
            }
            announce("A saved cart could not be read, so it was cleared.");
            return;
        }

        savedItems.forEach(function (item) {
            if (
                item &&
                typeof item.name === "string" &&
                item.name.trim() &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0 &&
                item.quantity <= 99
            ) {
                cart.set(item.name, { name: item.name, quantity: item.quantity });
            }
        });
    }

    function renderCart() {
        var totalItems = 0;
        var subtotal = 0;
        cartItems.replaceChildren();

        cart.forEach(function (item) {
            var price = menuPrices[item.name];
            if (!Number.isFinite(price)) {
                return;
            }
            totalItems += item.quantity;
            subtotal += price * item.quantity;

            var row = document.createElement("div");
            row.className = "tapfeast-cart-item";

            var details = document.createElement("div");
            details.className = "tapfeast-cart-item-details";
            var name = document.createElement("span");
            name.className = "tapfeast-cart-item-name";
            name.textContent = item.name;
            details.appendChild(name);

            var linePrice = document.createElement("span");
            linePrice.className = "tapfeast-cart-line-price";
            linePrice.textContent = formatPrice(price * item.quantity);
            details.appendChild(linePrice);
            row.appendChild(details);

            var controls = document.createElement("div");
            controls.className = "tapfeast-cart-item-controls";
            controls.setAttribute("aria-label", item.name + " quantity controls");
            controls.appendChild(createQuantityButton("−", "Decrease quantity of " + item.name, item.name, -1));

            var quantity = document.createElement("span");
            quantity.className = "tapfeast-cart-quantity";
            quantity.textContent = String(item.quantity);
            quantity.setAttribute("aria-label", "Quantity: " + item.quantity);
            controls.appendChild(quantity);

            controls.appendChild(createQuantityButton("+", "Increase quantity of " + item.name, item.name, 1));
            controls.appendChild(createRemoveButton(item.name));
            row.appendChild(controls);
            cartItems.appendChild(row);
        });

        cartCount.textContent = String(totalItems);
        cartSummary.hidden = cart.size === 0;
        document.querySelector("[data-cart-subtotal]").textContent = formatPrice(subtotal);
        document.querySelector("[data-cart-delivery]").textContent = formatPrice(cart.size ? deliveryFee : 0);
        document.querySelector("[data-cart-total]").textContent = formatPrice(subtotal + (cart.size ? deliveryFee : 0));
        checkoutForm.hidden = cart.size === 0;

        if (cart.size === 0) {
            var emptyMessage = document.createElement("p");
            emptyMessage.className = "tapfeast-cart-empty";
            emptyMessage.textContent = "Your cart is empty. Add a dish from the menu to get started.";
            cartItems.appendChild(emptyMessage);
        }

        renderMenuControls();
    }

    function createQuantityButton(label, accessibleLabel, itemName, change) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "tapfeast-quantity-button";
        button.textContent = label;
        button.setAttribute("aria-label", accessibleLabel);
        button.addEventListener("click", function () {
            changeQuantity(itemName, change);
        });
        return button;
    }

    function createRemoveButton(itemName) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "tapfeast-remove-button";
        button.textContent = "Remove";
        button.addEventListener("click", function () {
            cart.delete(itemName);
            var saved = saveCart();
            renderCart();
            announce(saved
                ? itemName + " removed from your order."
                : itemName + " removed. The browser could not save the updated cart.");
        });
        return button;
    }

    function changeQuantity(itemName, change) {
        var item = cart.get(itemName);
        if (!item) {
            return;
        }

        var nextQuantity = item.quantity + change;
        if (nextQuantity <= 0) {
            cart.delete(itemName);
        } else if (nextQuantity <= 99) {
            item.quantity = nextQuantity;
        } else {
            announce("The maximum quantity for one dish is 99.");
            return;
        }

        var saved = saveCart();
        renderCart();
        announce(saved
            ? itemName + " quantity updated."
            : itemName + " updated. The browser could not save the updated cart.");
    }

    function addDish(name) {
        if (!Object.prototype.hasOwnProperty.call(menuPrices, name)) {
            announce("A price is not configured for " + name + ". Please contact the restaurant.");
            return;
        }

        var item = cart.get(name);
        if (item) {
            if (item.quantity >= 99) {
                announce("The maximum quantity for one dish is 99.");
                return;
            }
            item.quantity += 1;
        } else {
            cart.set(name, { name: name, quantity: 1 });
        }

        var saved = saveCart();
        renderCart();
        announce(saved
            ? name + " added to your order."
            : name + " added. The browser could not save the cart for your next visit.");
    }

    function renderMenuControls() {
        document.querySelectorAll(".tapfeast-menu-controls").forEach(function (controls) {
            var name = controls.dataset.itemName;
            var item = cart.get(name);
            controls.replaceChildren();

            if (!Number.isFinite(menuPrices[name])) {
                var unavailable = document.createElement("span");
                unavailable.className = "tapfeast-menu-price-unavailable";
                unavailable.textContent = "Price unavailable";
                controls.appendChild(unavailable);
                return;
            }

            var price = document.createElement("span");
            price.className = "tapfeast-menu-price";
            price.textContent = formatPrice(menuPrices[name]);
            controls.appendChild(price);

            if (!item) {
                var addButton = document.createElement("button");
                addButton.type = "button";
                addButton.className = "tapfeast-add-button";
                addButton.textContent = "ADD";
                addButton.setAttribute("aria-label", "Add " + name + " to your order");
                addButton.addEventListener("click", function () {
                    addDish(name);
                });
                controls.appendChild(addButton);
                return;
            }

            var stepper = document.createElement("div");
            stepper.className = "tapfeast-menu-stepper";
            stepper.setAttribute("aria-label", name + " quantity controls");
            stepper.appendChild(createQuantityButton("−", "Decrease quantity of " + name, name, -1));

            var quantity = document.createElement("span");
            quantity.className = "tapfeast-menu-quantity";
            quantity.textContent = String(item.quantity);
            quantity.setAttribute("aria-label", "Quantity: " + item.quantity);
            stepper.appendChild(quantity);

            stepper.appendChild(createQuantityButton("+", "Increase quantity of " + name, name, 1));
            controls.appendChild(stepper);
        });
    }

    function installMenuControls() {
        document.querySelectorAll(".menu-item-card svg.bi-plus-square").forEach(function (icon) {
            var card = icon.closest(".menu-item-card");
            var title = card && card.querySelector(".menu-card-title");
            var name = title && title.textContent.trim();
            if (!name) {
                return;
            }

            var controls = document.createElement("div");
            controls.className = "tapfeast-menu-controls";
            controls.dataset.itemName = name;

            icon.replaceWith(controls);
        });
        document.querySelectorAll(".bg-container .menu-section-heading").forEach(function (heading) {
            var notice = document.createElement("p");
            notice.className = "tapfeast-demo-pricing-notice";
            notice.textContent = "Sample INR prices for demonstration only. Confirm final prices with Tapfeast.";
            heading.insertAdjacentElement("afterend", notice);
        });
        renderMenuControls();
    }

    document.querySelectorAll("[data-open-cart]").forEach(function (button) {
        button.addEventListener("click", function () {
            cartModal.modal("show");
        });
    });

    checkoutForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (cart.size === 0 || !checkoutForm.reportValidity()) {
            return;
        }

        var details = new FormData(checkoutForm);
        var subtotal = Array.from(cart.values()).reduce(function (sum, item) {
            return sum + menuPrices[item.name] * item.quantity;
        }, 0);
        var lines = Array.from(cart.values()).map(function (item) {
            return item.quantity + " x " + item.name + " — " + formatPrice(menuPrices[item.name] * item.quantity);
        });
        var body = [
            "New Tapfeast order",
            "",
            "Items (sample menu prices):",
            lines.join("\n"),
            "",
            "Subtotal: " + formatPrice(subtotal),
            "Estimated delivery fee: " + formatPrice(deliveryFee),
            "Estimated total: " + formatPrice(subtotal + deliveryFee),
            "",
            "Customer: " + details.get("name"),
            "Phone: " + details.get("phone"),
            "Delivery address: " + details.get("address"),
            "",
            "Please confirm availability and the final amount."
        ].join("\n");
        var mailto = "mailto:orderfood@tapfeast.com?subject=" +
            encodeURIComponent("Tapfeast food order") +
            "&body=" + encodeURIComponent(body);

        window.location.href = mailto;
        announce("Your email app should open with the order details. Review and send the email to place your order.");
    });

    restoreCart();
    installMenuControls();
    renderCart();
})();
