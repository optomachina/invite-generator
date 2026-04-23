import { NextResponse } from "next/server";
import OpenAI from "openai";
import { estimateCostUsd } from "@/lib/pricing";
import { buildPrompt, validateIntake, validateSettings } from "@/lib/intake";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
// High-quality 1024x1536 generations regularly run 60-180s. Vercel Pro
// allows up to 800s; 300 leaves headroom without inviting runaway jobs.
export const maxDuration = 300;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error("generate.missing_api_key");
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set in apps/web/.env.local" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    logger.warn("generate.invalid_json", { err });
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const intake = validateIntake(b.intake ?? body);
  if (!intake) {
    logger.warn("generate.invalid_intake");
    return NextResponse.json(
      { error: "invalid intake: requires non-empty honoree, event, date, time, location, vibe" },
      { status: 400 },
    );
  }
  const settings = validateSettings(b.settings);

  const prompt = buildPrompt(intake);
  const openai = new OpenAI({ apiKey });

  const t0 = Date.now();
  try {
    const result = await openai.images.generate(
      {
        model: settings.model,
        prompt,
        n: settings.n,
        size: settings.size,
        quality: settings.quality,
      },
      { signal: AbortSignal.timeout(290_000) },
    );
    const ms = Date.now() - t0;

    const images = (result.data ?? [])
      .map((d) => d.b64_json)
      .filter((b): b is string => typeof b === "string" && b.length > 0)
      .map((b64_json) => ({ b64_json }));

    if (images.length !== settings.n) {
      logger.error("generate.partial_result", {
        requested: settings.n,
        received: images.length,
        ms,
        settings,
      });
      return NextResponse.json(
        { error: `openai returned ${images.length}/${settings.n} usable images` },
        { status: 502 },
      );
    }

    const costUsd = estimateCostUsd(settings);
    logger.info("generate.ok", { ms, costUsd, settings });
    return NextResponse.json({ images, prompt, ms, costUsd, settings });
  } catch (err) {
    const ms = Date.now() - t0;
    const message = err instanceof Error ? err.message : String(err);
    logger.error("generate.openai_failed", { err, ms, settings });
    return NextResponse.json(
      { error: "openai call failed", detail: message },
      { status: 502 },
    );
  }
}
