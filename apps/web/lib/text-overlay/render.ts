import sharp from "sharp";

import { planOverlay } from "./compose";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type FontStackId,
  type LayoutId,
  type OverlayFields,
} from "./types";

export type RenderInput = {
  imageB64: string;
  layout: LayoutId;
  fontStack: FontStackId;
  fields: OverlayFields;
};

export type RenderResult = {
  imageB64: string;
};

export async function renderOverlay(input: RenderInput): Promise<RenderResult> {
  const baseBuffer = Buffer.from(input.imageB64, "base64");
  const plan = planOverlay(input.fields, input.layout, input.fontStack);

  const composed = await sharp(baseBuffer)
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: "cover" })
    .composite([
      { input: Buffer.from(plan.scrimSvg, "utf8"), top: 0, left: 0 },
      { input: Buffer.from(plan.textSvg, "utf8"), top: 0, left: 0 },
    ])
    .png()
    .toBuffer();

  return { imageB64: composed.toString("base64") };
}
