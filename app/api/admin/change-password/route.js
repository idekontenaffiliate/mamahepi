import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  comparePassword,
  hashPassword,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth";
import { getAdminByEmail, updateAdminPasswordHash } from "@/lib/sheets";

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Belum login" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Akun administrator (pemilik toko) belum bisa ganti password lewat menu ini — ubah ADMIN_PASSWORD di .env.",
        },
        { status: 400 }
      );
    }

    const { oldPassword, newPassword } = await req.json();
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Password lama dan password baru wajib diisi" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
    }

    const admin = await getAdminByEmail(session.email);
    if (!admin) {
      return NextResponse.json({ error: "Akun admin tidak ditemukan" }, { status: 404 });
    }

    const ok = await comparePassword(oldPassword, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Password lama salah" }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await updateAdminPasswordHash(admin.email, newHash);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal mengganti password" }, { status: 500 });
  }
}
