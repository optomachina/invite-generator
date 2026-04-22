# TODOS

Tracked work items deferred from the main build. Each entry captures what, why, pros, cons, context, and dependencies so the reasoning survives when you come back to this in 3 months.

---

## 1. Outside-the-circle validation cohort (week 4-5)

**What:** After week-3 beta with wife's circle, recruit 5-10 moms from Facebook parenting groups, a micro-influencer's followers, or cold DMs. Strangers with no social pressure. Run the same flow. Track conversion separately.

**Why:** Codex outside-voice challenge called the wife's-circle cohort contaminated. Social pressure + shared taste + founder proximity all inflate positive signal. Need a clean stranger cohort to confirm week-3 success is real signal and not friend-math.

**Pros:** Real data on whether the wedge generalizes beyond the founder's social graph. Catches a subtle failure mode where the product only works for people who know you.

**Cons:** 1-2 weeks of recruitment effort. Requires writing honest cold outreach and handling no-shows.

**Context:** Track `cohort_type` on every paid conversion in PostHog (`founder-adjacent` vs `stranger`). Split week-3 metrics by cohort in the retro. If strangers convert at <30% of friends' conversion rate, the positioning or product is off and iOS public launch gates on fixing it.

**Depends on:** Week-3 beta launching. Needs the product stable enough to hand to strangers.

---

## 2. Kill-criteria ladder between week 3 and week 12

**What:** Pre-commit to numeric gates between the beta checkpoint and public launch. Example:
- Week 5: 10 stranger paid conversions, refund rate <10%
- Week 7: 30 paid conversions total, at least 1 organic Instagram post
- Week 10: 100 paid conversions, 20% of paid users return for a second event

If any gate misses by >50%, stop and retro before continuing.

**Why:** Codex outside-voice called the jump from week-3 (3 friendly conversions) to week-12 (500 paid conversions) fantasy. No credible bridge besides "Instagram will work." Ladder rungs catch the failure early instead of discovering it at week 12 when you've burned 3 months.

**Pros:** Forces honest measurement. Kill criteria actually kill. Reduces wasted capital and time.

**Cons:** Requires pre-commitment discipline. Temptation to post-hoc rationalize misses will be high.

**Context:** PostHog funnels will produce the data. Gates must be written into the design doc or the retro and not reassessed mid-flight. Consider having your wife hold you accountable to them.

**Depends on:** PostHog funnel events wired up day-one (already committed in review).

---

## 3. Pricing / positioning test

**What:** Before week-3, research whether $7 signals "cheap AI output" to custom-Etsy-shopper users. Plan a post-validation A/B of $7 vs $12 vs $19 once 100 conversions land. Also test a "Premium" add-on tier at $19-29 (fast revision, priority support, custom-font review).

**Why:** Codex outside-voice pointed out the pricing paradox: "Etsy-designer quality" positioning + $7 price = mixed signal. Custom shoppers may not trust quality at that price. Templates cost $0-5; custom costs $50-80; the $7 point is ambiguous.

**Pros:** Catches positioning failure before public launch. A premium tier captures the high-intent user for whom $7 feels sketchy.

**Cons:** Adds price-test complexity. Requires enough volume to A/B statistically meaningfully.

**Context:** PostHog can track paywall-view → paywall-bounce even pre-A/B. If bounce rate is higher than expected at $7 for the custom-shopper persona, that's the signal to raise the ceiling. The "Premium" tier can be a single add-on toggle at checkout, not a separate product.

**Depends on:** Reaching >100 paid conversions for A/B statistical significance.

---

## 4. RSVP tracking + guest management (v1.1)

**What:** v1.1 feature. RSVP short-code texted alongside share URL. Guest RSVP form (Yes / No / Maybe + plus-ones + dietary notes). Host dashboard showing guest list, responses, reminder export to iMessage.

**Why:** Paperless Post, Evite, Greenvelope, Punchbowl all have this. Users will expect it post-v1. Opens a second paid moment: "Unlock guest tracking for +$5."

**Pros:** Feature parity with incumbents. Second pay moment per event. Increases retention (user comes back to the host dashboard to check RSVPs, which re-exposes them to the upsell).

**Cons:** 1-2 weeks of v1.1 work. Requires email or SMS delivery for guest notifications (new infra vertical).

