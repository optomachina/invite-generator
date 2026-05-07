export const LAYOUT_IDS = ["bottom-third"] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export const FONT_STACK_IDS = ["script", "sans"] as const;
export type FontStackId = (typeof FONT_STACK_IDS)[number];

export type OverlayFields = {
  honoree: string;
  event: string;
  date: string;
  time: string;
  location: string;
  customLine: string;
};

export const DEFAULT_LAYOUT: LayoutId = "bottom-third";
export const DEFAULT_FONT_STACK: FontStackId = "script";

export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 1536;

export function isLayoutId(v: unknown): v is LayoutId {
  return typeof v === "string" && (LAYOUT_IDS as readonly string[]).includes(v);
}

export function isFontStackId(v: unknown): v is FontStackId {
  return typeof v === "string" && (FONT_STACK_IDS as readonly string[]).includes(v);
}
