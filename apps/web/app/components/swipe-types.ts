export type SwipeCardStatus = "loading" | "ready" | "error";

export type SwipeCardData = {
  id: string;
  index: number;
  status: SwipeCardStatus;
  imageUrl?: string;
  error?: string;
  ms?: number;
  costUsd?: number;
};
