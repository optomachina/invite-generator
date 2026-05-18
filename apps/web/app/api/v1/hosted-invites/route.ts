import {
  createHostedInvite,
  publicUrlFor,
  validateHostedInviteDetails,
  validateHostedRSVPSettings,
  validateImageB64,
} from "@/lib/hosted-rsvp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const details = validateHostedInviteDetails(record?.details);
  if (!details) {
    return Response.json({ error: "invalid invite details" }, { status: 400 });
  }

  const rsvpSettings = validateHostedRSVPSettings(record?.rsvpSettings);
  const imageB64 = validateImageB64(record?.imageB64);
  if (imageB64 === null) {
    return Response.json({ error: "invalid image" }, { status: 400 });
  }

  const invite = await createHostedInvite({ details, rsvpSettings, imageB64 });
  return Response.json({
    id: invite.id,
    slug: invite.slug,
    hostToken: invite.hostToken,
    publicUrl: publicUrlFor(invite.slug),
  }, { status: 201 });
}
