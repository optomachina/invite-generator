"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { SwipeCard } from "@/app/components/SwipeCard";
import type { SwipeCardData } from "@/app/components/swipe-types";
import {
  COMMIT_DISTANCE_PX,
  MAX_TILT_DEG,
  MIN_PEEK_OPACITY,
  TILT_REFERENCE_PX,
  popDismissed,
  pushDismissed,
  shouldCommit,
  type DismissedEntry,
  type SwipeDirection,
} from "@/lib/swipe";

export type SwipeRoundResult = {
  kept: SwipeCardData[];
  passed: SwipeCardData[];
};

type SwipeStackProps = {
  cards: SwipeCardData[];
  sessionKey: number;
  onRoundComplete?: (result: SwipeRoundResult) => void;
};

const EXIT_X = 480;
const EXIT_ROTATION = 18;

export function SwipeStack({ cards, sessionKey, onRoundComplete }: Readonly<SwipeStackProps>) {
  const [dismissed, setDismissed] = useState<DismissedEntry[]>([]);
  const [removingById, setRemovingById] = useState<Record<string, SwipeDirection>>({});
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const timeoutIdsRef = useRef<Array<ReturnType<typeof globalThis.setTimeout>>>([]);

  const dragX = useMotionValue(0);
  const dragRotate = useTransform(
    dragX,
    [-TILT_REFERENCE_PX, 0, TILT_REFERENCE_PX],
    [-MAX_TILT_DEG, 0, MAX_TILT_DEG],
  );
  const dragOpacity = useTransform(
    dragX,
    [-TILT_REFERENCE_PX, 0, TILT_REFERENCE_PX],
    [MIN_PEEK_OPACITY, 1, MIN_PEEK_OPACITY],
  );
  const likeStampOpacity = useTransform(dragX, [0, COMMIT_DISTANCE_PX], [0, 1]);
  const nopeStampOpacity = useTransform(dragX, [-COMMIT_DISTANCE_PX, 0], [1, 0]);

  useEffect(() => {
    setDismissed([]);
    setRemovingById({});
    setPickedLabel(null);
    dragX.set(0);
    timeoutIdsRef.current.forEach((id) => globalThis.clearTimeout(id));
    timeoutIdsRef.current = [];
  }, [sessionKey, dragX]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => globalThis.clearTimeout(id));
    };
  }, []);

  const dismissedIds = useMemo(() => new Set(dismissed.map((d) => d.id)), [dismissed]);
  const visibleCards = cards.filter((card) => !dismissedIds.has(card.id));
  const topCard = visibleCards[0];
  const swipedCount = dismissed.length;
  const totalCount = cards.length;

  const actionableCards = cards.filter((card) => card.status !== "loading");
  const everyActionableSwiped =
    actionableCards.length > 0 &&
    cards.every((card) => card.status !== "loading") &&
    actionableCards.every((card) => dismissedIds.has(card.id)) &&
    Object.keys(removingById).length === 0;

  useEffect(() => {
    if (!onRoundComplete) return;
    if (!everyActionableSwiped) return;
    const directionById = new Map<string, SwipeDirection>(
      dismissed.map((entry) => [entry.id, entry.direction]),
    );
    const kept = cards.filter((card) => directionById.get(card.id) === "right");
    const passed = cards.filter((card) => directionById.get(card.id) === "left");
    onRoundComplete({ kept, passed });
  }, [everyActionableSwiped, cards, dismissed, onRoundComplete]);

  let statusText = "No more cards in this round.";
  if (topCard?.status === "loading") {
    statusText = "";
  } else if (topCard?.status === "error") {
    statusText = "Skip the failed card to keep reviewing.";
  } else if (topCard) {
    statusText = "Drag to choose, or tap a button below.";
  }

  function dismiss(card: SwipeCardData, direction: SwipeDirection) {
    if (removingById[card.id]) return;
    if (direction === "right") {
      setPickedLabel(`Concept ${card.index + 1} liked`);
    } else {
      setPickedLabel(null);
    }
    setRemovingById((prev) => ({ ...prev, [card.id]: direction }));
    dragX.set(0);
    const timeoutId = globalThis.setTimeout(() => {
      setDismissed((prev) => pushDismissed(prev, { id: card.id, direction }));
      setRemovingById((prev) => {
        const next = { ...prev };
        delete next[card.id];
        return next;
      });
    }, 220);
    timeoutIdsRef.current.push(timeoutId);
  }

  function undo() {
    if (dismissed.length === 0) return;
    const { history, popped } = popDismissed(dismissed);
    setDismissed(history);
    if (popped?.direction === "right") setPickedLabel(null);
  }

  if (cards.length === 0) return null;

  const canUndo = dismissed.length > 0;
  const topReady = topCard?.status === "ready" && !removingById[topCard.id];
  const topErrored = topCard?.status === "error" && !removingById[topCard.id];

  return (
    <section>
      <ProgressDots total={totalCount} swiped={swipedCount} />

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

            const motionStyle = canSwipe
              ? { x: dragX, rotate: dragRotate, opacity: dragOpacity, zIndex: 10 - depth }
              : { zIndex: 10 - depth };

            let animateTo: Record<string, number> | undefined;
            if (isRemoving) {
              animateTo = {
                x: isRemoving === "right" ? EXIT_X : -EXIT_X,
                rotate: isRemoving === "right" ? EXIT_ROTATION : -EXIT_ROTATION,
                opacity: 0,
              };
            } else if (!canSwipe) {
              animateTo = {
                x: 0,
                y: depth * 14,
                scale: 1 - depth * 0.035,
                rotate: depth * -0.8,
                opacity: 1 - depth * 0.08,
              };
            }

            return (
              <motion.div
                key={card.id}
                drag={canSwipe ? "x" : false}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.7}
                dragSnapToOrigin
                onDragEnd={(_, info) => {
                  if (!canSwipe) return;
                  const direction = shouldCommit(info.offset.x, info.velocity.x);
                  if (direction) dismiss(card, direction);
                }}
                animate={animateTo}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="absolute inset-0 touch-pan-y"
                style={motionStyle}
              >
                <div className="relative h-full">
                  <SwipeCard
                    card={card}
                    canSwipe={canSwipe}
                    canSkip={canSkip}
                    onSkip={() => dismiss(card, "left")}
                  />
                  {canSwipe && (
                    <>
                      <motion.div
                        aria-hidden
                        style={{ opacity: likeStampOpacity }}
                        className="pointer-events-none absolute left-6 top-8 -rotate-12 rounded-xl border-4 border-emerald-500 px-4 py-1 text-xl font-bold uppercase tracking-widest text-emerald-500"
                      >
                        Keep
                      </motion.div>
                      <motion.div
                        aria-hidden
                        style={{ opacity: nopeStampOpacity }}
                        className="pointer-events-none absolute right-6 top-8 rotate-12 rounded-xl border-4 border-rose-500 px-4 py-1 text-xl font-bold uppercase tracking-widest text-rose-500"
                      >
                        Pass
                      </motion.div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-6">
        <ActionButton
          label="Pass"
          variant="pass"
          disabled={!topReady && !topErrored}
          onClick={() => topCard && dismiss(topCard, "left")}
        />
        <ActionButton
          label="Undo"
          variant="undo"
          disabled={!canUndo}
          onClick={undo}
        />
        <ActionButton
          label="Keep"
          variant="keep"
          disabled={!topReady}
          onClick={() => topCard && dismiss(topCard, "right")}
        />
      </div>

      <div className="mt-5 flex min-h-7 items-center justify-between gap-4 text-sm text-ink/65">
        <span>{statusText}</span>
        <span className="font-medium text-ink/75">{pickedLabel}</span>
      </div>
    </section>
  );
}

type ProgressDotsProps = { total: number; swiped: number };

function ProgressDots({ total, swiped }: Readonly<ProgressDotsProps>) {
  if (total <= 0) return null;
  const dots = Array.from({ length: total }, (_, i) => `dot-${i}-of-${total}`);
  return (
    <div className="mb-4 flex items-center justify-center">
      <progress
        value={swiped}
        max={total}
        aria-label="Swipe progress"
        className="sr-only"
      >
        {swiped} of {total}
      </progress>
      <div aria-hidden className="flex items-center gap-2">
        {dots.map((dotKey, i) => {
          const active = i === swiped;
          const done = i < swiped;
          const baseClass = "h-2 rounded-full transition-all duration-300";
          let stateClass: string;
          if (active) {
            stateClass = "w-6 bg-ink/80";
          } else if (done) {
            stateClass = "w-2 bg-ink/50";
          } else {
            stateClass = "w-2 bg-ink/15";
          }
          return <span key={dotKey} className={`${baseClass} ${stateClass}`} />;
        })}
      </div>
    </div>
  );
}

type ActionButtonProps = {
  label: string;
  variant: "pass" | "keep" | "undo";
  disabled: boolean;
  onClick: () => void;
};

function ActionButton({ label, variant, disabled, onClick }: Readonly<ActionButtonProps>) {
  const sizeClass = variant === "undo" ? "h-12 w-12" : "h-16 w-16";
  let colorClass: string;
  if (variant === "pass") {
    colorClass = "border-rose-300 bg-white text-rose-500 hover:bg-rose-50";
  } else if (variant === "keep") {
    colorClass = "border-emerald-300 bg-white text-emerald-500 hover:bg-emerald-50";
  } else {
    colorClass = "border-ink/15 bg-white text-ink/70 hover:bg-ink/5";
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex ${sizeClass} items-center justify-center rounded-full border-2 ${colorClass} shadow-md transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none`}
    >
      <ActionIcon variant={variant} />
    </button>
  );
}

function ActionIcon({ variant }: Readonly<{ variant: "pass" | "keep" | "undo" }>) {
  if (variant === "pass") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden
      >
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </svg>
    );
  }
  if (variant === "keep") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-7 w-7"
        aria-hidden
      >
        <path d="M12 21s-7.5-4.5-9.5-9.5C1 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 23 7.5 21.5 11.5 19.5 16.5 12 21 12 21z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
