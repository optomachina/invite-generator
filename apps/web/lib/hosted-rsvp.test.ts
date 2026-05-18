import { describe, expect, test } from "bun:test";

import {
  validateHostedInviteDetails,
  validateHostedRSVPSettings,
  validateImageB64,
  validateRSVPInput,
} from "./hosted-rsvp";

describe("hosted rsvp validation", () => {
  test("accepts invite details with one display field", () => {
    const details = validateHostedInviteDetails({
      eventTitle: "Garden party",
      specialNotes: "Bring a jacket.",
    });

    expect(details?.eventTitle).toBe("Garden party");
    expect(details?.hostName).toBe("");
    expect(details?.specialNotes).toBe("Bring a jacket.");
  });

  test("rejects empty invite details", () => {
    expect(validateHostedInviteDetails({ eventTitle: " " })).toBeNull();
  });

  test("defaults RSVP settings without accepting blank party size", () => {
    const settings = validateHostedRSVPSettings({ maxPartySize: "" });

    expect(settings.maxPartySize).toBe("2");
    expect(settings.isEnabled).toBe(true);
  });

  test("normalizes RSVP max party size to a positive integer", () => {
    expect(validateHostedRSVPSettings({ maxPartySize: "12" }).maxPartySize).toBe("12");
    expect(validateHostedRSVPSettings({ maxPartySize: "12 guests" }).maxPartySize).toBe("2");
    expect(validateHostedRSVPSettings({ maxPartySize: "zero" }).maxPartySize).toBe("2");
    expect(validateHostedRSVPSettings({ maxPartySize: "-4" }).maxPartySize).toBe("2");
  });

  test("clamps RSVP party size and rejects disabled maybe responses", () => {
    const settings = validateHostedRSVPSettings({
      allowMaybe: false,
      allowPlusOnes: true,
      maxPartySize: "3",
    });

    expect(validateRSVPInput({ guestName: "Ari", status: "maybe" }, settings)).toBeNull();
    expect(validateRSVPInput({
      guestName: "Ari",
      status: "yes",
      guestCount: 8,
    }, settings)?.guestCount).toBe(3);
  });

  test("rejects oversized image payloads", () => {
    expect(validateImageB64("a".repeat(12 * 1024 * 1024))).toBeNull();
  });
});
