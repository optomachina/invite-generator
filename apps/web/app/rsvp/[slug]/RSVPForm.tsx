"use client";

import { useState } from "react";

import type { HostedRSVPSettings } from "@/lib/db/schema";

type RSVPFormProps = {
  slug: string;
  settings: HostedRSVPSettings;
};

type FormStatus = "idle" | "submitting" | "sent" | "failed";

function formText(formData: FormData, name: string, fallback = "") {
  const value = formData.get(name);
  return typeof value === "string" ? value : fallback;
}

export function RSVPForm({ slug, settings }: Readonly<RSVPFormProps>) {
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setFormStatus("submitting");
    setError(null);

    const body = {
      guestName: formText(formData, "guestName"),
      status: formText(formData, "status", "yes"),
      guestCount: Number(formData.get("guestCount") ?? 1),
      note: formText(formData, "note"),
      mealChoice: formText(formData, "mealChoice"),
    };

    const response = await fetch(`/api/v1/rsvp/${slug}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      setFormStatus("failed");
      setError("We could not save that RSVP. Please check the details and try again.");
      return;
    }

    setFormStatus("sent");
  }

  if (!settings.isEnabled) {
    return (
      <p className="rounded-md bg-white/70 px-4 py-3 text-sm text-ink/70">
        RSVP collection is closed for this invite.
      </p>
    );
  }

  if (formStatus === "sent") {
    return (
      <div className="rounded-md bg-white px-5 py-4 shadow-sm">
        <h2 className="font-serif text-2xl text-ink">RSVP received</h2>
        <p className="mt-2 text-sm text-ink/70">
          Thanks. Your response has been shared with the host.
        </p>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-4 rounded-md bg-white p-5 shadow-sm">
      <div>
        <label className="text-sm font-semibold text-ink" htmlFor="guestName">
          Name
        </label>
        <input
          className="mt-1 w-full rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm outline-none focus:border-ochre"
          id="guestName"
          name="guestName"
          required
          type="text"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Response</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {["yes", "no", ...(settings.allowMaybe ? ["maybe"] : [])].map((status) => (
            <label
              className="flex items-center justify-center gap-2 rounded-md border border-ink/15 bg-cream px-3 py-2 text-center text-sm capitalize text-ink"
              key={status}
            >
              <input
                className="accent-ochre"
                defaultChecked={status === "yes"}
                name="status"
                type="radio"
                value={status}
              />
              {status}
            </label>
          ))}
        </div>
      </fieldset>

      {settings.allowPlusOnes ? (
        <div>
          <label className="text-sm font-semibold text-ink" htmlFor="guestCount">
            Party size
          </label>
          <input
            className="mt-1 w-full rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm outline-none focus:border-ochre"
            defaultValue="1"
            id="guestCount"
            max={settings.maxPartySize || "2"}
            min="1"
            name="guestCount"
            type="number"
          />
        </div>
      ) : null}

      {settings.askForMealChoice ? (
        <div>
          <label className="text-sm font-semibold text-ink" htmlFor="mealChoice">
            Meal choice
          </label>
          <input
            className="mt-1 w-full rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm outline-none focus:border-ochre"
            id="mealChoice"
            name="mealChoice"
            type="text"
          />
        </div>
      ) : null}

      {settings.askForGuestNote ? (
        <div>
          <label className="text-sm font-semibold text-ink" htmlFor="note">
            Note
          </label>
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm outline-none focus:border-ochre"
            id="note"
            name="note"
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        className="w-full rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        disabled={formStatus === "submitting"}
        type="submit"
      >
        {formStatus === "submitting" ? "Sending..." : "Send RSVP"}
      </button>
    </form>
  );
}
