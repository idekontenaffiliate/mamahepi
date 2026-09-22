import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { clearAdminResetCode, getAdminByEmail, updateAdminPasswordHash } from "@/lib/sheets";

export async function POST(req) {
  try {
    const { email, code, newPassword } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanCode = String(code || "").trim();

    if (!cleanEmail || !cleanCode || !newPassword) {
      return NextResponse.json(
        { error: "Email, kode, dan password baru wajib diisi" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
    }

    const admin = await getAdminByEmail(cleanEmail);
    if (!admin || !admin.resetCode) {
      return NextResponse.json({ error: "Kode reset tidak valid" }, { status: 400 });
    }
    if (admin.resetCode !== cleanCode) {
      return NextResponse.json({ error: "Kode reset salah" }, { status: 400 });
    }
    if (!admin.resetCodeExpiry || new Date(admin.resetCodeExpiry).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Kode reset sudah kadaluarsa, minta kode baru" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await updateAdminPasswordHash(admin.email, newHash);
    await clearAdminResetCode(admin.email);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal mengatur ulang password" }, { status: 500 });
  }
}
