import { describe, expect, test } from "bun:test";
import { THINKING_NOTE_TEMPLATES } from "./templates";
import { render, renderApplicable, templateIsApplicable } from "./render";

describe("templateIsApplicable", () => {
  test("[null] always applies", () => {
    expect(
      templateIsApplicable(
        { id: "x", text_template: "Sketching...", context_requires: [null] },
        {},
      ),
    ).toBe(true);
  });

  test("name-required template skipped when name missing", () => {
    const t = { id: "x", text_template: "For {name}", context_requires: ["name" as const] };
    expect(templateIsApplicable(t, {})).toBe(false);
    expect(templateIsApplicable(t, { name: "" })).toBe(false);
    expect(templateIsApplicable(t, { name: "  " })).toBe(false);
    expect(templateIsApplicable(t, { name: "Lily" })).toBe(true);
  });

  test("name+event template needs both", () => {
    const t = {
      id: "x",
      text_template: "{name}'s {event}",
      context_requires: ["name" as const, "event" as const],
    };
    expect(templateIsApplicable(t, { name: "Lily" })).toBe(false);
    expect(templateIsApplicable(t, { event: "birthday" })).toBe(false);
    expect(templateIsApplicable(t, { name: "Lily", event: "birthday" })).toBe(true);
  });
});

describe("render", () => {
  test("interpolates name and event", () => {
    expect(
      render(
        {
          id: "x",
          text_template: "{name}'s {event}",
          context_requires: ["name", "event"],
        },
        { name: "Lily", event: "birthday" },
      ),
    ).toBe("Lily's birthday");
  });

  test("trims whitespace from interpolated values", () => {
    expect(
      render(
        { id: "x", text_template: "Hi {name}", context_requires: ["name"] },
        { name: "  Lily  " },
      ),
    ).toBe("Hi Lily");
  });

  test("replaces all occurrences", () => {
    expect(
      render(
        { id: "x", text_template: "{name} and {name}", context_requires: ["name"] },
        { name: "Lily" },
      ),
    ).toBe("Lily and Lily");
  });

  test("does not interpret $-patterns in user input as substitutions", () => {
    expect(
      render(
        { id: "x", text_template: "Hi {name}", context_requires: ["name"] },
        { name: "$&" },
      ),
    ).toBe("Hi $&");
    expect(
      render(
        { id: "x", text_template: "For {name}", context_requires: ["name"] },
        { name: "Cash $$ Money" },
      ),
    ).toBe("For Cash $$ Money");
    expect(
      render(
        { id: "x", text_template: "{name}'s {event}", context_requires: ["name", "event"] },
        { name: "$1", event: "$'" },
      ),
    ).toBe("$1's $'");
  });
});

describe("renderApplicable", () => {
  test("with no context, only [null] templates render", () => {
    const out = renderApplicable({});
    expect(out.length).toBeGreaterThan(0);
    for (const note of out) {
      expect(note.text).not.toContain("{");
    }
  });

  test("with name+event, all templates render", () => {
    const out = renderApplicable({ name: "Lily", event: "birthday" });
    expect(out.length).toBe(THINKING_NOTE_TEMPLATES.length);
    for (const note of out) {
      expect(note.text).not.toContain("{");
    }
  });
});

describe("template library invariants", () => {
  test("template ids are unique", () => {
    const ids = new Set(THINKING_NOTE_TEMPLATES.map((t) => t.id));
    expect(ids.size).toBe(THINKING_NOTE_TEMPLATES.length);
  });

  test("context_requires matches placeholders in text_template", () => {
    for (const t of THINKING_NOTE_TEMPLATES) {
      const usesName = t.text_template.includes("{name}");
      const usesEvent = t.text_template.includes("{event}");
      const requiresName = t.context_requires.includes("name");
      const requiresEvent = t.context_requires.includes("event");
      expect(usesName).toBe(requiresName);
      expect(usesEvent).toBe(requiresEvent);
      if (!usesName && !usesEvent) {
        expect(t.context_requires).toEqual([null]);
      }
    }
  });

  test("templates stay under 80 chars after rendering with realistic values", () => {
    const ctx = { name: "Lily", event: "5th birthday" };
    for (const t of THINKING_NOTE_TEMPLATES) {
      const rendered = render(t, ctx);
      expect(rendered.length).toBeLessThan(80);
    }
  });
});
