import { THINKING_NOTE_TEMPLATES, type ThinkingNoteTemplate } from "./templates";

export type ThinkingNoteContext = {
  name?: string;
  event?: string;
};

export function templateIsApplicable(
  t: ThinkingNoteTemplate,
  ctx: ThinkingNoteContext,
): boolean {
  for (const field of t.context_requires) {
    if (field === null) continue;
    const value = ctx[field];
    if (typeof value !== "string" || value.trim() === "") return false;
  }
  return true;
}

export function render(t: ThinkingNoteTemplate, ctx: ThinkingNoteContext): string {
  const name = ctx.name?.trim() ?? "";
  const event = ctx.event?.trim() ?? "";
  return t.text_template
    .replaceAll("{name}", () => name)
    .replaceAll("{event}", () => event);
}

export function renderApplicable(
  ctx: ThinkingNoteContext,
  templates: ThinkingNoteTemplate[] = THINKING_NOTE_TEMPLATES,
): Array<{ id: string; text: string }> {
  return templates
    .filter((t) => templateIsApplicable(t, ctx))
    .map((t) => ({ id: t.id, text: render(t, ctx) }));
}
