"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal login");
      router.push("/admin/orders");
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
        <h2 style={{ marginTop: 0 }}>Masuk Admin</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="save-btn" disabled={loading}>
            {loading ? "Memeriksa…" : "Masuk"}
          </button>
          <p style={{ fontSize: 12.5, textAlign: "center", marginTop: 10, marginBottom: 0 }}>
            <a href="/admin/forgot-password">Lupa password?</a>
          </p>
        </form>
        <p style={{ fontSize: 13, textAlign: "center", marginTop: 14, marginBottom: 0 }}>
          Belum punya akun admin?{" "}
          <a href="/admin/register" style={{ fontWeight: 600 }}>
            Daftar di sini
          </a>
        </p>
      </div>
    </div>
  );
}
