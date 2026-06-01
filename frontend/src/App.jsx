import { NavLink, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/Toast.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Customers from "./pages/Customers.jsx";
import Orders from "./pages/Orders.jsx";

export default function App() {
  return (
    <ToastProvider>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="dot" />
            <div>
              Stockpile
              <small>Inventory &amp; Orders</small>
            </div>
          </div>
          <NavLink to="/" end className="nav-link">Dashboard</NavLink>
          <NavLink to="/products" className="nav-link">Products</NavLink>
          <NavLink to="/customers" className="nav-link">Customers</NavLink>
          <NavLink to="/orders" className="nav-link">Orders</NavLink>
        </aside>

        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
