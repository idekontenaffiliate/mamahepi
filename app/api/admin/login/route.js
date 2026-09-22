import { NextResponse } from "next/server";
import {
  checkAdministratorCredentials,
  comparePassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { getAdminByEmail } from "@/lib/sheets";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    let payload = null;

    // 1) Coba sebagai "administrator" (pemilik toko, dari .env)
    if (checkAdministratorCredentials(email, password)) {
      payload = { email, role: "administrator", name: "Administrator" };
    } else {
      // 2) Coba sebagai "admin" yang mendaftar sendiri (dari Google Sheets)
      const admin = await getAdminByEmail(email);
      if (admin && admin.active !== false) {
        const ok = await comparePassword(password, admin.passwordHash);
        if (ok) {
          payload = { id: admin.id, email: admin.email, role: "admin", name: admin.name };
        }
      }
    }

    if (!payload) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const token = await createSessionToken(payload);
    const res = NextResponse.json({ ok: true, role: payload.role, name: payload.name });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal login" }, { status: 500 });
  }
}
