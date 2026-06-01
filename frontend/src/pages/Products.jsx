import { useEffect, useState } from "react";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { api } from "../lib/api.js";

const blank = { name: "", sku: "", price: "", quantity: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const notify = useToast();

  const load = () =>
    api.listProducts().then(setProducts).catch((e) => notify(e.message, "error")).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await api.deleteProduct(p.id);
      notify("Product deleted");
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Products</h1>
        <p>Add items, adjust stock, and keep your catalogue tidy.</p>
      </div>

      <div className="toolbar">
        <span style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
          {products.length} product{products.length === 1 ? "" : "s"}
        </span>
        <button className="btn btn-primary" onClick={() => setEditing({ ...blank })}>
          + Add product
        </button>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : products.length === 0 ? (
          <div className="empty">No products yet. Add your first one to get started.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="mono">{p.sku}</td>
                  <td className="mono">${Number(p.price).toFixed(2)}</td>
                  <td>
                    <span className={`pill ${p.quantity < 10 ? "low" : "ok"}`}>{p.quantity}</span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn-link" onClick={() => setEditing(p)}>Edit</button>
                    <span style={{ margin: "0 8px", color: "var(--line)" }}>|</span>
                    <button className="btn-danger-link" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ProductForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </>
  );
}

function ProductForm({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial.id);
  const [form, setForm] = useState({
    name: initial.name ?? "",
    sku: initial.sku ?? "",
    price: initial.price ?? "",
    quantity: initial.quantity ?? "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const notify = useToast();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = "Name is required";
    if (!form.sku.trim()) err.sku = "SKU is required";
    if (form.price === "" || Number(form.price) < 0) err.price = "Enter a price of 0 or more";
    if (form.quantity === "" || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0)
      err.quantity = "Quantity must be a whole number, 0 or more";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
    };
    try {
      if (isEdit) {
        await api.updateProduct(initial.id, payload);
        notify("Product updated");
      } else {
        await api.createProduct(payload);
        notify("Product added");
      }
      onSaved();
    } catch (e) {
      notify(e.message, "error");
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit product" : "Add product"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Product name</label>
        <input value={form.name} onChange={set("name")} placeholder="e.g. Stainless water bottle" />
        {errors.name && <div className="err">{errors.name}</div>}
      </div>
      <div className="field">
        <label>SKU / code</label>
        <input value={form.sku} onChange={set("sku")} placeholder="e.g. WB-500-SS" />
        {errors.sku && <div className="err">{errors.sku}</div>}
      </div>
      <div className="form-row">
        <div className="field">
          <label>Price</label>
          <input type="number" step="0.01" min="0" value={form.price} onChange={set("price")} placeholder="0.00" />
          {errors.price && <div className="err">{errors.price}</div>}
        </div>
        <div className="field">
          <label>Quantity in stock</label>
          <input type="number" min="0" value={form.quantity} onChange={set("quantity")} placeholder="0" />
          {errors.quantity && <div className="err">{errors.quantity}</div>}
        </div>
      </div>
    </Modal>
  );
}
