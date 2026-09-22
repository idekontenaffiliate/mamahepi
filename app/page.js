"use client";

import { useEffect, useMemo, useState } from "react";

function idr(n) {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

function useCountdown(timerEnd) {
  const [text, setText] = useState("--:--:--");
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!timerEnd) return;
    function tick() {
      const diff = new Date(timerEnd).getTime() - Date.now();
      if (diff <= 0) {
        setEnded(true);
        setText("00:00:00");
        return;
      }
      setEnded(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (n) => String(n).padStart(2, "0");
      setText(`${pad(h)}:${pad(m)}:${pad(s)}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerEnd]);

  return { text, ended };
}

export default function StorefrontPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // {code, percent}
  const [couponMsg, setCouponMsg] = useState({ text: "", ok: false });

  const [form, setForm] = useState({ customerName: "", phone: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null); // {orderId, total, waLink}

  const timer = useCountdown(settings?.timerEnd);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([p, s]) => {
        setProducts(p.products || []);
        setSettings(s.settings || {});
      })
      .finally(() => setLoading(false));
  }, []);

  // Catat kunjungan sekali per sesi browser (dipakai untuk dashboard admin).
  useEffect(() => {
    try {
      if (sessionStorage.getItem("mh_visited")) return;
      sessionStorage.setItem("mh_visited", "1");
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/" }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // sessionStorage tidak tersedia (mis. mode privat ketat) -> lewati saja
    }
  }, []);

  const { itemCount, subtotal } = useMemo(() => {
    let itemCount = 0;
    let subtotal = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const p = products.find((x) => x.id === id);
      if (!p || qty <= 0) return;
      itemCount += qty;
      subtotal += qty * (p.priceDiskon > 0 ? p.priceDiskon : p.priceNormal);
    });
    return { itemCount, subtotal };
  }, [cart, products]);

  const discount = appliedCoupon ? Math.round((subtotal * appliedCoupon.percent) / 100) : 0;
  const total = Math.max(0, subtotal - discount);

  const categories = useMemo(() => {
    const set = ["Semua"];
    products.forEach((p) => {
      const c = p.category || "Lainnya";
      if (!set.includes(c)) set.push(c);
    });
    return set;
  }, [products]);

  const shown = activeCategory === "Semua" ? products : products.filter((p) => (p.category || "Lainnya") === activeCategory);

  function changeQty(id, delta) {
    setCart((prev) => {
      const next = { ...prev };
      const qty = Math.max(0, (next[id] || 0) + delta);
      if (qty === 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponInput.trim() }),
    });
    const data = await res.json();
    if (data.valid) {
      setAppliedCoupon({ code: couponInput.trim().toUpperCase(), percent: data.percent });
      setCouponMsg({ text: `Kupon dipakai, diskon ${data.percent}%`, ok: true });
    } else {
      setAppliedCoupon(null);
      setCouponMsg({ text: data.message || "Kode kupon tidak valid", ok: false });
    }
  }

  async function submitOrder(e) {
    e.preventDefault();
    setSubmitError("");
    if (!form.customerName.trim() || !form.phone.trim()) {
      setSubmitError("Nama dan nomor HP wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cart,
          couponCode: appliedCoupon?.code || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat pesanan");
      setResult(data);
      setCart({});
      setAppliedCoupon(null);
      setCouponInput("");
      setCouponMsg({ text: "", ok: false });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function closeEverything() {
    setCartOpen(false);
    setCheckoutOpen(false);
    setResult(null);
    setSubmitError("");
  }

  if (loading) {
    return <div className="skeleton">Menyiapkan toko…</div>;
  }

  return (
    <>
      <header className="top">
        <div className="wrap top-row">
          <div>
            <h1 className="shopname">{settings.shopName}</h1>
            <p className="tagline">{settings.tagline}</p>
          </div>
          <a className="gear" href="/admin" title="Masuk admin">⚙️</a>
        </div>
      </header>

      <div className="wrap">
        {settings.timerEnd && (
          <div className={`ticket ${timer.ended ? "ended" : ""}`}>
            <div className="ticket-main">
              <div className="ticket-label">Promo hari ini</div>
              <div className="ticket-desc">Harga khusus untuk produk bertanda diskon, selama waktu tersisa.</div>
            </div>
            <div className="ticket-stub">
              <div className="ticket-time">{timer.text}</div>
              <div className="ticket-time-label">{timer.ended ? "promo berakhir" : "sisa waktu"}</div>
            </div>
          </div>
        )}

        <div className="section-head">
          <h2>Pilih produk</h2>
          <span className="count">{shown.length} produk</span>
        </div>

        {categories.length > 2 && (
          <div className="cat-tabs">
            {categories.map((c) => (
              <button
                key={c}
                className={`cat-tab ${c === activeCategory ? "active" : ""}`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="grid">
          {shown
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((p) => {
              const qty = cart[p.id] || 0;
              const hasDiscount = p.priceDiskon > 0 && p.priceDiskon < p.priceNormal;
              return (
                <div className="card" key={p.id}>
                  <div className="card-media" style={{ background: (p.color || "#C1571A") + "22" }}>
                    {p.bundle && <span className="bundle-flag">Paket hemat</span>}
                    {p.image ? (
                      <img className="card-photo" src={p.image} alt={p.name} />
                    ) : (
                      <span>{p.emoji || "🌶️"}</span>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="card-name">{p.name}</div>
                    {p.category && <div className="cat-chip">{p.category}</div>}
                    <div className="sold">Terjual {p.sold || 0}</div>
                    <div className="price-row">
                      {hasDiscount && <div className="price-was">{idr(p.priceNormal)}</div>}
                      <div className={`price-now ${hasDiscount ? "" : "no-discount"}`}>
                        {idr(hasDiscount ? p.priceDiskon : p.priceNormal)}
                      </div>
                    </div>
                    <div className="card-foot">
                      <div className="stepper">
                        <button onClick={() => changeQty(p.id, -1)}>−</button>
                        <span>{qty}</span>
                        <button onClick={() => changeQty(p.id, 1)}>+</button>
                      </div>
                      {qty === 0 && (
                        <button className="add-btn" onClick={() => changeQty(p.id, 1)}>
                          + Tambah
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <footer>{settings.shopName} · pesan mudah lewat WhatsApp</footer>

      <div className={`cartbar ${itemCount > 0 ? "show" : ""}`}>
        <div className="cartbar-inner">
          <div>
            <div className="cartbar-info">{itemCount} item dipilih</div>
            <div className="cartbar-total">{idr(total)}</div>
          </div>
          <button className="cartbar-btn" onClick={() => setCartOpen(true)}>
            Lihat keranjang
          </button>
        </div>
      </div>

      {/* -------- Sheet keranjang / checkout -------- */}
      <div className={`overlay ${cartOpen ? "show" : ""}`} onClick={(e) => e.target === e.currentTarget && closeEverything()}>
        <div className="sheet">
          {!checkoutOpen && !result && (
            <>
              <div className="sheet-head">
                <h2>Keranjang</h2>
                <button className="x-btn" onClick={closeEverything}>✕</button>
              </div>
              {Object.keys(cart).length === 0 ? (
                <div className="empty-cart">Keranjang masih kosong.<br />Pilih produk favoritmu dulu ya.</div>
              ) : (
                <>
                  {Object.keys(cart).map((id) => {
                    const p = products.find((x) => x.id === id);
                    if (!p) return null;
                    const qty = cart[id];
                    const price = p.priceDiskon > 0 ? p.priceDiskon : p.priceNormal;
                    return (
                      <div className="cart-line" key={id}>
                        <div className="cart-line-media" style={{ background: (p.color || "#C1571A") + "22" }}>
                          {p.image ? <img className="cart-photo" src={p.image} alt="" /> : p.emoji || "🌶️"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="cart-line-name">{p.name}</div>
                          <div className="cart-line-sub">{qty} × {idr(price)} = {idr(qty * price)}</div>
                          <button className="cart-line-remove" onClick={() => setCart((prev) => { const n = { ...prev }; delete n[id]; return n; })}>
                            Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="coupon-row">
                    <input
                      placeholder="Masukkan kode diskon"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                    />
                    <button onClick={applyCoupon}>Pakai</button>
                  </div>
                  {couponMsg.text && (
                    <div className={`coupon-note ${couponMsg.ok ? "ok" : "err"}`}>{couponMsg.text}</div>
                  )}

                  <div className="totals">
                    <div className="totals-row"><span>Subtotal</span><span>{idr(subtotal)}</span></div>
                    {discount > 0 && <div className="totals-row"><span>Diskon kupon</span><span>−{idr(discount)}</span></div>}
                    <div className="totals-row grand"><span>Total</span><span>{idr(total)}</span></div>
                  </div>

                  <button className="order-btn primary" onClick={() => setCheckoutOpen(true)}>
                    Lanjut ke data pemesan
                  </button>
                </>
              )}
            </>
          )}

          {checkoutOpen && !result && (
            <>
              <div className="sheet-head">
                <h2>Data pemesan</h2>
                <button className="x-btn" onClick={closeEverything}>✕</button>
              </div>
              <form onSubmit={submitOrder}>
                <div className="field">
                  <label>Nama</label>
                  <input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                </div>
                <div className="field">
                  <label>Nomor WhatsApp</label>
                  <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
                </div>
                <div className="field">
                  <label>Alamat</label>
                  <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="field">
                  <label>Catatan (opsional)</label>
                  <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="totals">
                  <div className="totals-row grand"><span>Total</span><span>{idr(total)}</span></div>
                </div>
                {submitError && <div className="error-msg">{submitError}</div>}
                <button className="order-btn primary" disabled={submitting}>
                  {submitting ? "Mengirim…" : "Buat pesanan"}
                </button>
                {(settings.bankName || settings.bankAccount) && (
                  <div className="pay-info">
                    <b>Info pembayaran</b>
                    {settings.bankName} {settings.bankAccount} a.n {settings.bankHolder}
                  </div>
                )}
              </form>
            </>
          )}

          {result && (
            <>
              <div className="sheet-head">
                <h2>Pesanan diterima 🎉</h2>
                <button className="x-btn" onClick={closeEverything}>✕</button>
              </div>
              <p>Nomor pesanan <b>{result.orderId}</b> sudah kami terima dan dicatat.</p>
              <div className="totals">
                <div className="totals-row grand"><span>Total</span><span>{idr(result.total)}</span></div>
              </div>
              {result.waLink && (
                <a className="order-btn wa" href={result.waLink} target="_blank" rel="noreferrer">
                  Konfirmasi via WhatsApp
                </a>
              )}
              {settings.lynkUrl && (
                <a className="order-btn lynk" href={settings.lynkUrl} target="_blank" rel="noreferrer">
                  Bayar dengan Lynk.id
                </a>
              )}
              <button className="order-btn" onClick={closeEverything} style={{ background: "transparent", border: "1px solid var(--line)" }}>
                Selesai
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
