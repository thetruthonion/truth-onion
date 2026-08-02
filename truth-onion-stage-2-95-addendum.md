# Truth Onion — Stage 2.95 Addendum: The Time Machine

*Captured design for the 2.95 kickoff. Temporal replay of the map: what it believed,
when, and why it changed its mind. This is a READ-SIDE feature over records the
invariants already force the system to keep — no new write paths, no rule changes.
One dependency lands earlier: the event-log completeness audit belongs in 2.9, while
the schema is open.*

---

## 1. Why this is cheap

The engine already keeps everything required:

- Claim text is immutable (rule 6) — revisions are new claims, so nothing was ever
  silently rewritten.
- Every challenge is permanently recorded, including **failed** promotion attempts.
- Every tier change carries its reason and timestamp.
- Source attachments, deletions, and the resulting auto-demotes are all events.
- Since the Legal amendments: hash supersessions (F) and scope actions with
  public logs (G) are dated records too.

That is a complete event log. What's missing is not data but **rendering** — the
ability to say "show me this topic as of March" and have the map replay itself to
that moment. Same happy shape as the depth dial: a control over existing data,
provably unable to write.

## 2. The core distinction: error vs. supersession

**The problem it solves.** A claim places at Inner in year one on the evidence that
existed — correctly. Years later a more rigorous replication lands, a contradicting
source attaches, a challenge is upheld, the claim demotes. A current-state-only map
quietly implies the original placement was a **mistake**. It wasn't. It was sound on
then-available evidence, and the demotion is the system working.

**Two different questions, both needed:**
- *Is this claim right now?* — the current map answers this.
- *Was this placement right given what was known then?* — only temporal replay
  answers this.

**Stage 3 reputation dependency (the reason this matters most).** An investigator
whose well-sourced claim is later superseded must NOT lose standing the way someone
who mis-sourced does. Those are different failures and reputation must distinguish
them. The time machine is the instrument that makes the distinction adjudicable:
scrub to placement-time and evaluate the placement against the record as it stood.
**Stage 3's reputation design should not be finalized before this exists**, or it
will punish being early.

## 3. Anti-gaslighting: the silent-update problem

A map that shows only its current state presents itself as having always been right —
the Wikipedia effect, where history technically exists but the article reads as
timeless. A map with a visible past says: *here is what we believed in 2026, here is
what changed it, here is the date.*

This is the same principle as the outermost ring (debunked claims kept visible so
nothing is re-litigated forever) applied to the time axis: **the system does not
quietly become correct.** It shows its corrections.

## 4. What the replay shows

**Evidence events:** claim creation and placement, promotions with their surviving
challenges, demotions with reasons, source attachment/deletion and resulting
ripples, failed promotion attempts (they stay in history — an honest record includes
what was tried and refused).

**Scope events (new since the original design conversation):** hash supersessions
per Amendment F (H1 → H2, date, category, span count) and aggregate/scope actions
per Amendment G (action ID, date, category, claim count, reviewer pseudonym). The
replay surfaces governance history alongside evidence history — a topic where scope
actions cluster is itself a signal.

**Binding rule — scope actions bind the past.** A removed-for-scope item renders as
its tombstone ("removed for scope — never validly admitted") at **every** point in
the replay, never as its content. The time machine shows what the map believed; it
does not resurrect what the boundary refused. Same for redacted captures: the
replay shows the redacted artifact at all timestamps, never the pre-redaction
original (which is not retained anyway, per Amendment A).

## 5. Statistics — topic health from the same log

Derived readouts, all from events already recorded:

- Tier-migration rates (how much moves, in which direction, how often)
- Survival time per tier (how long claims hold their placement)
- Churn per topic — a Core stable for two years reads very differently from one
  churning weekly, and both are honest states
- Challenge outcomes over time (upheld vs. rejected rates, by topic and by claim)
- Supersession rate — how often better evidence displaces good placements, which is
  the health metric for a topic's *field*, not its participants

Presentation caution: these are topic-health readouts, **not leaderboards**. Nothing
here may feed reputation directly or become a tier input (invariant 6). Displaying
"most active" or "most promoted" as achievement would reintroduce popularity
pressure through a side door.

## 6. The 3D payoff — time as the dial's sibling axis

The interface already has one control that encodes epistemics as physical structure
(the depth dial: how far out, how speculative). Time is the second axis:

- Scrub the time axis and **watch the sphere grow** — shells accreting as topics
  develop, tiles materializing at their placement moments.
- Tiles **migrate inward** as evidence lands; slide outward the day a debunk is
  upheld.
- Tile materials replay too: weathering accumulates as a claim survives challenges
  (a claim that looks tempered today looked pristine in year one).
- Kernel links and lineage fans appear at the moment the debunker flow created them.
- Scope tombstones appear at their action dates and persist backward as tombstones.

The two controls compose: *this topic, at Depth 3, as of last March.* One axis for
certainty, one for time.

## 7. Interaction

- A **time scrubber** alongside the depth dial, with an obvious "now" position and
  a visible current-timestamp indicator (same legibility standard as the dial).
- **Claim-level history:** from any claim's evidence panel, jump to a specific
  event in its own timeline — "show the map when this was promoted to Inner."
- **Snapshot comparison** — the operator's original framing: view a claim's history
  against a snapshot of the structure as it stood, compared to the moment of
  review. Two states, side by side, with the diff legible.
- Read-only in the strictest sense: no write path may be reachable from any
  historical view. Attempting an action while scrubbed to the past returns to now
  first (or refuses with a plain reason) — never writes against a past state.

## 8. Dependencies and prerequisites

- **2.9: event-log completeness audit.** Replay only works if every state-changing
  event is captured. Audit the schema for gaps *while it is already open* for the
  taxonomy revision. Any event that mutates placement, sources, links, or scope
  must be recorded with actor, timestamp, and reason.
- **Stage 3 reputation must wait on this** (see §2) or it will conflate
  supersession with error.
- Legal amendments F and G define the scope-event records this replays; their
  content-free discipline carries into the replay (no payload text ever surfaces,
  at any timestamp).

## 9. Definition-of-done seeds

1. Time scrubber renders any topic at any past timestamp from the event log alone;
   no new write paths exist and no historical view can reach one (pinned by test).
2. A superseded claim's history legibly distinguishes "correct then, demoted since"
   from "mis-placed and corrected."
3. Scope tombstones and redacted captures render as tombstones/redactions at every
   timestamp — proven by test that no historical view surfaces removed content.
4. Depth dial and time scrubber compose; both states are preserved across 2D/3D
   toggle.
5. Topic-health statistics render from the log with no leaderboard framing and no
   path into tier calculation or reputation.
6. Claim-level snapshot comparison works (state-at-event vs. state-at-review).
