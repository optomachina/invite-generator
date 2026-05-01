import { describe, expect, test } from "bun:test";
import {
  COMMIT_DISTANCE_PX,
  computePeekOpacity,
  computeStampOpacity,
  computeTilt,
  MAX_TILT_DEG,
  MIN_PEEK_OPACITY,
  popDismissed,
  pushDismissed,
  progressFraction,
  shouldCommit,
  TILT_REFERENCE_PX,
  type DismissedEntry,
} from "./swipe";

describe("shouldCommit", () => {
  test("returns null when below threshold and slow", () => {
    expect(shouldCommit(0, 0)).toBeNull();
    expect(shouldCommit(40, 100)).toBeNull();
    expect(shouldCommit(-50, -200)).toBeNull();
    expect(shouldCommit(COMMIT_DISTANCE_PX, 0)).toBeNull();
  });

  test("commits right past distance threshold", () => {
    expect(shouldCommit(COMMIT_DISTANCE_PX + 1, 0)).toBe("right");
    expect(shouldCommit(200, 0)).toBe("right");
  });

  test("commits left past negative distance threshold", () => {
    expect(shouldCommit(-(COMMIT_DISTANCE_PX + 1), 0)).toBe("left");
    expect(shouldCommit(-200, 0)).toBe("left");
  });

  test("commits right on velocity even when offset is small", () => {
    expect(shouldCommit(20, 800)).toBe("right");
  });

  test("commits left on negative velocity", () => {
    expect(shouldCommit(-20, -800)).toBe("left");
  });
});

describe("computeTilt", () => {
  test("zero offset = zero tilt", () => {
    expect(computeTilt(0)).toBe(0);
  });

  test("clamps to max tilt at reference distance", () => {
    expect(computeTilt(TILT_REFERENCE_PX)).toBe(MAX_TILT_DEG);
    expect(computeTilt(-TILT_REFERENCE_PX)).toBe(-MAX_TILT_DEG);
  });

  test("clamps beyond reference", () => {
    expect(computeTilt(TILT_REFERENCE_PX * 3)).toBe(MAX_TILT_DEG);
    expect(computeTilt(-TILT_REFERENCE_PX * 3)).toBe(-MAX_TILT_DEG);
  });

  test("scales linearly between zero and reference", () => {
    expect(computeTilt(TILT_REFERENCE_PX / 2)).toBeCloseTo(MAX_TILT_DEG / 2);
  });
});

describe("computePeekOpacity", () => {
  test("full opacity at center", () => {
    expect(computePeekOpacity(0)).toBe(1);
  });

  test("min opacity at reference distance both sides", () => {
    expect(computePeekOpacity(TILT_REFERENCE_PX)).toBeCloseTo(MIN_PEEK_OPACITY);
    expect(computePeekOpacity(-TILT_REFERENCE_PX)).toBeCloseTo(MIN_PEEK_OPACITY);
  });

  test("clamps beyond reference", () => {
    expect(computePeekOpacity(TILT_REFERENCE_PX * 5)).toBeCloseTo(MIN_PEEK_OPACITY);
  });
});

describe("computeStampOpacity", () => {
  test("right stamp invisible at zero or negative drag", () => {
    expect(computeStampOpacity(0, "right")).toBe(0);
    expect(computeStampOpacity(-50, "right")).toBe(0);
  });

  test("left stamp invisible at zero or positive drag", () => {
    expect(computeStampOpacity(0, "left")).toBe(0);
    expect(computeStampOpacity(50, "left")).toBe(0);
  });

  test("right stamp reaches full at commit distance", () => {
    expect(computeStampOpacity(COMMIT_DISTANCE_PX, "right")).toBe(1);
    expect(computeStampOpacity(COMMIT_DISTANCE_PX * 2, "right")).toBe(1);
  });

  test("left stamp reaches full at negative commit distance", () => {
    expect(computeStampOpacity(-COMMIT_DISTANCE_PX, "left")).toBe(1);
    expect(computeStampOpacity(-COMMIT_DISTANCE_PX * 2, "left")).toBe(1);
  });

  test("scales linearly mid-drag", () => {
    expect(computeStampOpacity(COMMIT_DISTANCE_PX / 2, "right")).toBeCloseTo(0.5);
    expect(computeStampOpacity(-COMMIT_DISTANCE_PX / 2, "left")).toBeCloseTo(0.5);
  });
});

describe("undo history", () => {
  test("push appends entry", () => {
    const start: DismissedEntry[] = [];
    const next = pushDismissed(start, { id: "a", direction: "right" });
    expect(next).toEqual([{ id: "a", direction: "right" }]);
    expect(start).toEqual([]);
  });

  test("pop returns last entry and shorter history", () => {
    const history: DismissedEntry[] = [
      { id: "a", direction: "right" },
      { id: "b", direction: "left" },
    ];
    const { history: next, popped } = popDismissed(history);
    expect(popped).toEqual({ id: "b", direction: "left" });
    expect(next).toEqual([{ id: "a", direction: "right" }]);
  });

  test("pop on empty history returns null", () => {
    const { history: next, popped } = popDismissed([]);
    expect(popped).toBeNull();
    expect(next).toEqual([]);
  });
});

describe("progressFraction", () => {
  test("zero total guards against divide-by-zero", () => {
    expect(progressFraction(0, 0)).toBe(0);
    expect(progressFraction(5, 0)).toBe(0);
  });

  test("ratio is clamped 0..1", () => {
    expect(progressFraction(0, 4)).toBe(0);
    expect(progressFraction(2, 4)).toBe(0.5);
    expect(progressFraction(4, 4)).toBe(1);
    expect(progressFraction(10, 4)).toBe(1);
    expect(progressFraction(-1, 4)).toBe(0);
  });
});
