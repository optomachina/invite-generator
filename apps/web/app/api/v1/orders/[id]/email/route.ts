import { sendInviteEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { getOrderByIdAndToken } from "@/lib/orders";
import { manageUrlFor } from "@/lib/urls";

export const runtime = "nodejs";

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
  if (!order.finalImageB64) return fail(409, "not yet rendered");

  const overrideTo = typeof b.email === "string" ? b.email.trim() : "";
  const to = overrideTo || order.customerEmail;
  if (!to) return fail(400, "no email on file");

  try {
    await sendInviteEmail({
      to,
      honoree: order.fields.honoree,
      event: order.fields.event,
      pngB64: order.finalImageB64,
      manageUrl: manageUrlFor(order.id, order.accessToken),
    });
    return Response.json({ ok: true });
  } catch (err) {
    logger.error("invite.email_failed", { err, orderId: order.id });
    return fail(500, "email failed");
  }
}
