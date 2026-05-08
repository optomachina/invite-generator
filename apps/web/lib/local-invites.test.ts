import { describe, expect, test } from "bun:test";

import {
  manageHrefFor,
  parseInvites,
  removeInvite,
  upsertInvite,
  type StoredInvite,
} from "./local-invites";

const sample: StoredInvite = {
  id: "abc",
  accessToken: "tok-1",
  honoree: "Lily",
  event: "5th birthday",
  fulfilledAt: "2026-05-08T00:00:00.000Z",
};

describe("parseInvites", () => {
  test("returns [] for null", () => {
    expect(parseInvites(null)).toEqual([]);
  });
  test("returns [] for invalid JSON", () => {
    expect(parseInvites("{not-json")).toEqual([]);
  });
  test("returns [] for non-array JSON", () => {
    expect(parseInvites('{"x":1}')).toEqual([]);
  });
  test("filters out malformed entries", () => {
    const raw = JSON.stringify([sample, { id: "bad" }, { ...sample, id: "ok" }]);
    const result = parseInvites(raw);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["abc", "ok"]);
  });
});

describe("upsertInvite", () => {
  test("prepends new entries", () => {
    const next: StoredInvite = { ...sample, id: "xyz" };
    const result = upsertInvite([sample], next);
    expect(result.map((r) => r.id)).toEqual(["xyz", "abc"]);
  });
  test("replaces existing entry by id, moving to front", () => {
    const a: StoredInvite = { ...sample, id: "a" };
    const b: StoredInvite = { ...sample, id: "b" };
    const updatedA: StoredInvite = { ...sample, id: "a", honoree: "Updated" };
    const result = upsertInvite([a, b], updatedA);
    expect(result.map((r) => r.id)).toEqual(["a", "b"]);
    expect(result[0].honoree).toBe("Updated");
  });
  test("caps at 50 entries", () => {
    const initial: StoredInvite[] = Array.from({ length: 50 }, (_, i) => ({
      ...sample,
      id: `id-${i}`,
    }));
    const result = upsertInvite(initial, { ...sample, id: "new" });
    expect(result).toHaveLength(50);
    expect(result[0].id).toBe("new");
    expect(result.at(-1)?.id).toBe("id-48");
  });
});

describe("removeInvite", () => {
  test("removes by id", () => {
    const a: StoredInvite = { ...sample, id: "a" };
    const b: StoredInvite = { ...sample, id: "b" };
    expect(removeInvite([a, b], "a")).toEqual([b]);
  });
  test("returns same shape if not found", () => {
    expect(removeInvite([sample], "missing")).toEqual([sample]);
  });
});

describe("manageHrefFor", () => {
  test("constructs token query string", () => {
    expect(manageHrefFor(sample)).toBe("/invite/abc?token=tok-1");
  });
  test("encodes special chars in token", () => {
    const weird: StoredInvite = { ...sample, accessToken: "a/b+c=d" };
    expect(manageHrefFor(weird)).toBe("/invite/abc?token=a%2Fb%2Bc%3Dd");
  });
});
