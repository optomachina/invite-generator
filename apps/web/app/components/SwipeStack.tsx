"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { SwipeCard } from "@/app/components/SwipeCard";
import type { SwipeCardData } from "@/app/components/swipe-types";

type SwipeStackProps = {
  cards: SwipeCardData[];
  sessionKey: number;
};

type SwipeDirection = "left" | "right";

type DismissedEntry = {
  id: string;
  direction: SwipeDirection;
};

const EXIT_X = 520;
const EXIT_ROTATION = 22;
const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
const STAMP_REVEAL = 60;

export function SwipeStack({ cards, sessionKey }: Readonly<SwipeStackProps>) {
  const [dismissedHistory, setDismissedHistory] = useState<DismissedEntry[]>([]);
  const [removingById, setRemovingById] = useState<Record<string, SwipeDirection>>({});
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const timeoutIdsRef = useRef<Array<ReturnType<typeof globalThis.setTimeout>>>([]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const cardOpacity = useTransform(
    x,
    [-200, -SWIPE_OFFSET_THRESHOLD, 0, SWIPE_OFFSET_THRESHOLD, 200],
    [0.6, 0.85, 1, 0.85, 0.6],
  );
  const keepStampOpacity = useTransform(x, [0, STAMP_REVEAL, SWIPE_OFFSET_THRESHOLD], [0, 0.4, 1]);
  const passStampOpacity = useTransform(
    x,
    [-SWIPE_OFFSET_THRESHOLD, -STAMP_REVEAL, 0],
    [1, 0.4, 0],
  );

  useEffect(() => {
    setDismissedHistory([]);
    setRemovingById({});
    setPickedLabel(null);
    timeoutIdsRef.current.forEach((id) => globalThis.clearTimeout(id));
    timeoutIdsRef.current = [];
    x.set(0);
  }, [sessionKey, x]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => globalThis.clearTimeout(id));
    };
  }, []);

  const dismissedIds = useMemo(() => dismissedHistory.map((entry) => entry.id), [dismissedHistory]);
  const visibleCards = cards.filter((card) => !dismissedIds.includes(card.id));
  const topCard = visibleCards[0];
  const totalCards = cards.length;
  const currentIndex = dismissedHistory.length;

  let statusText = "No more cards in this round.";
  if (topCard?.status === "loading") {
    statusText = "Next card is still rendering.";
  } else if (topCard?.status === "error") {
    statusText = "Skip the failed card to keep reviewing.";
  } else if (topCard) {
    statusText = "Swipe left to pass, right to shortlist.";
  }

  function dismiss(card: SwipeCardData, direction: SwipeDirection) {
    if (removingById[card.id]) return;
    if (direction === "right") {
      setPickedLabel(`Concept ${card.index + 1} liked`);
    } else {
      setPickedLabel(null);
    }
    setRemovingById((prev) => ({ ...prev, [card.id]: direction }));
    const timeoutId = globalThis.setTimeout(() => {
      setDismissedHistory((prev) => prev.concat({ id: card.id, direction }));
      setRemovingById((prev) => {
        const next = { ...prev };
        delete next[card.id];
        return next;
      });
      x.set(0);
    }, 220);
    timeoutIdsRef.current.push(timeoutId);
  }

  function undo() {
    if (dismissedHistory.length === 0) return;
    setDismissedHistory((prev) => prev.slice(0, -1));
    setPickedLabel(null);
    x.set(0);
  }

  if (cards.length === 0) return null;

  const canActOnTop = topCard?.status === "ready" && !removingById[topCard.id];
  const canSkipTop = topCard?.status === "error" && !removingById[topCard.id];

  return (
    <section>
      <ProgressDots total={totalCards} current={currentIndex} history={dismissedHistory} />

      <div className="relative mx-auto h-[31rem] max-w-sm sm:h-[38rem]">
        {visibleCards
          .slice(0, 3)
          .reverse()
          .map((card, stackIndex, reversedCards) => {
            const depth = reversedCards.length - stackIndex - 1;
            const isTop = depth === 0;
            const isRemoving = removingById[card.id];
            const canSwipe = isTop && card.status === "ready" && !isRemoving;
            const canSkip = isTop && card.status === "error" && !isRemoving;

            const topMotionStyle = isTop
              ? { x, rotate, opacity: cardOpacity }
              : undefined;

            return (
              <motion.div
                key={card.id}
                drag={canSwipe ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(_, info) => {
                  if (!canSwipe) return;
                  const past = Math.abs(info.offset.x) > SWIPE_OFFSET_THRESHOLD;
                  const fast = Math.abs(info.velocity.x) > SWIPE_VELOCITY_THRESHOLD;
                  if (!past && !fast) return;
                  if (info.offset.x > 0 || info.velocity.x > 0) {
                    dismiss(card, "right");
                  } else {
                    dismiss(card, "left");
                  }
                }}
                style={topMotionStyle}
                animate={
                  isRemoving
                    ? {
                        x: isRemoving === "right" ? EXIT_X : -EXIT_X,
                        rotate: isRemoving === "right" ? EXIT_ROTATION : -EXIT_ROTATION,
                        opacity: 0,
                      }
                    : isTop
                      ? undefined
                      : {
                          x: 0,
                          y: depth * 14,
                          scale: 1 - depth * 0.035,
                          rotate: depth * -0.8,
                          opacity: 1 - depth * 0.08,
                        }
                }
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="absolute inset-0 touch-pan-y"
              >
                <SwipeCard
                  card={card}
                  isTop={isTop}
                  canSwipe={canSwipe}
                  canSkip={canSkip}
                  onSkip={() => dismiss(card, "left")}
                  keepStampOpacity={isTop && !isRemoving ? keepStampOpacity : undefined}
                  passStampOpacity={isTop && !isRemoving ? passStampOpacity : undefined}
                />
              </motion.div>
            );
          })}
      </div>

      <ActionButtons
        canAct={Boolean(canActOnTop)}
        canSkip={Boolean(canSkipTop)}
        canUndo={dismissedHistory.length > 0}
        onPass={() => topCard && dismiss(topCard, "left")}
        onKeep={() => topCard && dismiss(topCard, "right")}
        onSkip={() => topCard && dismiss(topCard, "left")}
        onUndo={undo}
      />

      <div className="mt-5 flex min-h-7 items-center justify-between gap-4 text-sm text-ink/65">
        <span>{statusText}</span>
        <span className="font-medium text-ink/75">{pickedLabel}</span>
      </div>
    </section>
  );
}

