"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInputValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return d.toISOString();
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings || {}));
  }, []);

  function set(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSettings(data.settings);
      setNote("Tersimpan ✓");
      setTimeout(() => setNote(""), 2000);
    } catch (err) {
      setNote("Gagal simpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="admin-shell">
        <AdminNav />
        <div className="admin-body"><div className="skeleton">Memuat pengaturan…</div></div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="admin-body">
        <div className="section-head"><h2>Pengaturan toko</h2></div>
        <form onSubmit={save}>
          <div className="field">
            <label>Nama toko</label>
            <input value={settings.shopName || ""} onChange={(e) => set("shopName", e.target.value)} />
          </div>
          <div className="field">
            <label>Tagline</label>
            <input value={settings.tagline || ""} onChange={(e) => set("tagline", e.target.value)} />
          </div>
          <div className="field">
            <label>Promo berakhir pada</label>
            <input
              type="datetime-local"
              value={toLocalInputValue(settings.timerEnd)}
              onChange={(e) => set("timerEnd", fromLocalInputValue(e.target.value))}
            />
          </div>

          <div className="field">
            <label>Nomor WhatsApp toko (untuk konfirmasi pesanan, format 08xx atau 62xx)</label>
            <input value={settings.waNumber || ""} onChange={(e) => set("waNumber", e.target.value)} />
          </div>
          <div className="field">
            <label>Link Lynk.id (opsional)</label>
            <input value={settings.lynkUrl || ""} onChange={(e) => set("lynkUrl", e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Nama bank</label>
              <input value={settings.bankName || ""} onChange={(e) => set("bankName", e.target.value)} />
            </div>
            <div className="field">
              <label>No. rekening</label>
              <input value={settings.bankAccount || ""} onChange={(e) => set("bankAccount", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Nama pemilik rekening</label>
            <input value={settings.bankHolder || ""} onChange={(e) => set("bankHolder", e.target.value)} />
          </div>

          <div className="field">
            <label>Email pemilik toko (notifikasi pesanan baru dikirim ke sini)</label>
            <input type="email" value={settings.ownerEmail || ""} onChange={(e) => set("ownerEmail", e.target.value)} placeholder="pemilik@email.com" />
          </div>
          <div className="field">
            <label>Nomor WhatsApp pemilik toko (opsional, untuk notifikasi WA otomatis via Fonnte)</label>
            <input value={settings.ownerWaNumber || ""} onChange={(e) => set("ownerWaNumber", e.target.value)} placeholder="08xxxxxxxxxx" />
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
              Aktif hanya kalau <code>FONNTE_TOKEN</code> sudah diisi di environment variable. Kalau kosong, sistem tetap jalan normal — pemilik cukup dapat notifikasi lewat email di atas.
            </div>
          </div>

          {note && <div className="save-note">{note}</div>}
          <button className="save-btn" disabled={saving}>{saving ? "Menyimpan…" : "Simpan pengaturan"}</button>
        </form>
      </div>
    </div>
  );
}
