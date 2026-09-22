import { NextResponse } from "next/server";
import { getAllProducts, saveAllProducts } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { products } = await req.json();
    if (!Array.isArray(products)) {
      return NextResponse.json({ error: "Format produk tidak valid" }, { status: 400 });
    }
    // beri id otomatis untuk produk baru yang belum punya id
    const withIds = products.map((p, i) => ({
      ...p,
      id: p.id && String(p.id).trim() ? p.id : `p${Date.now()}${i}`,
    }));
    const saved = await saveAllProducts(withIds);
    return NextResponse.json({ products: saved });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
