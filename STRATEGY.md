# STRATEGY

Non-engineering work — measurement, validation, pricing, and ethics-gated product decisions. These items are tracked here so they don't get lost in the build queue, but they're not coding tasks. Revisit deliberately at retro checkpoints.

For the build queue, see [TODOS.md](TODOS.md).

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

## 4. Social-graph enrichment for invite context (v2+, ethics gate)

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
