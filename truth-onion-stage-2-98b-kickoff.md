# Truth Onion — Stage 2.98b Kickoff: Record Permanence & Source Links (give this to Claude Code)

Runs after the 2.98 correction is operator-verified. Read `PROJECT-STATE.md`
first. This stage brings the UI's removal affordances into line with the
record's own append-only constitution, and makes the seeded sources
verifiable. Rules-layer + presentation + seed content; no tier logic
changes.

**Standing rule (permanent):** nothing created this session is removed
before operator verification.

## Principle (stated once, with reasoning)

The record already refuses to forget: append-only events, actor and reason
on every state change, debunked kept visible, failed promotions rendered.
A one-click delete that vanishes evidence from display contradicts all of
it — the log remembers but the reader can't see what left or why, and
nobody can stand up for removed evidence they can't see. Therefore:
**record entities are never hard-deleted through any UI or API path — they
change status, with a reason, and remain visible in a diminished state.**

## A. Replace deletion with recorded withdrawal

- **Source detach (the ⨯ on attachment rows):** becomes "withdraw from this
  claim" — requires a reason (refused without one, blocker named). The
  withdrawn source renders in a diminished state on the claim's Sources
  tab (struck/sectioned as *withdrawn*, reason and date shown), remains in
  replay, remains auditable. Ripple effects on tier floors apply exactly as
  detach does today.
- **Library delete (the ⨂lib control):** becomes "withdraw from library" —
  same reason requirement; existing ripple demotions unchanged; the
  library entry renders as withdrawn rather than vanishing.
- **Sweep for any other hard-delete affordance on record entities**
  (challenges, links, topics, claims — some already have no path; verify)
  and report the inventory. Any found gets the same treatment or is
  removed as an affordance entirely.
- Rules-layer enforcement: the API paths themselves refuse reason-less
  withdrawal and offer no hard delete; the UI renders refusals, it does
  not pre-decide them.
- Schema/event note: reuse existing detach/delete event types where the
  semantics match (recorded as withdrawal with reason); add none beyond
  what status rendering requires. Report what was reused vs. added.

**Stated exceptions (settled, not relitigated):** parking lot (private
scratch, no standing — truly deletable, unlogged); companion threads and
notebook (private, client-side); legal-boundary scope removals and
redactions (the one case content genuinely leaves — tombstone machinery,
governed elsewhere).

## B. Review socket on record changes

- The 2.98 review-status treatment extends to source attach and withdrawal
  events where they render (Sources tab entries, History tab): each shows
  its independent-review state — currently the honest "none yet —
  single-curator record" line. Display only; no submission machinery.

## C. Seed source link audit

- Every source across all seeded topics gets its canonical online link
  (prefer primary homes: govinfo, National Archives, court dockets/RECAP,
  agency reading rooms, archive.org for defunct pages).
- Sources with no legitimate online home render as honest offline
  citations — labeled (e.g., "print source — no canonical online copy")
  with full citation detail. **No naked linkless statements, and no
  invented or approximate links** — a wrong link is worse than a labeled
  absence.
- Deliver the audit as a per-topic table (source → link found / offline /
  could-not-verify) for operator spot-checking. Could-not-verify items are
  reported, not guessed.

## Out of scope — refused, not negotiated

- Review submission or moderation machinery.
- Any change to challenge, promotion, or placement logic.
- Legal-boundary tombstone machinery (governed by its own rules).
- Deleting anything (obviously).

## Definition of done

1. No hard-delete affordance exists on any record entity in UI or API
   (inventory reported); withdrawal requires a reason everywhere, refused
   without one (pinned by test).
2. Withdrawn sources/library entries render diminished-but-visible with
   reason and date, on the claim and in replay (2.95 view shows the
   withdrawal at its timestamp; pre-withdrawal views show the source
   active).
3. Review-status line renders on attach/withdraw entries per B.
4. Source link audit table delivered; every seeded source is linked,
   labeled offline, or flagged could-not-verify — zero naked statements
   remain (pinned by a seed-lint test that fails on a linkless, unlabeled
   source).
5. Full suite green including new tests; report totals by suite.
6. PROJECT-STATE updated: affordance inventory, event-type reuse notes,
   audit table location.

Stop at the definition of done. End with one line each: decided / finished
/ scrapped. Nothing built this session is cleaned up.

---

## Amendment A (2026-07-31) — withdrawal adjudicates before it takes effect

Operator finding against the built 2.98b: withdrawal-with-reason still takes
effect the moment one actor files it — auditable vandalism is still
vandalism. Supersedes scope A's effect timing. Run as a follow-up session.

- **Withdrawal is two-phase, challenge-shaped:** filing a withdrawal
  (source-from-claim or library) creates a PROPOSED withdrawal — reason
  still mandatory, refused without one. A proposed withdrawal renders on
  the source immediately ("withdrawal proposed — {reason}") but **the
  source continues to count toward tier floors and all rules until
  adjudication.** No effect precedes adjudication, structurally: the floor
  computation must be provably unable to see un-adjudicated withdrawals.
- **Adjudication:** upheld → withdrawn status, diminished rendering,
  ripples — exactly as 2.98b built; rejected → the source stands, and the
  rejected attempt remains permanently visible in history, like a failed
  promotion. Both outcomes are events with actor, timestamp, reason.
- **Implementation latitude:** reuse the challenge machinery (a withdrawal
  as a challenge type against the attachment) or parallel it — build's
  call, but the two-phase shape, the no-effect-before-adjudication rule,
  and the permanent history of rejected attempts are required either way.
  Report which was chosen and why.
- **Single-curator honesty:** in the current engine the operator files and
  adjudicates; the display says so plainly — "adjudicated by curator ·
  independent review: none yet" — the same review-status socket, no
  pretense of a review that didn't happen. At Stage 3 the adjudicator
  becomes the review pipeline with no schema change; bad-actor bounding
  (rate limits, reputation weight on proposals) is Stage 3 scope, noted
  and not built.
- **Stated asymmetry (settled, with reasoning):** additions take effect
  immediately and answer to challenges afterward; removals adjudicate
  before effect. Additions are bounded by the rules (zero-weight,
  floors) and contestable downstream; removals subtract standing evidence
  with nothing downstream to catch them. The record can absorb weak
  additions; it cannot absorb silent subtractions.
- **Replay:** the 2.95 view renders the full lifecycle — proposal at its
  timestamp (source still active), adjudication at its timestamp (effect
  or rejection). A withdrawal never appears retroactively effective from
  its proposal time.

**Amended definition-of-done items:**
7. Un-adjudicated withdrawals provably have zero rule effect (test: file a
   withdrawal, assert floors unchanged; adjudicate upheld, assert ripples
   fire at adjudication time, not filing time).
8. Rejected withdrawals render permanently in history; proposed state
   renders on the source; adjudication line shows the curator-honesty
   text.
9. Replay shows proposal and adjudication as distinct events with correct
   effect timing.
