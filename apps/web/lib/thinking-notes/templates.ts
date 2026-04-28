export type ThinkingNoteContextField = "name" | "event";

export type ThinkingNoteTemplate = {
  id: string;
  text_template: string;
  context_requires: Array<ThinkingNoteContextField | null>;
};

export const THINKING_NOTE_TEMPLATES: ThinkingNoteTemplate[] = [
  { id: "local-sketch-first-lines", text_template: "Sketching the first lines...", context_requires: [null] },
  { id: "local-cream-paper", text_template: "Pulling out the cream paper...", context_requires: [null] },
  { id: "local-sharpening-pencils", text_template: "Sharpening the pencils...", context_requires: [null] },
  { id: "local-mixing-palette", text_template: "Mixing a palette by hand...", context_requires: [null] },
  { id: "local-warming-up", text_template: "Warming up the studio...", context_requires: [null] },

  { id: "local-colors-name", text_template: "Picking colors {name} would love...", context_requires: ["name"] },
  { id: "local-handlettering-name", text_template: "Hand-lettering {name}'s name...", context_requires: ["name"] },
  { id: "local-thinking-about-name", text_template: "Thinking about {name}...", context_requires: ["name"] },
  { id: "local-name-deserves", text_template: "{name} deserves something special...", context_requires: ["name"] },
  { id: "local-quiet-touches-name", text_template: "Adding quiet touches for {name}...", context_requires: ["name"] },

  { id: "local-event-vibe", text_template: "Finding the {event} vibe...", context_requires: ["event"] },
  { id: "local-event-feeling", text_template: "Capturing how a {event} feels...", context_requires: ["event"] },
  { id: "local-event-references", text_template: "Pulling references for {event}s...", context_requires: ["event"] },
  { id: "local-event-mood", text_template: "Setting the mood for the {event}...", context_requires: ["event"] },
  { id: "local-event-shape", text_template: "Letting the {event} take shape...", context_requires: ["event"] },

  { id: "local-name-event-concepts", text_template: "Sketching 4 concepts for {name}'s {event}...", context_requires: ["name", "event"] },
  { id: "local-name-event-paper", text_template: "Choosing paper for {name}'s {event}...", context_requires: ["name", "event"] },
  { id: "local-name-event-typography", text_template: "Hand-setting type for {name}'s {event}...", context_requires: ["name", "event"] },
  { id: "local-name-event-layout", text_template: "Arranging {name}'s {event} on the page...", context_requires: ["name", "event"] },
  { id: "local-name-event-finishing", text_template: "Adding the last details to {name}'s {event}...", context_requires: ["name", "event"] },

  { id: "codex-layout-roughing", text_template: "Roughing out the layout...", context_requires: [null] },
  { id: "codex-grain-testing", text_template: "Testing a softer grain...", context_requires: [null] },
  { id: "codex-margins-balancing", text_template: "Balancing the margins...", context_requires: [null] },
  { id: "codex-idea-turning", text_template: "Turning the idea over...", context_requires: [null] },
  { id: "codex-sunlight-borrowing", text_template: "Borrowing a little sunlight...", context_requires: [null] },

  { id: "codex-name-palette-matching", text_template: "Matching a palette to {name}'s energy...", context_requires: ["name"] },
  { id: "codex-name-lettering", text_template: "Lettering with {name} in mind...", context_requires: ["name"] },
  { id: "codex-name-details-framing", text_template: "Framing the details around {name}...", context_requires: ["name"] },
  { id: "codex-name-mood-tracing", text_template: "Tracing a bolder mood for {name}...", context_requires: ["name"] },
  { id: "codex-name-flourishes-tucking", text_template: "Tucking in flourishes for {name}...", context_requires: ["name"] },

  { id: "codex-event-scene-composing", text_template: "Composing a scene for {event}...", context_requires: ["event"] },
  { id: "codex-event-edges-tinting", text_template: "Tinting the edges for {event}...", context_requires: ["event"] },
  { id: "codex-event-references-gathering", text_template: "Gathering references for {event}...", context_requires: ["event"] },
  { id: "codex-event-type-shaping", text_template: "Shaping the type for {event}...", context_requires: ["event"] },
  { id: "codex-event-paper-softening", text_template: "Softening the paper for {event}...", context_requires: ["event"] },

  { id: "codex-name-event-world-casting", text_template: "Casting {name} into the world of {event}...", context_requires: ["name", "event"] },
  { id: "codex-name-event-weaving", text_template: "Weaving {name} through {event}...", context_requires: ["name", "event"] },
  { id: "codex-name-event-hello-polishing", text_template: "Polishing the hello for {name} at {event}...", context_requires: ["name", "event"] },
  { id: "codex-name-event-charm-staging", text_template: "Staging the charm for {name} at {event}...", context_requires: ["name", "event"] },
  { id: "codex-name-event-cues-finishing", text_template: "Finishing the little cues for {name} at {event}...", context_requires: ["name", "event"] },
];
