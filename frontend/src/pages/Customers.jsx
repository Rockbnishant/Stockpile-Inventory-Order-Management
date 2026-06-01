import { useEffect, useState } from "react";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { api } from "../lib/api.js";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const notify = useToast();

  const load = () =>
    api.listCustomers().then(setCustomers).catch((e) => notify(e.message, "error")).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const remove = async (c) => {
    if (!confirm(`Delete ${c.full_name}?`)) return;
    try {
      await api.deleteCustomer(c.id);
      notify("Customer deleted");
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Customers</h1>
        <p>People and businesses you sell to.</p>
      </div>

      <div className="toolbar">
        <span style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
          {customers.length} customer{customers.length === 1 ? "" : "s"}
        </span>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add customer</button>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : customers.length === 0 ? (
          <div className="empty">No customers yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th></th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.full_name}</td>
                  <td>{c.email}</td>
                  <td className="mono">{c.phone || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn-danger-link" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding && <CustomerForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </>
  );
}

function CustomerForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const notify = useToast();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const err = {};
    if (!form.full_name.trim()) err.full_name = "Name is required";
    // Light client-side check; the backend validates properly too.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = "Enter a valid email";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.createCustomer({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      notify("Customer added");
      onSaved();
    } catch (e) {
      notify(e.message, "error");
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add customer"
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
        <label>Full name</label>
        <input value={form.full_name} onChange={set("full_name")} placeholder="e.g. Maya Fernandes" />
        {errors.full_name && <div className="err">{errors.full_name}</div>}
      </div>
      <div className="field">
        <label>Email</label>
        <input value={form.email} onChange={set("email")} placeholder="name@example.com" />
        {errors.email && <div className="err">{errors.email}</div>}
      </div>
      <div className="field">
        <label>Phone <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>(optional)</span></label>
        <input value={form.phone} onChange={set("phone")} placeholder="+1 555 0100" />
      </div>
    </Modal>
  );
}
