# Truth Onion — Stage 2.95 Kickoff: The Time Machine (give this to Claude Code)

Runs ONLY after Stage 2.9 is done and operator-verified. Fresh session: read
`PROJECT-STATE.md` first. Design authority is
`truth-onion-stage-2-95-addendum.md`; this kickoff scopes it. This stage is
read-side over the event log the 2.9 audit certified: **no new write paths, no
rule changes, no schema changes beyond what rendering the log requires.**

## In scope

**A. The time scrubber.**
- A control beside the depth dial: render any topic at any past timestamp,
  computed from the event log alone. Obvious "now" position; visible
  current-timestamp indicator (same legibility standard as the dial — a filter
  that hid its own filtering would be a lie).
- Depth dial and scrubber compose (*Depth 3, as of last March*); both states
  survive the 2D/3D toggle.
- 3D replay: shells accrete, tiles materialize at placement moments, migrate
  on tier changes, weathering accumulates as challenges are survived, kernel
  links/fans appear at their creation events.

**B. Error vs. supersession — the reason this stage exists.**
- A claim's history must legibly distinguish "correctly placed on
  then-available evidence, later superseded" from "mis-placed and corrected."
  The record already contains the difference (what was attached when, what
  arrived later); the rendering must not flatten it.
- Failed promotion attempts render in history — an honest record includes what
  was tried and refused.

**C. Strict read-only, structurally.**
- No write path is reachable from any historical view. An attempted action
  while scrubbed to the past either returns to now first or refuses with a
  plain reason — it NEVER writes against a past state. Pinned by test.

**D. Binding rule — the past does not resurrect what the boundary refused.**
- Scope-removed items render as tombstones at EVERY timestamp; redacted
  captures render redacted at every timestamp. Proven by test that no
  historical view surfaces removed or pre-redaction content.
- **Conditional on the 2.9 audit report:** if the schema has no
  scope-event/hash-supersession record types (Legal Amendments F/G
  unimplemented), the replay covers evidence events only, and this kickoff's
  scope-event rendering is explicitly deferred with one line in PROJECT-STATE
  saying so — do not invent the record types here.

**E. Claim-level history and comparison.**
- From any claim's evidence panel: jump the map to a specific event in that
  claim's timeline ("show the map when this was promoted").
- Snapshot comparison: state-at-event vs. state-at-review, side by side, diff
  legible.

**F. Topic-health statistics, from the log only.**
- Tier-migration rates, survival time per tier, churn, challenge outcomes over
  time, supersession rate.
- Presentation rule, enforced not preferred: readouts, never leaderboards.
  Nothing here feeds reputation, tier calculation, or any ranking of
  participants — "most active/most promoted as achievement" is refused. Pin
  with a test that statistics endpoints expose topic aggregates only.

## Out of scope — refused, not negotiated

- Taxonomy (2.99). Reputation design (Stage 3 — and per the addendum it must
  wait on this stage, not ship inside it). Multiplayer anything.
- New write paths of any kind. Storage of anything the invariants exclude.
- Public hosting (the release checklist in the release decision record runs
  after this stage verifies — it is a separate, small piece of work).

## Definition of done

1. Scrubber renders any topic at any past timestamp from the log alone; no
   historical view reaches a write path (pinned).
2. Superseded-vs-misplaced is legible in claim history; failed promotions
   appear.
3. Tombstone/redaction binding proven by test at every timestamp (or the
   scope-event deferral is recorded per D).
4. Dial and scrubber compose; state survives 2D/3D toggle.
5. Statistics render with no leaderboard framing and no path into tiers or
   reputation (pinned).
6. Snapshot comparison works.
7. Full suite green including new tests; report totals by suite.
8. PROJECT-STATE updated: status, decisions, rejects.

Stop at the definition of done. The public release checklist is next but is
NOT this session's work. End with one line each: decided / finished /
scrapped.

---

## Amendment A (2026-07-27) — the log epoch

Supersedes the implicit assumption in §A that the event log reaches back to
the beginning of every topic. The 2.9 audit found it does not: no general
event log existed before 2026-07-27. The `events` table records from its
creation forward. Source and link operations before that date were never
recorded and are unrecoverable. Placements and tier changes before it are at
most partially reconstructible from claim and challenge records that carry
their own timestamps.

Binding rules for this stage:

1. **The replay exposes a log epoch.** Scrubbing before the epoch shows an
   honest boundary — "recorded history begins here" — never an empty map
   passing itself off as "nothing had happened yet."
2. **Backfill is permitted only from records that carry their own
   timestamps** (claim creation, tier changes with reasons, challenge
   records). Every backfilled event renders as *derived from record*, visually
   and in data distinct from contemporaneous log events. Unknown actor stays
   unknown — never guessed, never defaulted to a name.
3. **No pre-epoch view may present itself as complete.** Pinned by test.
4. Trade-off stated so nobody relitigates it at release: the seeded topics
   will have thin replay histories in the public demo. Honest thinness beats
   fabricated depth. Post-2.9 activity on those topics is fully logged and
   replays normally, so the demo's time machine demonstrates itself on real
   recorded events from today forward.

Additional definition-of-done item:

9. Log epoch rendered honestly; backfilled events distinguishable from logged
   events by test; no pre-epoch view claims completeness.
