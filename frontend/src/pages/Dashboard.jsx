import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="empty">Couldn't load dashboard: {error}</div>;
  if (!stats) return <div className="loading">Loading…</div>;

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>A quick snapshot of what's in the system right now.</p>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <div className="label">Products</div>
          <div className="value">{stats.total_products}</div>
        </div>
        <div className="card stat">
          <div className="label">Customers</div>
          <div className="value">{stats.total_customers}</div>
        </div>
        <div className="card stat">
          <div className="label">Orders</div>
          <div className="value">{stats.total_orders}</div>
        </div>
        <div className="card stat">
          <div className="label">Low stock</div>
          <div className="value">{stats.low_stock.length}</div>
        </div>
      </div>

      <div className="section-title">Low stock products</div>
      <div className="card table-wrap">
        {stats.low_stock.length === 0 ? (
          <div className="empty">Nothing running low. Stock levels look healthy.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Product</th><th>SKU</th><th>In stock</th></tr>
            </thead>
            <tbody>
              {stats.low_stock.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="mono">{p.sku}</td>
                  <td><span className="pill low">{p.quantity} left</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
