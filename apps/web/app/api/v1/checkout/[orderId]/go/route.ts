import { logger } from "@/lib/logger";
import { getOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RX = /^[0-9a-f-]{36}$/i;
const STRIPE_CHECKOUT_PREFIX = "https://checkout.stripe.com/";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await ctx.params;
  if (!orderId || !UUID_RX.test(orderId)) {
    return new Response("invalid order id", { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) return new Response("not found", { status: 404 });
  if (!order.stripeCheckoutUrl) {
    logger.error("checkout.go.missing_url", { orderId });
    return new Response("checkout not ready", { status: 409 });
  }

  if (!order.stripeCheckoutUrl.startsWith(STRIPE_CHECKOUT_PREFIX)) {
    logger.error("checkout.go.unexpected_host", {
      orderId,
      url: order.stripeCheckoutUrl,
    });
    return new Response("invalid checkout url", { status: 500 });
  }

  return Response.redirect(order.stripeCheckoutUrl, 303);
}
