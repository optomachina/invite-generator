"use client";

import type { ReactNode } from "react";
import { motion, type MotionValue } from "framer-motion";
import type { SwipeCardData } from "@/app/components/swipe-types";

type SwipeCardProps = {
  card: SwipeCardData;
  isTop: boolean;
  canSwipe: boolean;
  canSkip: boolean;
  onSkip: () => void;
  keepStampOpacity?: MotionValue<number>;
  passStampOpacity?: MotionValue<number>;
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function fmtUsd(n?: number): string {
  if (typeof n !== "number") return "";
  return usdFormatter.format(n);
}

export function SwipeCard({
  card,
  isTop,
  canSwipe,
  canSkip,
  onSkip,
  keepStampOpacity,
  passStampOpacity,
}: Readonly<SwipeCardProps>) {
  let media: ReactNode;
  if (card.status === "ready" && card.imageUrl) {
    media = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.imageUrl}
          alt={`Concept ${card.index + 1}`}
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent" />
      </>
    );
  } else if (card.status === "error") {
    media = (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,_rgba(224,119,78,0.22),_transparent_55%),linear-gradient(180deg,_#fff7f0,_#f6e8dd)] px-8 text-center">
        <div className="rounded-full border border-[#d38b70] bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#99553c]">
          Variant failed
        </div>
        <div>
          <h3 className="font-serif text-3xl text-ink">Still generating the next look</h3>
          <p className="mt-2 text-sm text-ink/70">
            {card.error ?? "We couldn't generate this concept. Try again."}
          </p>
        </div>
        {canSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-white/80"
          >
            Skip this card
          </button>
        )}
      </div>
    );
  } else {
    media = (
      <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(201,153,79,0.22),_transparent_48%),linear-gradient(180deg,_#f8efdf,_#efe1ca)]">
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(115deg,transparent_15%,rgba(255,255,255,0.55)_45%,transparent_75%)]" />
        <div className="absolute left-6 right-6 top-6 h-16 rounded-[1.5rem] border border-white/50 bg-white/45" />
        <div className="absolute left-6 right-6 top-28 bottom-24 rounded-[2rem] border border-white/40 bg-white/35" />
        <div className="absolute bottom-6 left-6 right-20 h-5 rounded-full bg-white/45" />
        <div className="absolute bottom-6 right-6 h-5 w-12 rounded-full bg-white/35" />
      </div>
    );
  }

  let statusLabel = "warming up";
  if (card.status === "ready") {
    statusLabel = "ready to review";
  } else if (card.status === "error") {
    statusLabel = "needs retry";
  }

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-ink/10 bg-[#fffaf2] shadow-[0_24px_80px_rgba(68,40,16,0.14)]">
      <div className="relative flex-1 overflow-hidden bg-[#f1e7d6]">
        {media}

        {isTop && card.status === "loading" && (
          <div className="absolute inset-x-5 bottom-5 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-center text-xs font-medium tracking-[0.16em] text-ink/70 backdrop-blur">
            generating your next card
          </div>
        )}
        {isTop && canSwipe && keepStampOpacity && (
          <motion.div
            style={{ opacity: keepStampOpacity }}
            className="pointer-events-none absolute left-6 top-8 -rotate-12 rounded-md border-4 border-emerald-500 px-3 py-1 text-2xl font-extrabold uppercase tracking-[0.18em] text-emerald-500"
            aria-hidden="true"
          >
            Keep
          </motion.div>
        )}
        {isTop && canSwipe && passStampOpacity && (
          <motion.div
            style={{ opacity: passStampOpacity }}
            className="pointer-events-none absolute right-6 top-8 rotate-12 rounded-md border-4 border-rose-500 px-3 py-1 text-2xl font-extrabold uppercase tracking-[0.18em] text-rose-500"
            aria-hidden="true"
          >
            Pass
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ink/10 px-5 py-4">
        <div>
          <div className="font-serif text-2xl text-ink">Concept {card.index + 1}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink/55">{statusLabel}</div>
        </div>
        <div className="text-right text-xs text-ink/60">
          {typeof card.ms === "number" && <div>{(card.ms / 1000).toFixed(1)}s</div>}
          {typeof card.costUsd === "number" && <div>{fmtUsd(card.costUsd)}</div>}
          {!canSwipe && card.status === "ready" && <div>swiped</div>}
        </div>
      </div>
    </article>
  );
}
