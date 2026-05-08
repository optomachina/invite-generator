import type Stripe from "stripe";

import { sendInviteEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import {
  getOrder,
  getOrderBySession,
  markFailed,
  markFulfilled,
  markPaid,
} from "@/lib/orders";
import { getStripe } from "@/lib/stripe";
import { renderOverlay } from "@/lib/text-overlay/render";
import { manageUrlFor } from "@/lib/urls";
import {
  DEFAULT_FONT_STACK,
  DEFAULT_LAYOUT,
  isFontStackId,
  isLayoutId,
} from "@/lib/text-overlay/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function extractEmail(session: Stripe.Checkout.Session): string | null {
  const direct = session.customer_details?.email ?? session.customer_email;
  return typeof direct === "string" && direct.length > 0 ? direct : null;
}

async function fulfill(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) {
    logger.error("stripe.webhook.order_missing", { orderId });
    return;
  }
  if (order.status === "fulfilled") return;
  if (!order.customerEmail) {
    logger.warn("stripe.webhook.no_email", { orderId });
    return;
  }

  try {
    const layout = isLayoutId(order.layout) ? order.layout : DEFAULT_LAYOUT;
    const fontStack = isFontStackId(order.fontStack)
      ? order.fontStack
      : DEFAULT_FONT_STACK;

    const result = await renderOverlay({
      imageB64: order.imageB64,
      layout,
      fontStack,
      fields: order.fields,
    });

    await sendInviteEmail({
      to: order.customerEmail,
      honoree: order.fields.honoree,
      event: order.fields.event,
      pngB64: result.imageB64,
      manageUrl: manageUrlFor(order.id, order.accessToken),
    });

    await markFulfilled(orderId, result.imageB64);
    logger.info("stripe.webhook.fulfilled", { orderId });
  } catch (err) {
    logger.error("stripe.webhook.fulfill_failed", { err, orderId });
    await markFailed(orderId);
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("stripe.webhook.missing_secret");
    return new Response("misconfigured", { status: 500 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(raw, sig, secret);
  } catch (err) {
    logger.warn("stripe.webhook.bad_signature", { err });
    return new Response("bad signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId =
    (session.client_reference_id as string | null) ??
    (session.metadata?.orderId as string | undefined) ??
    null;

  let resolvedOrderId = orderId;
  if (!resolvedOrderId) {
    const order = await getOrderBySession(session.id);
    resolvedOrderId = order?.id ?? null;
  }
  if (!resolvedOrderId) {
    logger.error("stripe.webhook.unresolved_order", { sessionId: session.id });
    return new Response("unresolved order", { status: 200 });
  }

  const claimed = await markPaid(resolvedOrderId, {
    eventId: event.id,
    customerEmail: extractEmail(session),
  });

  if (!claimed) {
    const existing = await getOrder(resolvedOrderId);
    if (
      existing &&
      existing.stripeEventId === event.id &&
      existing.status !== "fulfilled"
    ) {
      logger.info("stripe.webhook.retry_fulfill", {
        orderId: resolvedOrderId,
        eventId: event.id,
        status: existing.status,
      });
      await fulfill(resolvedOrderId);
    } else {
      logger.info("stripe.webhook.already_processed", {
        orderId: resolvedOrderId,
        eventId: event.id,
      });
    }
    return Response.json({ received: true });
  }

  await fulfill(resolvedOrderId);
  return Response.json({ received: true });
}
