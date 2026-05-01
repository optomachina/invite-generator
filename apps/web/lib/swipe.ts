export type SwipeDirection = "left" | "right";

export const COMMIT_DISTANCE_PX = 80;
export const COMMIT_VELOCITY = 0.5;
export const MAX_TILT_DEG = 15;
export const MIN_PEEK_OPACITY = 0.6;
export const TILT_REFERENCE_PX = 160;

export function shouldCommit(offsetX: number, velocityX: number): SwipeDirection | null {
  if (offsetX > COMMIT_DISTANCE_PX || velocityX > COMMIT_VELOCITY * 1000) {
    return "right";
  }
  if (offsetX < -COMMIT_DISTANCE_PX || velocityX < -COMMIT_VELOCITY * 1000) {
    return "left";
  }
  return null;
}

export function computeTilt(offsetX: number): number {
  const ratio = Math.max(-1, Math.min(1, offsetX / TILT_REFERENCE_PX));
  return ratio * MAX_TILT_DEG;
}

export function computePeekOpacity(offsetX: number): number {
  const distance = Math.min(Math.abs(offsetX), TILT_REFERENCE_PX);
  const ratio = distance / TILT_REFERENCE_PX;
  return 1 - (1 - MIN_PEEK_OPACITY) * ratio;
}

export function computeStampOpacity(offsetX: number, direction: SwipeDirection): number {
  if (direction === "right" && offsetX <= 0) return 0;
  if (direction === "left" && offsetX >= 0) return 0;
  const distance = Math.min(Math.abs(offsetX), COMMIT_DISTANCE_PX);
  return distance / COMMIT_DISTANCE_PX;
}

export type DismissedEntry = { id: string; direction: SwipeDirection };

export function pushDismissed(
  history: DismissedEntry[],
  entry: DismissedEntry,
): DismissedEntry[] {
  return history.concat(entry);
}

export function popDismissed(
  history: DismissedEntry[],
): { history: DismissedEntry[]; popped: DismissedEntry | null } {
  if (history.length === 0) return { history, popped: null };
  const popped = history[history.length - 1];
  return { history: history.slice(0, -1), popped };
}

export function progressFraction(swiped: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, swiped / total));
}
