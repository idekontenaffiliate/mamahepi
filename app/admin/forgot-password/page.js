"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = minta kode, 2 = masukkan kode + password baru
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestCode(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim kode");
      setInfo(data.message || "Kode reset sudah dikirim ke email tersebut.");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengatur ulang password");
      router.push("/admin/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h2 style={{ marginTop: 0 }}>Lupa Password</h2>

        {step === 1 && (
          <form onSubmit={handleRequestCode}>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: -6, marginBottom: 16 }}>
              Masukkan email akun admin kamu — kami kirim kode 6 digit ke email tersebut.
            </p>
            <div className="field">
              <label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="save-btn" disabled={loading}>
              {loading ? "Mengirim…" : "Kirim kode"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            {info && (
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: -6, marginBottom: 16 }}>
                {info}
              </p>
            )}
            <div className="field">
              <label>Kode dari email (6 digit)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
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
            <button className="save-btn" disabled={loading}>
              {loading ? "Menyimpan…" : "Atur ulang password"}
            </button>
            <button
              type="button"
              className="admin-tab"
              style={{ width: "100%", marginTop: 8, background: "transparent" }}
              onClick={() => {
                setStep(1);
                setError("");
                setInfo("");
              }}
            >
              Kirim ulang kode
            </button>
          </form>
        )}

        <p style={{ fontSize: 13, textAlign: "center", marginTop: 14, marginBottom: 0 }}>
          <a href="/admin/login" style={{ fontWeight: 600 }}>
            Kembali ke halaman masuk
          </a>
        </p>
      </div>
    </div>
  );
}
