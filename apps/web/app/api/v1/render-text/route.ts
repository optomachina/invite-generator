import { logger } from "@/lib/logger";
import { renderOverlay } from "@/lib/text-overlay/render";
import {
  DEFAULT_FONT_STACK,
  DEFAULT_LAYOUT,
  isFontStackId,
  isLayoutId,
  type OverlayFields,
} from "@/lib/text-overlay/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_FIELD_LEN = 200;

const FIELD_KEYS: Array<keyof OverlayFields> = [
  "honoree",
  "event",
  "date",
  "time",
  "location",
  "customLine",
];

function validateFields(raw: unknown): OverlayFields | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<OverlayFields> = {};
  for (const key of FIELD_KEYS) {
    const v = r[key];
    if (v === undefined || v === null || v === "") {
      out[key] = "";
      continue;
    }
    if (typeof v !== "string") return null;
    if (v.length > MAX_FIELD_LEN) return null;
    out[key] = v;
  }
  return out as OverlayFields;
}

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

  const fields = validateFields(b.fields);
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
