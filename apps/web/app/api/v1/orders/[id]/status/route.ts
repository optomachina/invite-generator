import { getOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });

  const order = await getOrder(id);
  if (!order) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({
    id: order.id,
    status: order.status,
    finalImageB64: order.status === "fulfilled" ? order.finalImageB64 : null,
    accessToken: order.status === "fulfilled" ? order.accessToken : null,
    honoree: order.fields.honoree,
    event: order.fields.event,
  });
}
