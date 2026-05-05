import type * as opentype from "opentype.js";

import { getFontStack, type LoadedFont } from "./fonts";
import { getLayout, type LineSpec, type LineRole } from "./layouts";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type FontStackId,
  type LayoutId,
  type OverlayFields,
} from "./types";

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

type ResolvedLine = {
  role: LineRole;
  text: string;
  spec: LineSpec;
};

export function resolveLines(
  fields: OverlayFields,
  layout: LayoutId,
  stack: FontStackId,
): ResolvedLine[] {
  const specs = getLayout(layout).lines(stack);
  const out: ResolvedLine[] = [];

  const honoree = clean(fields.honoree);
  if (honoree) out.push({ role: "display", text: honoree, spec: specs.display });

  const event = clean(fields.event);
  if (event) out.push({ role: "subtitle", text: event, spec: specs.subtitle });

  const date = clean(fields.date);
  const time = clean(fields.time);
  const meta = [date, time].filter(Boolean).join(" · ");
  if (meta) out.push({ role: "meta", text: meta, spec: specs.meta });

  const location = clean(fields.location);
  if (location) out.push({ role: "location", text: location, spec: specs.location });

  const custom = clean(fields.customLine);
  if (custom) out.push({ role: "custom", text: custom, spec: specs.custom });

  return out;
}

function applyCase(text: string, spec: LineSpec): string {
  return spec.uppercase ? text.toUpperCase() : text;
}

function fontMetrics(font: opentype.Font, fontSize: number) {
  const unitsPerEm = font.unitsPerEm;
  const scale = fontSize / unitsPerEm;
  return {
    ascent: font.ascender * scale,
    descent: -font.descender * scale,
    lineHeight: (font.ascender - font.descender) * scale,
  };
}

function renderTextPath(
  font: opentype.Font,
  text: string,
  fontSize: number,
  letterSpacingPx: number,
): { glyphs: { d: string; x: number }[]; width: number } {
  const scale = fontSize / font.unitsPerEm;
  const chars = Array.from(text);
  const glyphs: { d: string; x: number }[] = [];
  let cursor = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const glyph = font.charToGlyph(ch);
    const path = glyph.getPath(0, 0, fontSize);
    const d = path.toPathData(2);
    if (d) glyphs.push({ d, x: cursor });

    let advance = (glyph.advanceWidth ?? 0) * scale;
    if (i < chars.length - 1) {
      const nextGlyph = font.charToGlyph(chars[i + 1]);
      const kern = font.getKerningValue(glyph, nextGlyph);
      advance += kern * scale + letterSpacingPx;
    }
    cursor += advance;
  }

  return { glyphs, width: cursor };
}

export type LinePlan = {
  role: LineRole;
  baselineY: number;
  centerX: number;
  width: number;
  height: number;
};

export type ComposedPlan = {
  scrimSvg: string;
  textSvg: string;
  lines: LinePlan[];
};

export function buildScrimSvg(layout: LayoutId): string {
  const layoutSpec = getLayout(layout);
  const region = layoutSpec.region;
  const scrim = layoutSpec.scrim;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">`,
    `<defs><linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0" stop-color="${scrim.from}"/>`,
    `<stop offset="0.4" stop-color="${scrim.to}"/>`,
    `<stop offset="1" stop-color="${scrim.to}"/>`,
    `</linearGradient></defs>`,
    `<rect x="${region.x}" y="${region.y}" width="${region.w}" height="${region.h}" fill="url(#scrim)"/>`,
    `</svg>`,
  ].join("");
}

function pickFont(
  fonts: ReturnType<typeof getFontStack>,
  spec: LineSpec,
): LoadedFont {
  if (spec.fontRole === "display") return fonts.display;
  if (spec.fontRole === "bodyBold") return fonts.bodyBold;
  return fonts.body;
}

export function planOverlay(
  fields: OverlayFields,
  layout: LayoutId,
  stack: FontStackId,
): ComposedPlan {
  const layoutSpec = getLayout(layout);
  const fonts = getFontStack(stack);
  const region = layoutSpec.region;
  const lines = resolveLines(fields, layout, stack);
  const centerX = region.x + region.w / 2;
  const usableWidth = region.w - layoutSpec.paddingX * 2;

  let cursorTop = region.y + layoutSpec.paddingTop;
  const planLines: LinePlan[] = [];
  const groups: string[] = [];

  for (const line of lines) {
    cursorTop += line.spec.marginTop;
    const loaded = pickFont(fonts, line.spec);
    const text = applyCase(line.text, line.spec);

    const letterSpacingPx = line.spec.letterSpacingEm
      ? line.spec.fontSize * line.spec.letterSpacingEm
      : 0;
    const { glyphs, width: rawWidth } = renderTextPath(
      loaded.font,
      text,
      line.spec.fontSize,
      letterSpacingPx,
    );

    let width = rawWidth;
    let scaleX = 1;
    if (width > usableWidth) {
      scaleX = usableWidth / width;
      width = usableWidth;
    }

    const metrics = fontMetrics(loaded.font, line.spec.fontSize);
    const baselineY = cursorTop + metrics.ascent;
    const lineX = centerX - width / 2;

    const transform =
      scaleX === 1
        ? `translate(${lineX.toFixed(2)} ${baselineY.toFixed(2)})`
        : `translate(${lineX.toFixed(2)} ${baselineY.toFixed(2)}) scale(${scaleX.toFixed(4)} 1)`;

    const pathEls = glyphs
      .map(
        (g) =>
          `<g transform="translate(${g.x.toFixed(2)} 0)"><path d="${g.d}"/></g>`,
      )
      .join("");
    groups.push(
      `<g transform="${transform}" fill="${layoutSpec.textColor}">${pathEls}</g>`,
    );

    planLines.push({
      role: line.role,
      baselineY,
      centerX,
      width,
      height: metrics.lineHeight,
    });

    cursorTop += metrics.lineHeight;
  }

  const textSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">`,
    ...groups,
    `</svg>`,
  ].join("");

  return {
    scrimSvg: buildScrimSvg(layout),
    textSvg,
    lines: planLines,
  };
}
