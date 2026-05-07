import type { FontStackId, LayoutId } from "@/lib/text-overlay/types";

export type SwipeCardStatus = "loading" | "ready" | "error";

export type SwipeCardData = {
  id: string;
  index: number;
  status: SwipeCardStatus;
  imageUrl?: string;
  imageB64?: string;
  layout?: LayoutId;
  fontStack?: FontStackId;
  error?: string;
  ms?: number;
  costUsd?: number;
};
