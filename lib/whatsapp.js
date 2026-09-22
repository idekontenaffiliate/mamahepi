// Notifikasi WhatsApp OTOMATIS ke pemilik toko lewat Fonnte (https://fonnte.com).
// Ini TERPISAH dari tombol "Konfirmasi via WhatsApp" yang dilihat pembeli (itu cuma
// link wa.me, gratis, tanpa API). Fitur di file ini mengirim WA dari sistem ke NOMOR
// PEMILIK TOKO setiap ada pesanan baru — sifatnya opsional & berbayar (token Fonnte).
//
// Kalau FONNTE_TOKEN tidak diisi di .env, fungsi ini otomatis dilewati (skip) tanpa
// bikin proses checkout gagal — jadi aman dibiarkan kosong kalau belum mau pakai.

function idr(n) {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

function waDigits(v) {
  v = String(v || "").replace(/[^0-9]/g, "");
  if (v.indexOf("0") === 0) v = "62" + v.slice(1);
  return v;
}

export async function sendOwnerWhatsAppNotification({ ownerWaNumber, order }) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return { skipped: true, reason: "FONNTE_TOKEN belum diset" };
  if (!ownerWaNumber) return { skipped: true, reason: "Nomor WA pemilik belum diisi di Pengaturan" };

  const lines = [
    `🔔 Pesanan baru ${order.orderId}`,
    `${order.customerName} · ${order.phone}`,
    ...order.items.map((it) => `- ${it.name} x${it.qty} = ${idr(it.price * it.qty)}`),
    order.discount > 0 ? `Diskon: -${idr(order.discount)}` : null,
    `Total: ${idr(order.total)}`,
    order.address ? `Alamat: ${order.address}` : null,
    order.notes ? `Catatan: ${order.notes}` : null,
    `Cek & proses di halaman admin.`,
  ].filter(Boolean);

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      target: waDigits(ownerWaNumber),
      message: lines.join("\n"),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fonnte gagal (${res.status}): ${text}`);
  }
  const data = await res.json().catch(() => ({}));
  return { skipped: false, data };
}
