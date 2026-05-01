import { describe, expect, test } from "bun:test";
import { nextNoteIndex, pickIntervalMs, pickRotationOrder } from "./rotate";

describe("pickRotationOrder", () => {
  test("returns same set of items", () => {
    const byNumber = (a: number, b: number) => a - b;
    const input = [1, 2, 3, 4, 5];
    const out = pickRotationOrder(input, () => 0);
    expect(out.slice().sort(byNumber)).toEqual(input.slice().sort(byNumber));
  });

  test("does not mutate original", () => {
    const input = [1, 2, 3];
    const before = input.slice();
    pickRotationOrder(input, () => 0.5);
    expect(input).toEqual(before);
  });

  test("deterministic with deterministic rng", () => {
    let i = 0;
    const seq = [0.1, 0.5, 0.9, 0.3];
    const rng = () => seq[i++ % seq.length];
    const a = pickRotationOrder([1, 2, 3, 4], rng);
    i = 0;
    const b = pickRotationOrder([1, 2, 3, 4], rng);
    expect(a).toEqual(b);
  });
});

describe("nextNoteIndex", () => {
  test("wraps around", () => {
    expect(nextNoteIndex(0, 3)).toBe(1);
    expect(nextNoteIndex(2, 3)).toBe(0);
  });

  test("returns 0 when total is 0", () => {
    expect(nextNoteIndex(5, 0)).toBe(0);
  });
});

describe("pickIntervalMs", () => {
  test("falls within 4000-6000ms range", () => {
    expect(pickIntervalMs(() => 0)).toBe(4000);
    expect(pickIntervalMs(() => 0.9999)).toBe(6000);
    expect(pickIntervalMs(() => 0.5)).toBeGreaterThanOrEqual(4000);
    expect(pickIntervalMs(() => 0.5)).toBeLessThanOrEqual(6000);
  });
});
