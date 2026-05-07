import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import { renderOverlay } from "./render";
import type { OverlayFields } from "./types";

const FIELDS: OverlayFields = {
  honoree: "Lily",
  event: "5th birthday",
  date: "Saturday, June 13",
  time: "2:00 PM",
  location: "Magnolia Park, Pavilion 3",
  customLine: "Bring your favorite stuffed animal",
};

async function makeCreamBackground(): Promise<string> {
  const buf = await sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 3,
      background: { r: 252, g: 244, b: 230 },
    },
  })
    .png()
    .toBuffer();
  return buf.toString("base64");
}

describe("renderOverlay smoke", () => {
  test("composites script stack onto a cream background", async () => {
    const imageB64 = await makeCreamBackground();
    const out = await renderOverlay({
      imageB64,
      layout: "bottom-third",
      fontStack: "script",
      fields: FIELDS,
    });
    expect(out.imageB64.length).toBeGreaterThan(0);

    const outBuf = Buffer.from(out.imageB64, "base64");
    const meta = await sharp(outBuf).metadata();
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(1536);

    if (process.env.WRITE_SMOKE_OUTPUTS === "1") {
      const outDir = path.resolve(import.meta.dirname, "../../../../.context");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(path.join(outDir, "v17-smoke-script.png"), outBuf);
    }
  });

  test("composites sans stack onto a cream background", async () => {
    const imageB64 = await makeCreamBackground();
    const out = await renderOverlay({
      imageB64,
      layout: "bottom-third",
      fontStack: "sans",
      fields: FIELDS,
    });
    const outBuf = Buffer.from(out.imageB64, "base64");
    const meta = await sharp(outBuf).metadata();
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(1536);

    if (process.env.WRITE_SMOKE_OUTPUTS === "1") {
      const outDir = path.resolve(import.meta.dirname, "../../../../.context");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(path.join(outDir, "v17-smoke-sans.png"), outBuf);
    }
  });
});
