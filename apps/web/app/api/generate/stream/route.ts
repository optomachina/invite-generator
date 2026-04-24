import OpenAI from "openai";
import { estimateCostUsd } from "@/lib/pricing";
import { buildPrompt, validateIntake, validateSettings } from "@/lib/intake";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

const VARIANT_COUNT = 3;
const PER_VARIANT_TIMEOUT_MS = 290_000;

type StreamWriter = (event: string, data: Record<string, unknown>) => void;

function serializeSseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
        let nextIndex = 0;

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

        void (async () => {
          const sessionStart = Date.now();
          let completedCount = 0;
          let failedCount = 0;
          let totalCostUsd = 0;

          const tasks = Array.from({ length: VARIANT_COUNT }, (_, attempt) =>
            (async () => {
              const variantStart = Date.now();
              try {
                const result = await openai.images.generate(
                  {
                    model: singleVariantSettings.model,
                    prompt,
                    n: 1,
                    size: singleVariantSettings.size,
                    quality: singleVariantSettings.quality,
                  },
                  {
                    signal: AbortSignal.any([
                      AbortSignal.timeout(PER_VARIANT_TIMEOUT_MS),
                      req.signal,
                    ]),
                  },
                );

                const b64_json = result.data?.[0]?.b64_json;
                if (typeof b64_json !== "string" || b64_json.length === 0) {
                  throw new Error("openai returned no image bytes");
                }

                const index = nextIndex++;
                const ms = Date.now() - variantStart;
                const costUsd = estimateCostUsd(singleVariantSettings);
                completedCount += 1;
                totalCostUsd += costUsd;

                logger.info("generate.variant_ready", {
                  sessionId,
                  attempt,
                  index,
                  ms,
                  costUsd,
                  settings: singleVariantSettings,
                });
                write("variant_ready", { sessionId, index, ms, costUsd, b64_json });
              } catch (err) {
                if (req.signal.aborted) return;

                const index = nextIndex++;
                const ms = Date.now() - variantStart;
                const detail = err instanceof Error ? err.message : String(err);
                failedCount += 1;

                logger.error("generate.variant_failed", {
                  sessionId,
                  attempt,
                  index,
                  ms,
                  settings: singleVariantSettings,
                  err,
                });
                write("variant_failed", { sessionId, index, ms, error: detail });
              }
            })(),
          );

          await Promise.allSettled(tasks);
          if (req.signal.aborted) return;

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
        })()
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
