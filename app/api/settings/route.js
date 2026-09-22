import { NextResponse } from "next/server";
import { getSettings } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    // ownerEmail & ownerWaNumber tidak perlu dikirim ke publik
    const { ownerEmail, ownerWaNumber, ...publicSettings } = settings;
    return NextResponse.json({ settings: publicSettings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
