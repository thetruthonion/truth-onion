# Truth Onion — Build Spec & Roadmap (v1)

A handoff document for building an evidence-first investigation tool. Give this to Claude Code as the project brief.

---

## What this is

An investigation tool where claims about a topic are placed on a map by **how well-supported they are**, and users move claims by supplying evidence that survives scrutiny. The core is not "collect conspiracies" — it is "sort claims by strength of evidence, and make the difference between proven and speculative *visible and honest*."

The first prototype is **single-user**: one person building and stress-testing one topic's evidence map. No multiplayer, no user-hosted worlds, no 3D environment yet. Prove the engine first.

Seed topic: **MKUltra** — chosen because it has a rock-solid documented core (Church Committee, 1977 Senate hearings, the Olson case, the 1973 record destruction) *and* a real fringe of overreach, so the full range of evidence tiers is exercised.

---

## The two axes (core data model concept)

Every claim has a position on two independent axes:

**Radial axis — how established (the "onion rings"), innermost = strongest:**
1. **Core** — primary documents, court records, multiple independent reliable sources. Must have survived challenge.
2. **Inner** — well-supported but with credible dispute remaining.
3. **Middle** — partial support / correlation not causation; plausible, links missing.
4. **Outer** — speculative; thin or circumstantial support.
5. **Outermost** — debunked / checked-and-failed. Kept visible on purpose.

**Vertical axis — documented net outcome, NOT moral approval:**
- Up = evidence of people **helped**. Down = evidence of people **harmed**. Center = contested/none.
- This axis is measured with the **same sourcing rigor as the radial axis**. It is *documented outcomes* (named victims, counted cohorts, epidemiological data), never "good vs evil by conviction." This distinction is a hard requirement, enforced at the schema level — see Rules.

---

## Claim structure: three layers

Most contested claims are a proven factual core welded to a contested rider. The tool must show the seam. Every claim is tagged as one of:
- **Factual** — an empirical assertion that can be sourced true/false.
- **Moral** — a value judgment. Can be represented and attributed, but *cannot occupy the factual core ring*, regardless of how strongly held.
- **Framing** — a characterization that adds meaning beyond the facts (loaded wording, implied intent). Flagged as such.

A claim can be decomposed: "abortion ends a human life" (factual) vs "abortion is child sacrifice" (framing that adds ritual/intent the facts don't carry). The tool's job is to split these and place each where its evidence lands.

---

## The debunker mechanic (the heart of it)

A "correction" is a constructive act, not a downvote:
1. Restate the established facts plainly.
2. Push the unproven remainder outward to the ring its evidence actually earns.

Scoring/interaction rewards moving a claim **out** (demoting overreach, catching a bad source, flagging equivocation) as much as moving one **in**. In single-user mode there's no leaderboard, but the *interaction* must make demotion as easy and satisfying as promotion.

---

## Non-negotiable rules (encode as enforced constraints, not comments)

1. **Promotion requires surviving challenge.** A claim moves inward only after evidence is supplied AND a challenge step is passed. Hard to promote, easy to demote — this asymmetry is deliberate.
2. **Outer cannot feed inner.** A claim in Middle/Outer/Outermost cannot be cited as supporting evidence for a claim further in. Enforce in the data model.
3. **Moral & framing claims cannot occupy the Core ring.** They render on their own layer/tag, never as established fact.
4. **Vertical axis = documented outcomes only.** Placement up/down requires evidence of harm/help that survives the same review. No conviction-based placement.
5. **The tool must be able to tell its own user "no."** Faithfully-stated claims sit at the tier their evidence earns even when the user believes otherwise. The prototype's value is that it demotes the user's own unsupported claims.
6. **Outer/outermost claims are stated faithfully, not fortified.** Show the claim as its proponents state it, next to its evidence profile (e.g. "sources: none / anonymous / refuted"). Never add invented corroboration or "here's how it could work" scaffolding. Nothing is hidden; nothing is propped up.

---

## Data model (starting point)

```
Claim {
  id
  topic_id
  text                      // stated faithfully
  layer: factual | moral | framing
  radial_tier: core | inner | middle | outer | outermost
  vertical: { direction: help | harm | neutral, magnitude, evidenced: bool }
  sources: [Source]
  challenges: [Challenge]    // history of attempts to demote/refute
  supports_claims: [id]      // BLOCKED if this claim's tier is outer than target
  status: confirmed | contested | refuted
}

Source {
  id
  tier: primary_doc | court_record | reputable_secondary | single_outlet | self_published | anonymous
  url / citation
  supports | contradicts
  notes
}

Challenge {
  id
  claim_id
  type: bad_source | contradicting_evidence | equivocation | mis-tiered | layer_mismatch
  outcome: upheld | rejected
  resulting_tier_change
}
```

The `supports_claims` constraint (outer-can't-feed-inner) and the layer/core constraint (no moral in core) must be validated on write.

---

## Prototype 1 scope (build this first)

Single-user, one topic (MKUltra), local persistence.
- Visual onion: concentric rings, claims placed by tier, vertical offset for harm/help.
- Add a claim → tag its layer → attach sources (with tiers) → propose a radial tier.
- Challenge flow: the app itself surfaces challenges ("this source is anonymous — should this really be Core?") so it pushes back even with one user.
- Debunker flow: restate core + push remainder outward.
- Evidence profile panel: click a claim, see its sources, tiers, status, challenge history.
- Enforce all six rules at the data layer.

Stack suggestion: React + a real DB (SQLite/Postgres) so the claim graph and provenance persist and the constraints are enforceable server-side. Keep it local.

**Definition of done:** you can build the MKUltra onion, and the tool correctly *refuses* to let you place an unsourced or moral claim in the Core, correctly blocks an outer claim from supporting an inner one, and makes demoting a weak claim as easy as promoting a strong one.

---

## Roadmap

**Prototype 1 — Evidence engine (single-user).** The above. Proves the core loop is honest and satisfying. *Nothing else matters until this feels right.*

**Prototype 2 — Multi-topic + the depth/X-ray view.** Several onions; the radial depth-filter that shows only established things by default and reveals further tiers as you dial outward. Still single-user. Introduces the "center = shared bedrock" concept as a read view.

**Prototype 3 — Multi-user & adversarial review.** Persistent identified profiles. Claims move via *other people's* challenges, not self-review. Reputation earned by good debunking as much as confirming. This is where the epistemic rules stop depending on one honest user and become social. Build the review/challenge queue, dissent-preservation, and the topic-stats-vs-people-stats separation.

**Prototype 4 — The shared center & discovery.** The spawn commons, presence, proximity chat with identified profiles. Discovery routed through the center with the depth filter (known / curated / algo / self-promoted). Outreach convention enforced: promote the *investigation*, not the conclusion.

**Prototype 5 — User-hosted sections & creative layer.** Hosts build a section = creative world + sourced onion + self-promoted front. Kit-based building (no review) vs AI/custom inserts (technical + epistemic review). Canonical badge gated by epistemic review; independent servers free but marked non-canonical. The one locked, non-overridable rule: the meaning of the evidence tiers on canonical worlds.

**Prototype 6 — The full spatial universe.** Travel past decorated sections, the two-axis sphere, vertical grouping, the whole explorable world. Only attempt once 1–5 are solid.

Each stage should be usable and honest on its own. Do not skip ahead — every later stage assumes the evidence rules from Prototype 1 are enforced at the data layer.
