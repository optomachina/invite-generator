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

function buildPrompt(intake: Intake): string {
  const ageBit = intake.age !== undefined ? `${ordinal(intake.age)} ` : "";
  return [
    `An editorial-quality custom invitation design for ${intake.honoree}'s ${ageBit}${intake.event}.`,
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

  const intake = validateIntake(body);
  if (!intake) {
    return NextResponse.json(
      { error: "invalid intake: requires non-empty honoree, event, date, time, location, vibe" },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(intake);
  const openai = new OpenAI({ apiKey });

  const t0 = Date.now();
  try {
    const result = await openai.images.generate(
      {
        model: "gpt-image-2",
        prompt,
        n: 4,
        size: "1024x1536",
      },
      { signal: AbortSignal.timeout(110_000) },
    );
    const ms = Date.now() - t0;

    const images = (result.data ?? []).map((d) => ({ b64_json: d.b64_json }));

    return NextResponse.json({ images, prompt, ms });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "openai call failed", detail: message },
      { status: 502 },
    );
  }
}