**Context:** Design doc line 75 already has this as "planned for v1.1." Capturing here so it doesn't drift. Guest data model needs design: `invites ← has_many → rsvps (email, status, plus_ones, notes, responded_at)`.

**Depends on:** v1 paid-conversion signal hitting week-3 kill criteria.

---

## 5. User-editable text UI on the compare screen

**What:** After code-overlay typography ships in v1, a simple edit form on the compare screen. User can tweak honoree name, date, time, address, custom line before paying. Server re-renders text overlay on paid concepts instantly.

**Why:** Parser extraction will be ~80% accurate. 20% of events will have a misspelled name, wrong time, missing detail. An edit UI turns a $7 refund request into a 2-second re-render. Trust win.

**Pros:** Massive retention + trust win. Near-zero engineering cost once code-overlay is the text pipeline. Distinguishes product from competitors.

**Cons:** +1 day of UI work. Adds form validation surface.

**Context:** Code-overlay typography was locked in v1 during this review. Text becomes data. Rendering with different text strings is a server round-trip (fast). Fields: honoree name, date, time, location, honoree age, custom line. Keep it minimal; any field beyond those 6 is out of scope.

**Depends on:** Code-overlay typography shipping in v1. Consider moving this into v1 scope if time allows.

---

## 6. Verify RTK installation

**What:** Confirm `rtk` is on your PATH and `rtk gain` returns analytics. If missing, install from reachingforthejack/rtk (the Rust Token Killer variant, NOT Rust Type Kit — name collision warning in RTK.md).

**Why:** Your global `~/.claude/RTK.md` says "All other commands are automatically rewritten by the Claude Code hook" — if RTK isn't actually installed, you're missing the 60-90% token savings it claims on dev operations.

**Pros:** Free token savings on every dev session. 2 min check.

**Cons:** None if it's already installed. If not, install involves Rust toolchain.

**Context:** Run `which rtk` and `rtk gain`. If "command not found", install and set up the Claude Code hook per your RTK.md. Delete this TODO when verified.

**Depends on:** Nothing.

---

## 7. Apple Wallet pass integration (v1.1)

**What:** Static .pkpass signing pipeline on the Fly.io worker, `POST /api/v1/invites/{id}/wallet-pass` endpoint, pass template with invite illustration + event metadata, Apple PassKit signing cert. Add-to-Wallet CTA on share page. Rely on Apple's built-in time-based relevance for lock-screen surfacing near event date. Defer push-update web service (APNs) until retention data shows guests actually use Wallet pass.

**Why:** Mrs. W identified Wallet pass as a high-value differentiator on the share page during 2026-04-22 review — "American-Airlines-style timely reminders." Deferred from v1 by /plan-eng-review on 2026-04-22 to protect solo builder timeline. Static pass with native time-relevance delivers ~80% of the vision for ~20% of the build cost.

**Pros:** Unique in the invite space (nobody else does this well). Second retention moment per event. Low incremental infra — cert + template + sign + serve. Works on share page visits from any guest phone.

**Cons:** ~1 day of solo build for static pass; ~3-4 days for full push-update service. PassKit cert management becomes a permanent operational task (annual renewal). Adds a vendor dependency on Apple's notarization chain.

**Context:** Design doc line 485 notes the vision is "American-Airlines-style timely reminders with a cute image pulled from the invitation." Static pass path: node-passkit or similar lib on the worker. Cert is one-time setup in Apple Developer portal. Template JSON references the invite image URL. Worth building the push-update service later only if v1.1+ usage data shows the feature is sticky.

**Depends on:** v1 paid-conversion signal hitting week-3 kill criteria + Apple Developer Program setup (already budgeted in design doc L258).

---

## 8. Voice-input feature flag + cost kill-switch (pre-ship)

**What:** From day one, wrap the `/api/v1/transcribe` endpoint behind a PostHog feature flag that can be toggled without a deploy. Add a cost kill-switch: if transcribe spend exceeds $50 in a rolling 24h window (tracked via a Postgres `transcribe_usage` table with hourly aggregation), auto-disable voice for all sessions and fire a Sentry alert. When disabled, the intake UI silently reverts to text-only.

