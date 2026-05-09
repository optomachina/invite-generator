export const STORAGE_KEY = "invite-generator:invites:v1";
const MAX_ENTRIES = 50;

export type StoredInvite = {
  id: string;
  accessToken: string;
  honoree: string;
  event: string;
  fulfilledAt: string;
};

function isStoredInvite(v: unknown): v is StoredInvite {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.accessToken === "string" &&
    typeof r.honoree === "string" &&
    typeof r.event === "string" &&
    typeof r.fulfilledAt === "string"
  );
}

export function parseInvites(raw: string | null): StoredInvite[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredInvite);
  } catch {
    return [];
  }
}

export function upsertInvite(
  current: StoredInvite[],
  next: StoredInvite,
): StoredInvite[] {
  const filtered = current.filter((entry) => entry.id !== next.id);
  filtered.unshift(next);
  return filtered.slice(0, MAX_ENTRIES);
}

export function removeInvite(
  current: StoredInvite[],
  id: string,
): StoredInvite[] {
  return current.filter((entry) => entry.id !== id);
}

export function manageHrefFor(invite: StoredInvite): string {
  return `/invite/${invite.id}?token=${encodeURIComponent(invite.accessToken)}`;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadStoredInvites(): StoredInvite[] {
  const storage = safeStorage();
  if (!storage) return [];
  return parseInvites(storage.getItem(STORAGE_KEY));
}

export function saveStoredInvite(next: StoredInvite): StoredInvite[] {
  const storage = safeStorage();
  if (!storage) return [];
  const updated = upsertInvite(parseInvites(storage.getItem(STORAGE_KEY)), next);
  storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteStoredInvite(id: string): StoredInvite[] {
  const storage = safeStorage();
  if (!storage) return [];
  const updated = removeInvite(
    parseInvites(storage.getItem(STORAGE_KEY)),
    id,
  );
  storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
