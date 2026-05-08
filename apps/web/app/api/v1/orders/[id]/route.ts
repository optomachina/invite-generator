import { getOrderByIdAndToken } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("token");
  if (!id || !token) {
    return Response.json({ error: "missing id or token" }, { status: 400 });
  }

  const order = await getOrderByIdAndToken(id, token);
  if (!order) return Response.json({ error: "not found" }, { status: 404 });

  if (order.status !== "fulfilled") {
    return Response.json({
      id: order.id,
      status: order.status,
      fields: order.fields,
      finalImageB64: null,
    });
  }

  return Response.json({
    id: order.id,
    status: order.status,
    fields: order.fields,
    finalImageB64: order.finalImageB64,
    customerEmail: order.customerEmail,
  });
}
