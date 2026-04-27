import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getVoiceStatus } from "@/lib/voice-gate";

export const runtime = "nodejs";

// Stub. Real Whisper-or-equivalent transcription is tracked as a follow-up
// in TODOS.md. What ships here is the gate: when voice is disabled (env flag
// off OR rolling 24h spend has crossed the kill threshold), return 503 so
// the client falls back to text-only intake silently. When enabled, return
// 501 because the transcribe pipeline itself is not implemented yet.
export async function POST() {
  const status = await getVoiceStatus();
  if (!status.enabled) {
    logger.info("transcribe.gated", { reason: status.reason });
    return NextResponse.json(
      { error: "voice_disabled", reason: status.reason },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: "not_implemented" },
    { status: 501 },
  );
}
