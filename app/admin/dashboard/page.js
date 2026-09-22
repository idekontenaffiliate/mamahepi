"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

function idr(n) {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

function shortDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "short" }).replace(".", "");
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="admin-body">
        <div className="section-head">
          <h2>Dashboard</h2>
          <button className="admin-tab" onClick={load}>Refresh</button>
        </div>

        {loading && <div className="skeleton">Memuat data…</div>}
        {error && <div className="error-msg">Gagal memuat: {error}</div>}

        {!loading && data && (
          <>
            <div className="stat-grid">
              <StatCard
                label="Jumlah transaksi"
                value={data.summary.totalOrders.toLocaleString("id-ID")}
                sub={`${data.summary.ordersToday} hari ini`}
                accent="spice"
              />
              <StatCard
                label="Omzet (non-batal)"
                value={idr(data.summary.revenueGross)}
                sub={`Selesai: ${idr(data.summary.revenueCompleted)}`}
                accent="leaf"
              />
              <StatCard
                label="Pengunjung"
                value={data.summary.totalVisits.toLocaleString("id-ID")}
                sub={
                  data.summary.hasVisitData
                    ? `${data.summary.visitsToday} hari ini`
                    : "Belum ada data — lihat catatan di bawah"
                }
                accent="gold"
              />
              <StatCard
                label="Rata-rata / transaksi"
                value={idr(data.summary.avgOrderValue)}
                sub={
                  data.summary.conversionRate !== null
                    ? `Konversi 7 hari: ${data.summary.conversionRate}%`
                    : `${data.summary.activeProductCount} produk aktif`
                }
                accent="chili"
              />
            </div>

            <div className="section-head" style={{ marginTop: 26 }}>
              <h2>Tren 14 hari terakhir</h2>
            </div>
            <TrendChart chart={data.chart} />

            <div className="dash-cols">
              <div className="dash-col">
                <div className="section-head" style={{ marginTop: 22 }}>
                  <h2>Produk terlaris</h2>
                  <span className="count">dari isi pesanan</span>
                </div>
                {data.popularProducts.length === 0 && (
                  <div className="empty-cart">Belum ada produk terjual.</div>
                )}
                <div className="popular-list">
                  {data.popularProducts.map((p, i) => (
                    <div className="popular-row" key={p.name}>
                      <span className="popular-rank">{i + 1}</span>
                      <div className="popular-info">
                        <div className="popular-name">{p.name}</div>
                        <div className="popular-sub">{p.qty} terjual · {idr(p.revenue)}</div>
                      </div>
                      <div className="popular-bar-track">
                        <div
                          className="popular-bar-fill"
                          style={{
                            width: `${Math.max(
                              6,
                              (p.qty / data.popularProducts[0].qty) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dash-col">
                <div className="section-head" style={{ marginTop: 22 }}>
                  <h2>Status pesanan</h2>
                </div>
                <div className="status-grid">
                  {Object.entries(data.statusCount).map(([status, count]) => (
                    <div className="status-box" key={status}>
                      <span className={`order-status ${status}`}>{status}</span>
                      <div className="status-count">{count}</div>
                    </div>
                  ))}
                </div>

                <div className="section-head" style={{ marginTop: 22 }}>
                  <h2>Pesanan terbaru</h2>
                </div>
                {data.recentOrders.length === 0 && (
                  <div className="empty-cart">Belum ada pesanan.</div>
                )}
                {data.recentOrders.map((o) => (
                  <div className="recent-row" key={o.orderId}>
                    <div>
                      <b>{o.customerName || o.orderId}</b>
                      <div className="popular-sub">{o.timestamp?.replace("T", " ").slice(0, 16)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600 }}>{idr(o.total)}</div>
                      <span className={`order-status ${o.status}`}>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!data.summary.hasVisitData && (
              <div className="pay-info" style={{ marginTop: 24 }}>
                <b>Catatan jumlah pengunjung</b>
                Untuk mengaktifkan hitungan pengunjung, tambahkan tab baru bernama <b>Visits</b> di
                Google Sheet kamu dengan kolom <b>timestamp | path</b> di baris pertama (sama seperti
                tab lainnya). Setelah tab itu ada, kunjungan ke halaman toko akan otomatis tercatat.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function TrendChart({ chart }) {
  const maxOrders = Math.max(1, ...chart.orders);
  const maxVisits = Math.max(1, ...chart.visits);
  return (
    <div className="trend-card">
      <div className="trend-legend">
        <span><i className="dot dot-spice" /> Transaksi</span>
        <span><i className="dot dot-gold" /> Pengunjung</span>
      </div>
      <div className="trend-chart">
        {chart.days.map((d, i) => (
          <div className="trend-col" key={d}>
            <div className="trend-bars">
              <div
                className="trend-bar bar-spice"
                style={{ height: `${(chart.orders[i] / maxOrders) * 100}%` }}
                title={`${chart.orders[i]} transaksi`}
              />
              <div
                className="trend-bar bar-gold"
                style={{ height: `${(chart.visits[i] / maxVisits) * 100}%` }}
                title={`${chart.visits[i]} pengunjung`}
              />
            </div>
            <div className="trend-label">{shortDay(d)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
