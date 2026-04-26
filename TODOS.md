# TODOS

Build queue, organized by phase. Each entry captures what, why, pros, cons, context, and dependencies so the reasoning survives when you come back to this in 3 months.

For non-engineering work (validation cohorts, kill criteria, pricing tests, ethics-gated features), see [STRATEGY.md](STRATEGY.md).

---

## Pre-flight

### P1. Verify RTK installation

**What:** Confirm `rtk` is on your PATH and `rtk gain` returns analytics. If missing, install from reachingforthejack/rtk (the Rust Token Killer variant, NOT Rust Type Kit — name collision warning in RTK.md).

**Why:** Your global `~/.claude/RTK.md` says "All other commands are automatically rewritten by the Claude Code hook" — if RTK isn't actually installed, you're missing the 60-90% token savings it claims on dev operations.

**Pros:** Free token savings on every dev session. 2 min check.

**Cons:** None if it's already installed. If not, install involves Rust toolchain.

**Context:** Run `which rtk` and `rtk gain`. If "command not found", install and set up the Claude Code hook per your RTK.md. Delete this TODO when verified.

**Depends on:** Nothing.

---

## v1 (ship-blocking)

### V1.1. Voice-input feature flag + cost kill-switch

**What:** From day one, wrap the `/api/v1/transcribe` endpoint behind a PostHog feature flag that can be toggled without a deploy. Add a cost kill-switch: if transcribe spend exceeds $50 in a rolling 24h window (tracked via a Postgres `transcribe_usage` table with hourly aggregation), auto-disable voice for all sessions and fire a Sentry alert. When disabled, the intake UI silently reverts to text-only.

**Why:** Codex outside voice flagged during /plan-eng-review 2026-04-22 that voice is a new abuse surface and the initial defense layer (Turnstile + 60s cap + per-session rate limit) lacks a cost-based circuit breaker. For a pre-validation product with no revenue covering abuse, a silent $500 OpenAI bill from a targeted abuse campaign is a much larger pain than a 2-line check in the request handler.

**Pros:** Trivial to add while building the endpoint. Saves you in the long-tail abuse scenario where Turnstile is bypassed. Lets you kill voice instantly if anything goes wrong without a deploy. Cost kill-switches are standard operational hygiene.

**Cons:** Adds one env var, one PostHog flag, one Postgres table, one Sentry alert rule. Negligible cost. Slight latency tax on every transcribe request (<5ms for the flag check + the usage counter increment).

**Context:** PostHog is already in the stack (design doc L122). Feature flag reads happen at Edge before the transcribe handler runs. Usage counter is INSERT-only with a daily cleanup job. Sentry alert fires at $40 threshold (warning) and $50 (auto-disable). Manual re-enable via PostHog dashboard after investigation.

**Depends on:** Voice-input feature being built. This TODO gates shipping voice.

---

### V1.2. Thinking-notes template library expansion

**What:** Start v1 with 40 canned+interpolated note templates in `packages/thinking-notes/templates.ts`. Expand to 80 templates by week 3 based on Mrs. W's repetition feedback from beta usage. Each template is `{ id: string, text_template: string, context_requires: Array<"name" | "event" | null> }` so the renderer picks only templates where the required context fields are filled.

**Why:** Codex outside voice warned during /plan-eng-review 2026-04-22 that the beta cohort (Mrs. W, same user running the flow 10+ times) will notice repetition fast. 40 notes at ~4-6s rotation over a 60s generating window = ~12 notes per session = repetition begins by session 4. 80 templates extends the non-repetition ceiling to ~7 sessions, covering the critical week-1 to week-3 beta window without a vendor swap to LLM-generated notes.

**Pros:** Better beta experience without adding an LLM dependency to the anxiety-peak wait screen. Defers the decision about LLM-generated notes until post-validation data supports it. Copywriting is fast with Claude (~4 hours for 40 more).

**Cons:** ~4 hours of copywriting. Slight maintenance burden (one file to curate).

