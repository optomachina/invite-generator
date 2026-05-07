import { describe, expect, test } from "bun:test";
import {
  buildScrimSvg,
  escapeXml,
  planOverlay,
  resolveLines,
} from "./compose";
import type { OverlayFields } from "./types";

const FULL: OverlayFields = {
  honoree: "Lily",
  event: "5th birthday",
  date: "Saturday, June 13",
  time: "2:00 PM",
  location: "Magnolia Park",
  customLine: "Bring your favorite stuffed animal",
};

describe("escapeXml", () => {
  test("escapes the five XML specials", () => {
    expect(escapeXml(`<script>"&'</script>`)).toBe(
      "&lt;script&gt;&quot;&amp;&apos;&lt;/script&gt;",
    );
  });

  test("does not double-escape ampersands", () => {
    expect(escapeXml("A & B")).toBe("A &amp; B");
    expect(escapeXml("A &amp; B")).toBe("A &amp;amp; B");
  });
});

describe("resolveLines", () => {
  test("drops empty fields", () => {
    const lines = resolveLines(
      { ...FULL, customLine: "", time: "" },
      "bottom-third",
      "script",
    );
    const roles = lines.map((l) => l.role);
    expect(roles).not.toContain("custom");
    expect(roles).toContain("meta");
  });

  test("combines date and time into a single meta line", () => {
    const lines = resolveLines(FULL, "bottom-third", "script");
    const meta = lines.find((l) => l.role === "meta");
    expect(meta?.text).toBe("Saturday, June 13 · 2:00 PM");
  });

  test("collapses excess whitespace", () => {
    const lines = resolveLines(
      { ...FULL, honoree: "  Lily   Wilson  " },
      "bottom-third",
      "script",
    );
    const display = lines.find((l) => l.role === "display");
    expect(display?.text).toBe("Lily Wilson");
  });

  test("script and sans use different display sizes", () => {
    const script = resolveLines(FULL, "bottom-third", "script");
    const sans = resolveLines(FULL, "bottom-third", "sans");
    const sd = script.find((l) => l.role === "display");
    const ssd = sans.find((l) => l.role === "display");
    expect(sd?.spec.fontSize).not.toBe(ssd?.spec.fontSize);
  });
});

describe("planOverlay", () => {
  test("produces a line for every populated field", () => {
    const plan = planOverlay(FULL, "bottom-third", "script");
    expect(plan.lines.map((l) => l.role)).toEqual([
      "display",
      "subtitle",
      "meta",
      "location",
      "custom",
    ]);
  });

  test("omits lines for empty fields", () => {
    const plan = planOverlay(
      { ...FULL, customLine: "", location: "" },
      "bottom-third",
      "sans",
    );
    const roles = plan.lines.map((l) => l.role);
    expect(roles).not.toContain("custom");
    expect(roles).not.toContain("location");
  });

  test("emits a textSvg with one outer fill group per line", () => {
    const plan = planOverlay(FULL, "bottom-third", "script");
    const fillGroupCount = (plan.textSvg.match(/<g transform="translate[^"]+" fill=/g) ?? [])
      .length;
    expect(fillGroupCount).toBe(plan.lines.length);
    expect(plan.textSvg).toContain("<path d=");
  });

  test("places every baseline inside the canvas", () => {
    const plan = planOverlay(FULL, "bottom-third", "sans");
    for (const line of plan.lines) {
      expect(line.baselineY).toBeGreaterThan(0);
      expect(line.baselineY).toBeLessThan(1536);
    }
  });

  test("baselines are monotonically increasing top-to-bottom", () => {
    const plan = planOverlay(FULL, "bottom-third", "script");
    for (let i = 1; i < plan.lines.length; i++) {
      expect(plan.lines[i].baselineY).toBeGreaterThan(plan.lines[i - 1].baselineY);
    }
  });

  test("paths are vector geometry, not text strings (no plaintext leakage)", () => {
    const plan = planOverlay(
      { ...FULL, customLine: 'rm -rf "/"' },
      "bottom-third",
      "sans",
    );
    expect(plan.textSvg).not.toContain('rm -rf "/"');
  });
});

describe("buildScrimSvg", () => {
  test("returns an SVG with the canvas dimensions and a gradient rect", () => {
    const svg = buildScrimSvg("bottom-third");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="1024"');
    expect(svg).toContain('height="1536"');
    expect(svg).toContain('fill="url(#scrim)"');
  });
});
