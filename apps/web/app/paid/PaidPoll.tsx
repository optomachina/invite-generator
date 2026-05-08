"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { saveStoredInvite } from "@/lib/local-invites";

type StatusResponse = {
  id: string;
  status: "pending" | "paid" | "fulfilled" | "failed";
  finalImageB64: string | null;
  accessToken: string | null;
  honoree: string;
  event: string;
};

const POLL_MS = 1500;
const SLOW_AFTER_MS = 30_000;

type PollResult =
  | { kind: "ok"; data: StatusResponse; done: boolean }
  | { kind: "http"; status: number }
  | { kind: "error"; message: string };

async function fetchStatus(orderId: string): Promise<PollResult> {
  try {
    const res = await fetch(`/api/v1/orders/${orderId}/status`, {
      cache: "no-store",
    });
    if (!res.ok) return { kind: "http", status: res.status };
    const data = (await res.json()) as StatusResponse;
    const done = data.status === "fulfilled" || data.status === "failed";
    return { kind: "ok", data, done };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function PaidPoll({ orderId }: Readonly<{ orderId: string }>) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const persistedRef = useRef(false);

  useEffect(() => {
    if (persistedRef.current) return;
    if (data?.status !== "fulfilled" || !data.accessToken) return;
    persistedRef.current = true;
    saveStoredInvite({
      id: data.id,
      accessToken: data.accessToken,
      honoree: data.honoree,
      event: data.event,
      fulfilledAt: new Date().toISOString(),
    });
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const applyResult = (result: PollResult): boolean => {
      if (result.kind === "http") {
        setError(`status ${result.status}`);
        return false;
      }
      if (result.kind === "error") {
        setError(result.message);
        return false;
      }
      setData(result.data);
      setError(null);
      return result.done;
    };

    const tick = async () => {
      const result = await fetchStatus(orderId);
      if (cancelled) return;
      const done = applyResult(result);
      if (done) return;
      setElapsed(Date.now() - startedAt.current);
      timer = setTimeout(tick, POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  const slow = elapsed > SLOW_AFTER_MS;
  const imageUrl = useMemo(() => {
    if (!data?.finalImageB64) return null;
    return `data:image/png;base64,${data.finalImageB64}`;
  }, [data?.finalImageB64]);

  if (data?.status === "fulfilled" && imageUrl) {
    const filename = `${(data.honoree || "invite").replace(/[^a-z0-9-_]+/gi, "-")}.png`;
    const manageHref = data.accessToken
      ? `/invite/${data.id}?token=${encodeURIComponent(data.accessToken)}`
      : null;
    return (
      <section className="rounded-[2rem] border border-ink/10 bg-[#fffaf2] p-6 text-center shadow-[0_24px_80px_rgba(68,40,16,0.14)] sm:p-8">
        <h1 className="font-serif text-3xl text-ink">Your invite is ready</h1>
        <p className="mt-2 text-sm text-ink/70">
          We also emailed it to you with a link to come back and edit text any
          time.
        </p>
        <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Your invite" className="h-full w-full object-cover" />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={imageUrl}
            download={filename}
            className="inline-flex items-center justify-center rounded-full bg-ochre px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-ochre/90"
          >
            Download PNG
          </a>
          {manageHref && (
            <a
              href={manageHref}
              className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-white/80"
            >
              Edit text
            </a>
          )}
        </div>
      </section>
    );
  }

  if (data?.status === "failed") {
    return (
      <section className="rounded-[2rem] border border-red-300/40 bg-[#fffaf2] p-6 text-center shadow-[0_24px_80px_rgba(68,40,16,0.14)] sm:p-8">
        <h1 className="font-serif text-3xl text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink/70">
          Your payment went through but we hit a snag rendering the final image.
          We&apos;ll email it manually within an hour.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-ink/10 bg-[#fffaf2] p-6 text-center shadow-[0_24px_80px_rgba(68,40,16,0.14)] sm:p-8">
      <h1 className="font-serif text-3xl text-ink">Finalizing your invite…</h1>
      <p className="mt-2 text-sm text-ink/70">
        {slow
          ? "Taking a bit longer than usual — we'll email it as soon as it's done."
          : "Hang tight — usually under 10 seconds after payment."}
      </p>
      {error && (
        <p className="mt-3 text-xs text-red-700/70">retrying… ({error})</p>
      )}
    </section>
  );
}
