import {
  createRSVPResponse,
  getHostedInviteBySlug,
  validateRSVPInput,
} from "@/lib/hosted-rsvp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const invite = await getHostedInviteBySlug(slug);
  if (invite?.status !== "published") {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({
    id: invite.id,
    slug: invite.slug,
    status: invite.status,
    details: invite.details,
    rsvpSettings: invite.rsvpSettings,
    imageB64: invite.imageB64,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const invite = await getHostedInviteBySlug(slug);
  if (invite?.status !== "published") {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  if (!invite.rsvpSettings.isEnabled) {
    return Response.json({ error: "rsvp closed" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const input = validateRSVPInput(body, invite.rsvpSettings);
  if (!input) {
    return Response.json({ error: "invalid rsvp" }, { status: 400 });
  }

  const response = await createRSVPResponse(invite.id, input);
  return Response.json({
    id: response.id,
    guestName: response.guestName,
    status: response.status,
    guestCount: response.guestCount,
    note: response.note,
    mealChoice: response.mealChoice,
    createdAt: response.createdAt,
  }, { status: 201 });
}
