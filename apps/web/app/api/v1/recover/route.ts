import { sendRecoveryEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { getOrdersByEmail } from "@/lib/orders";
import { manageUrlFor } from "@/lib/urls";

export const runtime = "nodejs";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RX.test(email) || email.length > 200) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }

  try {
    const orders = await getOrdersByEmail(email);
    if (orders.length > 0) {
      await sendRecoveryEmail({
        to: email,
        links: orders.map((o) => ({
          honoree: o.fields.honoree,
          event: o.fields.event,
          manageUrl: manageUrlFor(o.id, o.accessToken),
        })),
      });
    }
  } catch (err) {
    logger.error("recover.failed", { err });
    // Fall through — return the same neutral response so we don't leak signal.
  }

  // Constant response: never reveal whether the email matched.
  return Response.json({ ok: true });
}
