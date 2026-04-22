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
