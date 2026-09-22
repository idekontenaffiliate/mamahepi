import { NextResponse } from "next/server";
import { getAllOrders, getAllProducts, getAllVisits } from "@/lib/sheets";

export const dynamic = "force-dynamic";

function dayKey(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function last14Days() {
  const days = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
}

export async function GET() {
  try {
    const [orders, products, visits] = await Promise.all([
      getAllOrders(),
      getAllProducts(),
      getAllVisits(),
    ]);

    const days = last14Days();
    const todayKey = days[days.length - 1];

    // ---- Transaksi & omzet ----
    const statusCount = { Baru: 0, Diproses: 0, Selesai: 0, Batal: 0 };
    let revenueCompleted = 0;
    let revenueGross = 0;
    const ordersByDay = Object.fromEntries(days.map((d) => [d, 0]));
    const revenueByDay = Object.fromEntries(days.map((d) => [d, 0]));

    orders.forEach((o) => {
      if (statusCount[o.status] !== undefined) statusCount[o.status]++;
      if (o.status !== "Batal") revenueGross += o.total || 0;
      if (o.status === "Selesai") revenueCompleted += o.total || 0;

      const key = (o.timestamp || "").slice(0, 10);
      if (key in ordersByDay) {
        ordersByDay[key]++;
        if (o.status !== "Batal") revenueByDay[key] += o.total || 0;
      }
    });

    const totalOrders = orders.length;
    const ordersToday = ordersByDay[todayKey] || 0;
    const avgOrderValue = totalOrders ? Math.round(revenueGross / totalOrders) : 0;

    // ---- Produk terlaris (dihitung dari isi pesanan asli, bukan field manual) ----
    const soldMap = new Map(); // name -> { name, qty, revenue }
    orders.forEach((o) => {
      if (o.status === "Batal") return;
      (o.items || []).forEach((it) => {
        const key = it.name || "Produk";
        const entry = soldMap.get(key) || { name: key, qty: 0, revenue: 0 };
        entry.qty += Number(it.qty || 0);
        entry.revenue += Number(it.qty || 0) * Number(it.price || 0);
        soldMap.set(key, entry);
      });
    });
    const popularProducts = [...soldMap.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    const activeProductCount = products.filter((p) => p.active !== false).length;
    const outOfIdeas = products.length === 0;

    // ---- Pengunjung ----
    const visitsByDay = Object.fromEntries(days.map((d) => [d, 0]));
    visits.forEach((v) => {
      const key = (v.timestamp || "").slice(0, 10);
      if (key in visitsByDay) visitsByDay[key]++;
    });
    const totalVisits = visits.length;
    const visitsToday = visitsByDay[todayKey] || 0;
    const visitsLast7 = days.slice(7).reduce((s, d) => s + visitsByDay[d], 0);
    const ordersLast7 = days.slice(7).reduce((s, d) => s + ordersByDay[d], 0);
    const conversionRate = visitsLast7 ? Math.round((ordersLast7 / visitsLast7) * 1000) / 10 : null;

    return NextResponse.json({
      summary: {
        totalOrders,
        ordersToday,
        revenueGross,
        revenueCompleted,
        avgOrderValue,
        totalVisits,
        visitsToday,
        conversionRate,
        activeProductCount,
        hasProducts: !outOfIdeas,
        hasVisitData: visits.length > 0,
      },
      statusCount,
      popularProducts,
      chart: {
        days,
        orders: days.map((d) => ordersByDay[d]),
        revenue: days.map((d) => revenueByDay[d]),
        visits: days.map((d) => visitsByDay[d]),
      },
      recentOrders: orders.slice(0, 6),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