**Why:** Codex outside voice flagged during /plan-eng-review 2026-04-22 that voice is a new abuse surface and the initial defense layer (Turnstile + 60s cap + per-session rate limit) lacks a cost-based circuit breaker. For a pre-validation product with no revenue covering abuse, a silent $500 OpenAI bill from a targeted abuse campaign is a much larger pain than a 2-line check in the request handler.

**Pros:** Trivial to add while building the endpoint. Saves you in the long-tail abuse scenario where Turnstile is bypassed. Lets you kill voice instantly if anything goes wrong without a deploy. Cost kill-switches are standard operational hygiene.

**Cons:** Adds one env var, one PostHog flag, one Postgres table, one Sentry alert rule. Negligible cost. Slight latency tax on every transcribe request (<5ms for the flag check + the usage counter increment).

**Context:** PostHog is already in the stack (design doc L122). Feature flag reads happen at Edge before the transcribe handler runs. Usage counter is INSERT-only with a daily cleanup job. Sentry alert fires at $40 threshold (warning) and $50 (auto-disable). Manual re-enable via PostHog dashboard after investigation.

**Depends on:** Voice-input feature being built. This TODO gates shipping voice.

---

## 9. Thinking-notes template library expansion (week 2-3)

**What:** Start v1 with 40 canned+interpolated note templates in `packages/thinking-notes/templates.ts`. Expand to 80 templates by week 3 based on Mrs. W's repetition feedback from beta usage. Each template is `{ id: string, text_template: string, context_requires: Array<"name" | "event" | null> }` so the renderer picks only templates where the required context fields are filled.

**Why:** Codex outside voice warned during /plan-eng-review 2026-04-22 that the beta cohort (Mrs. W, same user running the flow 10+ times) will notice repetition fast. 40 notes at ~4-6s rotation over a 60s generating window = ~12 notes per session = repetition begins by session 4. 80 templates extends the non-repetition ceiling to ~7 sessions, covering the critical week-1 to week-3 beta window without a vendor swap to LLM-generated notes.

**Pros:** Better beta experience without adding an LLM dependency to the anxiety-peak wait screen. Defers the decision about LLM-generated notes until post-validation data supports it. Copywriting is fast with Claude (~4 hours for 40 more).

**Cons:** ~4 hours of copywriting. Slight maintenance burden (one file to curate).

