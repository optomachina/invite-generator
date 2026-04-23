"use client";

import { useEffect, useMemo, useState } from "react";

const HARDCODED_INTAKE = {
  honoree: "Lily",
  age: 5,
  event: "birthday party",
  date: "Saturday, June 13",
  time: "2:00 PM",
  location: "Magnolia Park, Pavilion 3",
  vibe: "garden tea-party, soft pastels, illustrated florals, hand-drawn feel",
};

type Model = "gpt-image-2" | "gpt-image-1";
type Quality = "low" | "medium" | "high" | "auto";
type Size = "1024x1024" | "1024x1536" | "1536x1024" | "auto";

type Settings = { model: Model; quality: Quality; size: Size; n: number };

type GenResponse = {
  images: { b64_json?: string }[];
  prompt: string;
  ms: number;
  costUsd: number;
  settings: Settings;
};

const MODELS: { id: Model; label: string }[] = [
  { id: "gpt-image-2", label: "gpt-image-2 (preferred)" },
  { id: "gpt-image-1", label: "gpt-image-1 (legacy)" },
];
const QUALITIES: Quality[] = ["low", "medium", "high", "auto"];
const SIZES: Size[] = ["1024x1536", "1024x1024", "1536x1024", "auto"];

// Mirrors the table in route.ts so the UI can show a pre-flight estimate.
const COST: Record<Model, Record<Exclude<Quality, "auto">, Record<Exclude<Size, "auto">, number>>> = {
  "gpt-image-1": {
    low:    { "1024x1024": 0.011, "1024x1536": 0.016, "1536x1024": 0.016 },
    medium: { "1024x1024": 0.042, "1024x1536": 0.063, "1536x1024": 0.063 },
    high:   { "1024x1024": 0.167, "1024x1536": 0.25,  "1536x1024": 0.25  },
  },
  "gpt-image-2": {
    low:    { "1024x1024": 0.011, "1024x1536": 0.016, "1536x1024": 0.016 },
    medium: { "1024x1024": 0.042, "1024x1536": 0.063, "1536x1024": 0.063 },
    high:   { "1024x1024": 0.167, "1024x1536": 0.25,  "1536x1024": 0.25  },
  },
};

function estimate(s: Settings): number {
  const q = (s.quality === "auto" ? "medium" : s.quality) as Exclude<Quality, "auto">;
  const sz = (s.size === "auto" ? "1024x1536" : s.size) as Exclude<Size, "auto">;
  return COST[s.model][q][sz] * s.n;
}

function b64ToObjectUrl(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "image/png" });
  return URL.createObjectURL(blob);
}

function fmtUsd(n: number): string {
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`;
}

export default function Page() {
  const [settings, setSettings] = useState<Settings>({
    model: "gpt-image-2",
    quality: "low",
    size: "1024x1536",
    n: 1,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenResponse | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const estCost = useMemo(() => estimate(settings), [settings]);

  useEffect(() => {
    if (!result) return;
    const urls = result.images
      .map((img) => (img.b64_json ? b64ToObjectUrl(img.b64_json) : ""))
      .filter(Boolean);
    setImageUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [result]);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: HARDCODED_INTAKE, settings }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status}: ${t}`);
      }
      const json = (await res.json()) as GenResponse;
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-serif text-4xl tracking-tight">Invite — slice 0</h1>
        <p className="mt-2 text-sm text-ink/70">
          Smallest end-to-end test. Hardcoded intake. Configurable model/quality/size/count.
        </p>
      </header>

      <section className="mb-8 rounded-lg border border-ink/10 bg-white/40 p-5">
        <h2 className="font-serif text-lg mb-3">Settings</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Field label="Model">
            <select
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value as Model })}
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
              onChange={(e) => setSettings({ ...settings, quality: e.target.value as Quality })}
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
              onChange={(e) => setSettings({ ...settings, size: e.target.value as Size })}
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Count">
            <select
              value={settings.n}
              onChange={(e) => setSettings({ ...settings, n: Number(e.target.value) })}
              className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </Field>
        </div>

        <details className="mb-4">
          <summary className="cursor-pointer text-xs text-ink/60">intake (hardcoded)</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-ink/70">
            {JSON.stringify(HARDCODED_INTAKE, null, 2)}
          </pre>
        </details>

        <div className="flex items-center gap-4">
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center rounded-full bg-ochre px-6 py-3 text-white text-sm font-medium tracking-wide hover:bg-ochre/90 disabled:opacity-50"
          >
            {loading ? "Sketching…" : `Generate ${settings.n} invite${settings.n === 1 ? "" : "s"}`}
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

      {result && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">
              {result.images.length} concept{result.images.length === 1 ? "" : "s"}
            </h2>
            <div className="flex items-center gap-4 text-xs text-ink/70">
              <span>{(result.ms / 1000).toFixed(1)}s</span>
              <span>{fmtUsd(result.costUsd)}</span>
              <span className="text-ink/50">
                {result.settings.model} · {result.settings.quality} · {result.settings.size}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {imageUrls.map((src, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Concept ${i + 1}`} className="w-full h-auto" />
                <div className="p-3 text-xs text-ink/60">Concept {i + 1}</div>
              </div>
            ))}
          </div>
          <details className="mt-6">
            <summary className="cursor-pointer text-xs text-ink/60">prompt used</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-ink/70">{result.prompt}</pre>
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
