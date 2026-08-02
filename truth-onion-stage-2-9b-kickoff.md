# Truth Onion — Stage 2.9b Kickoff: Legibility & Seeding (give this to Claude Code)

Corrective stage between 2.9 and 2.95. Read `PROJECT-STATE.md` first. This
stage makes the 2.9 features *legible and inspectable* — no new mechanisms, no
schema changes beyond what rendering requires, no rule changes.

## Standing rule (applies to this and every future kickoff)

**Nothing created during a build session is removed before operator
verification.** Verification fixtures, seeded data, test artifacts in the live
DB — they persist until the operator has inspected them. Cleanup is a separate
step, proposed and operator-approved. The 2.9 session deleted its
verification kernel links after its own visual check; the operator was then
unable to inspect the very thing being verified. That does not happen again.

## Settled decisions carried in this kickoff (with reasoning, per convention)

- **Parked-note deletion stays unlogged.** The event log exists so the map can
  replay honestly; a parked note has no tier, weight, or place on the rings
  and cannot affect the map at any timestamp, so its deletion cannot make a
  replay dishonest. Logging it would drag private scratch into a permanent
  record for zero replay benefit. Trade-off stated: an unlogged deletion path
  exists, scoped to data with zero epistemic standing. Record in
  PROJECT-STATE so 2.95 scopes around it without re-deciding.
- **Interaction model amendment (supersedes the 2.9 select behavior):**
  single-click = tile select + evidence panel ONLY — no lineage draw, no
  clearing, no reframing. Double-click = chain view (below) with narration
  riding on it. The 2.9 build put lineage-draw on select; that is superseded.
- **Weathering keeps its single meaning** (challenge survival). The
  netted-vs-undecided distinction on the vertical axis is carried by
  position, not by material. No material channel gets two meanings.

## In scope

**A. Chain view (double-click).**
- On double-click of a claim with a kernel lineage: every tile NOT in the
  chain clears fully from view (no ghosting). The sphere rotates globe-style —
  about its vertical axis, animated, unhurried — until the chain lies across
  the visible face as a legible path: kernel at one end, intermediate hops in
  recorded order, the outer claim at the other, break point and gap statement
  readable without further camera work.
- Narration plays over this cleared state. Lineage chips step the camera along
  the path; fans present one lineage stepped-forward, others cleared or
  minimally indicated until stepped to.
- Click into empty space: full sphere restores **at the depth the dial was
  set to** — the dial never resets. Escape retains its go-home meaning.
- Double-click on a claim with no lineage: no clearing; narration behaves as
  it already does.

**B. Rest-state tile legibility.**
- Tiles become small, crisp, discrete objects — the current oversized
  soft-edged rendering that fills all available surface is replaced. Open
  space on the sphere is correct and expected.
- Tile size varies only within a set range per ring, driven by that ring's
  diameter and crowding. Evidence weight is expressed by which layer a claim
  sits in and by material (mass/finish, weathering, pulse) — NEVER by tile
  size. Pin with the existing no-appearance-fields discipline.
- Sphere rotation idles globe-style; poles are naturally sparse.

**C. Vertical axis — outcome latitude.**
- Latitude encodes documented outcome, from the existing outcome-evidence
  records only ("stays empty rather than guessed" is untouched):
  - attached outcome evidence netting to ~zero: rides ON the equator line;
  - nothing attached (undecided): sits in the band just above/below the line;
  - attached evidence with net direction: displaced toward the documented-help
    or documented-harm pole, magnitude normalized within the topic, so only
    the record earns distance from the equator.
- No rendered guide ring — the equator population is a natural cluster, not a
  drawn band. Radial placement (tier/shell) is a fully independent axis and
  is untouched.

**D. Seed kernel links for the existing debunked claims.**
- Author real kernel links, through the rules layer like any write, for the
  debunked/outermost claims across the five seeded topics — each with a
  genuine three-part gap statement (what the kernel establishes / what the
  outer claim asserts beyond it / the path inward). Example shape: claim #11's
  kernel is the documented program's existence and exposure; the gap is the
  leap to an operational present-day system.
- These links are release seed content AND the operator's verification
  artifacts. Per the standing rule: they persist. Every creation goes through
  the rules layer and lands in the event log with actor and reason.
- If any debunked claim genuinely has no defensible kernel, do not force one —
  report it. A forced kernel link is a fabricated lineage.

## Out of scope — refused, not negotiated

- Time machine work (2.95). Taxonomy (2.99). Anything multiplayer/reputation.
- New write paths, tier logic changes, any popularity or appearance-stored
  fields.
- Deleting anything. See the standing rule.

## Definition of done

1. Double-click chain view: full clear, globe rotation into a legible path,
   readable gap statement, narration over the cleared state, chip stepping;
   empty-space click restores the sphere at the current dial depth (pinned by
   a state test).
2. Single-click does tile select + panel only — no lineage draw (supersession
   implemented and tested).
3. Rest state: crisp discrete tiles, per-ring size range from diameter and
   crowding only; no size-encodes-weight path (pinned).
4. Vertical axis behaves per C; a claim with no outcome evidence never leaves
   the equator band (pinned by test).
5. Kernel links exist in the live DB for the seeded debunked claims (or a
   report names which claims defensibly lack one), created via rules layer,
   present in the event log, and NOT removed.
6. Full suite green including new tests; report totals by suite.
7. PROJECT-STATE updated: interaction supersession, parked-note decision,
   seeding report, anything tried and rejected.

Stop at the definition of done. End with one line each: decided / finished /
scrapped. Nothing built this session is cleaned up.
