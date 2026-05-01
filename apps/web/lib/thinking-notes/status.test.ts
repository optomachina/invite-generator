import { describe, expect, test } from "bun:test";
import { buildCanonicalStatus } from "./status";

describe("buildCanonicalStatus", () => {
  test("uses honoree + event when both are present", () => {
    expect(
      buildCanonicalStatus({ honoree: "Lily", event: "birthday party", variantCount: 4 }),
    ).toBe("Sketching 4 invites for Lily's birthday party…");
  });

  test("prepends ordinal age when not already in event", () => {
    expect(
      buildCanonicalStatus({ honoree: "Lily", event: "birthday", age: 5, variantCount: 3 }),
    ).toBe("Sketching 3 invites for Lily's 5th birthday…");
  });

  test("does not double-prepend when event already has the ordinal", () => {
    expect(
      buildCanonicalStatus({
        honoree: "Lily",
        event: "5th birthday",
        age: 5,
        variantCount: 3,
      }),
    ).toBe("Sketching 3 invites for Lily's 5th birthday…");
  });

  test("singular noun when n=1", () => {
    expect(
      buildCanonicalStatus({ honoree: "Lily", event: "birthday", variantCount: 1 }),
    ).toBe("Sketching 1 invite for Lily's birthday…");
  });

  test("falls back to honoree-only when event missing", () => {
    expect(buildCanonicalStatus({ honoree: "Lily", variantCount: 3 })).toBe(
      "Sketching 3 invites for Lily…",
    );
  });

  test("falls back to event-only when honoree missing", () => {
    expect(buildCanonicalStatus({ event: "graduation", variantCount: 3 })).toBe(
      "Sketching 3 invites for the graduation…",
    );
  });

  test("falls back to bare phrasing when both missing", () => {
    expect(buildCanonicalStatus({ variantCount: 3 })).toBe("Sketching 3 invites…");
  });

  test("trims whitespace-only honoree and event", () => {
    expect(
      buildCanonicalStatus({ honoree: "  ", event: "  ", variantCount: 2 }),
    ).toBe("Sketching 2 invites…");
  });

  test("ignores non-positive or non-integer age", () => {
    expect(
      buildCanonicalStatus({ honoree: "Lily", event: "birthday", age: 0, variantCount: 3 }),
    ).toBe("Sketching 3 invites for Lily's birthday…");
    expect(
      buildCanonicalStatus({ honoree: "Lily", event: "birthday", age: 5.5, variantCount: 3 }),
    ).toBe("Sketching 3 invites for Lily's birthday…");
  });
});
