import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const saved = await saveSettings(body);
    return NextResponse.json({ settings: saved });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
