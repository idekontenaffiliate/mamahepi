import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "mamahepi_admin_session";

async function isValidSession(token) {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "");
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // Halaman login & daftar admin tetap boleh diakses tanpa session
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/register" ||
    pathname === "/admin/forgot-password"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const valid = await isValidSession(token);
    if (!valid) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // Endpoint admin yang boleh dipanggil tanpa session (login, daftar,
  // keluar, dan cek status sesi sendiri)
  const PUBLIC_ADMIN_API = [
    "/api/admin/login",
    "/api/admin/register",
    "/api/admin/logout",
    "/api/admin/session",
    "/api/admin/forgot-password",
    "/api/admin/reset-password",
  ];

  // Lindungi juga API admin (selain di atas) dengan cara yang sama
  if (pathname.startsWith("/api/admin") && !PUBLIC_ADMIN_API.includes(pathname)) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const valid = await isValidSession(token);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
