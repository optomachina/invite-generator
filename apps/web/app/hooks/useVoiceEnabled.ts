"use client";

import { useEffect, useState } from "react";

// Polls /api/v1/voice-status once on mount. Voice UI consumers check this
// before rendering mic affordances; when voice is gated off (flag or budget),
// the intake silently reverts to text-only per V1.1.
export function useVoiceEnabled(): { enabled: boolean; loaded: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/voice-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((j) => {
        if (cancelled) return;
        setEnabled(Boolean(j.enabled));
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(false);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loaded };
}
