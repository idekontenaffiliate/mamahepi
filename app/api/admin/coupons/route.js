import { NextResponse } from "next/server";
import { getAllCoupons, saveAllCoupons } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const coupons = await getAllCoupons();
    return NextResponse.json({ coupons });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { coupons } = await req.json();
    if (!Array.isArray(coupons)) {
      return NextResponse.json({ error: "Format kupon tidak valid" }, { status: 400 });
    }
    const saved = await saveAllCoupons(coupons);
    return NextResponse.json({ coupons: saved });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
