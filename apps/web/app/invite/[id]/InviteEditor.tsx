"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  EditTextForm,
  type ComparePayFields,
} from "@/app/components/EditTextForm";
import { saveStoredInvite } from "@/lib/local-invites";

type OrderResponse = {
  id: string;
  status: "pending" | "paid" | "fulfilled" | "failed";
  fields: ComparePayFields;
  finalImageB64: string | null;
  customerEmail?: string;
};

const DEBOUNCE_MS = 350;

type LoadResult =
  | { kind: "ok"; data: OrderResponse }
  | { kind: "not-found" }
  | { kind: "transient" };

async function loadOrder(orderId: string, token: string): Promise<LoadResult> {
  try {
    const res = await fetch(
      `/api/v1/orders/${orderId}?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (res.status === 404) return { kind: "not-found" };
    if (!res.ok) return { kind: "transient" };
    const data = (await res.json()) as OrderResponse;
    return { kind: "ok", data };
  } catch {
    return { kind: "transient" };
  }
}

async function fetchRender(
  orderId: string,
  token: string,
  fields: ComparePayFields,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(`/api/v1/orders/${orderId}/render`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, fields }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `render ${res.status}`);
  }
  const data = (await res.json()) as { imageB64: string };
  return data.imageB64;
}

function fieldsKey(f: ComparePayFields): string {
  return [f.honoree, f.event, f.date, f.time, f.location, f.customLine].join(
    "",
  );
}

export function InviteEditor({
  orderId,
  token,
}: Readonly<{
  orderId: string;
  token: string;
}>) {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [waitingForFulfillment, setWaitingForFulfillment] = useState(false);
  const [fields, setFields] = useState<ComparePayFields | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const lastKey = useRef<string>("");
  const persistedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const persistOnFulfilled = (data: OrderResponse) => {
      if (persistedRef.current) return;
      persistedRef.current = true;
      saveStoredInvite({
        id: orderId,
        accessToken: token,
        honoree: data.fields.honoree,
        event: data.fields.event,
        fulfilledAt: new Date().toISOString(),
      });
    };

    const apply = (data: OrderResponse): boolean => {
      setFields(data.fields);
      setImageB64(data.finalImageB64);
      lastKey.current = fieldsKey(data.fields);
      setLoading(false);
      if (data.status === "fulfilled") {
        setWaitingForFulfillment(false);
        persistOnFulfilled(data);
        return true;
      }
      setWaitingForFulfillment(true);
      return false;
    };

    const tick = async () => {
      const result = await loadOrder(orderId, token);
      if (cancelled) return;
      if (result.kind === "not-found") {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (result.kind === "transient") {
        setTimeout(tick, 2000);
        return;
      }
      const fulfilled = apply(result.data);
      if (!fulfilled) setTimeout(tick, 1500);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  useEffect(() => {
    if (!fields) return;
    const key = fieldsKey(fields);
    if (key === lastKey.current) return;

    const controller = new AbortController();
    const runRender = async () => {
      lastKey.current = key;
      setRendering(true);
      setRenderError(null);
      try {
        const next = await fetchRender(orderId, token, fields, controller.signal);
        setImageB64(next);
      } catch (err) {
        if (controller.signal.aborted) return;
        setRenderError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!controller.signal.aborted) setRendering(false);
      }
    };

    const timer = setTimeout(() => void runRender(), DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fields, orderId, token]);

  const imageUrl = useMemo(
    () => (imageB64 ? `data:image/png;base64,${imageB64}` : null),
    [imageB64],
  );

  if (loading) {
    return (
      <p className="text-center text-sm text-ink/70">Loading your invite…</p>
    );
  }
  if (notFound) {
    return (
      <section className="rounded-[2rem] border border-ink/10 bg-[#fffaf2] p-6 text-center sm:p-8">
        <h1 className="font-serif text-3xl text-ink">Link not valid</h1>
        <p className="mt-2 text-sm text-ink/70">
          This link is missing or expired. <a className="underline" href="/recover">Email me a new one</a>.
        </p>
      </section>
    );
  }
  if (!fields) return null;

  const filename = `${(fields.honoree || "invite").replace(/[^a-z0-9-_]+/gi, "-")}.png`;

  const onResend = async () => {
    setEmailStatus("sending");
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setEmailStatus(res.ok ? "sent" : "error");
    } catch {
      setEmailStatus("error");
    }
  };

  return (
    <section className="rounded-[2rem] border border-ink/10 bg-[#fffaf2] p-6 shadow-[0_24px_80px_rgba(68,40,16,0.14)] sm:p-8">
      <header>
        <h1 className="font-serif text-3xl text-ink">Edit your invite</h1>
        <p className="mt-2 text-sm text-ink/70">
          Tweak the text — we&apos;ll re-render automatically. The image stays
          the same; this just updates the words.
        </p>
      </header>

      {waitingForFulfillment && (
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink/60">
          finalizing your invite…
        </p>
      )}

      {imageUrl && (
        <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Your invite"
            className="h-full w-full object-cover"
          />
          {rendering && (
            <p className="border-t border-ink/10 px-3 py-1.5 text-center text-[11px] uppercase tracking-[0.22em] text-ink/65">
              updating…
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <EditTextForm fields={fields} onChange={setFields} />
      </div>

      {renderError && (
        <p role="alert" className="mt-3 text-sm text-red-700/80">
          {renderError}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-6">
        {imageUrl ? (
          <a
            href={imageUrl}
            download={filename}
            className="rounded-full bg-ochre px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-ochre/90"
          >
            Download PNG
          </a>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onResend}
          disabled={emailStatus === "sending" || !imageB64}
          className="rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {emailStatus === "sending"
            ? "Sending…"
            : emailStatus === "sent"
              ? "Email sent"
              : emailStatus === "error"
                ? "Try again"
                : "Email me this version"}
        </button>
      </div>
    </section>
  );
}
