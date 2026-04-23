import {
  VALID_MODELS,
  VALID_QUALITY,
  VALID_SIZE,
  type Model,
  type Quality,
  type Settings,
  type Size,
} from "@/lib/pricing";

export type Intake = {
  honoree: string;
  age?: number;
  event: string;
  date: string;
  time: string;
  location: string;
  vibe: string;
};

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function validateIntake(raw: unknown): Intake | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const required = ["honoree", "event", "date", "time", "location", "vibe"] as const;
  for (const k of required) {
    if (typeof r[k] !== "string" || !(r[k] as string).trim()) return null;
  }
  if (
    r.age !== undefined &&
    (typeof r.age !== "number" || !Number.isInteger(r.age) || r.age <= 0)
  ) {
    return null;
  }
  return {
    honoree: r.honoree as string,
    age: r.age as number | undefined,
    event: r.event as string,
    date: r.date as string,
    time: r.time as string,
    location: r.location as string,
    vibe: r.vibe as string,
  };
}

export function validateSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const model = VALID_MODELS.includes(r.model as Model) ? (r.model as Model) : "gpt-image-2";
  const quality = VALID_QUALITY.includes(r.quality as Quality) ? (r.quality as Quality) : "low";
  const size = VALID_SIZE.includes(r.size as Size) ? (r.size as Size) : "1024x1536";
  const nRaw = typeof r.n === "number" && Number.isInteger(r.n) ? r.n : 1;
  const n = Math.min(Math.max(nRaw, 1), 4);
  return { model, quality, size, n };
}

export function buildPrompt(intake: Intake): string {
  const eventLabel =
    intake.age !== undefined && !containsWord(intake.event, ordinal(intake.age))
      ? `${ordinal(intake.age)} ${intake.event}`
      : intake.event;
  return [
    `An editorial-quality custom invitation design for ${intake.honoree}'s ${eventLabel}.`,
    `Vibe: ${intake.vibe}.`,
    `Composition: portrait 5x7, leave clean negative space in the upper third for event text overlay.`,
    `Style references: hand-illustrated, warm cream paper, restrained color palette,`,
    `subtle grain, generous whitespace, looks like a boutique stationer made it — not a template.`,
    `Avoid: stock-photo aesthetic, generic SaaS color palette, purple/indigo gradients, slate/zinc neutrals.`,
    `Render the event text directly into the design (honoree name "${intake.honoree}",`,
    `date "${intake.date}", time "${intake.time}", location "${intake.location}") with`,
    `editorial serif typography. Make text crisp and legible.`,
  ].join(" ");
}

// Word-boundary substring check using a static pattern so we never construct
// a RegExp from interpolated input.
const ALNUM = /[a-z0-9]/i;

function containsWord(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let i = h.indexOf(n);
  while (i !== -1) {
    const before = i === 0 ? "" : h[i - 1];
    const after = h[i + n.length] ?? "";
    if (!ALNUM.test(before) && !ALNUM.test(after)) return true;
    i = h.indexOf(n, i + 1);
  }
  return false;
}
