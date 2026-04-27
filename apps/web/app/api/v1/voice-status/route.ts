import { NextResponse } from "next/server";
import { getVoiceStatus } from "@/lib/voice-gate";

export const runtime = "nodejs";

export async function GET() {
  const status = await getVoiceStatus();
  return NextResponse.json(
    { enabled: status.enabled, reason: status.reason },
    { headers: { "cache-control": "no-store" } },
  );
}
