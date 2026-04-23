import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 120;

type Intake = {
  honoree: string;
  age?: number;
  event: string;
  date: string;
  time: string;
  location: string;
  vibe: string;
};

type Model = "gpt-image-2" | "gpt-image-1";
type Quality = "low" | "medium" | "high" | "auto";
type Size = "1024x1024" | "1024x1536" | "1536x1024" | "auto";

type Settings = {
  model: Model;
  quality: Quality;
  size: Size;
  n: number;
};

const VALID_MODELS: Model[] = ["gpt-image-2", "gpt-image-1"];
const VALID_QUALITY: Quality[] = ["low", "medium", "high", "auto"];
const VALID_SIZE: Size[] = ["1024x1024", "1024x1536", "1536x1024", "auto"];

// Per-image USD cost. gpt-image-1 numbers from OpenAI's published pricing.
// gpt-image-2 is unknown at training cutoff — using v1 numbers as a placeholder
// until the first real invoice. Refine in DEPLOY.md cost-watch step.
const COST_TABLE: Record<Model, Record<Exclude<Quality, "auto">, Record<Exclude<Size, "auto">, number>>> = {
  "gpt-image-1": {
    low:    { "1024x1024": 0.011, "1024x1536": 0.016, "1536x1024": 0.016 },
    medium: { "1024x1024": 0.042, "1024x1536": 0.063, "1536x1024": 0.063 },
    high:   { "1024x1024": 0.167, "1024x1536": 0.25,  "1536x1024": 0.25  },
  },
  "gpt-image-2": {
    low:    { "1024x1024": 0.011, "1024x1536": 0.016, "1536x1024": 0.016 },
    medium: { "1024x1024": 0.042, "1024x1536": 0.063, "1536x1024": 0.063 },
    high:   { "1024x1024": 0.167, "1024x1536": 0.25,  "1536x1024": 0.25  },
  },
};

function estimateCostUsd(s: Settings): number {
  const q: Exclude<Quality, "auto"> = s.quality === "auto" ? "medium" : s.quality;
  const sz: Exclude<Size, "auto"> = s.size === "auto" ? "1024x1536" : s.size;
  return COST_TABLE[s.model][q][sz] * s.n;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function validateIntake(raw: unknown): Intake | null {
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

function validateSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const model = VALID_MODELS.includes(r.model as Model) ? (r.model as Model) : "gpt-image-2";
  const quality = VALID_QUALITY.includes(r.quality as Quality) ? (r.quality as Quality) : "low";
  const size = VALID_SIZE.includes(r.size as Size) ? (r.size as Size) : "1024x1536";
  const nRaw = typeof r.n === "number" && Number.isInteger(r.n) ? r.n : 1;
  const n = Math.min(Math.max(nRaw, 1), 4);
  return { model, quality, size, n };
}

function buildPrompt(intake: Intake): string {
  const eventLabel =
    intake.age !== undefined &&
    !new RegExp(`\\b${ordinal(intake.age)}\\b`, "i").test(intake.event)
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

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set in apps/web/.env.local" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const intake = validateIntake(b.intake ?? body);
  if (!intake) {
    return NextResponse.json(
      { error: "invalid intake: requires non-empty honoree, event, date, time, location, vibe" },
      { status: 400 },
    );
  }
  const settings = validateSettings(b.settings);

  const prompt = buildPrompt(intake);
  const openai = new OpenAI({ apiKey });

  const t0 = Date.now();
  try {
    const result = await openai.images.generate(
      {
        model: settings.model,
        prompt,
        n: settings.n,
        size: settings.size,
        quality: settings.quality,
      },
      { signal: AbortSignal.timeout(110_000) },
    );
    const ms = Date.now() - t0;

    const images = (result.data ?? [])
      .map((d) => d.b64_json)
      .filter((b): b is string => typeof b === "string" && b.length > 0)
      .map((b64_json) => ({ b64_json }));

    if (images.length !== settings.n) {
      return NextResponse.json(
        { error: `openai returned ${images.length}/${settings.n} usable images` },
        { status: 502 },
      );
    }

    const costUsd = estimateCostUsd(settings);
    return NextResponse.json({ images, prompt, ms, costUsd, settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "openai call failed", detail: message },
      { status: 502 },
    );
  }
}
