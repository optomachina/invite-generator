# TODOS

Build queue, organized by phase. Each entry captures what, why, pros, cons, context, and dependencies so the reasoning survives when you come back to this in 3 months.

For horizon-level roadmap (V1.x / V2 / V3+ / V4+), see [ROADMAP.md](ROADMAP.md). For non-engineering work (validation cohorts, kill criteria, pricing tests, ethics-gated features), see [STRATEGY.md](STRATEGY.md).

**Strategic stance (2026-05-09):** iOS-first. Native iOS app is the primary creation surface. Web is fallback / purchase entry / Android share target. Net-new feature work goes iOS-first.

---

## V1.x web — closing out

Web is in maintenance mode. No net-new feature work; only the items below.

### V1.4. Intake: tap-and-hold mic + visible event-type chips — DEFERRED to iOS

**Status:** Web implementation deferred per iOS-first pivot (2026-05-09). Lands as V2.3 on iOS using on-device `SFSpeechRecognizer` (free, zero-latency, no transcribe API). Web keeps current text-only intake as fallback.

**Why deferred:** With iOS-first, spending dev cycles on web voice doesn't pencil — iOS speech recognition is free and lower-latency than the gpt-4o-mini-transcribe path the web version would have used. The V1.1 cost kill-switch was scaffolding for the web version; the iOS version doesn't need it.

**Context preserved for V2.3:** 7 chips visible by default (the 6 most common event types + "Other"). Long-press on textbox starts recording with visible waveform + timer; release stops + transcribes + appends (does not replace).

---

### V1.6. User-editable text UI on the compare screen — VERIFY

**Status:** UI shipped in PR #14 (2026-05-01); renderer shipped in V1.7 (2026-05-05). Need to verify the integration is wired end-to-end. If yes → move to Done. If gaps remain → close them as the final V1 web fix.

**What:** Edit form on compare screen for honoree name, date, time, address, custom line. Server re-renders text overlay on paid concepts via the V1.7 pipeline.

**Why:** Parser extraction is ~80% accurate. Edit UI turns a $7 refund into a 2-second re-render. Trust win that protects paid conversion in the week-3 kill-criteria window.

**Pros:** Massive retention + trust win. Near-zero engineering cost since renderer is done.

**Cons:** Form-validation surface to verify.

**Context:** Code-overlay typography (V1.7) makes text data — re-rendering with different strings is a fast server round-trip. Field set: honoree name, date, time, location, honoree age, custom line.

**Depends on:** V1.7 ✅ shipped 2026-05-05.

---

## V2 iOS native app

Net-new development priority. Reuses existing backend as the shared service layer.

### V2.1. iOS app scaffolding + magic-link auth

**What:** Xcode project (SwiftUI, iOS 17+), Apple Developer Program enrollment, app ID + provisioning profiles, magic-link sign-in via universal links, REST client for existing Next.js API routes (`/api/v1/events/parse`, generation, render-text, etc.).

**Why:** iOS-first pivot (2026-05-09) makes the native app the primary creation surface. Reusing the existing backend means the iOS app is a thin native client, not a rebuild — ~4-6 weeks of focused Swift work.

**Pros:** Greenfield Swift project with tight scope. Reuses all backend infra. Magic-link auth means no Sign-in-with-Apple complexity in v1.

**Cons:** $99/year Apple Developer Program. App Store review cycle (1-3 days). Universal links require web-side `apple-app-site-association` file deploy.

**Context:** SwiftUI + async/await. iOS 17+ covers ~85% of iOS users and gets us PHLivePhoto, modern PassKit, StoreKit 2. Magic-link flow: web sends email → user taps link → universal link opens app with auth token → app stores in Keychain.

**Depends on:** OPS.2 (Apple Developer Program enrollment).

---

### V2.2. In-App Purchase via StoreKit 2

