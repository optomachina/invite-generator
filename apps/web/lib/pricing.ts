// Per-image USD cost. gpt-image-1 numbers from OpenAI's published pricing.
// gpt-image-2 is unknown at training cutoff — using v1 numbers as a placeholder
// until the first real invoice. Refine in DEPLOY.md cost-watch step.

export type Model = "gpt-image-2" | "gpt-image-1";
export type Quality = "low" | "medium" | "high" | "auto";
export type Size = "1024x1024" | "1024x1536" | "1536x1024" | "auto";

export type Settings = {
  model: Model;
  quality: Quality;
  size: Size;
  n: number;
};

export const VALID_MODELS: Model[] = ["gpt-image-2", "gpt-image-1"];
export const VALID_QUALITY: Quality[] = ["low", "medium", "high", "auto"];
export const VALID_SIZE: Size[] = ["1024x1024", "1024x1536", "1536x1024", "auto"];

const v1Pricing = {
  low:    { "1024x1024": 0.011, "1024x1536": 0.016, "1536x1024": 0.016 },
  medium: { "1024x1024": 0.042, "1024x1536": 0.063, "1536x1024": 0.063 },
  high:   { "1024x1024": 0.167, "1024x1536": 0.25,  "1536x1024": 0.25  },
} as const;

const COST_TABLE: Record<Model, typeof v1Pricing> = {
  "gpt-image-1": v1Pricing,
  "gpt-image-2": v1Pricing,
};

export function estimateCostUsd(s: Settings): number {
  const q: Exclude<Quality, "auto"> = s.quality === "auto" ? "medium" : s.quality;
  const sz: Exclude<Size, "auto"> = s.size === "auto" ? "1024x1536" : s.size;
  return COST_TABLE[s.model][q][sz] * s.n;
}
