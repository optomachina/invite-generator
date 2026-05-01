"use client";

import { useMemo, useState } from "react";
import type { SwipeCardData } from "@/app/components/swipe-types";
import {
  EditTextForm,
  type ComparePayFields,
} from "@/app/components/EditTextForm";

type ComparePayScreenProps = {
  kept: SwipeCardData[];
  initialFields: ComparePayFields;
  onBack: () => void;
  onPay: (winner: SwipeCardData, fields: ComparePayFields) => void;
};

const PRICE_USD = 7;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function pickInitialId(kept: SwipeCardData[]): string | null {
  const firstReady = kept.find((c) => c.status === "ready");
  if (firstReady) return firstReady.id;
  return kept[0]?.id ?? null;
}

export function ComparePayScreen({
  kept,
  initialFields,
  onBack,
  onPay,
}: Readonly<ComparePayScreenProps>) {
  const [fields, setFields] = useState<ComparePayFields>(initialFields);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    pickInitialId(kept),
  );

  const winner = useMemo(
    () => kept.find((c) => c.id === selectedId) ?? null,
    [kept, selectedId],
  );

  const priceLabel = usdFormatter.format(PRICE_USD);

  if (kept.length === 0) {
    return (
      <section className="rounded-[2rem] border border-ink/10 bg-[#fffaf2] p-6 shadow-[0_24px_80px_rgba(68,40,16,0.14)] sm:p-8">
        <h2 className="font-serif text-3xl text-ink">No favorites yet</h2>
        <p className="mt-2 text-sm text-ink/70">
          Go back and keep at least one concept to continue.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-white/80"
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-ink/10 bg-[#fffaf2] p-6 shadow-[0_24px_80px_rgba(68,40,16,0.14)] sm:p-8">
      <header>
        <h2 className="font-serif text-3xl text-ink">Pick your favorite</h2>
        <p className="mt-2 text-sm text-ink/70">
          Edit any details, then check out for {priceLabel}.
        </p>
      </header>

      <div
        role="radiogroup"
        aria-label="Choose your favorite concept"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
      >
        {kept.map((card) => {
          const selected = card.id === selectedId;
          const baseBorder = selected
            ? "border-emerald-500 ring-2 ring-emerald-500/30"
            : "border-ink/10";
          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSelectedId(card.id)}
              className={`group flex flex-col overflow-hidden rounded-[1.5rem] border bg-white text-left transition ${baseBorder}`}
            >
              <div className="relative aspect-[5/7] overflow-hidden bg-[#f1e7d6]">
                {card.status === "ready" && card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.imageUrl}
                    alt={`Concept ${card.index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-ink/55">
                    {card.status === "error" ? "unavailable" : "loading"}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 font-serif text-lg text-ink">
                Concept {card.index + 1}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <EditTextForm fields={fields} onChange={setFields} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink/10 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-white/80"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!winner}
          onClick={() => {
            if (winner) onPay(winner, fields);
          }}
          className="rounded-full bg-ochre px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-ochre/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pay {priceLabel}
        </button>
      </div>
    </section>
  );
}
