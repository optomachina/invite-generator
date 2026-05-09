import type { OverlayFields } from "./text-overlay/types";

export const MAX_FIELD_LEN = 200;

export const ORDER_FIELD_KEYS: ReadonlyArray<keyof OverlayFields> = [
  "honoree",
  "event",
  "date",
  "time",
  "location",
  "customLine",
];

export function validateOrderFields(raw: unknown): OverlayFields | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<OverlayFields> = {};
  for (const key of ORDER_FIELD_KEYS) {
    const v = r[key];
    if (v === undefined || v === null || v === "") {
      out[key] = "";
      continue;
    }
    if (typeof v !== "string") return null;
    if (v.length > MAX_FIELD_LEN) return null;
    out[key] = v;
  }
  return out as OverlayFields;
}
