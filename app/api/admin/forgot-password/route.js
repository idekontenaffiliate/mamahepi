import { NextResponse } from "next/server";
import { sendAdminOtpEmail } from "@/lib/mailer";
import { getAdminByEmail, setAdminResetCode } from "@/lib/sheets";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digit
}

export async function POST(req) {
  try {
    const { email } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    // Pesan sukses generik selalu sama, supaya orang tidak bisa menebak
    // email mana yang terdaftar sebagai admin.
    const genericOk = NextResponse.json({
      ok: true,
      message: "Kalau email terdaftar, kode reset sudah dikirim ke email tersebut.",
    });

    const admin = await getAdminByEmail(cleanEmail);
    if (!admin || admin.active === false) {
      return genericOk;
    }

    const code = generateOtp();
    const expiryISO = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 menit

    await setAdminResetCode(admin.email, code, expiryISO);
    await sendAdminOtpEmail({ to: admin.email, code, name: admin.name });

    return genericOk;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal mengirim kode reset" }, { status: 500 });
  }
}
