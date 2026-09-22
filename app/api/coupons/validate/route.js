import { NextResponse } from "next/server";
import { getAllCoupons } from "@/lib/sheets";

export async function POST(req) {
  try {
    const { code } = await req.json();
    const coupons = await getAllCoupons();
    const found = coupons.find(
      (c) => c.code.toLowerCase() === String(code || "").trim().toLowerCase() && c.active
    );
    if (!found) {
      return NextResponse.json({ valid: false, message: "Kode kupon tidak valid" });
    }
    return NextResponse.json({ valid: true, percent: found.percent });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
