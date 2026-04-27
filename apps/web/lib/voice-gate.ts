// Voice-input feature flag + cost kill-switch.
//
// Two independent gates control whether transcribe is available:
//   1. VOICE_ENABLED env var — manual on/off (PostHog flag stand-in until
//      PostHog is wired up; flip and redeploy or hot-swap via platform UI).
//   2. Rolling 24h spend ceiling — auto-disables once the cost limit is hit.
//
// The store interface is pluggable so the in-memory implementation here can
// be swapped for Redis/Postgres in production without touching callers.

import { logger } from "@/lib/logger";

export type VoiceStatus = {
  enabled: boolean;
  reason: "ok" | "flag_off" | "budget_exceeded";
  rolling24hCostUsd: number;
  warnThresholdUsd: number;
  killThresholdUsd: number;
};

export type UsageEvent = { tsMs: number; costUsd: number };

export interface UsageStore {
  record(event: UsageEvent): Promise<void>;
  sumSince(sinceMs: number): Promise<number>;
}

// In-memory store. Per-instance only — Vercel serverless will run multiple
// instances, so the production deploy MUST replace this with a shared store
// (Upstash Redis is the path of least resistance) before voice ships at scale.
// For pre-launch single-instance dev and the immediate post-ship beta with
// Mrs. W, in-memory is enough to make the kill-switch fire if anything goes
// catastrophically wrong on a single hot instance.
export class InMemoryUsageStore implements UsageStore {
  private events: UsageEvent[] = [];

  async record(event: UsageEvent): Promise<void> {
    this.events.push(event);
    this.gc(event.tsMs - WINDOW_MS);
  }

  async sumSince(sinceMs: number): Promise<number> {
    this.gc(sinceMs);
    let total = 0;
    for (const e of this.events) {
      if (e.tsMs >= sinceMs) total += e.costUsd;
    }
    return total;
  }

  private gc(cutoffMs: number): void {
    if (this.events.length === 0) return;
    let i = 0;
    while (i < this.events.length && this.events[i].tsMs < cutoffMs) i++;
    if (i > 0) this.events = this.events.slice(i);
  }
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

let store: UsageStore = new InMemoryUsageStore();

export function setUsageStore(next: UsageStore): UsageStore {
  const prev = store;
  store = next;
  return prev;
}

function envFlag(name: string, defaultVal: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultVal;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return defaultVal;
}

function envNumber(name: string, defaultVal: number): number {
  const raw = process.env[name];
  if (raw === undefined) return defaultVal;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : defaultVal;
}

export function getThresholds(): { warn: number; kill: number } {
  const warn = envNumber("VOICE_COST_WARN_USD", 40);
  const kill = envNumber("VOICE_COST_KILL_USD", 50);
  return { warn, kill };
}

export async function getVoiceStatus(now: number = Date.now()): Promise<VoiceStatus> {
  const { warn, kill } = getThresholds();
  const flagOn = envFlag("VOICE_ENABLED", false);
  const rolling = await store.sumSince(now - WINDOW_MS);
  if (!flagOn) {
    return {
      enabled: false,
      reason: "flag_off",
      rolling24hCostUsd: rolling,
      warnThresholdUsd: warn,
      killThresholdUsd: kill,
    };
  }
  if (rolling >= kill) {
    return {
      enabled: false,
      reason: "budget_exceeded",
      rolling24hCostUsd: rolling,
      warnThresholdUsd: warn,
      killThresholdUsd: kill,
    };
  }
  return {
    enabled: true,
    reason: "ok",
    rolling24hCostUsd: rolling,
    warnThresholdUsd: warn,
    killThresholdUsd: kill,
  };
}

// Record a transcribe call's cost. Logs a warn-level event when the warn
// threshold is crossed (Sentry-shaped: when @sentry/nextjs is wired up, a
// future hook can promote any voice.budget.* warn into a Sentry alert).
export async function recordTranscribeUsage(
  costUsd: number,
  now: number = Date.now(),
): Promise<{ rolling24hCostUsd: number; killed: boolean }> {
  if (!Number.isFinite(costUsd) || costUsd < 0) {
    throw new Error("costUsd must be a non-negative finite number");
  }
  await store.record({ tsMs: now, costUsd });
  const { warn, kill } = getThresholds();
  const rolling = await store.sumSince(now - WINDOW_MS);
  if (rolling >= kill) {
    logger.error("voice.budget.killed", {
      rolling24hCostUsd: rolling,
      killThresholdUsd: kill,
    });
    return { rolling24hCostUsd: rolling, killed: true };
  }
  if (rolling >= warn) {
    logger.warn("voice.budget.warn", {
      rolling24hCostUsd: rolling,
      warnThresholdUsd: warn,
      killThresholdUsd: kill,
    });
  }
  return { rolling24hCostUsd: rolling, killed: false };
}
