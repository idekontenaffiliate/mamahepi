"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Pesanan" },
  { href: "/admin/products", label: "Produk" },
  { href: "/admin/coupons", label: "Kupon" },
  { href: "/admin/settings", label: "Pengaturan" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [who, setWho] = useState(null);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.loggedIn) setWho(d);
      })
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-header">
      <div className="admin-header-inner">
        <div className="admin-nav">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`admin-tab ${pathname === t.href ? "active" : ""}`}>
              {t.label}
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {who && (
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              {who.name} · {who.role === "administrator" ? "Administrator" : "Admin"}
            </span>
          )}
          {who?.role === "admin" && (
            <Link href="/admin/change-password" className="admin-tab" style={{ background: "transparent" }}>
              Ganti password
            </Link>
          )}
          <Link href="/" className="admin-tab" style={{ background: "transparent" }}>
            Lihat toko
          </Link>
          <button className="logout-btn" onClick={logout}>Keluar</button>
        </div>
      </div>
    </div>
  );
}
