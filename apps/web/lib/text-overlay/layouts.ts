import type { FontStackId, LayoutId } from "./types";

export type LineRole = "display" | "subtitle" | "meta" | "location" | "custom";

export type LineSpec = {
  role: LineRole;
  fontRole: "display" | "body" | "bodyBold";
  fontSize: number;
  italic?: boolean;
  uppercase?: boolean;
  letterSpacingEm?: number;
  marginTop: number;
};

export type LayoutSpec = {
  region: { x: number; y: number; w: number; h: number };
  paddingX: number;
  paddingTop: number;
  scrim: { from: string; to: string };
  textColor: string;
  lines: (stack: FontStackId) => Record<LineRole, LineSpec>;
};

const BOTTOM_THIRD: LayoutSpec = {
  region: { x: 0, y: 1024, w: 1024, h: 512 },
  paddingX: 72,
  paddingTop: 56,
  scrim: { from: "rgba(255,250,242,0)", to: "rgba(255,250,242,0.92)" },
  textColor: "#2a1d10",
  lines: (stack) => {
    const displaySize = stack === "script" ? 132 : 88;
    return {
      display: {
        role: "display",
        fontRole: "display",
        fontSize: displaySize,
        marginTop: 0,
      },
      subtitle: {
        role: "subtitle",
        fontRole: "body",
        fontSize: 30,
        uppercase: true,
        letterSpacingEm: 0.18,
        marginTop: stack === "script" ? 4 : 18,
      },
      meta: {
        role: "meta",
        fontRole: "bodyBold",
        fontSize: 26,
        marginTop: 22,
      },
      location: {
        role: "location",
        fontRole: "body",
        fontSize: 24,
        marginTop: 10,
      },
      custom: {
        role: "custom",
        fontRole: "body",
        fontSize: 22,
        italic: true,
        marginTop: 18,
      },
    };
  },
};

const LAYOUTS: Record<LayoutId, LayoutSpec> = {
  "bottom-third": BOTTOM_THIRD,
};

export function getLayout(id: LayoutId): LayoutSpec {
  return LAYOUTS[id];
}