type ProgressDotsProps = {
  total: number;
  current: number;
  history: DismissedEntry[];
};

function ProgressDots({ total, current, history }: Readonly<ProgressDotsProps>) {
  if (total === 0) return null;
  return (
    <div className="mb-4 flex items-center justify-center gap-2" aria-label={`Card ${Math.min(current + 1, total)} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const past = i < history.length;
        const isCurrent = i === history.length;
        const direction = past ? history[i].direction : null;
        const dotClass = isCurrent
          ? "h-2.5 w-2.5 rounded-full bg-ink"
          : past && direction === "right"
            ? "h-1.5 w-1.5 rounded-full bg-emerald-500/70"
            : past
              ? "h-1.5 w-1.5 rounded-full bg-ink/30"
              : "h-1.5 w-1.5 rounded-full border border-ink/25 bg-transparent";
        return <span key={i} className={dotClass} />;
      })}
    </div>
  );
}

type ActionButtonsProps = {
  canAct: boolean;
  canSkip: boolean;
  canUndo: boolean;
  onPass: () => void;
  onKeep: () => void;
  onSkip: () => void;
  onUndo: () => void;
};

function ActionButtons({
  canAct,
  canSkip,
  canUndo,
  onPass,
  onKeep,
  onSkip,
  onUndo,
}: Readonly<ActionButtonsProps>) {
  const passEnabled = canAct || canSkip;
  return (
    <div className="mt-6 flex items-center justify-center gap-5">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo last swipe"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-white text-ink shadow-sm transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
        </svg>
      </button>

      <button
        type="button"
        onClick={canSkip ? onSkip : onPass}
        disabled={!passEnabled}
        aria-label="Pass on this concept"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 shadow-[0_8px_24px_rgba(220,38,38,0.18)] transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onKeep}
        disabled={!canAct}
        aria-label="Keep this concept"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600 shadow-[0_8px_24px_rgba(16,185,129,0.22)] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7.5-4.5-10-9.4C.6 8 2.7 4 6.5 4c2 0 3.6 1 5.5 3 1.9-2 3.5-3 5.5-3 3.8 0 5.9 4 4.5 7.6C19.5 16.5 12 21 12 21z" />
        </svg>
      </button>
    </div>
  );
}
