"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SwipeStack } from "@/app/components/SwipeStack";
import type { SwipeCardData } from "@/app/components/swipe-types";
import { b64ToObjectUrl } from "@/lib/image";
import { estimateCostUsd, type Model, type Quality, type Settings, type Size } from "@/lib/pricing";
import type { Intake } from "@/lib/intake";

type FormIntake = Omit<Intake, "age"> & {
  age: number | "";
};

const DEFAULT_INTAKE: FormIntake = {
  honoree: "Lily",
  age: 5,
  event: "birthday party",
  date: "Saturday, June 13",
  time: "2:00 PM",
  location: "Magnolia Park, Pavilion 3",
  vibe: "garden tea-party, soft pastels, illustrated florals, hand-drawn feel",
};

const MODELS: { id: Model; label: string }[] = [
  { id: "gpt-image-2", label: "gpt-image-2 (preferred)" },
  { id: "gpt-image-1", label: "gpt-image-1 (legacy)" },
];
const QUALITIES: Quality[] = ["low", "medium", "high", "auto"];
const SIZES: Size[] = ["1024x1536", "1024x1024", "1536x1024", "auto"];
const VARIANT_COUNT = 3;

type StreamEvent =
  | {
      event: "variant_ready";
      data: { index: number; b64_json: string; ms: number; costUsd: number };
    }
  | {
      event: "variant_failed";
      data: { index: number; error: string; ms: number };
    }
  | {
      event: "session_cost";
      data: {
        sessionId: string;
        variantCount: number;
        totalMs: number;
        totalCostUsd: number;
        completedCount: number;
        failedCount: number;
        prompt: string;
        settings: Settings;
      };
    }
  | {
      event: "fatal";
      data: { error: string };
    }
  | {
      event: "done";
      data: { sessionId: string };
    };

type SessionSummary = Extract<StreamEvent, { event: "session_cost" }>["data"];