**What:** $10 invite-credit SKU via StoreKit 2. Server-side receipt validation against existing Postgres schema (reuse credit-grant logic from PR #17). Apple Small Business Program enrollment for reduced rate.

**Why:** Smoother UX than web-redirect-back-to-app per user decision (2026-05-09). Tax cost (~$1.50/sale at SBP 15%) is acceptable for the friction savings.

**Pros:** Native purchase flow. Apple handles all PCI/fraud. Restorable purchases free. Higher conversion than web checkout.

**Cons:** Pricing locked to App Store tiers (closest is $9.99 — confirm). Cannot show web prices in-app per Apple guidelines (no "buy on web for cheaper" links). Apple review can reject for IAP setup mistakes.

**Context:** Use existing Postgres `purchases` table; add `apple_transaction_id` column. Server validates StoreKit signed transaction → grants credit via existing magic-link path. Web Stripe purchase stays available for fallback.

**Depends on:** V2.1, OPS.3 (SBP enrollment).

---

### V2.3. Native intake (speech recognition + chips)

**What:** Long-press mic uses on-device `SFSpeechRecognizer`. Event-type chips as native SwiftUI controls. Same UX vision as deferred V1.4: unified text+voice input with chips as empty-state helpers.

**Why:** iOS speech recognition is free, on-device (privacy + offline), and zero-latency vs the gpt-4o-mini-transcribe path the web version would have used. Native chips feel correct, not styled buttons.

**Pros:** Better UX than web could ever ship. Lower cost (no transcribe API). Privacy story (on-device).

**Cons:** Requires `NSSpeechRecognitionUsageDescription` + `NSMicrophoneUsageDescription` in Info.plist. Some users decline mic permission — UX needs graceful fallback to text + chips only.

**Context:** Suggested chips: birthday, baby shower, graduation, gender reveal, milestone, wedding, other. Tapping seeds the textbox with starter phrase. Long-press starts recording with waveform + timer; release stops + transcribes + appends.

**Depends on:** V2.1.

---

### V2.4. Live Photo creation + iOS-to-iOS sharing

**What:** Generate paired JPEG + 3s MOV with matching `content-identifier` metadata. Combine via `PHLivePhoto.request` + save to Photos library via `PHAssetCreationRequest`. Share sheet preserves Live Photo when sent via iMessage/AirDrop. Recipient can set as lockscreen wallpaper.

**Why:** Live Photo on lockscreen is the iconic moment that beats Etsy/Canva. iOS-to-iOS only by design — Android gets MP4 fallback link. Defining product moment that no competitor in the invite space ships.

**Pros:** Free virality ("how did you do that?"). Lockscreen presence = persistent retention. Compounds with Wallet pass.

**Cons:** Requires `NSPhotoLibraryAddUsageDescription`. Live Photo bundle size (~3-5MB) constrains over-cellular delivery — must use iCloud Link share for full quality. Simulator behavior diverges from device; test on real hardware early.

**Context:** MOV is the Grok video clip from V2.5. Pairing logic: write asset identifier to MOV's `com.apple.quicktime.content.identifier` metadata + JPEG's `MakerApple` field 17. Reference: ImageIO + AVFoundation.

**Depends on:** V2.1, V2.5.

---

### V2.5. Surprise-reveal animation pipeline (Grok video)

**What:** During text-edit step, kick off background Grok short-clip video generation on the user's chosen concept. On review screen reveal, swap the still image to the animated MP4 with a still/animated toggle. Audio muted by default (autoplay policy); tap to unmute.

**Why:** Hides 30-60s gen latency behind existing user time. Surprise-reveal makes a $10 invite feel like a gift, not a transaction. Toggle gives users who genuinely want stills an opt-out without losing the animated default.

**Pros:** Killer differentiation moment. No marginal user time cost. Per-invite toggle creates invisible learning (default reflects user's first choice). Web fallback still works for Android recipients.

**Cons:** Grok video API cost per generation. Latency variance (sometimes >60s) needs graceful fallback — "polishing your invite…" shimmer if not ready by review reveal. Audio policies vary; iOS muted-autoplay for inline video works but unmute-on-tap requires explicit user gesture.

**Context:** Trigger gen at text-commit, NOT image-gen completion — generating video for invites abandoned during text edit is wasted compute. Cache MP4 in S3 + CDN keyed on `concept_id`. Recipient share link renders animated by default with `?still=1` override.

**Depends on:** Grok video API access, V2.1, V2.2 (gated on paid).

---

### V2.6. Apple Wallet pass (static pass v1)

**What:** PassKit-signed `.pkpass` template with invite illustration + event metadata (date, location, RSVP link, host name). "Add to Apple Wallet" CTA on share page. Apple's built-in time-relevance auto-surfaces on lockscreen 30-60 min before event.

**Why:** Mrs. W flagged Wallet pass as a high-value differentiator (2026-04-22). Iconic American-Airlines moment for guests. Static pass = ~80% of vision for ~20% of build cost. Push-updates deferred to V3.2.

**Pros:** Unique in invite space. Doubles as RSVP/check-in QR. Low incremental infra (cert + template + sign + serve).

**Cons:** ~1 day for static pass; PassKit cert is annual operational task. Apple notarization chain is a vendor dependency.

**Context:** Use `node-passkit-generator` or similar on existing Next.js worker. Cert is one-time setup in Apple Developer portal (V2.1 dependency). Template JSON references invite image URL. Generated on-demand from `/api/v1/invites/{id}/wallet-pass`. Bridges to V3.2 (push updates) and the broader Dynamic Live Invites vision.

**Depends on:** OPS.2 (Apple Developer Program for cert).

---

### V2.7. Reminder images + push notifications

**What:** Near-event auto-generated graphics ("3 days out", "tonight!", "see you in an hour") delivered via APNs push. Reuses existing image pipeline with new prompt templates per countdown stage.

**Why:** Engagement moment between purchase and event. Re-exposes user to the product. Compounds with Wallet pass time-relevance. Near-zero marginal cost (image gen amortized over notifications).

**Pros:** Sticky engagement layer. Optional surface for upsells (registry, additional invites). Could even animate countdowns.

**Cons:** Push-permission ask is friction — time the ask correctly (after first invite created, not on app open). Generated images for cancelled events = wasted compute (need cancel flow).

**Context:** Trigger schedule: T-7 days, T-3 days, T-1 day, T-1 hour. APNs setup via Apple Push Notification service (cert in Apple Developer portal). Image cache keyed on `(invite_id, countdown_stage)`.

**Depends on:** V2.1, image-gen pipeline access.

---

### V2.8. Edit text on iOS (port from web)

**What:** Native edit form on review screen for honoree, date, time, location, custom line. Calls existing `/api/v1/render-text` from V1.7 to re-composite text overlays.

**Why:** V1.7 renderer is reusable as-is. iOS just needs the form + render call.

**Pros:** Cheap port — backend already done.

**Cons:** None substantial.

**Context:** Reuse the same field set from V1.6 (honoree, date, time, location, age, custom line). SwiftUI form with keyboard-appropriate input types (date picker, etc.).

**Depends on:** V2.1, V1.7 ✅.

---

## V3+ event lifecycle (post-V2 launch)

Triggered after V2 paid-conversion signal validates the iOS app. Builds the cohost agent / event OS layer.

### V3.1. RSVP tracking + guest management

**What:** RSVP short-code texted alongside share URL. Guest RSVP form (Yes / No / Maybe + plus-ones + dietary notes). Host dashboard showing guest list, responses, reminder export to iMessage. iOS-first interface for hosts; web-fallback for non-iOS hosts.

**Why:** Paperless Post, Evite, Greenvelope, Punchbowl all have this. Users will expect it post-V2. Opens a second paid moment: "Unlock guest tracking for +$5."

**Pros:** Feature parity with incumbents. Second pay moment per event. Increases retention (host comes back to dashboard to check RSVPs, re-exposing them to upsell).

**Cons:** 1-2 weeks of work. Requires email or SMS delivery for guest notifications (new infra vertical).

**Context:** Guest data model: `invites ← has_many → rsvps (email, status, plus_ones, notes, responded_at)`.

**Depends on:** V2 paid-conversion signal hitting kill criteria.

---

### V3.2. Wallet pass push-update service

**What:** APNs web service for Apple Wallet — push venue changes, weather alerts, parking notes, schedule updates to all guests with the pass installed.

**Why:** V2.6 ships static pass; V3.2 makes it live. Bridges to the Dynamic Live Invites vision (#7 in original 40-idea list).

**Pros:** True differentiator vs static-only competitors. One-update-reaches-all-guests is huge for hosts.

**Cons:** ~3-4 days build. APNs is fiddly. Pass push requires registered devices (recipients must add pass first).

**Context:** Build only after V2 retention data shows guests actually save Wallet passes (target: >30% add-to-Wallet rate).

**Depends on:** V2.6, V2 paid-conversion validation.

---

### V3.3. Live invite agent (Q&A bot)

**What:** Per-event conversational agent answering guest questions: parking, dress code, food/allergy, plus-one, registry. Escalates to host when uncertain. Surfaces from share page + Wallet pass link.

**Why:** Highest-leverage post-purchase feature — turns the invite into a 24/7 host assistant. Reduces host burden + improves guest experience.

**Pros:** Unique. Compounds with FAQ autogen, venue intelligence, weather adaptation.

**Cons:** LLM cost per session. Hallucination risk (always include "ask the host" escape).

**Context:** Per-event RAG over the FAQ + manual host notes. Cap conversation depth.

**Depends on:** V3.1.

---

### V3.4. Conversational RSVP

**What:** SMS/iMessage RSVP with emoji + dietary + plus-one collection in 2-3 messages. Intelligent follow-up for non-responders.

**Why:** Frictionless mobile RSVP is a known wedge — Greenvelope/Paperless Post don't do it well.

**Pros:** Removes the #1 host complaint about invite tools (low RSVP rates).

**Cons:** SMS infra (Twilio?). Per-message cost.

**Context:** Hooks into V3.1 guest management. SMS short-code + reply parsing.

**Depends on:** V3.1.

---

### V3.5. Post-event memory engine

**What:** Shared photo album linked to the invite. AI curation, recap reels, auto-thank-yous, annual memory resurfacing.

**Why:** Extends event from one-day moment to persistent memory layer. Massive retention loop — annual resurfacing creates new event opportunities.

**Pros:** Sticky beyond the event itself. Compounds with shared albums and guest-uploaded photos.

**Cons:** Photo storage costs. AI curation latency. Privacy considerations for guest-uploaded photos (consent flow needed).

**Context:** Shared album generates own URL/QR for guests to upload. AI does best-photo detection, duplicate cleanup, face grouping.

**Depends on:** V2 launched + retention data showing event lifecycle is desired.

---

### V3.6. Persistent taste memory + person-aware intelligence

**What:** Per-family aesthetic profile that learns typography/palette/layout preferences over time. Person-aware intelligence: relationship-aware tone, culturally aware formatting/language. Recipient-specific invite variants.

**Why:** Makes the product feel like a designer who *knows you*, not a generic AI. Compounds across events — second event for a family is better than the first.

**Pros:** Strong moat (taste data accumulates). Personalization differentiator.

**Cons:** Cold-start problem (first event has no taste history). Privacy/data-retention considerations.

**Context:** Build only after V2 + V3.1 are live and you have multiple events per family in the data.

**Depends on:** V2 launched, V3.1.

---

### V3.7. LLM-driven context-extraction intake

**What:** Conversational intake layer that asks 2-4 follow-up questions after initial description to deepen context. gpt-4o-mini drives the question loop based on what's still ambiguous in the parse. Optional "tell me more" affordance, not a gate on the happy path.

**Why:** The locked V2 intake is a single-shot description → parse → generate. That leaves taste-signal on the table. Bespoke designers ask clarifying questions on day 2. An LLM-driven question loop is the cheapest way to extract that signal without a form.

**Pros:** Gets bespoke-designer quality closer to reality. Differentiator vs single-shot competitors. Cost ~$0.002/session at gpt-4o-mini pricing.

**Cons:** Every extra question is a funnel leak. Must be strictly optional and skippable. Risk of LLM asking dumb/generic questions.

**Context:** Natural follow-on to existing `POST /api/v1/events/parse`: add `POST /api/v1/events/refine` that takes current parsed state and returns `{ next_question?, confidence, ready_to_generate }`. Loop until `ready_to_generate=true` or user hits "I'm done, generate."

**Depends on:** V2 paid-conversion data — don't build before knowing what users consistently get wrong.

---

## V4+ commerce

### V4.1. Gift registry with affiliate links

**What:** Integrated registry. AI suggests gifts based on event theme + honoree details. Affiliate revenue from Amazon, Target Registry, Honeyfund (cash gifts), Zola partnership.

**Why:** Monetization layer beyond the $10 SKU. Natural fit — guests want to know what to bring; hosts want to capture preferences without an awkward "here's my Amazon list" link.

**Pros:** Stacks revenue without raising primary SKU price. AI gift suggestions are a differentiator vs basic registry tools. Affiliate revenue compounds with engagement (every guest who clicks through is potential $).

**Cons:** Affiliate API integrations have approval processes (Amazon especially). Fulfillment is third-party (less control over guest experience). Registry abandonment is a known issue across the category.

**Context:** Linked from invite share page + Wallet pass. Honeyfund / Zola partnership for cash-gift flows vs physical-only registries. AI suggestions powered by event theme + honoree taste from V3.6.

**Depends on:** V2 launched + measurable guest engagement on share page.

---

### V4.2. Full event asset generation

**What:** Generate matching menus, table cards, placards, banners, welcome signs, stickers, thank-you cards, social stories, QR signs, photo booth props, cake toppers, coloring sheets, itinerary cards — all matching the invite's aesthetic.

**Why:** Reuses existing image pipeline. Hosts who buy the invite are the same hosts who need the matching assets. Natural upsell at near-zero marginal cost.

**Pros:** Multiplier on average revenue per event. Matching aesthetic across all assets is the bespoke-designer experience guests notice.

**Cons:** Print-on-demand fulfillment for physical assets adds operational complexity. Digital-only first (PDFs to download/print) is the cheap entry.

**Context:** Phase 1: digital downloads (PDFs). Phase 2: print-on-demand integration (Printful, Gelato). Phase 3: vendor marketplace for custom physical orders.

**Depends on:** V2 launched.

---

## Ops

### OPS.1. Rotate Stripe API keys before 2026-06-09

**What:** Both live + test Stripe API keys on Overdraft Inc. (`acct_1OuKXaKchTJzDiFQ`) expire 2026-06-09. Rotate before that date — generate new restricted live key + test key in Stripe dashboard, update `STRIPE_SECRET_KEY` in Vercel envs (production + preview + development scopes), update `~/.config/stripe/config.toml` for local CLI, redeploy.

**Why:** Hard deadline. If keys expire mid-launch the checkout endpoint will start returning auth errors and paid conversions stop until rotated. Discovered while scoping the Stripe Checkout build (2026-05-07).

**Pros:** Prevents a self-inflicted outage during the validation cohort window.

**Cons:** Brief test-mode reverification needed after rotation (run `stripe trigger checkout.session.completed` against the new whsec).

**Context:** `stripe config --list` shows `live_mode_key_expires_at = '2026-06-09'` and `test_mode_key_expires_at = '2026-06-09'`. Restricted keys (`rk_live_…`) only — never store unrestricted secrets in env. The webhook secret (`whsec_…`) does not expire on the same cadence; only rotate it if compromised.

**Depends on:** Schedule rotation for ~2026-05-25 to leave a 2-week buffer.

---

### OPS.2. Apple Developer Program enrollment

**What:** Enroll Overdraft Inc. in Apple Developer Program ($99/year). Set up app ID, provisioning profiles, push notification cert (APNs), PassKit cert, StoreKit configuration.

**Why:** Required for V2 (iOS app). Annual cost. Cert management is permanent operational task.

**Pros:** One-time setup unlocks all V2.x. Org enrollment lets the app ship under "Overdraft Inc." not personal name.

**Cons:** $99/year. D-U-N-S number required for org enrollment. ~1-3 days for approval.

**Context:** Use Overdraft Inc. account (same as Stripe). Enroll under business name. Get D-U-N-S free from Dun & Bradstreet (~1 week processing if not already on file).

**Depends on:** Decision to build V2 (committed 2026-05-09).

---

### OPS.3. Apple Small Business Program enrollment

**What:** Enroll Overdraft Inc. in Apple Small Business Program. Reduces IAP fee from 30% to 15% for orgs under $1M/year in App Store revenue.

**Why:** Saves 15 percentage points on every $10 IAP transaction = $1.50/sale. Material at scale.

**Pros:** Material margin improvement. Standard path for indie devs.

**Cons:** Annual reverification required. If revenue exceeds $1M in a year, reverts to 30% the following year.

**Context:** Apply via Apple Developer portal after Developer Program enrollment. Verify exact rate before financial planning — user said 10% on 2026-05-09; published rate is 15%. Could be a recent change or confusion; confirm.

**Depends on:** OPS.2.

---

## Done

- **V1.1** Voice-input feature flag + cost kill-switch — shipped 2026-04-26 (lean MVP). `apps/web/lib/voice-gate.ts` + transcribe/voice-status routes + `useVoiceEnabled` hook. PostHog/Sentry/shared UsageStore deferred.
- **V1.2** Thinking-notes template library (initial 40) — shipped 2026-04-26. `apps/web/lib/thinking-notes/{templates,render}.ts`. Week-3 expansion to 80 pending Mrs. W beta feedback.
- **V1.3** Tinder-style L/R swipe gestures (web) — shipped 2026-04-30 (PR #14). `apps/web/lib/swipe.ts` + `SwipeStack.tsx`, drag/tilt/peek/snap-back, undo, 4-dot progress, X/heart fallback buttons. iOS port now part of V2.x.
- **V1.5** Generating screen: status copy dedup + thinking-notes voice — shipped 2026-04-30. `apps/web/lib/thinking-notes/status.ts` + `GeneratingStatus.tsx`. Single canonical status line + rotating thinking-notes (4-6s).
- **V1.7** Code-overlay text rendering pipeline — shipped 2026-05-05. `apps/web/lib/text-overlay/` (opentype.js → SVG glyph paths → sharp composite) + `/api/v1/render-text` route + `useTextOverlay` hook. Pivot story preserved in git log.
- **Stripe Checkout + magic-link post-purchase access** — shipped 2026-05-08 (PR #17). $10 SKU, Postgres-backed credit grant, Resend magic-link delivery. Web purchase flow stays as fallback for V2 IAP.
- **P1** RTK installation verified — 2026-04-26. rtk 0.35.0 at `/Users/blainewilson/.local/bin/rtk`, 50.2% savings across 1707 commands.
