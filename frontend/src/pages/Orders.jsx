import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { api } from "../lib/api.js";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const notify = useToast();

  const load = () =>
    api.listOrders().then(setOrders).catch((e) => notify(e.message, "error")).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const cancel = async (o) => {
    if (!confirm(`Cancel order #${o.id}? Stock will be returned.`)) return;
    try {
      await api.deleteOrder(o.id);
      notify("Order cancelled");
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Orders</h1>
        <p>Create orders against live stock and review past ones.</p>
      </div>

      <div className="toolbar">
        <span style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
          {orders.length} order{orders.length === 1 ? "" : "s"}
        </span>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New order</button>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">#{o.id}</td>
                  <td className="mono">C-{o.customer_id}</td>
                  <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="mono">${Number(o.total_amount).toFixed(2)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn-link" onClick={() => setViewing(o.id)}>Details</button>
                    <span style={{ margin: "0 8px", color: "var(--line)" }}>|</span>
                    <button className="btn-danger-link" onClick={() => cancel(o)}>Cancel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && <OrderForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {viewing && <OrderDetail orderId={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

function OrderForm({ onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ product_id: "", quantity: 1 }]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const notify = useToast();

  useEffect(() => {
    Promise.all([api.listCustomers(), api.listProducts()])
      .then(([c, p]) => { setCustomers(c); setProducts(p); })
      .catch((e) => notify(e.message, "error"));
  }, []);

  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [String(p.id), p])),
    [products]
  );

  const estTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const p = productById[l.product_id];
      return p ? sum + Number(p.price) * Number(l.quantity || 0) : sum;
    }, 0);
  }, [lines, productById]);

  const setLine = (i, key, val) => {
    const next = [...lines];
    next[i] = { ...next[i], [key]: val };
    setLines(next);
  };
  const addLine = () => setLines([...lines, { product_id: "", quantity: 1 }]);
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

  const validate = () => {
    const err = {};
    if (!customerId) err.customer = "Pick a customer";
    const filled = lines.filter((l) => l.product_id);
    if (filled.length === 0) err.lines = "Add at least one product";
    for (const l of filled) {
      const p = productById[l.product_id];
      if (p && Number(l.quantity) > p.quantity) {
        err.lines = `Only ${p.quantity} of "${p.name}" in stock`;
        break;
      }
      if (Number(l.quantity) < 1) { err.lines = "Quantities must be at least 1"; break; }
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    const items = lines
      .filter((l) => l.product_id)
      .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }));
    try {
      await api.createOrder({ customer_id: Number(customerId), items });
      notify("Order created");
      onSaved();
    } catch (e) {
      notify(e.message, "error");
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New order"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Placing…" : "Place order"}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Customer</label>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
          ))}
        </select>
        {errors.customer && <div className="err">{errors.customer}</div>}
      </div>

      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 8 }}>
        Products
      </label>
      {lines.map((l, i) => {
        const p = productById[l.product_id];
        return (
          <div className="line-row" key={i}>
            <select value={l.product_id} onChange={(e) => setLine(i, "product_id", e.target.value)}>
              <option value="">Choose product…</option>
              {products.map((pr) => (
                <option key={pr.id} value={pr.id} disabled={pr.quantity === 0}>
                  {pr.name} — ${Number(pr.price).toFixed(2)} ({pr.quantity} in stock)
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max={p ? p.quantity : undefined}
              value={l.quantity}
              onChange={(e) => setLine(i, "quantity", e.target.value)}
            />
            <button
              className="x-btn"
              onClick={() => removeLine(i)}
              disabled={lines.length === 1}
              title="Remove line"
            >
              &times;
            </button>
          </div>
        );
      })}

      <button className="btn-link" onClick={addLine} style={{ marginTop: 2 }}>+ Add another product</button>
      {errors.lines && <div className="err" style={{ marginTop: 8 }}>{errors.lines}</div>}

      <div className="line-total">Estimated total: ${estTotal.toFixed(2)}</div>
    </Modal>
  );
}

function OrderDetail({ orderId, onClose }) {
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState({});
  const notify = useToast();

  useEffect(() => {
    Promise.all([api.getOrder(orderId), api.listProducts()])
      .then(([o, ps]) => {
        setOrder(o);
        setProducts(Object.fromEntries(ps.map((p) => [p.id, p])));
      })
      .catch((e) => notify(e.message, "error"));
  }, [orderId]);

  return (
    <Modal
      title={`Order #${orderId}`}
      onClose={onClose}
      footer={<button className="btn btn-ghost" onClick={onClose}>Close</button>}
    >
      {!order ? (
        <div className="loading">Loading…</div>
      ) : (
        <>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: 14 }}>
            Customer C-{order.customer_id} · placed {new Date(order.created_at).toLocaleString()}
          </p>
          <ul className="detail-list">
            {order.items.map((it, idx) => (
              <li key={idx}>
                <span>{products[it.product_id]?.name || `Product ${it.product_id}`} × {it.quantity}</span>
                <span className="mono">${(Number(it.unit_price) * it.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="line-total">Total: ${Number(order.total_amount).toFixed(2)}</div>
        </>
      )}
    </Modal>
  );
}
