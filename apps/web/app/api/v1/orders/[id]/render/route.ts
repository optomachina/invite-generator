import { logger } from "@/lib/logger";
import {
  getOrderByIdAndToken,
  updateFieldsAndImage,
} from "@/lib/orders";
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

const MAX_FIELD_LEN = 200;
const FIELD_KEYS: Array<keyof OverlayFields> = [
  "honoree",
  "event",
  "date",
  "time",
  "location",
  "customLine",
];

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

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

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "invalid json");
  }
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const token = typeof b.token === "string" ? b.token : null;
  if (!id || !token) return fail(400, "missing id or token");

  const order = await getOrderByIdAndToken(id, token);
  if (!order) return fail(404, "not found");

  const fields = validateFields(b.fields);
  if (!fields) return fail(400, "invalid fields");

  const layout = isLayoutId(order.layout) ? order.layout : DEFAULT_LAYOUT;
  const fontStack = isFontStackId(order.fontStack)
    ? order.fontStack
    : DEFAULT_FONT_STACK;

  try {
    const result = await renderOverlay({
      imageB64: order.imageB64,
      layout,
      fontStack,
      fields,
    });
    await updateFieldsAndImage(order.id, fields, result.imageB64);
    return Response.json({ imageB64: result.imageB64 });
  } catch (err) {
    logger.error("invite.render_failed", { err, orderId: order.id });
    return fail(500, "render failed");
  }
}
