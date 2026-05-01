"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { renderApplicable } from "@/lib/thinking-notes/render";
import {
  nextNoteIndex,
  pickIntervalMs,
  pickRotationOrder,
} from "@/lib/thinking-notes/rotate";

type GeneratingStatusProps = {
  active: boolean;
  status: string;
  honoree?: string;
  event?: string;
  sessionKey: number;
};

export function GeneratingStatus({
  active,
  status,
  honoree,
  event,
  sessionKey,
}: Readonly<GeneratingStatusProps>) {
  const notes = useMemo(
    () => pickRotationOrder(renderApplicable({ name: honoree, event })),
    [honoree, event, sessionKey],
  );
  const [noteIndex, setNoteIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  useEffect(() => {
    setNoteIndex(0);
  }, [sessionKey]);

  useEffect(() => {
    if (!active || notes.length <= 1) return;
    function tick() {
      setNoteIndex((i) => nextNoteIndex(i, notes.length));
      timeoutRef.current = globalThis.setTimeout(tick, pickIntervalMs());
    }
    timeoutRef.current = globalThis.setTimeout(tick, pickIntervalMs());
    return () => {
      if (timeoutRef.current) globalThis.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [active, notes.length, sessionKey]);

  if (!active) return null;

  const note = notes[noteIndex]?.text ?? "";

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 rounded-2xl border border-ink/10 bg-white/60 px-5 py-5 text-center shadow-[0_8px_28px_rgba(68,40,16,0.06)] backdrop-blur"
    >
      <div className="font-serif text-lg text-ink sm:text-xl">{status}</div>
      <div className="relative mt-3 h-5 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={notes[noteIndex]?.id ?? noteIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-sm italic text-ink/70"
          >
            {note}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
