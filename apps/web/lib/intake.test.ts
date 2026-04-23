import { describe, expect, test } from "bun:test";
import { buildPrompt, ordinal, validateIntake, validateSettings } from "./intake";

describe("ordinal", () => {
  test("common cases", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(5)).toBe("5th");
  });

  test("teens all use th", () => {
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
  });

  test("two-digit tail reuses rule", () => {
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(22)).toBe("22nd");
    expect(ordinal(23)).toBe("23rd");
    expect(ordinal(111)).toBe("111th");
    expect(ordinal(112)).toBe("112th");
    expect(ordinal(113)).toBe("113th");
    expect(ordinal(121)).toBe("121st");
  });
});

describe("validateIntake", () => {
  const valid = {
    honoree: "Lily",
    age: 5,
    event: "birthday party",
    date: "Saturday, June 13",
    time: "2:00 PM",
    location: "Magnolia Park",
    vibe: "garden tea-party",
  };

  test("accepts a complete payload", () => {
    expect(validateIntake(valid)).toEqual(valid);
  });

  test("accepts omitted age", () => {
    const { age, ...rest } = valid;
    const result = validateIntake(rest);
    expect(result).not.toBeNull();
    expect(result?.age).toBeUndefined();
    expect(result?.honoree).toBe("Lily");
  });

  test("rejects non-object input", () => {
    expect(validateIntake(null)).toBeNull();
    expect(validateIntake(undefined)).toBeNull();
    expect(validateIntake("not an object")).toBeNull();
    expect(validateIntake(42)).toBeNull();
  });

  test("rejects missing required string fields", () => {
    for (const key of ["honoree", "event", "date", "time", "location", "vibe"] as const) {
      const bad = { ...valid, [key]: "" };
      expect(validateIntake(bad)).toBeNull();
    }
  });

  test("rejects whitespace-only required fields", () => {
    expect(validateIntake({ ...valid, honoree: "   " })).toBeNull();
  });

  test("rejects non-positive or non-integer age", () => {
    expect(validateIntake({ ...valid, age: 0 })).toBeNull();
    expect(validateIntake({ ...valid, age: -3 })).toBeNull();
    expect(validateIntake({ ...valid, age: 4.5 })).toBeNull();
    expect(validateIntake({ ...valid, age: "5" })).toBeNull();
  });
});

describe("validateSettings", () => {
  test("returns defaults for empty input", () => {
    expect(validateSettings({})).toEqual({
      model: "gpt-image-2",
      quality: "low",
      size: "1024x1536",
      n: 1,
    });
    expect(validateSettings(null)).toEqual({
      model: "gpt-image-2",
      quality: "low",
      size: "1024x1536",
      n: 1,
    });
  });

  test("preserves valid values", () => {
    expect(
      validateSettings({ model: "gpt-image-1", quality: "high", size: "1024x1024", n: 3 }),
    ).toEqual({ model: "gpt-image-1", quality: "high", size: "1024x1024", n: 3 });
  });

  test("falls back to defaults for invalid enum values", () => {
    const result = validateSettings({ model: "bogus", quality: "ultra", size: "huge" });
    expect(result.model).toBe("gpt-image-2");
    expect(result.quality).toBe("low");
    expect(result.size).toBe("1024x1536");
  });

  test("clamps n into [1, 4]", () => {
    expect(validateSettings({ n: 0 }).n).toBe(1);
    expect(validateSettings({ n: -10 }).n).toBe(1);
    expect(validateSettings({ n: 99 }).n).toBe(4);
    expect(validateSettings({ n: 2.5 }).n).toBe(1); // non-integer -> default then clamped
  });
});

describe("buildPrompt", () => {
  const intake = {
    honoree: "Lily",
    age: 5,
    event: "birthday party",
    date: "Saturday, June 13",
    time: "2:00 PM",
    location: "Magnolia Park",
    vibe: "garden tea-party",
  };

  test("includes honoree, event, and vibe", () => {
    const prompt = buildPrompt(intake);
    expect(prompt).toContain("Lily");
    expect(prompt).toContain("garden tea-party");
    expect(prompt).toContain("Saturday, June 13");
  });

  test("injects ordinal when age is present and missing from event", () => {
    expect(buildPrompt(intake)).toContain("5th birthday party");
  });

  test("does not double-inject ordinal when already present in event", () => {
    const prompt = buildPrompt({ ...intake, event: "5th birthday party" });
    expect(prompt).not.toContain("5th 5th");
  });

  test("omits ordinal when age is undefined", () => {
    const prompt = buildPrompt({ ...intake, age: undefined });
    expect(prompt).not.toMatch(/\b\d+(st|nd|rd|th)\b/);
  });
});
