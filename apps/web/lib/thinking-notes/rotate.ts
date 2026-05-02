type Note = { id: string; text: string };

export function pickRotationOrder<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function nextNoteIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

export function pickIntervalMs(rng: () => number = Math.random): number {
  return 4000 + Math.floor(rng() * 2001);
}

export type { Note };
