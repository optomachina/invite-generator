"use client";

import type { SwipeCardData } from "@/app/components/swipe-types";
import type { SwipeRoundResult } from "@/app/components/SwipeStack";

type RoundCompletePanelProps = {
  result: SwipeRoundResult;
  onStartOver: () => void;
  onGenerateMore: () => void;
};

function summaryLine(keptCount: number, totalReviewed: number): string {
  if (totalReviewed === 0) {
    return "No concepts to review yet.";
  }
  if (keptCount === 0) {
    return "No keepers this round — try another batch?";
  }
  if (keptCount === totalReviewed) {
    return `You loved all ${totalReviewed}!`;
  }
  return `You shortlisted ${keptCount} of ${totalReviewed} concepts.`;
}

function readyWithImage(card: SwipeCardData): card is SwipeCardData & { imageUrl: string } {
  return card.status === "ready" && typeof card.imageUrl === "string" && card.imageUrl.length > 0;
}

export function RoundCompletePanel({
  result,
  onStartOver,
  onGenerateMore,
}: Readonly<RoundCompletePanelProps>) {
  const keptVisible = result.kept.filter(readyWithImage);
  const passedVisible = result.passed.filter(readyWithImage);
  const totalReviewed = result.kept.length + result.passed.length;

  return (
    <section className="rounded-[2rem] border border-ink/10 bg-[#fffaf2] p-6 shadow-[0_24px_80px_rgba(68,40,16,0.14)] sm:p-8">
      <header className="mb-6">
        <h2 className="font-serif text-3xl text-ink sm:text-4xl">Round complete</h2>
        <p className="mt-2 text-sm text-ink/70 sm:text-base">
          {summaryLine(result.kept.length, totalReviewed)}
        </p>
      </header>

      {keptVisible.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {keptVisible.map((card) => (
            <figure key={card.id} className="flex flex-col gap-2">
              <div className="aspect-square overflow-hidden rounded-[1.5rem] border border-ink/10 bg-[#f1e7d6]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.imageUrl}
                  alt={`Concept ${card.index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="text-center text-xs uppercase tracking-[0.18em] text-ink/60">
                Concept {card.index + 1}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {passedVisible.length > 0 && (
        <div className="mt-6 border-t border-ink/10 pt-4">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-ink/55">
            Passed ({passedVisible.length})
          </div>
          <div className="flex flex-wrap gap-3 opacity-60">
            {passedVisible.map((card) => (
              <div
                key={card.id}
                className="h-16 w-16 overflow-hidden rounded-[0.9rem] border border-ink/10 bg-[#f1e7d6] sm:h-20 sm:w-20"
                title={`Concept ${card.index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.imageUrl}
                  alt={`Passed concept ${card.index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-cream"
        >
          Start over
        </button>
        <button
          type="button"
          onClick={onGenerateMore}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
        >
          Generate 3 more
        </button>
      </div>
    </section>
  );
}
