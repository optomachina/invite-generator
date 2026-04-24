"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SwipeCard } from "@/app/components/SwipeCard";
import type { SwipeCardData } from "@/app/components/swipe-types";

type SwipeStackProps = {
  cards: SwipeCardData[];
  sessionKey: number;
};

type SwipeDirection = "left" | "right";

const EXIT_X = 420;
const EXIT_ROTATION = 18;
const SWIPE_THRESHOLD = 110;

export function SwipeStack({ cards, sessionKey }: Readonly<SwipeStackProps>) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [removingById, setRemovingById] = useState<Record<string, SwipeDirection>>({});
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const timeoutIdsRef = useRef<Array<ReturnType<typeof globalThis.setTimeout>>>([]);

  useEffect(() => {
    setDismissedIds([]);
    setRemovingById({});
    setPickedLabel(null);
    timeoutIdsRef.current.forEach((id) => globalThis.clearTimeout(id));
    timeoutIdsRef.current = [];
  }, [sessionKey]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => globalThis.clearTimeout(id));
    };
  }, []);

  const visibleCards = cards.filter((card) => !dismissedIds.includes(card.id));
  const topCard = visibleCards[0];
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
      setDismissedIds((prev) => prev.concat(card.id));
      setRemovingById((prev) => {
        const next = { ...prev };
        delete next[card.id];
        return next;
      });
    }, 180);
    timeoutIdsRef.current.push(timeoutId);
  }

  if (cards.length === 0) return null;

  return (
    <section>
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

            return (
              <motion.div
                key={card.id}
                drag={canSwipe ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (!canSwipe) return;
                  if (info.offset.x > SWIPE_THRESHOLD) dismiss(card, "right");
                  if (info.offset.x < -SWIPE_THRESHOLD) dismiss(card, "left");
                }}
                animate={
                  isRemoving
                    ? {
                        x: isRemoving === "right" ? EXIT_X : -EXIT_X,
                        rotate: isRemoving === "right" ? EXIT_ROTATION : -EXIT_ROTATION,
                        opacity: 0,
                      }
                    : {
                        x: 0,
                        y: depth * 14,
                        scale: 1 - depth * 0.035,
                        rotate: depth * -0.8,
                        opacity: 1 - depth * 0.08,
                      }
                }
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className="absolute inset-0 touch-pan-y"
                style={{ zIndex: 10 - depth }}
              >
                <SwipeCard
                  card={card}
                  isTop={isTop}
                  canSwipe={canSwipe}
                  canSkip={canSkip}
                  onSkip={() => dismiss(card, "left")}
                />
              </motion.div>
            );
          })}
      </div>

      <div className="mt-5 flex min-h-7 items-center justify-between gap-4 text-sm text-ink/65">
        <span>{statusText}</span>
        <span className="font-medium text-ink/75">{pickedLabel}</span>
      </div>
    </section>
  );
}
