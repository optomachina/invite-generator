import { logger } from "@/lib/logger";
import { validateOrderFields } from "@/lib/order-fields";
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
} from "@/lib/text-overlay/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
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

  const fields = validateOrderFields(b.fields);
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
