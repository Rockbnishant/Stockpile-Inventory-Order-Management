// Base URL comes from the build-time env var. Vite only exposes vars
// prefixed with VITE_. Falls back to localhost for `npm run dev`.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // FastAPI puts the message in `detail`; validation errors make it a list.
    const detail = body.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(", ")
      : detail || "Something went wrong";
    throw new Error(msg);
  }
  return body;
}

export const api = {
  // products
  listProducts: () => request("/products"),
  createProduct: (data) => request("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),

  // customers
  listCustomers: () => request("/customers"),
  createCustomer: (data) => request("/customers", { method: "POST", body: JSON.stringify(data) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: "DELETE" }),

  // orders
  listOrders: () => request("/orders"),
  createOrder: (data) => request("/orders", { method: "POST", body: JSON.stringify(data) }),
  getOrder: (id) => request(`/orders/${id}`),
  deleteOrder: (id) => request(`/orders/${id}`, { method: "DELETE" }),

  // dashboard
  dashboard: () => request("/dashboard"),
};
