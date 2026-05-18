import { notFound } from "next/navigation";

import { getHostedInviteBySlug } from "@/lib/hosted-rsvp";

import { RSVPForm } from "./RSVPForm";

export const dynamic = "force-dynamic";

type RSVPPageProps = {
  params: Promise<{ slug: string }>;
};

function detailsList(invite: Awaited<ReturnType<typeof getHostedInviteBySlug>>) {
  if (!invite) return [];
  const { details } = invite;
  return [
    ["When", [details.date, details.startTime].filter(Boolean).join(" at ")],
    ["Where", [details.venueName, details.address].filter(Boolean).join(", ")],
    ["Dress", details.dressCode],
    ["RSVP by", details.rsvpDeadline],
    ["Host", details.hostName],
  ].filter(([, value]) => value);
}

function inviteTitle(invite: NonNullable<Awaited<ReturnType<typeof getHostedInviteBySlug>>>) {
  const { details } = invite;
  if (details.eventTitle) return details.eventTitle;
  if (details.honoree && details.eventType) return `${details.honoree}'s ${details.eventType}`;
  return details.honoree || details.eventType || "Untitled Invite";
}

export default async function RSVPPage({ params }: Readonly<RSVPPageProps>) {
  const { slug } = await params;
  const invite = await getHostedInviteBySlug(slug);
  if (invite?.status !== "published") notFound();

  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(320px,1fr)] md:items-start">
        <section className="space-y-5">
          {invite.imageB64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="w-full rounded-md bg-white object-cover shadow-sm"
              src={`data:image/png;base64,${invite.imageB64}`}
            />
          ) : (
            <div className="flex aspect-[5/7] items-center justify-center rounded-md bg-white px-8 text-center shadow-sm">
              <span className="font-serif text-3xl text-ink/70">
                {inviteTitle(invite)}
              </span>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ochre">
              Invitation
            </p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-ink md:text-5xl">
              {inviteTitle(invite)}
            </h1>
            {invite.details.specialNotes ? (
              <p className="mt-3 text-base leading-7 text-ink/72">
                {invite.details.specialNotes}
              </p>
            ) : null}
          </div>

          <dl className="grid gap-3 rounded-md bg-white/70 p-4 text-sm">
            {detailsList(invite).map(([label, value]) => (
              <div className="grid grid-cols-[88px_1fr] gap-3" key={label}>
                <dt className="font-semibold text-ink">{label}</dt>
                <dd className="text-ink/72">{value}</dd>
              </div>
            ))}
          </dl>

          <RSVPForm slug={invite.slug} settings={invite.rsvpSettings} />
        </section>
      </div>
    </main>
  );
}