**Context:** Templates live in `packages/thinking-notes/templates.ts`. Renderer is pure function: `render(template, intake_context) => string`. Server interpolates once at generation start, sends all notes in a single `generation.state` blob the client can refetch on reconnect (per Codex's SSE replay concern). Expansion is purely additive — adding 40 more templates doesn't change the renderer or the API contract.

**Depends on:** v1 shipping with the initial 40. Week-3 retro checks if Mrs. W flagged repetition.

---

## 10. LLM-driven context-extraction intake (v1.5+)

**What:** A conversational intake layer that asks follow-up questions after the initial description to deepen context: "Who's this for?" "What's the vibe?" "Where is it?" "Any design direction — preferred colors, themes, references you've seen you loved?" gpt-4o-mini drives 2-4 chained questions based on what's still ambiguous in the parse. Output feeds into the generation prompt as richer context than a single-shot description provides. Ship as an optional "tell me more" affordance, not a gate on the happy path.

**Why:** The locked v1 intake is a single-shot free-text + chip + voice → parser → generate flow. That's enough for "Lily's 5th birthday, June 15, at the park" but leaves a lot of taste-signal on the table. The highest-variance variable in generation quality is the prompt; better prompts come from better context; better context comes from knowing what to ask about. An LLM-driven question loop is the cheapest way to extract that without a form.

**Pros:** Gets bespoke-designer quality closer to reality — the thing an Etsy designer does on day 2 is ask clarifying questions. Creates a differentiator vs. single-shot competitors. Re-uses the parser infrastructure already locked. Cost is ~$0.002/session at gpt-4o-mini pricing.

**Cons:** Every extra question is a conversion funnel leak. Must be strictly optional and skippable. Adds prompt-engineering surface area (the system prompt for "ask the right next question" is not trivial). Risk of the LLM asking dumb or generic questions that annoy the target user.

**Context:** v1 ships intake without this. Gather week-3 data first — what do paying users consistently NOT get right on first generation? What do refund requests cite? That signal tells you whether the extraction loop would have caught it. Natural follow-on to the existing `POST /api/v1/events/parse` endpoint: add `POST /api/v1/events/refine` that takes the current parsed state and returns `{ next_question?, confidence, ready_to_generate }`. Loop until `ready_to_generate=true` or user hits "I'm done, generate."

**Depends on:** v1 paid-conversion data. Don't build before week 3.

---

## 11. Social-graph enrichment for invite context (v2+, ethics gate)

**What:** Opt-in feature where the host provides the honoree's Instagram handle (and optionally guest list emails/phone → matched to public profiles). System analyzes publicly-available posts to extract taste signals: favorite colors in their feed, aesthetic vocabulary (cottagecore, minimalist, Y2K), interests (horses, Taylor Swift, specific franchises), and generates invites biased toward those signals. For guest lists: aggregate taste signals across guests to increase the chance the invite resonates with the group (not just the honoree).

**Why:** Blaine flagged as a moonshot idea 2026-04-22. The pitch: "what if we could analyze the guest list and create an invite that's more likely to have people attend on account of publicly available information?" It IS a genuinely novel differentiator in the invite space. No competitor does this. Closest analog is how wedding designers look at couples' Instagrams before proposing a direction.

**Pros:** Real differentiator. Would make the product feel weirdly prescient in the good way ("how did it KNOW Lily loves horses?"). Could drive significant word-of-mouth virality.

**Cons (substantial, take seriously):**
- **GDPR/CCPA exposure.** Scraping public profiles for taste signal is legally gray. EU residents have "right to be forgotten" that doesn't care about public/private distinction. "I gave you my friend's handle, you profiled them without their consent" is a real complaint vector.
- **Kids on guest lists.** Target user is moms planning kids' birthdays. Guest lists have kids in them. COPPA scope for under-13 is severe; profiling a minor off Instagram is a compliance trainwreck.
- **Creep factor.** The line between "thoughtful personalization" and "you read my Instagram without asking" is in a different place for every user. Some will love it; some will tell everyone they know you're creepy. That asymmetry is dangerous for a consumer product.
- **Signal quality is dubious.** Public Instagram posts are curated performances, not actual taste. A designer who spent 20 min on someone's IG still gets it wrong half the time. An LLM scoring colors and keywords will get it wrong more.
- **Engineering surface is huge.** Instagram scraping is an arms race. Their API is gated; third-party scraping services violate ToS; even "read a public profile" is adversarial. This feature alone is a multi-month build.
- **Instagram ToS risk.** Meta's developer terms prohibit scraping for profile analysis. Using their Graph API for this requires an approved use case, which "infer taste preferences for invite design" is not.

**Context:** If you pursue this at all:
1. Start with explicit opt-in for the **honoree only** ("paste their Instagram if they said it's OK — we'll use it to personalize"). Never guest-list-wide as v1 of this feature.
2. Never profile anyone under 18. Age-verification gate.
3. Use Meta's official Instagram Basic Display API with the honoree's own OAuth approval — scrapers are a liability.
4. Be deeply transparent in UI about what was used and why. "We noticed her feed has a lot of ocean colors, so we leaned blue." Not hidden.
5. Alternative framing that sidesteps most issues: ask the host to paste 2-3 Instagram post URLs that capture the honoree's aesthetic. Host copies the URLs deliberately; no automated crawl. Same signal, no compliance surface.

**Pros of the alternative framing:** ~100x lower legal risk. Lower engineering cost (no scraping infra). Same user-visible magic.

**Depends on:** v1 validation + legal review + explicit product decision on ethics posture. This TODO should be revisited after consulting with a lawyer about the scraping-vs-OAuth-vs-URL-paste spectrum.

---

## 12. Tinder-style L/R swipe gestures (v1 — non-optional per Mrs. W)

**What:** Replace tap-to-choose on the swipe screen with full Tinder-style card-stack physics: drag with tilt+opacity peek, snap-back on weak swipes, decisive L/R commits the keep/discard, undo button, 4-dot progress dots, circular X/heart buttons under the stack as a non-swiper fallback. Both web and iOS.

**Why:** Mrs. W explicit ask in 2026-04-22 design review: tap-to-choose breaks the mental model the "swipe" word promises. The swipe metaphor is the core mechanic of this product — getting it wrong is shipping a different product than the one we pitched. She called this non-optional, not a preference.

**Pros:** Matches the mental model the product name implies. Tactile feedback is what makes the "fun" of generation land. Non-swiper fallback (X/heart buttons) keeps it accessible.

**Cons:** ~1 day of UI work on web (framer-motion or react-tinder-card). iOS gets it close to free with native gesture system. Adds gesture-tuning surface (thresholds, easings) that needs to feel right or it feels broken.

**Context:** Currently the design doc lists the swipe screen with "tap-to-choose" semantics. This TODO upgrades it to gesture-first with tap fallback. Spec: drag threshold ~80px or velocity >0.5; tilt up to 15° at threshold; opacity to 0.6 at threshold; snap-back below threshold with spring; success animation = card flies off screen + green keep stamp on right, red X on left. Non-swiper buttons trigger the same animations.

**Depends on:** Swipe screen being built. This is v1, not deferred.

---

## 13. Intake: tap-and-hold mic + visible event-type chips (v1)

**What:** Unify the intake into one input that accepts both typing and voice. Long-press on the textbox or its embedded mic icon dictates into the same field (no separate voice/text mode toggle). Show event-type chips as empty-state helpers (birthday, baby shower, graduation, gender reveal, milestone, wedding, other) — tapping a chip seeds the textbox with a starter phrase. "Or use fields" stays as an escape hatch but the hybrid is the default.

**Why:** Two findings from 2026-04-22 design review with Mrs. W. (1) The "second mic icon in the textbox" reads as redundant — make it one unified affordance. (2) Empty input feels unguided; visible chips give the user permission to "focus on the right answer." Even users who could verbally answer benefit from seeing the answer space first.

**Pros:** Removes a decision (voice vs text) the user shouldn't have to make. Chips lower the activation energy on a blank textbox — the #1 conversion killer on intake screens. Both feedback items resolved with one screen iteration.

**Cons:** ~half a day of UI work. Tap-and-hold gesture needs visual feedback (recording indicator, waveform, release-to-stop) — easy to ship a janky version. Chips list needs curation; too many = clutter, too few = the user's event type is missing.

**Context:** Voice transcription path already TODO'd as #8 (PostHog flag + cost kill-switch). This TODO is about the UI affordance, not the backend. Recommended: 7 chips visible by default (the 6 most common event types + "Other"). Long-press on textbox starts recording with visible waveform + timer; release stops + transcribes + appends to existing text (does not replace).

**Depends on:** Intake screen being built. This is v1.

---

## 14. Generating screen: status copy dedup + thinking-notes voice (v1)

**What:** Two fixes on the generating screen. (a) Show one status line max — "Sketching… Sketching… Sketching 4 concepts for Lily's first birthday" reads like a stuttering bug. Pick one canonical phrasing and stick with it for the session. (b) Adopt Claude's flip-book thinking-notes voice — small clever notes like "Adding a dash of cake…" / "Picking colors Lily would love" — instead of sterile progress copy. Add jokes and contextual references (honoree name, event type) so it feels like a designer is in the room, not a load bar.

**Why:** Mrs. W's 2026-04-22 reaction to the generating mockups. She picked the "calm" variant overall but specifically called out the duplicative copy as a defect and the playful thinking-notes as the right tone. The 60-second wait is the highest-anxiety moment in the funnel; voice on this screen does emotional work the spinner can't.

**Pros:** Cheap fix — copy + a single status line. Big emotional payoff at the most fragile moment in the funnel. Aligns with "feels like a designer is working on it" positioning. Reuses the thinking-notes template library already TODO'd as #9.

**Cons:** None substantial. Risk is over-doing the cleverness and tipping from "warm" to "annoying" — keep notes short and specific to the user's event.

**Context:** Pairs with TODO #9 (thinking-notes template library expansion). #14 is the screen-level UX fix; #9 is the content library that powers it. Single status line should reference the user's actual event ("Sketching 4 invites for Lily's 5th birthday") not generic ("Generating concepts"). Notes rotate every 4-6s during the 60s window.

**Depends on:** Generating screen being built. v1.

