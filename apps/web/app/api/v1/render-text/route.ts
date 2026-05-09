import { logger } from "@/lib/logger";
import { validateOrderFields } from "@/lib/order-fields";
import { renderOverlay } from "@/lib/text-overlay/render";
import {
  DEFAULT_FONT_STACK,
  DEFAULT_LAYOUT,
  isFontStackId,
  isLayoutId,
} from "@/lib/text-overlay/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    logger.warn("render_text.invalid_json", { err });
    return fail(400, "invalid json body");
  }

  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const imageB64 = b.imageB64;
  if (typeof imageB64 !== "string" || imageB64.length === 0) {
    return fail(400, "imageB64 required");
  }
  const approxBytes = Math.floor((imageB64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return fail(413, "image too large");
  }

  const layout = isLayoutId(b.layout) ? b.layout : DEFAULT_LAYOUT;
  const fontStack = isFontStackId(b.fontStack) ? b.fontStack : DEFAULT_FONT_STACK;

  const fields = validateOrderFields(b.fields);
  if (!fields) {
    return fail(400, "invalid fields");
  }

  const start = Date.now();
  try {
    const result = await renderOverlay({ imageB64, layout, fontStack, fields });
    const ms = Date.now() - start;
    logger.info("render_text.ok", { ms, layout, fontStack });
    return Response.json({
      imageB64: result.imageB64,
      ms,
      layout,
      fontStack,
    });
  } catch (err) {
    logger.error("render_text.failed", {
      err: err instanceof Error ? err.message : String(err),
      layout,
      fontStack,
    });
    return fail(500, "render failed");
  }
}
