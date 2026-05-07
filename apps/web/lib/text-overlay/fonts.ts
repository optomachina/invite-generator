import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as opentype from "opentype.js";

import type { FontStackId } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(__dirname, "fonts");

export type LoadedFont = {
  family: string;
  weight: number;
  font: opentype.Font;
};

function loadFont(filename: string): opentype.Font {
  const buf = readFileSync(path.join(FONT_DIR, filename));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

const greatVibes: LoadedFont = {
  family: "Great Vibes",
  weight: 400,
  font: loadFont("GreatVibes-Regular.ttf"),
};
const latoRegular: LoadedFont = {
  family: "Lato",
  weight: 400,
  font: loadFont("Lato-Regular.ttf"),
};
const latoBold: LoadedFont = {
  family: "Lato",
  weight: 700,
  font: loadFont("Lato-Bold.ttf"),
};

const FONT_FAMILIES: Record<
  FontStackId,
  { display: LoadedFont; body: LoadedFont; bodyBold: LoadedFont }
> = {
  script: { display: greatVibes, body: latoRegular, bodyBold: latoBold },
  sans: { display: latoBold, body: latoRegular, bodyBold: latoBold },
};

export function getFontStack(stack: FontStackId) {
  return FONT_FAMILIES[stack];
}
