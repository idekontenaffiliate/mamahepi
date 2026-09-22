"use client";

import { useState } from "react";
import AdminNav from "../AdminNav";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengganti password");
      setSuccess("Password berhasil diganti.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="admin-body">
        <div className="section-head">
          <h2>Ganti Password</h2>
        </div>
        <div className="login-card" style={{ maxWidth: 420, margin: 0 }}>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Password lama</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Password baru</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Konfirmasi password baru</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            {success && (
              <div style={{ color: "var(--spice, #2a7)", fontSize: 12.5, margin: "-4px 0 10px" }}>
                {success}
              </div>
            )}
            <button className="save-btn" disabled={loading}>
              {loading ? "Menyimpan…" : "Simpan password baru"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
