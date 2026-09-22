"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GENDER_OPTIONS = [
  { value: "male", label: "Laki-laki" },
  { value: "female", label: "Perempuan" },
  { value: "rather_not_say", label: "Tidak ingin menyebutkan" },
];

export default function AdminRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    birthDate: "",
    gender: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h2 style={{ marginTop: 0 }}>Daftar Admin</h2>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: -6, marginBottom: 16 }}>
          Akun ini punya akses ke dashboard admin (bukan akun administrator/pemilik toko).
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nama lengkap</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Nomor telepon</label>
            <input
              type="tel"
              required
              placeholder="08xxxxxxxxxx"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Tanggal lahir</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => update("birthDate", e.target.value)}
              />
            </div>
            <div className="field">
              <label>Jenis kelamin</label>
              <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                <option value="">Pilih…</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="save-btn" disabled={loading}>
            {loading ? "Mendaftarkan…" : "Daftar & Masuk"}
          </button>
        </form>
        <p style={{ fontSize: 13, textAlign: "center", marginTop: 14, marginBottom: 0 }}>
          Sudah punya akun? <a href="/admin/login" style={{ fontWeight: 600 }}>Masuk di sini</a>
        </p>
      </div>
    </div>
  );
}
