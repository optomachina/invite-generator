import { logger } from "@/lib/logger";
import { validateOrderFields } from "@/lib/order-fields";
import { createOrder, attachStripeSession } from "@/lib/orders";
import { getStripe, PRICE_USD_CENTS } from "@/lib/stripe";
import {
  DEFAULT_FONT_STACK,
  DEFAULT_LAYOUT,
  isFontStackId,
  isLayoutId,
} from "@/lib/text-overlay/types";
import { appOrigin } from "@/lib/urls";

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
  } catch {
    return fail(400, "invalid json");
  }

  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const winnerCard = b.winnerCard as Record<string, unknown> | undefined;
  if (!winnerCard) return fail(400, "winnerCard required");

  const imageB64 = winnerCard.imageB64;
  if (typeof imageB64 !== "string" || imageB64.length === 0) {
    return fail(400, "winnerCard.imageB64 required");
  }
  if (Math.floor((imageB64.length * 3) / 4) > MAX_IMAGE_BYTES) {
    return fail(413, "image too large");
  }

  const winnerIndexRaw = winnerCard.index;
  const winnerIndex =
    typeof winnerIndexRaw === "number" && Number.isFinite(winnerIndexRaw)
      ? winnerIndexRaw
      : 0;

  const layout = isLayoutId(winnerCard.layout) ? winnerCard.layout : DEFAULT_LAYOUT;
  const fontStack = isFontStackId(winnerCard.fontStack)
    ? winnerCard.fontStack
    : DEFAULT_FONT_STACK;

  const fields = validateOrderFields(b.fields);
  if (!fields) return fail(400, "invalid fields");

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    logger.error("checkout.missing_price_id");
    return fail(500, "checkout misconfigured");
  }

  let order: Awaited<ReturnType<typeof createOrder>>;
  try {
    order = await createOrder({
      winnerIndex,
      fields,
      imageB64,
      layout,
      fontStack,
    });
  } catch (err) {
    logger.error("checkout.create_order_failed", { err });
    return fail(500, "could not create order");
  }

  const origin = appOrigin();
  const successUrl = new URL("/paid", `${origin}/`);
  successUrl.searchParams.set("orderId", order.id);
  successUrl.searchParams.set("token", order.accessToken);

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      success_url: successUrl.toString(),
      cancel_url: `${origin}/?checkout=canceled`,
      payment_intent_data: {
        metadata: { orderId: order.id },
      },
      automatic_tax: { enabled: false },
    });

    if (!session.url) {
      logger.error("checkout.no_session_url", { orderId: order.id });
      return fail(500, "stripe returned no checkout url");
    }

    await attachStripeSession(order.id, {
      sessionId: session.id,
      checkoutUrl: session.url,
    });

    logger.info("checkout.created", {
      orderId: order.id,
      sessionId: session.id,
      pricedAt: PRICE_USD_CENTS,
    });

    return Response.json({ orderId: order.id });
  } catch (err) {
    logger.error("checkout.stripe_failed", {
      err,
      orderId: order.id,
    });
    return fail(502, "stripe error");
  }
}
