import { NextResponse } from "next/server";
import { createSessionToken, hashPassword, SESSION_COOKIE_NAME } from "@/lib/auth";
import { addAdmin, getAdminByEmail } from "@/lib/sheets";

const GENDER_VALUES = ["male", "female", "rather_not_say"];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export async function POST(req) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    const birthDate = String(body.birthDate || "").trim();
    const gender = String(body.gender || "").trim();

    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { error: "Nama, email, password, dan nomor telepon wajib diisi" },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }
    if (gender && !GENDER_VALUES.includes(gender)) {
      return NextResponse.json({ error: "Jenis kelamin tidak valid" }, { status: 400 });
    }

    // Email pemilik toko (administrator) tidak boleh dipakai daftar sebagai admin biasa.
    if (process.env.ADMIN_EMAIL && email === String(process.env.ADMIN_EMAIL).toLowerCase()) {
      return NextResponse.json({ error: "Email ini sudah terpakai" }, { status: 409 });
    }

    const existing = await getAdminByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar, silakan masuk" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Tidak ada proses verifikasi OTP/SMS terpisah — begitu nomor telepon
    // diisi saat daftar, langsung dianggap valid.
    const admin = {
      id: `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      email,
      passwordHash,
      phone,
      phoneVerified: Boolean(phone),
      birthDate,
      gender,
      createdAt: new Date().toISOString(),
      active: true,
    };

    await addAdmin(admin);

    // Langsung login setelah daftar.
    const token = await createSessionToken({
      id: admin.id,
      email: admin.email,
      role: "admin",
      name: admin.name,
    });
    const res = NextResponse.json({ ok: true, role: "admin", name: admin.name });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal mendaftar" }, { status: 500 });
  }
}
