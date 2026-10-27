(function () {
    "use strict";

    var storageKey = "tapfeast-order-cart";
    var cart = new Map();
    var cartItems = document.querySelector("[data-cart-items]");
    var cartCount = document.querySelector("[data-cart-count]");
    var cartStatus = document.querySelector("[data-cart-status]");
    var checkoutForm = document.querySelector("[data-checkout-form]");
    var cartModal = $("#tapfeastCartModal");

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
        cartItems.replaceChildren();

        cart.forEach(function (item) {
            totalItems += item.quantity;

            var row = document.createElement("div");
            row.className = "tapfeast-cart-item";

            var name = document.createElement("span");
            name.className = "tapfeast-cart-item-name";
            name.textContent = item.name;
            row.appendChild(name);

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
        checkoutForm.hidden = cart.size === 0;

        if (cart.size === 0) {
            var emptyMessage = document.createElement("p");
            emptyMessage.className = "tapfeast-cart-empty";
            emptyMessage.textContent = "Your cart is empty. Add a dish from the menu to get started.";
            cartItems.appendChild(emptyMessage);
        }
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

    function installMenuButtons() {
        document.querySelectorAll(".menu-item-card svg.bi-plus-square").forEach(function (icon) {
            var card = icon.closest(".menu-item-card");
            var title = card && card.querySelector(".menu-card-title");
            var name = title && title.textContent.trim();
            if (!name) {
                return;
            }

            var button = document.createElement("button");
            button.type = "button";
            button.className = "tapfeast-add-button";
            button.textContent = "Add";
            button.setAttribute("aria-label", "Add " + name + " to your order");
            button.addEventListener("click", function () {
                addDish(name);
            });

            icon.replaceWith(button);
        });
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
        var lines = Array.from(cart.values()).map(function (item) {
            return item.quantity + " x " + item.name;
        });
        var body = [
            "New Tapfeast order",
            "",
            "Items:",
            lines.join("\n"),
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
    installMenuButtons();
    renderCart();
})();