**Context:** Templates live in `packages/thinking-notes/templates.ts`. Renderer is pure function: `render(template, intake_context) => string`. Server interpolates once at generation start, sends all notes in a single `generation.state` blob the client can refetch on reconnect (per Codex's SSE replay concern). Expansion is purely additive — adding 40 more templates doesn't change the renderer or the API contract.

**Depends on:** v1 shipping with the initial 40. Week-3 retro checks if Mrs. W flagged repetition.

---

### V1.3. Tinder-style L/R swipe gestures (non-optional per Mrs. W)

**What:** Replace tap-to-choose on the swipe screen with full Tinder-style card-stack physics: drag with tilt+opacity peek, snap-back on weak swipes, decisive L/R commits the keep/discard, undo button, 4-dot progress dots, circular X/heart buttons under the stack as a non-swiper fallback. Both web and iOS.

**Why:** Mrs. W explicit ask in 2026-04-22 design review: tap-to-choose breaks the mental model the "swipe" word promises. The swipe metaphor is the core mechanic of this product — getting it wrong is shipping a different product than the one we pitched. She called this non-optional, not a preference.

**Pros:** Matches the mental model the product name implies. Tactile feedback is what makes the "fun" of generation land. Non-swiper fallback (X/heart buttons) keeps it accessible.

**Cons:** ~1 day of UI work on web (framer-motion or react-tinder-card). iOS gets it close to free with native gesture system. Adds gesture-tuning surface (thresholds, easings) that needs to feel right or it feels broken.

**Context:** Currently the design doc lists the swipe screen with "tap-to-choose" semantics. This TODO upgrades it to gesture-first with tap fallback. Spec: drag threshold ~80px or velocity >0.5; tilt up to 15° at threshold; opacity to 0.6 at threshold; snap-back below threshold with spring; success animation = card flies off screen + green keep stamp on right, red X on left. Non-swiper buttons trigger the same animations.

**Depends on:** Swipe screen being built. This is v1, not deferred.

---

### V1.4. Intake: tap-and-hold mic + visible event-type chips

**What:** Unify the intake into one input that accepts both typing and voice. Long-press on the textbox or its embedded mic icon dictates into the same field (no separate voice/text mode toggle). Show event-type chips as empty-state helpers (birthday, baby shower, graduation, gender reveal, milestone, wedding, other) — tapping a chip seeds the textbox with a starter phrase. "Or use fields" stays as an escape hatch but the hybrid is the default.

**Why:** Two findings from 2026-04-22 design review with Mrs. W. (1) The "second mic icon in the textbox" reads as redundant — make it one unified affordance. (2) Empty input feels unguided; visible chips give the user permission to "focus on the right answer." Even users who could verbally answer benefit from seeing the answer space first.

**Pros:** Removes a decision (voice vs text) the user shouldn't have to make. Chips lower the activation energy on a blank textbox — the #1 conversion killer on intake screens. Both feedback items resolved with one screen iteration.

**Cons:** ~half a day of UI work. Tap-and-hold gesture needs visual feedback (recording indicator, waveform, release-to-stop) — easy to ship a janky version. Chips list needs curation; too many = clutter, too few = the user's event type is missing.

**Context:** Voice transcription path covered by V1.1 (PostHog flag + cost kill-switch). This TODO is about the UI affordance, not the backend. Recommended: 7 chips visible by default (the 6 most common event types + "Other"). Long-press on textbox starts recording with visible waveform + timer; release stops + transcribes + appends to existing text (does not replace).

**Depends on:** Intake screen being built. This is v1.

---

### V1.5. Generating screen: status copy dedup + thinking-notes voice

**What:** Two fixes on the generating screen. (a) Show one status line max — "Sketching… Sketching… Sketching 4 concepts for Lily's first birthday" reads like a stuttering bug. Pick one canonical phrasing and stick with it for the session. (b) Adopt Claude's flip-book thinking-notes voice — small clever notes like "Adding a dash of cake…" / "Picking colors Lily would love" — instead of sterile progress copy. Add jokes and contextual references (honoree name, event type) so it feels like a designer is in the room, not a load bar.

**Why:** Mrs. W's 2026-04-22 reaction to the generating mockups. She picked the "calm" variant overall but specifically called out the duplicative copy as a defect and the playful thinking-notes as the right tone. The 60-second wait is the highest-anxiety moment in the funnel; voice on this screen does emotional work the spinner can't.

**Pros:** Cheap fix — copy + a single status line. Big emotional payoff at the most fragile moment in the funnel. Aligns with "feels like a designer is working on it" positioning. Reuses the thinking-notes template library from V1.2.

**Cons:** None substantial. Risk is over-doing the cleverness and tipping from "warm" to "annoying" — keep notes short and specific to the user's event.

**Context:** Pairs with V1.2 (thinking-notes template library expansion). V1.5 is the screen-level UX fix; V1.2 is the content library that powers it. Single status line should reference the user's actual event ("Sketching 4 invites for Lily's 5th birthday") not generic ("Generating concepts"). Notes rotate every 4-6s during the 60s window.

**Depends on:** Generating screen being built. v1.

---

### V1.6. User-editable text UI on the compare screen

**What:** After code-overlay typography ships in v1, a simple edit form on the compare screen. User can tweak honoree name, date, time, address, custom line before paying. Server re-renders text overlay on paid concepts instantly.

**Why:** Parser extraction will be ~80% accurate. 20% of events will have a misspelled name, wrong time, missing detail. An edit UI turns a $7 refund request into a 2-second re-render. Trust win. Pulled into v1 because it directly protects paid-conversion in the week-3 kill-criteria window (STRATEGY #2) — without it, parser misses become refund requests.

**Pros:** Massive retention + trust win. Near-zero engineering cost once code-overlay is the text pipeline. Distinguishes product from competitors.

**Cons:** +1 day of UI work. Adds form validation surface.

**Context:** Code-overlay typography was locked in v1 during this review. Text becomes data. Rendering with different text strings is a server round-trip (fast). Fields: honoree name, date, time, location, honoree age, custom line. Keep it minimal; any field beyond those 6 is out of scope.

**Depends on:** Code-overlay typography shipping in v1.

---

## v1.1

### V1.1.1. RSVP tracking + guest management

**What:** v1.1 feature. RSVP short-code texted alongside share URL. Guest RSVP form (Yes / No / Maybe + plus-ones + dietary notes). Host dashboard showing guest list, responses, reminder export to iMessage.

**Why:** Paperless Post, Evite, Greenvelope, Punchbowl all have this. Users will expect it post-v1. Opens a second paid moment: "Unlock guest tracking for +$5."

**Pros:** Feature parity with incumbents. Second pay moment per event. Increases retention (user comes back to the host dashboard to check RSVPs, which re-exposes them to the upsell).

**Cons:** 1-2 weeks of v1.1 work. Requires email or SMS delivery for guest notifications (new infra vertical).

**Context:** Design doc line 75 already has this as "planned for v1.1." Capturing here so it doesn't drift. Guest data model needs design: `invites ← has_many → rsvps (email, status, plus_ones, notes, responded_at)`.

**Depends on:** v1 paid-conversion signal hitting week-3 kill criteria.

---

### V1.1.2. Apple Wallet pass integration

**What:** Static .pkpass signing pipeline on the Fly.io worker, `POST /api/v1/invites/{id}/wallet-pass` endpoint, pass template with invite illustration + event metadata, Apple PassKit signing cert. Add-to-Wallet CTA on share page. Rely on Apple's built-in time-based relevance for lock-screen surfacing near event date. Defer push-update web service (APNs) until retention data shows guests actually use Wallet pass.

**Why:** Mrs. W identified Wallet pass as a high-value differentiator on the share page during 2026-04-22 review — "American-Airlines-style timely reminders." Deferred from v1 by /plan-eng-review on 2026-04-22 to protect solo builder timeline. Static pass with native time-relevance delivers ~80% of the vision for ~20% of the build cost.

**Pros:** Unique in the invite space (nobody else does this well). Second retention moment per event. Low incremental infra — cert + template + sign + serve. Works on share page visits from any guest phone.

**Cons:** ~1 day of solo build for static pass; ~3-4 days for full push-update service. PassKit cert management becomes a permanent operational task (annual renewal). Adds a vendor dependency on Apple's notarization chain.

**Context:** Design doc line 485 notes the vision is "American-Airlines-style timely reminders with a cute image pulled from the invitation." Static pass path: node-passkit or similar lib on the worker. Cert is one-time setup in Apple Developer portal. Template JSON references the invite image URL. Worth building the push-update service later only if v1.1+ usage data shows the feature is sticky.

**Depends on:** v1 paid-conversion signal hitting week-3 kill criteria + Apple Developer Program setup (already budgeted in design doc L258).

---

## v1.5+

### V1.5+.1. LLM-driven context-extraction intake

**What:** A conversational intake layer that asks follow-up questions after the initial description to deepen context: "Who's this for?" "What's the vibe?" "Where is it?" "Any design direction — preferred colors, themes, references you've seen you loved?" gpt-4o-mini drives 2-4 chained questions based on what's still ambiguous in the parse. Output feeds into the generation prompt as richer context than a single-shot description provides. Ship as an optional "tell me more" affordance, not a gate on the happy path.

**Why:** The locked v1 intake is a single-shot free-text + chip + voice → parser → generate flow. That's enough for "Lily's 5th birthday, June 15, at the park" but leaves a lot of taste-signal on the table. The highest-variance variable in generation quality is the prompt; better prompts come from better context; better context comes from knowing what to ask about. An LLM-driven question loop is the cheapest way to extract that without a form.

**Pros:** Gets bespoke-designer quality closer to reality — the thing an Etsy designer does on day 2 is ask clarifying questions. Creates a differentiator vs. single-shot competitors. Re-uses the parser infrastructure already locked. Cost is ~$0.002/session at gpt-4o-mini pricing.

**Cons:** Every extra question is a conversion funnel leak. Must be strictly optional and skippable. Adds prompt-engineering surface area (the system prompt for "ask the right next question" is not trivial). Risk of the LLM asking dumb or generic questions that annoy the target user.

**Context:** v1 ships intake without this. Gather week-3 data first — what do paying users consistently NOT get right on first generation? What do refund requests cite? That signal tells you whether the extraction loop would have caught it. Natural follow-on to the existing `POST /api/v1/events/parse` endpoint: add `POST /api/v1/events/refine` that takes the current parsed state and returns `{ next_question?, confidence, ready_to_generate }`. Loop until `ready_to_generate=true` or user hits "I'm done, generate."

**Depends on:** v1 paid-conversion data. Don't build before week 3.
