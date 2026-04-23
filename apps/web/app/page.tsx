"use client";

import { useEffect, useState } from "react";

const HARDCODED_INTAKE = {
  honoree: "Lily",
  age: 5,
  event: "5th birthday party",
  date: "Saturday, June 13",
  time: "2:00 PM",
  location: "Magnolia Park, Pavilion 3",
  vibe: "garden tea-party, soft pastels, illustrated florals, hand-drawn feel",
};

type GenResponse = {
  images: { b64_json?: string }[];
  prompt: string;
  ms: number;
};

function b64ToObjectUrl(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "image/png" });
  return URL.createObjectURL(blob);
}

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenResponse | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify(HARDCODED_INTAKE),
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
          Smallest end-to-end test. Hardcoded intake. 4 concepts from gpt-image-2.
          No swipe, no payment, no infra.
        </p>
      </header>

      <section className="mb-8 rounded-lg border border-ink/10 bg-white/40 p-5">
        <h2 className="font-serif text-lg mb-2">Intake (hardcoded)</h2>
        <pre className="whitespace-pre-wrap text-sm text-ink/80">
          {JSON.stringify(HARDCODED_INTAKE, null, 2)}
        </pre>
        <button
          onClick={generate}
          disabled={loading}
          className="mt-5 inline-flex items-center rounded-full bg-ochre px-6 py-3 text-white text-sm font-medium tracking-wide hover:bg-ochre/90 disabled:opacity-50"
        >
          {loading ? "Sketching 4 concepts…" : "Generate 4 invites"}
        </button>
      </section>

      {error && (
        <div className="mb-8 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">4 concepts</h2>
            <span className="text-xs text-ink/60">
              {(result.ms / 1000).toFixed(1)}s
            </span>
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
