import { describe, expect, test } from "bun:test";
import { estimateCostUsd, VALID_MODELS, VALID_QUALITY, VALID_SIZE } from "./pricing";

describe("estimateCostUsd", () => {
  test("scales linearly with n", () => {
    const base = estimateCostUsd({ model: "gpt-image-2", quality: "low", size: "1024x1536", n: 1 });
    const four = estimateCostUsd({ model: "gpt-image-2", quality: "low", size: "1024x1536", n: 4 });
    expect(four).toBeCloseTo(base * 4, 5);
  });

  test("auto quality maps to medium pricing", () => {
    const auto = estimateCostUsd({ model: "gpt-image-2", quality: "auto", size: "1024x1024", n: 1 });
    const med = estimateCostUsd({ model: "gpt-image-2", quality: "medium", size: "1024x1024", n: 1 });
    expect(auto).toBe(med);
  });

  test("auto size maps to 1024x1536 pricing", () => {
    const auto = estimateCostUsd({ model: "gpt-image-1", quality: "high", size: "auto", n: 1 });
    const portrait = estimateCostUsd({ model: "gpt-image-1", quality: "high", size: "1024x1536", n: 1 });
    expect(auto).toBe(portrait);
  });

  test("high quality costs more than low", () => {
    const low = estimateCostUsd({ model: "gpt-image-2", quality: "low", size: "1024x1024", n: 1 });
    const high = estimateCostUsd({ model: "gpt-image-2", quality: "high", size: "1024x1024", n: 1 });
    expect(high).toBeGreaterThan(low);
  });

  test("exposes non-empty option lists", () => {
    expect(VALID_MODELS.length).toBeGreaterThan(0);
    expect(VALID_QUALITY.length).toBeGreaterThan(0);
    expect(VALID_SIZE.length).toBeGreaterThan(0);
  });
});
