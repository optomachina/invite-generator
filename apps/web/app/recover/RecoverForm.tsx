"use client";

import { useState } from "react";

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/v1/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <p className="rounded-2xl border border-ink/10 bg-[#fffaf2] p-4 text-sm text-ink/80">
        If we have any invites for that email, we just sent the links. Check
        your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1 rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm focus:border-ink/40 focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-ochre px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-ochre/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Email me my links"}
      </button>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-700/80">
          Something went wrong — try again.
        </p>
      )}
    </form>
  );
}
