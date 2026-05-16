import { randomBytes, randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDb, schema } from "./db";
import type {
  HostedInvite,
  HostedInviteDetails,
  HostedRSVPSettings,
  NewHostedInvite,
  NewRSVPResponse,
  RSVPResponseRow,
} from "./db/schema";
import { appOrigin } from "./urls";

const MAX_TEXT_LEN = 240;
const MAX_NOTE_LEN = 600;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const DETAIL_KEYS: ReadonlyArray<keyof HostedInviteDetails> = [
  "eventType",
  "eventTitle",
  "honoree",
  "hostName",
  "date",
  "startTime",
  "endTime",
  "venueName",
  "address",
  "rsvpContact",
  "rsvpDeadline",
  "dressCode",
  "registryLink",
  "specialNotes",
  "plusOneRules",
  "maxGuests",
];

const DEFAULT_RSVP_SETTINGS: HostedRSVPSettings = {
  isEnabled: true,
  allowMaybe: true,
  allowPlusOnes: true,
  maxPartySize: "2",
  askForGuestNote: true,
  askForMealChoice: false,
};

export type CreateHostedInviteInput = {
  details: HostedInviteDetails;
  rsvpSettings: HostedRSVPSettings;
  imageB64?: string;
};

export type RSVPInput = {
  guestName: string;
  status: "yes" | "no" | "maybe";
  guestCount: number;
  note: string;
  mealChoice: string;
};

export function publicUrlFor(slug: string): string {
  return `${appOrigin()}/rsvp/${slug}`;
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

function cleanText(value: unknown, max = MAX_TEXT_LEN): string | null {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (cleaned.length > max) return null;
  return cleaned;
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function slugify(value: string): string {
  let base = "";
  for (const char of value.toLowerCase()) {
    const isAsciiLetter = char >= "a" && char <= "z";
    const isDigit = char >= "0" && char <= "9";
    if (isAsciiLetter || isDigit) {
      base += char;
    } else if (base.length > 0 && !base.endsWith("-")) {
      base += "-";
    }
    if (base.length >= 56) break;
  }
  base = base.endsWith("-") ? base.slice(0, -1) : base;
  return base || "invite";
}

export function validateHostedInviteDetails(raw: unknown): HostedInviteDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<HostedInviteDetails> = {};
  for (const key of DETAIL_KEYS) {
    const value = cleanText(r[key], key === "specialNotes" ? MAX_NOTE_LEN : MAX_TEXT_LEN);
    if (value === null) return null;
    out[key] = value;
  }

  if (!out.eventTitle && !out.eventType && !out.honoree) return null;
  return out as HostedInviteDetails;
}

export function validateHostedRSVPSettings(raw: unknown): HostedRSVPSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_RSVP_SETTINGS;
  const r = raw as Record<string, unknown>;
  const maxPartySize = cleanText(r.maxPartySize);
  return {
    isEnabled: typeof r.isEnabled === "boolean" ? r.isEnabled : DEFAULT_RSVP_SETTINGS.isEnabled,
    allowMaybe: typeof r.allowMaybe === "boolean" ? r.allowMaybe : DEFAULT_RSVP_SETTINGS.allowMaybe,
    allowPlusOnes: typeof r.allowPlusOnes === "boolean" ? r.allowPlusOnes : DEFAULT_RSVP_SETTINGS.allowPlusOnes,
    maxPartySize: maxPartySize || DEFAULT_RSVP_SETTINGS.maxPartySize,
    askForGuestNote: typeof r.askForGuestNote === "boolean" ? r.askForGuestNote : DEFAULT_RSVP_SETTINGS.askForGuestNote,
    askForMealChoice: typeof r.askForMealChoice === "boolean" ? r.askForMealChoice : DEFAULT_RSVP_SETTINGS.askForMealChoice,
  };
}

export function validateImageB64(raw: unknown): string | undefined | null {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return null;
  if (Math.floor((raw.length * 3) / 4) > MAX_IMAGE_BYTES) return null;
  return raw;
}

export function validateRSVPInput(raw: unknown, settings: HostedRSVPSettings): RSVPInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const guestName = cleanText(r.guestName);
  if (!guestName) return null;

  const rawStatus = typeof r.status === "string" ? r.status.toLowerCase() : "";
  if (rawStatus !== "yes" && rawStatus !== "no" && rawStatus !== "maybe") return null;
  if (rawStatus === "maybe" && !settings.allowMaybe) return null;

  const maxPartySize = parsePositiveInt(settings.maxPartySize, 1);
  const rawGuestCount = typeof r.guestCount === "number" ? r.guestCount : Number(r.guestCount);
  let guestCount = 1;
  if (settings.allowPlusOnes) {
    const requestedGuestCount = Number.isFinite(rawGuestCount) ? Math.floor(rawGuestCount) : 1;
    guestCount = Math.min(Math.max(requestedGuestCount, 1), maxPartySize);
  }

  const note = cleanText(r.note, MAX_NOTE_LEN);
  const mealChoice = cleanText(r.mealChoice);
  if (note === null || mealChoice === null) return null;

  return {
    guestName,
    status: rawStatus,
    guestCount,
    note,
    mealChoice,
  };
}

export async function createHostedInvite(input: CreateHostedInviteInput): Promise<HostedInvite> {
  const id = randomUUID();
  const title = input.details.eventTitle || input.details.honoree || input.details.eventType;
  const slug = `${slugify(title)}-${id.slice(0, 8)}`;
  const row: NewHostedInvite = {
    id,
    hostToken: newToken(),
    slug,
    status: "published",
    details: input.details,
    rsvpSettings: input.rsvpSettings,
    imageB64: input.imageB64,
  };
  const [inserted] = await getDb().insert(schema.hostedInvites).values(row).returning();
  return inserted;
}

export async function getHostedInviteBySlug(slug: string): Promise<HostedInvite | null> {
  const rows = await getDb()
    .select()
    .from(schema.hostedInvites)
    .where(eq(schema.hostedInvites.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getHostedInviteByIdAndToken(
  id: string,
  token: string,
): Promise<HostedInvite | null> {
  const rows = await getDb()
    .select()
    .from(schema.hostedInvites)
    .where(
      and(
        eq(schema.hostedInvites.id, id),
        eq(schema.hostedInvites.hostToken, token),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listRSVPResponses(inviteId: string): Promise<RSVPResponseRow[]> {
  return await getDb()
    .select()
    .from(schema.rsvpResponses)
    .where(eq(schema.rsvpResponses.inviteId, inviteId))
    .orderBy(desc(schema.rsvpResponses.createdAt));
}

export async function createRSVPResponse(
  inviteId: string,
  input: RSVPInput,
): Promise<RSVPResponseRow> {
  const row: NewRSVPResponse = {
    id: randomUUID(),
    inviteId,
    guestName: input.guestName,
    status: input.status,
    guestCount: input.guestCount,
    note: input.note,
    mealChoice: input.mealChoice,
  };
  const [inserted] = await getDb().insert(schema.rsvpResponses).values(row).returning();
  await getDb()
    .update(schema.hostedInvites)
    .set({ updatedAt: sql`now()` })
    .where(eq(schema.hostedInvites.id, inviteId));
  return inserted;
}
