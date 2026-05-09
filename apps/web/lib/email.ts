import { Resend } from "resend";

import { logger } from "./logger";

let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  cached = new Resend(key);
  return cached;
}

function getResendFrom(): string {
  const from = process.env.RESEND_FROM;
  if (!from) throw new Error("RESEND_FROM not set");
  return from;
}

export type InviteEmail = {
  to: string;
  honoree: string;
  event: string;
  pngB64: string;
  manageUrl: string;
};

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendInviteEmail(input: InviteEmail): Promise<void> {
  const from = getResendFrom();
  const subject = input.honoree
    ? `Your invite for ${input.honoree}'s ${input.event || "event"}`
    : "Your invite is ready";
  const filename = `${(input.honoree || "invite").replace(/[^a-z0-9-_]+/gi, "-")}.png`;
  const manageUrl = escapeHtml(input.manageUrl);

  const res = await getResend().emails.send({
    from,
    to: input.to,
    subject,
    html:
      `<p>Your invite is attached.</p>` +
      `<p>Need to fix a typo or change a date? <a href="${manageUrl}">Edit and re-download here</a> — no new image, just updated text. Bookmark that link; it's how you'll get back to your invite later.</p>` +
      `<p>If anything still looks off, just reply to this email.</p>`,
    attachments: [
      {
        filename,
        content: input.pngB64,
      },
    ],
  });

  if (res.error) {
    logger.error("email.send_failed", { err: res.error });
    throw new Error(`resend: ${res.error.message}`);
  }
}

export type RecoveryEmail = {
  to: string;
  links: Array<{ honoree: string; event: string; manageUrl: string }>;
};

export async function sendRecoveryEmail(input: RecoveryEmail): Promise<void> {
  if (input.links.length === 0) return;
  const from = getResendFrom();
  const items = input.links
    .map((l) => {
      const label = l.honoree
        ? `${escapeHtml(l.honoree)}'s ${escapeHtml(l.event || "event")}`
        : "Your invite";
      return `<li><a href="${escapeHtml(l.manageUrl)}">${label}</a></li>`;
    })
    .join("");

  const res = await getResend().emails.send({
    from,
    to: input.to,
    subject: "Your invite links",
    html: `<p>Here are the invites you've created with us:</p><ul>${items}</ul>`,
  });

  if (res.error) {
    logger.error("email.recovery_send_failed", { err: res.error });
    throw new Error(`resend: ${res.error.message}`);
  }
}
