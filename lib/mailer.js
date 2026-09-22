import nodemailer from "nodemailer";

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Konfigurasi SMTP belum lengkap. Cek SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS di .env"
    );
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function idr(n) {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

export async function sendNewOrderEmail({ to, order }) {
  if (!to) return { skipped: true, reason: "ownerEmail belum diisi di Pengaturan" };

  const itemsHtml = (order.items || [])
    .map(
      (it) =>
        `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${it.name}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${it.qty}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${idr(
          it.price * it.qty
        )}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#C1571A">Pesanan baru masuk 🎉</h2>
      <p>Order <b>${order.orderId}</b> · ${order.timestamp}</p>
      <p><b>${order.customerName}</b><br/>${order.phone}<br/>${order.address || "-"}</p>
      ${order.notes ? `<p><i>Catatan: ${order.notes}</i></p>` : ""}
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <thead><tr>
          <th style="text-align:left;padding:4px 8px;border-bottom:2px solid #ddd">Produk</th>
          <th style="text-align:center;padding:4px 8px;border-bottom:2px solid #ddd">Qty</th>
          <th style="text-align:right;padding:4px 8px;border-bottom:2px solid #ddd">Subtotal</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="text-align:right;font-size:18px;margin-top:10px">
        <b>Total: ${idr(order.total)}</b>
      </p>
      <p style="color:#888;font-size:12px">Detail lengkap & status pesanan bisa dicek di halaman admin.</p>
    </div>`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Mamahepi" <${process.env.SMTP_USER}>`,
    to,
    subject: `Pesanan baru ${order.orderId} - ${order.customerName}`,
    html,
  });
  return { skipped: false };
}

export async function sendAdminOtpEmail({ to, code, name }) {
  if (!to) return { skipped: true, reason: "email tujuan kosong" };

  const html = `
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
      <h2 style="color:#C1571A">Kode reset password</h2>
      <p>Halo${name ? ` ${name}` : ""}, gunakan kode berikut untuk mengatur ulang password akun admin Mamahepi kamu:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;text-align:center;background:#fff3e9;padding:14px;border-radius:10px">${code}</p>
      <p style="color:#888;font-size:12.5px">Kode ini berlaku 10 menit. Kalau kamu tidak meminta reset password, abaikan email ini.</p>
    </div>`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Mamahepi" <${process.env.SMTP_USER}>`,
    to,
    subject: `Kode reset password: ${code}`,
    html,
  });
  return { skipped: false };
}
