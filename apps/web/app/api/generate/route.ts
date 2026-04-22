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

function buildPrompt(intake: Intake): string {
  const ageBit = intake.age ? `${intake.age}th ` : "";
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

  let intake: Intake;
  try {
    intake = (await req.json()) as Intake;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const prompt = buildPrompt(intake);
  const openai = new OpenAI({ apiKey });

  const t0 = Date.now();
  try {
    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      n: 4,
      size: "1024x1536",
    });
    const ms = Date.now() - t0;

    const images = (result.data ?? []).map((d) => ({
      url: d.url,
      b64_json: d.b64_json,
    }));

    return NextResponse.json({
      images,
      prompt,
      ms,
      cost_estimate: "~$0.76 for 4 (refine after first run)",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "openai call failed", detail: message },
      { status: 502 },
    );
  }
}
