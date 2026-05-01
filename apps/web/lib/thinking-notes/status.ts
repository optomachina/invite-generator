import { containsWord, ordinal } from "@/lib/intake";

export type StatusContext = {
  honoree?: string;
  event?: string;
  age?: number;
  variantCount: number;
};

function describeEvent(event: string | undefined, age: number | undefined): string {
  const e = event?.trim() ?? "";
  if (!e) return "";
  if (age && Number.isInteger(age) && age > 0 && !containsWord(e, ordinal(age))) {
    return `${ordinal(age)} ${e}`;
  }
  return e;
}

export function buildCanonicalStatus(ctx: StatusContext): string {
  const honoree = ctx.honoree?.trim() ?? "";
  const event = describeEvent(ctx.event, ctx.age);
  const n = ctx.variantCount;
  const noun = n === 1 ? "invite" : "invites";

  if (honoree && event) return `Sketching ${n} ${noun} for ${honoree}'s ${event}…`;
  if (honoree) return `Sketching ${n} ${noun} for ${honoree}…`;
  if (event) return `Sketching ${n} ${noun} for the ${event}…`;
  return `Sketching ${n} ${noun}…`;
}
