import OpenAI from "openai";
import { estimateCostUsd, type Settings } from "@/lib/pricing";
import { buildPrompt, validateIntake, validateSettings } from "@/lib/intake";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

const VARIANT_COUNT = 3;
const PER_VARIANT_TIMEOUT_MS = 290_000;

type StreamWriter = (event: string, data: Record<string, unknown>) => void;
type VariantResult =
  | {
      status: "ready";
      attempt: number;
      b64_json: string;
      ms: number;
      costUsd: number;
    }
  | {
      status: "error";
      attempt: number;
      error: string;
      ms: number;
    };

function serializeSseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function generateVariant({
  attempt,
  openai,
  prompt,
  settings,
  signal,
}: {
  attempt: number;
  openai: OpenAI;
  prompt: string;
  settings: Settings;
  signal: AbortSignal;
}): Promise<VariantResult> {
  const variantStart = Date.now();
  try {
    const result = await openai.images.generate(
      {
        model: settings.model,
        prompt,
        n: 1,
        size: settings.size,
        quality: settings.quality,
      },
      {
        signal: AbortSignal.any([AbortSignal.timeout(PER_VARIANT_TIMEOUT_MS), signal]),
      },
    );

    const b64_json = result.data?.[0]?.b64_json;
    if (typeof b64_json !== "string" || b64_json.length === 0) {
      throw new Error("openai returned no image bytes");
    }

    return {
      status: "ready",
      attempt,
      b64_json,
      ms: Date.now() - variantStart,
      costUsd: estimateCostUsd(settings),
    };
  } catch (err) {
    if (signal.aborted) {
      throw err;
    }

    return {
      status: "error",
      attempt,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - variantStart,
    };
  }
}

async function streamVariantSession({
  openai,
  prompt,
  settings,
  signal,
  sessionId,
  write,
  close,
}: {
  openai: OpenAI;
  prompt: string;
  settings: Settings;
  signal: AbortSignal;
  sessionId: string;
  write: StreamWriter;
  close: () => void;
}) {
  const sessionStart = Date.now();
  let completedCount = 0;
  let failedCount = 0;
  let totalCostUsd = 0;
  let nextIndex = 0;

  const handleVariant = (variant: VariantResult) => {
    // `index` is assigned when each variant completes, while `attempt` tracks
    // launch order, so the first-ready card lands on top of the swipe stack.
    const index = nextIndex++;

    if (variant.status === "ready") {
      completedCount += 1;
      totalCostUsd += variant.costUsd;

      logger.info("generate.variant_ready", {
        sessionId,
        attempt: variant.attempt,
        index,
        ms: variant.ms,
        costUsd: variant.costUsd,
        settings,
      });
      write("variant_ready", {
        sessionId,
        index,
        ms: variant.ms,
        costUsd: variant.costUsd,
        b64_json: variant.b64_json,
      });
      return;
    }

    failedCount += 1;
    logger.error("generate.variant_failed", {
      sessionId,
      attempt: variant.attempt,
      index,
      ms: variant.ms,
      settings,
      err: variant.error,
    });
    write("variant_failed", {
      sessionId,
      index,
      ms: variant.ms,
      error: variant.error,
    });
  };

  const tasks = Array.from({ length: VARIANT_COUNT }, (_, attempt) =>
    generateVariant({
      attempt,
      openai,
      prompt,
      settings,
      signal,
    }).then((variant) => {
      if (signal.aborted) return;
      handleVariant(variant);
    }),
  );

  await Promise.allSettled(tasks);
  if (signal.aborted) return;

  const totalMs = Date.now() - sessionStart;
  logger.info("generate.session_cost", {
    sessionId,
    variantCount: VARIANT_COUNT,
    totalMs,
    totalCostUsd,
    completedCount,
    failedCount,
  });
  write("session_cost", {
    sessionId,
    variantCount: VARIANT_COUNT,
    totalMs,
    totalCostUsd,
    completedCount,
    failedCount,
    prompt,
    settings,
  });
  write("done", { sessionId });
  close();
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error("generate.missing_api_key");
    return new Response(
      serializeSseEvent("fatal", { error: "OPENAI_API_KEY not set in apps/web/.env.local" }),
      {
        status: 500,
        headers: {
          "cache-control": "no-cache, no-transform",
          "content-type": "text/event-stream; charset=utf-8",
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    logger.warn("generate.invalid_json", { err });
    return new Response(
      serializeSseEvent("fatal", { error: "invalid json body" }),
      {
        status: 400,
        headers: {
          "cache-control": "no-cache, no-transform",
          "content-type": "text/event-stream; charset=utf-8",
        },
      },
    );
  }

  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const intake = validateIntake(b.intake ?? body);
  if (!intake) {
    logger.warn("generate.invalid_intake");
    return new Response(
      serializeSseEvent("fatal", {
        error: "invalid intake: requires non-empty honoree, event, date, time, location, vibe",
      }),
      {
        status: 400,
        headers: {
          "cache-control": "no-cache, no-transform",
          "content-type": "text/event-stream; charset=utf-8",
        },
      },
    );
  }

  const settings = { ...validateSettings(b.settings), n: VARIANT_COUNT };
  const singleVariantSettings = { ...settings, n: 1 };
  const prompt = buildPrompt(intake);
  const openai = new OpenAI({ apiKey });
  const sessionId = crypto.randomUUID();
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        let closed = false;

        const write: StreamWriter = (event, data) => {
          if (closed || req.signal.aborted) return;
          try {
            controller.enqueue(encoder.encode(serializeSseEvent(event, data)));
          } catch (err) {
            logger.error("generate.stream_write_failed", { sessionId, event, err });
          }
        };

        const close = () => {
          if (closed) return;
          closed = true;
          controller.close();
        };

        const onAbort = () => {
          logger.warn("generate.stream_abandoned", { sessionId, settings });
          close();
        };

        req.signal.addEventListener("abort", onAbort, { once: true });

        void streamVariantSession({
          openai,
          prompt,
          settings: singleVariantSettings,
          signal: req.signal,
          sessionId,
          write,
          close,
        })
          .catch((err) => {
            logger.error("generate.stream_failed", { sessionId, err, settings });
            write("fatal", {
              sessionId,
              error: "stream failed before all variants completed",
            });
            close();
          })
          .finally(() => {
            req.signal.removeEventListener("abort", onAbort);
          });
      },
      cancel() {
        logger.warn("generate.stream_cancelled", { sessionId, settings });
      },
    }),
    {
      headers: {
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8",
        "x-accel-buffering": "no",
      },
    },
  );
}
