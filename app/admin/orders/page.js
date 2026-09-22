"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

function idr(n) {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

const STATUSES = ["Baru", "Diproses", "Selesai", "Batal"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function changeStatus(orderId, status) {
    setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status } : o)));
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
  }

  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="admin-body">
        <div className="section-head">
          <h2>Pesanan masuk</h2>
          <button className="admin-tab" onClick={load}>Refresh</button>
        </div>

        {loading && <div className="skeleton">Memuat pesanan…</div>}
        {!loading && orders.length === 0 && <div className="empty-cart">Belum ada pesanan.</div>}

        {orders.map((o) => (
          <div className="order-row" key={o.orderId}>
            <div className="order-row-top">
              <div>
                <b>{o.orderId}</b> · {o.timestamp}
                <div className="order-items">{o.customerName} · {o.phone}</div>
              </div>
              <select
                className={`order-status ${o.status}`}
                value={o.status}
                onChange={(e) => changeStatus(o.orderId, e.target.value)}
                style={{ border: "none" }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="order-items">
              {o.items.map((it) => `${it.name} x${it.qty}`).join(", ")}
            </div>
            {o.address && <div className="order-items">Alamat: {o.address}</div>}
            {o.notes && <div className="order-items">Catatan: {o.notes}</div>}
            <div style={{ fontWeight: 600 }}>{idr(o.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
