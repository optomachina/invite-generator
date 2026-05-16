import {
  getHostedInviteByIdAndToken,
  listRSVPResponses,
  publicUrlFor,
} from "@/lib/hosted-rsvp";

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

  const invite = await getHostedInviteByIdAndToken(id, token);
  if (!invite) return Response.json({ error: "not found" }, { status: 404 });

  const responses = await listRSVPResponses(invite.id);
  return Response.json({
    id: invite.id,
    slug: invite.slug,
    status: invite.status,
    details: invite.details,
    rsvpSettings: invite.rsvpSettings,
    imageB64: invite.imageB64,
    publicUrl: publicUrlFor(invite.slug),
    responses: responses.map((response) => ({
      id: response.id,
      guestName: response.guestName,
      status: response.status,
      guestCount: response.guestCount,
      note: response.note,
      mealChoice: response.mealChoice,
      createdAt: response.createdAt,
    })),
  });
}
