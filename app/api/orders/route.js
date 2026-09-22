import { NextResponse } from "next/server";
import { getActiveProducts, getAllCoupons, appendOrder, getSettings } from "@/lib/sheets";
import { sendNewOrderEmail } from "@/lib/mailer";
import { sendOwnerWhatsAppNotification } from "@/lib/whatsapp";

function idr(n) {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

function waDigits(v) {
  v = String(v || "").replace(/[^0-9]/g, "");
  if (v.indexOf("0") === 0) v = "62" + v.slice(1);
  return v;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { customerName, phone, address, notes, cart, couponCode } = body;

    if (!customerName || !phone || !cart || typeof cart !== "object") {
      return NextResponse.json({ error: "Data pesanan tidak lengkap" }, { status: 400 });
    }

    // Ambil harga & produk terkini dari sheet, jangan percaya harga dari client.
    const [products, coupons, settings] = await Promise.all([
      getActiveProducts(),
      getAllCoupons(),
      getSettings(),
    ]);

    const items = [];
    let subtotal = 0;
    for (const [productId, qtyRaw] of Object.entries(cart)) {
      const qty = Number(qtyRaw) || 0;
      if (qty <= 0) continue;
      const p = products.find((x) => x.id === productId);
      if (!p) continue;
      const price = p.priceDiskon > 0 ? p.priceDiskon : p.priceNormal;
      items.push({ id: p.id, name: p.name, qty, price });
      subtotal += qty * price;
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Keranjang kosong atau produk tidak valid" }, { status: 400 });
    }

    let discount = 0;
    let appliedCouponCode = "";
    if (couponCode) {
      const c = coupons.find(
        (x) => x.code.toLowerCase() === String(couponCode).trim().toLowerCase() && x.active
      );
      if (c) {
        discount = Math.round((subtotal * c.percent) / 100);
        appliedCouponCode = c.code;
      }
    }

    const total = Math.max(0, subtotal - discount);
    const orderId = "ORD" + Date.now().toString(36).toUpperCase();
    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    const order = {
      timestamp,
      orderId,
      status: "Baru",
      customerName,
      phone,
      address: address || "",
      notes: notes || "",
      items,
      subtotal,
      discount,
      total,
      couponCode: appliedCouponCode,
    };

    // 1) Catat ke Google Sheets (jadi "Excel" toko, langsung bisa dibuka dari HP)
    await appendOrder(order);

    // 2) Kirim email notifikasi ke pemilik toko, kalau alamat email sudah diisi
    let emailResult = { skipped: true };
    try {
      emailResult = await sendNewOrderEmail({ to: settings.ownerEmail, order });
    } catch (emailErr) {
      // Order tetap sukses walau email gagal terkirim (misal SMTP belum diatur)
      emailResult = { skipped: true, reason: emailErr.message };
    }

    // 3) Kirim notifikasi WhatsApp OTOMATIS ke HP pemilik toko (opsional, lewat Fonnte)
    let waNotifResult = { skipped: true };
    try {
      waNotifResult = await sendOwnerWhatsAppNotification({
        ownerWaNumber: settings.ownerWaNumber,
        order,
      });
    } catch (waErr) {
      // Order tetap sukses walau notifikasi WA gagal terkirim
      waNotifResult = { skipped: true, reason: waErr.message };
    }

    // 4) Siapkan teks & link WhatsApp supaya pembeli bisa langsung konfirmasi manual
    let waLink = null;
    if (settings.waNumber) {
      const lines = [
        `Halo, saya mau konfirmasi pesanan ${orderId}`,
        ...items.map((it) => `- ${it.name} x${it.qty} = ${idr(it.price * it.qty)}`),
        discount > 0 ? `Diskon kupon ${appliedCouponCode}: -${idr(discount)}` : null,
        `Total: ${idr(total)}`,
        `Nama: ${customerName}`,
        `Alamat: ${address || "-"}`,
        notes ? `Catatan: ${notes}` : null,
      ].filter(Boolean);
      const text = encodeURIComponent(lines.join("\n"));
      waLink = `https://wa.me/${waDigits(settings.waNumber)}?text=${text}`;
    }

    return NextResponse.json({
      ok: true,
      orderId,
      total,
      waLink,
      emailSent: !emailResult.skipped,
      ownerWaNotified: !waNotifResult.skipped,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal membuat pesanan" }, { status: 500 });
  }
}