function fmtUsd(n: number): string {
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`;
}

function createLoadingCards(): SwipeCardData[] {
  return Array.from({ length: VARIANT_COUNT }, (_, index) => ({
    id: `slot-${index}`,
    index,
    status: "loading",
  }));
}

function parseSseEvent(raw: string): StreamEvent | null {
  const lines = raw.split(/\r?\n/);
  let event = "";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }

  if (!event || dataLines.length === 0) return null;

  try {
    return {
      event: event as StreamEvent["event"],
      data: JSON.parse(dataLines.join("\n")) as StreamEvent["data"],
    } as StreamEvent;
  } catch {
    return null;
  }
}

export default function Page() {
  const [settings, setSettings] = useState<Settings>({
    model: "gpt-image-2",
    quality: "low",
    size: "1024x1536",
    n: VARIANT_COUNT,
  });
  const [intake, setIntake] = useState<FormIntake>(DEFAULT_INTAKE);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<SwipeCardData[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const objectUrlsRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const estCost = useMemo(() => estimateCostUsd(settings), [settings]);
  const readyCount = cards.filter((card) => card.status === "ready").length;
  const failedCount = cards.filter((card) => card.status === "error").length;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  async function readStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseSseEvent(chunk);
        if (parsed) handleStreamEvent(parsed);
        boundary = buffer.indexOf("\n\n");
      }
    }

    buffer += decoder.decode();
    const parsed = parseSseEvent(buffer.trim());
    if (parsed) handleStreamEvent(parsed);
  }

  function handleStreamEvent(message: StreamEvent) {
    switch (message.event) {
      case "variant_ready": {
        const imageUrl = b64ToObjectUrl(message.data.b64_json);
        objectUrlsRef.current.push(imageUrl);
        setCards((prev) =>
          prev.map((card) =>
            card.index === message.data.index
              ? {
                  ...card,
                  status: "ready",
                  imageUrl,
                  ms: message.data.ms,
                  costUsd: message.data.costUsd,
                  error: undefined,
                }
              : card,
          ),
        );
        return;
      }
      case "variant_failed":
        setCards((prev) =>
          prev.map((card) =>
            card.index === message.data.index
              ? {
                  ...card,
                  status: "error",
                  error: message.data.error,
                  ms: message.data.ms,
                }
              : card,
          ),
        );
        return;
      case "session_cost":
        setSessionSummary(message.data);
        if (message.data.completedCount === 0) {
          setError("All three variants failed. Review the cards below, then try another run.");
        }
        return;
      case "fatal":
        setError(message.data.error);
        return;
      case "done":
        setLoading(false);
        return;
    }
  }

  async function generate() {
    abortRef.current?.abort();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setLoading(true);
    setError(null);
    setSessionSummary(null);
    setCards(createLoadingCards());
    setSessionKey((prev) => prev + 1);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payloadIntake = {
        ...intake,
        age: intake.age === "" ? undefined : intake.age,
      };
      const res = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: payloadIntake, settings: { ...settings, n: VARIANT_COUNT } }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status}: ${t}`);
      }
      if (!res.body) {
        throw new Error("stream body missing");
      }
      await readStream(res.body);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-serif text-4xl tracking-tight">Invite — slice 0</h1>
        <p className="mt-2 text-sm text-ink/70">
          Multi-variant streaming prototype with a Tinder-style review stack.
        </p>
      </header>

      <section className="mb-8 rounded-lg border border-ink/10 bg-white/40 p-5">
        <h2 className="font-serif text-lg mb-3">Settings</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
          <Field label="Model">
            <select
              value={settings.model}
              onChange={(e) =>
                setSettings({ ...settings, model: e.target.value as Model, n: VARIANT_COUNT })
              }
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Quality">
            <select
              value={settings.quality}
              onChange={(e) =>
                setSettings({ ...settings, quality: e.target.value as Quality, n: VARIANT_COUNT })
              }
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            >
              {QUALITIES.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </Field>
          <Field label="Size">
            <select
              value={settings.size}
              onChange={(e) =>
                setSettings({ ...settings, size: e.target.value as Size, n: VARIANT_COUNT })
              }
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-ink/55">
          Each run launches {VARIANT_COUNT} parallel image generations.
        </p>

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Honoree">
            <input
              value={intake.honoree}
              onChange={(e) => setIntake({ ...intake, honoree: e.target.value })}
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Age (optional)">
            <input
              type="number"
              min={1}
              value={intake.age}
              onChange={(e) => {
                const v = e.target.value;
                setIntake({ ...intake, age: v === "" ? "" : Math.max(1, Math.floor(Number(v))) });
              }}
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Event">
            <input
              value={intake.event}
              onChange={(e) => setIntake({ ...intake, event: e.target.value })}
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Date">
            <input
              value={intake.date}
              onChange={(e) => setIntake({ ...intake, date: e.target.value })}
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Time">
            <input
              value={intake.time}
              onChange={(e) => setIntake({ ...intake, time: e.target.value })}
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Location">
            <input
              value={intake.location}
              onChange={(e) => setIntake({ ...intake, location: e.target.value })}
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Vibe">
              <textarea
                value={intake.vibe}
                onChange={(e) => setIntake({ ...intake, vibe: e.target.value })}
                rows={2}
                className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center rounded-full bg-ochre px-6 py-3 text-white text-sm font-medium tracking-wide hover:bg-ochre/90 disabled:opacity-50"
          >
            {loading ? "Streaming…" : `Generate ${VARIANT_COUNT} invite concepts`}
          </button>
          <span className="text-sm text-ink/70">
            est. cost: <strong className="text-ink">{fmtUsd(estCost)}</strong>
          </span>
        </div>
        <p className="mt-2 text-xs text-ink/50">
          Estimates use gpt-image-1 published pricing. gpt-image-2 actuals will be confirmed after first run.
        </p>
      </section>

      {error && (
        <div className="mb-8 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <strong>Error:</strong> {error}
        </div>
      )}

      {cards.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Swipe Concepts</h2>
            <div className="flex items-center gap-4 text-xs text-ink/70">
              <span>{readyCount}/{VARIANT_COUNT} ready</span>
              <span>{failedCount} failed</span>
              {sessionSummary && <span>{(sessionSummary.totalMs / 1000).toFixed(1)}s</span>}
              {sessionSummary && <span>{fmtUsd(sessionSummary.totalCostUsd)}</span>}
              <span className="text-ink/50">{settings.model} · {settings.quality} · {settings.size}</span>
            </div>
          </div>
          <SwipeStack cards={cards} sessionKey={sessionKey} />
          <details className="mt-6">
            <summary className="cursor-pointer text-xs text-ink/60">prompt used</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-ink/70">
              {sessionSummary?.prompt ?? "Prompt will appear when the stream finishes."}
            </pre>
          </details>
        </section>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-ink/60 mb-1">{label}</span>
      {children}
    </label>
  );
}
