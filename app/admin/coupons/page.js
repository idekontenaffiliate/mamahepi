"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/coupons")
      .then((r) => r.json())
      .then((d) => setCoupons(d.coupons || []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function updateField(idx, field, value) {
    setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  function addCoupon() {
    setCoupons((prev) => [...prev, { code: "", percent: 10, active: true }]);
  }

  function removeCoupon(idx) {
    setCoupons((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupons: coupons.map((c) => ({ ...c, code: c.code.trim().toUpperCase() })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoupons(data.coupons);
      setNote("Tersimpan ✓");
      setTimeout(() => setNote(""), 2000);
    } catch (err) {
      setNote("Gagal simpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="admin-body">
        <div className="section-head">
          <h2>Kupon diskon</h2>
        </div>

        {loading ? (
          <div className="skeleton">Memuat kupon…</div>
        ) : (
          <>
            {coupons.map((c, idx) => (
              <div className="coupon-admin-row" key={idx}>
                <input
                  className="code"
                  style={{ border: "none", background: "transparent", width: 100 }}
                  value={c.code}
                  onChange={(e) => updateField(idx, "code", e.target.value)}
                  placeholder="KODEKU"
                />
                <input
                  type="number"
                  style={{ width: 70, border: "1px solid var(--line)", borderRadius: 6, padding: "4px 6px" }}
                  value={c.percent}
                  onChange={(e) => updateField(idx, "percent", Number(e.target.value))}
                />
                <span>%</span>
                <label style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                  <input type="checkbox" checked={c.active !== false} onChange={(e) => updateField(idx, "active", e.target.checked)} />
                  Aktif
                </label>
                <button className="del-btn" onClick={() => removeCoupon(idx)}>Hapus</button>
              </div>
            ))}

            <button className="add-row-btn" onClick={addCoupon}>+ Tambah kupon</button>

            {note && <div className="save-note">{note}</div>}
            <button className="save-btn" onClick={save} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan semua perubahan"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
