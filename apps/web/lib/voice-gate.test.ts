import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { setLogSink } from "./logger";
import {
  InMemoryUsageStore,
  getVoiceStatus,
  recordTranscribeUsage,
  setUsageStore,
} from "./voice-gate";

const ENV_KEYS = [
  "VOICE_ENABLED",
  "VOICE_COST_WARN_USD",
  "VOICE_COST_KILL_USD",
] as const;

let savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};
let logLines: string[] = [];
let restoreSink: (line: string) => void;

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  delete process.env.VOICE_ENABLED;
  delete process.env.VOICE_COST_WARN_USD;
  delete process.env.VOICE_COST_KILL_USD;
  setUsageStore(new InMemoryUsageStore());
  logLines = [];
  restoreSink = setLogSink((line) => logLines.push(line));
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  setLogSink(restoreSink);
});

describe("voice-gate", () => {
  test("default is disabled (flag_off)", async () => {
    const status = await getVoiceStatus();
    expect(status.enabled).toBe(false);
    expect(status.reason).toBe("flag_off");
  });

  test("flag on with no usage is enabled", async () => {
    process.env.VOICE_ENABLED = "true";
    const status = await getVoiceStatus();
    expect(status.enabled).toBe(true);
    expect(status.reason).toBe("ok");
    expect(status.rolling24hCostUsd).toBe(0);
  });

  test("flag on but budget exceeded returns budget_exceeded", async () => {
    process.env.VOICE_ENABLED = "true";
    process.env.VOICE_COST_KILL_USD = "10";
    const now = Date.now();
    await recordTranscribeUsage(10, now);
    const status = await getVoiceStatus(now);
    expect(status.enabled).toBe(false);
    expect(status.reason).toBe("budget_exceeded");
    expect(status.rolling24hCostUsd).toBe(10);
  });

  test("usage outside the 24h window does not count", async () => {
    process.env.VOICE_ENABLED = "true";
    process.env.VOICE_COST_KILL_USD = "5";
    const now = Date.now();
    const longAgo = now - (24 * 60 * 60 * 1000 + 60_000);
    await recordTranscribeUsage(100, longAgo);
    const status = await getVoiceStatus(now);
    expect(status.enabled).toBe(true);
    expect(status.rolling24hCostUsd).toBe(0);
  });

  test("crossing the kill threshold logs voice.budget.killed", async () => {
    process.env.VOICE_ENABLED = "true";
    process.env.VOICE_COST_KILL_USD = "1";
    const now = Date.now();
    const result = await recordTranscribeUsage(1.5, now);
    expect(result.killed).toBe(true);
    const events = logLines.map((l) => JSON.parse(l));
    expect(events.some((e) => e.event === "voice.budget.killed")).toBe(true);
  });

  test("crossing the warn threshold logs voice.budget.warn but not killed", async () => {
    process.env.VOICE_ENABLED = "true";
    process.env.VOICE_COST_WARN_USD = "1";
    process.env.VOICE_COST_KILL_USD = "10";
    const now = Date.now();
    const result = await recordTranscribeUsage(1.25, now);
    expect(result.killed).toBe(false);
    const events = logLines.map((l) => JSON.parse(l));
    const evNames = events.map((e) => e.event);
    expect(evNames).toContain("voice.budget.warn");
    expect(evNames).not.toContain("voice.budget.killed");
  });

  test("recordTranscribeUsage rejects negative costs", async () => {
    await expect(recordTranscribeUsage(-1)).rejects.toThrow();
  });

  test("env flag accepts true/1/yes/on (case-insensitive)", async () => {
    for (const v of ["true", "1", "yes", "on", "TRUE", "On"]) {
      process.env.VOICE_ENABLED = v;
      const status = await getVoiceStatus();
      expect(status.enabled).toBe(true);
    }
  });

  test("env flag treats false/0/no/off as off", async () => {
    for (const v of ["false", "0", "no", "off"]) {
      process.env.VOICE_ENABLED = v;
      const status = await getVoiceStatus();
      expect(status.enabled).toBe(false);
      expect(status.reason).toBe("flag_off");
    }
  });

  test("rolling sum gc trims old events", async () => {
    process.env.VOICE_ENABLED = "true";
    process.env.VOICE_COST_KILL_USD = "100";
    const now = Date.now();
    await recordTranscribeUsage(5, now - (25 * 60 * 60 * 1000));
    await recordTranscribeUsage(7, now);
    const status = await getVoiceStatus(now);
    expect(status.rolling24hCostUsd).toBe(7);
  });
});
