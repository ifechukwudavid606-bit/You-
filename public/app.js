let selectedProduct = null;
let currentOrderId = null;
let adminKey = null;
let statusTimer = null;

async function loadProducts() {
  try {
    const res = await fetch("/api/products");

    if (!res.ok) {
      throw new Error("Could not load products");
    }

    const products = await res.json();

    document.getElementById("products").innerHTML =
      products.map((product) => `
        <div class="product">
          <h3>${escapeHtml(product.name)}</h3>

          <div class="price">
            ₦${Number(product.price).toLocaleString()}
          </div>

          <button
            class="buy"
            type="button"
            onclick="buyProduct(${product.id})"
          >
            BUY
          </button>
        </div>
      `).join("");

  } catch (error) {
    document.getElementById("products").innerHTML =
      "<p>Could not load products. Please refresh the page.</p>";
  }
}

function buyProduct(id) {
  selectedProduct = id;

  document
    .getElementById("paymentSection")
    .classList.remove("hidden");

  document
    .getElementById("paymentForm")
    .classList.add("hidden");

  document
    .getElementById("paymentSection")
    .scrollIntoView({ behavior: "smooth" });
}

function showPaymentForm() {
  if (selectedProduct === null) {
    return;
  }

  document
    .getElementById("paymentForm")
    .classList.remove("hidden");

  document
    .getElementById("paymentForm")
    .scrollIntoView({ behavior: "smooth" });
}

async function submitPayment() {
  const customerName =
    document.getElementById("customerName").value.trim();

  const transactionId =
    document.getElementById("transactionId").value.trim();

  const msg =
    document.getElementById("formMessage");

  if (selectedProduct === null) {
    msg.textContent = "Please select a product first.";
    return;
  }

  if (!customerName || !transactionId) {
    msg.textContent =
      "Please enter your name and transaction ID/reference.";
    return;
  }

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId: selectedProduct,
        customerName: customerName,
        transactionId: transactionId
      })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent =
        data.error || "Could not submit order.";
      return;
    }

    currentOrderId = data.id;

    document.getElementById("orderId").textContent =
      data.id;

    document
      .getElementById("statusSection")
      .classList.remove("hidden");

    document
      .getElementById("paymentForm")
      .classList.add("hidden");

    startStatusPolling();

    document
      .getElementById("statusSection")
      .scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    msg.textContent =
      "Connection error. Please try again.";
  }
}

function startStatusPolling() {
  clearInterval(statusTimer);

  refreshOrderStatus();

  statusTimer =
    setInterval(refreshOrderStatus, 5000);
}

async function refreshOrderStatus() {
  if (!currentOrderId) {
    return;
  }

  try {
    const res = await fetch(
      "/api/orders/" +
      encodeURIComponent(currentOrderId)
    );

    if (!res.ok) {
      return;
    }

    const order = await res.json();

    document.getElementById("statusProduct").textContent =
      order.product;

    document.getElementById("paymentStatus").textContent =
      order.paymentStatus;

    document.getElementById("injectionStatus").textContent =
      order.injectionStatus || "WAITING";

    if (
      order.paymentStatus === "DECLINED" ||
      order.injectionStatus === "INJECTED"
    ) {
      clearInterval(statusTimer);
    }

  } catch (error) {
    // Keep polling if connection temporarily fails.
  }
}

function toggleMenu() {
  document
    .getElementById("sideMenu")
    .classList.toggle("open");
}

function showAdminLogin() {
  toggleMenu();

  document
    .getElementById("adminLogin")
    .classList.remove("hidden");

  document
    .getElementById("adminLogin")
    .scrollIntoView({ behavior: "smooth" });
}

async function adminLogin() {
  const key =
    document.getElementById("adminKey").value.trim();

  const msg =
    document.getElementById("adminMessage");

  if (!key) {
    msg.textContent = "Enter the admin key.";
    return;
  }

  try {
    const res = await fetch("/api/admin/orders", {
      headers: {
        "x-admin-key": key
      }
    });

    if (!res.ok) {
      msg.textContent = "ACCESS DENIED";
      adminKey = null;
      return;
    }

    adminKey = key;

    msg.textContent = "ACCESS GRANTED";

    document
      .getElementById("adminDashboard")
      .classList.remove("hidden");

    await loadOrders();

    document
      .getElementById("adminDashboard")
      .scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    msg.textContent =
      "Connection error. Please try again.";
  }
}

async function loadOrders() {
  if (!adminKey) {
    return;
  }

  try {
    const res = await fetch(
      "/api/admin/orders",
      {
        headers: {
          "x-admin-key": adminKey
        }
      }
    );

    if (!res.ok) {
      return;
    }

    const orders = await res.json();

    const box =
      document.getElementById("adminOrders");

    if (!orders.length) {
      box.innerHTML =
        "<p>No orders yet.</p>";
      return;
    }

    box.innerHTML =
      orders.map((order) => `
        <div class="order-card">

          <p>
            <strong>
              ${escapeHtml(order.id)}
            </strong>
          </p>

          <p>
            Customer:
            ${escapeHtml(order.customerName)}
          </p>

          <p>
            Product:
            ${escapeHtml(order.product)}
          </p>

          <p>
            Amount:
            ₦${Number(order.amount).toLocaleString()}
          </p>

          <p>
            Transaction ID:
            ${escapeHtml(order.transactionId)}
          </p>

          <p>
            Payment:
            <strong>
              ${escapeHtml(order.paymentStatus)}
            </strong>
          </p>

          <p>
            Injection:
            <strong>
              ${escapeHtml(
                order.injectionStatus || "WAITING"
              )}
            </strong>
          </p>

          <div class="order-actions">

            <button
              type="button"
              onclick="paymentDecision(
                '${order.id}',
                'APPROVED'
              )"
            >
              APPROVED
            </button>

            <button
              type="button"
              onclick="paymentDecision(
                '${order.id}',
                'DECLINED'
              )"
            >
              DECLINED
            </button>

            <button
              type="button"
              onclick="injectionDecision(
                '${order.id}',
                'INJECTING'
              )"
            >
              INJECTING
            </button>

            <button
              type="button"
              onclick="injectionDecision(
                '${order.id}',
                'INJECTED'
              )"
            >
              INJECTED
            </button>

          </div>

        </div>
      `).join("");

  } catch (error) {
    // Ignore temporary admin connection errors.
  }
}

async function paymentDecision(id, status) {
  if (!adminKey) {
    return;
  }

  await fetch(
    "/api/admin/orders/" +
    encodeURIComponent(id) +
    "/payment",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({
        status: status
      })
    }
  );

  await loadOrders();
}

async function injectionDecision(id, status) {
  if (!adminKey) {
    return;
  }

  await fetch(
    "/api/admin/orders/" +
    encodeURIComponent(id) +
    "/injection",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({
        status: status
      })
    }
  );

  await loadOrders();
}

function closeAdmin() {
  document
    .getElementById("adminDashboard")
    .classList.add("hidden");

  document
    .getElementById("adminLogin")
    .classList.add("hidden");

  adminKey = null;

  document
    .getElementById("adminKey")
    .value = "";
}

function showTelegramMessage() {
  alert("Telegram link will be added soon.");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadProducts();
