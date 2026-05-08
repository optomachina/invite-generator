"use client";

import { useEffect, useRef, useState } from "react";

import {
  STORAGE_KEY,
  deleteStoredInvite,
  loadStoredInvites,
  manageHrefFor,
  type StoredInvite,
} from "@/lib/local-invites";

function formatLabel(invite: StoredInvite): string {
  if (invite.honoree && invite.event) {
    return `${invite.honoree}'s ${invite.event}`;
  }
  return invite.honoree || invite.event || "Your invite";
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "today";
  const days = Math.floor(diffMs / day);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function StoredInvitesPill() {
  const [invites, setInvites] = useState<StoredInvite[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInvites(loadStoredInvites());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setInvites(loadStoredInvites());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (invites.length === 0) return null;

  const remove = (id: string) => {
    setInvites(deleteStoredInvite(id));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-xs font-medium text-ink/80 transition hover:bg-white/80"
      >
        Your invites · {invites.length}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-ink/10 bg-[#fffaf2] shadow-[0_24px_60px_rgba(68,40,16,0.14)]"
        >
          <ul className="max-h-80 overflow-y-auto py-1 text-sm">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/60"
              >
                <a
                  href={manageHrefFor(invite)}
                  className="min-w-0 flex-1 truncate font-medium text-ink"
                >
                  <span className="block truncate">{formatLabel(invite)}</span>
                  <span className="block text-xs font-normal text-ink/55">
                    {formatRelative(invite.fulfilledAt)}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    remove(invite.id);
                  }}
                  aria-label={`Forget ${formatLabel(invite)}`}
                  className="rounded-full px-2 py-1 text-xs text-ink/55 hover:bg-white hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-ink/10 px-3 py-2 text-[11px] text-ink/55">
            Saved on this device only. Lost it? <a className="underline" href="/recover">Email me my links</a>.
          </div>
        </div>
      )}
    </div>
  );
}
