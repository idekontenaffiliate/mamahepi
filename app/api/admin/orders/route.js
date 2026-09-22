import { NextResponse } from "next/server";
import { getAllOrders, updateOrderStatus } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orders = await getAllOrders();
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { orderId, status } = await req.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId dan status wajib diisi" }, { status: 400 });
    }
    await updateOrderStatus(orderId, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
