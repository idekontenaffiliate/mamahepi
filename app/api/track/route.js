import { NextResponse } from "next/server";
import { logVisit } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { path } = await req.json().catch(() => ({}));
    // fire-and-forget dari sisi pemanggil; kalau gagal, tetap balas ok
    // supaya tidak pernah mengganggu pengalaman pengunjung toko.
    await logVisit(path || "/");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
