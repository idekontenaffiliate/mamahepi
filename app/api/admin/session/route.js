import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  if (!payload) return NextResponse.json({ loggedIn: false });
  return NextResponse.json({
    loggedIn: true,
    email: payload.email,
    role: payload.role || "administrator",
    name: payload.name || payload.email,
  });
}
