"use client";

import { useEffect, useRef, useState } from "react";

import type { SwipeCardData } from "@/app/components/swipe-types";
import type { ComparePayFields } from "@/app/components/EditTextForm";
import { b64ToObjectUrl } from "@/lib/image";

export type OverlayState = {
  url?: string;
  loading: boolean;
  error?: string;
};

const DEBOUNCE_MS = 350;

function fieldsKey(fields: ComparePayFields): string {
  return [
    fields.honoree,
    fields.event,
    fields.date,
    fields.time,
    fields.location,
    fields.customLine,
  ].join("");
}

async function fetchOverlay(
  card: SwipeCardData,
  fields: ComparePayFields,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/v1/render-text", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      imageB64: card.imageB64,
      layout: card.layout ?? "bottom-third",
      fontStack: card.fontStack ?? "script",
      fields,
    }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `render failed: ${res.status}`);
  }
  const data = (await res.json()) as { imageB64: string };
  return b64ToObjectUrl(data.imageB64);
}

export function useTextOverlay(
  cards: SwipeCardData[],
  fields: ComparePayFields,
): Record<string, OverlayState> {
  const [state, setState] = useState<Record<string, OverlayState>>({});
  const urlCacheRef = useRef<Record<string, string>>({});
  const inFlightRef = useRef<Map<string, AbortController>>(new Map());
  const lastKeyRef = useRef<Record<string, string>>({});

  useEffect(() => {
    return () => {
      Object.values(urlCacheRef.current).forEach((url) => URL.revokeObjectURL(url));
      urlCacheRef.current = {};
      inFlightRef.current.forEach((c) => c.abort());
      inFlightRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const key = fieldsKey(fields);

    const startRender = async (card: SwipeCardData) => {
      const cardId = card.id;
      if (!card.imageB64 || lastKeyRef.current[cardId] === key) return;
      lastKeyRef.current[cardId] = key;

      inFlightRef.current.get(cardId)?.abort();
      const controller = new AbortController();
      inFlightRef.current.set(cardId, controller);

      setState((prev) => ({
        ...prev,
        [cardId]: { ...prev[cardId], loading: true, error: undefined },
      }));

      try {
        const url = await fetchOverlay(card, fields, controller.signal);
        const prevUrl = urlCacheRef.current[cardId];
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        urlCacheRef.current[cardId] = url;
        setState((s) => ({ ...s, [cardId]: { url, loading: false } }));
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setState((s) => ({ ...s, [cardId]: { ...s[cardId], loading: false, error: message } }));
      } finally {
        if (inFlightRef.current.get(cardId) === controller) {
          inFlightRef.current.delete(cardId);
        }
      }
    };

    const timer = setTimeout(() => {
      for (const card of cards) void startRender(card);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [cards, fields]);

  return state;
}
