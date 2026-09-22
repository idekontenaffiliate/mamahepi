import { NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getActiveProducts();
    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
