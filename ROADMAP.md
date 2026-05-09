# ROADMAP

Horizon-level plan. For active build queue with What/Why/Pros/Cons/Context/Depends detail, see [TODOS.md](TODOS.md). For non-engineering validation/pricing/ethics work, see [STRATEGY.md](STRATEGY.md).

**Strategic stance (2026-05-09):** iOS-first, even before the website. Native iOS app is the primary creation surface. Web is marketing, Android-recipient fallback, and purchase entry for users without the app yet. Net-new feature work goes iOS-first.

---

## V1.x — Web (shipped + closing out)

Validation surface. Web is in maintenance mode — no net-new feature work.

**Shipped:** voice gate (V1.1), thinking-notes templates (V1.2), Tinder-style swipe gestures (V1.3), generating-screen polish (V1.5), code-overlay text rendering (V1.7), Stripe Checkout + magic-link post-purchase access (PR #17).

**Open:**
- V1.4 (intake mic+chips) — deferred to iOS native (V2.3) where on-device speech recognition is free.
- V1.6 (edit-text UI) — UI shipped in PR #14, renderer in V1.7; verify integration end-to-end and either close or finish.

---

## V2.0 — iOS native app (the real product)

Primary creation surface. Reuses existing Next.js backend (API routes, Postgres, Stripe, Resend, magic-link auth) as the shared service layer. Estimated 4-6 weeks of focused Swift work.

**Core experience:**
- iOS 17+, SwiftUI, magic-link auth via universal links
- Native intake — long-press mic uses `SFSpeechRecognizer` (on-device, free, no transcribe API)
- Generation + swipe stack (reuses existing concept-gen API)
- Edit text + code-overlay rendering (reuses V1.7 renderer)
- **Surprise-reveal animation:** background-generate Grok video clip during text-edit step; on review, reveal animated invite with still/animated toggle (muted-default, tap to unmute)
- **Live Photo creation:** `PHLivePhoto` from animated invite, save to Photos, share via iMessage with Live Photo preserved — recipient can set as lockscreen wallpaper
- **Apple Wallet pass:** PassKit-signed event pass; auto-surfaces on lockscreen 30-60 min before event; doubles as RSVP/check-in QR
- **Reminder images:** auto-generated near-event graphics ("3 days out", "tonight!") delivered via push
- **In-App Purchase:** $10 SKU via StoreKit 2; Apple Small Business Program rate (15% — confirm)

**Cross-platform delivery:**
- iOS senders → iOS recipients = full magic (Live Photo + Wallet pass)
- iOS senders → Android recipients = MP4/still fallback via existing web share link

---

## V3+ — AI Event Cohost (lifecycle)

Move from "invite generator" to "event operating system." Triggered after V2 paid-conversion signal validates the iOS app.

**Pre-event:**
- RSVP tracking + guest management
- Conversational RSVP (SMS / iMessage / web)
- Live invite agent (per-event Q&A bot)
- Wallet pass push-update service (venue, weather, parking, schedule changes)
- Per-guest invite personalization
- Calendar-aware autonomous event suggestions

**Day-of:**
- Wallet-pass-as-ticket (QR check-in)
- Real-time updates to all guests
- Vibe voting / collaborative playlist

**Post-event:**
- Shared photo album (invite-linked, AI curation)
- AI recap reels
- Auto-generated thank-yous
- Annual memory resurfacing

**Identity layer:**
- Persistent taste memory (style DNA per family)
- Person-aware intelligence (relationship-aware tone, cultural formatting)
- Family/household graph

---

## V4+ — Commerce + ecosystem

Monetization layers beyond the $10 invite SKU.

- **Gift registry with affiliate** — Amazon, Target Registry, Honeyfund (cash), Zola partnership. AI suggests gifts based on event theme + honoree taste.
- **Full event asset generation** — matching menus, signage, thank-yous, social stories, photo booth props (reuses image pipeline)
- **Print-on-demand merch** — physical cards, banners, stickers
- **Vendor marketplace** — photographers, decorators, caterers, DJs (eventually)

---

## Out of scope

- Android native app — intentional per strategic stance
- Social-graph enrichment / Instagram scraping — see [STRATEGY.md #4](STRATEGY.md) for ethics gate
