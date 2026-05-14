import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildPromptFromDescription } from "@/lib/generatePrompt";
import { buildPrompt, validateIntake, validateSettings, type Intake } from "@/lib/intake";
import { logger } from "@/lib/logger";
import { estimateCostUsd } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 300;

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
};

function validateRawPrompt(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const prompt = raw.trim();
  return prompt.length > 0 ? prompt : null;
}

function requestId(): string {
  return randomUUID();
}

function errorResponse(status: number, error: string, detail: string | undefined, id: string) {
  return NextResponse.json(
    { error, detail, requestId: id },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const id = requestId();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error("generate.missing_api_key", { requestId: id });
    return errorResponse(500, "Invite generation is not configured.", undefined, id);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    logger.warn("generate.invalid_json", { err, requestId: id });
    return errorResponse(400, "Tell us about the event before sketching.", undefined, id);
  }

  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const rawPrompt = validateRawPrompt(b.prompt);
  const intake = validateIntake(b.intake ?? body);
  if (!rawPrompt && !intake) {
    logger.warn("generate.invalid_request", { requestId: id });
    return errorResponse(400, "Tell us about the event before sketching.", undefined, id);
  }
  const settings = validateSettings(b.settings);

  const prompt = rawPrompt ? buildPromptFromDescription(rawPrompt) : buildPrompt(intake as Intake);

  const t0 = Date.now();
  try {
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: settings.model,
          prompt,
          n: settings.n,
          size: settings.size,
          quality: settings.quality,
        }),
        signal: AbortSignal.timeout(290_000),
      },
    );
    const ms = Date.now() - t0;
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 1000)}`);
    }

    const result = await response.json() as OpenAIImageResponse;

    const images = (result.data ?? [])
      .map((d) => d.b64_json)
      .filter((b): b is string => typeof b === "string" && b.length > 0)
      .map((b64_json) => ({ b64_json }));

    if (images.length !== settings.n) {
      logger.error("generate.partial_result", {
        requestId: id,
        requested: settings.n,
        received: images.length,
        ms,
        settings,
      });
      return errorResponse(
        502,
        "The invite service did not return an image.",
        `OpenAI returned ${images.length}/${settings.n} usable images.`,
        id,
      );
    }

    const costUsd = estimateCostUsd(settings);
    logger.info("generate.ok", { requestId: id, ms, costUsd, settings });
    return NextResponse.json(
      { images, prompt, ms, costUsd, settings },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const ms = Date.now() - t0;
    const message = err instanceof Error ? err.message : String(err);
    logger.error("generate.openai_failed", { err, requestId: id, ms, settings });
    return errorResponse(502, "Invite generation failed.", message, id);
  }
}
