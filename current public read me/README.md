# The Truth Onion

**An investigation game where evidence decides everything — including when you're wrong.**

The Truth Onion maps real topics as layered spheres of claims. The better-proven a claim,
the closer it sits to the center. The wilder and less-supported, the further out. Claims
move inward only by surviving challenge, and outward the moment their evidence fails —
and the rules are enforced at the data layer, where no one, including the operator, can
override them.

It is part research tool, part game, and — on the roadmap — a shared 3D universe built
literally on what's been established.

---

## The idea in one image

Open the app and you see a small, solid sphere: the **Core** — only the claims backed by
primary documents and court records, having survived challenge. Nothing speculative is
on screen. A note beside it reads: *"8 more claims at deeper levels — the dial hides
content, never existence."*

Turn the **depth dial** and translucent shells materialize around the core, settling
opaque: Inner (well-supported, credible dispute remaining), Middle (partial support),
Outer (speculative — stated faithfully, with the path inward written down), Outermost
(checked and failed — kept visible so nothing gets re-litigated forever).

Uncertainty is opt-in. You choose how far down the rabbit hole your view reaches.

## The rules are the product

Every rule below is a **write-time constraint in the database**, not a moderation policy:

1. **Promotion requires surviving challenge.** Hard to move inward, easy to move outward
   — the asymmetry is deliberate.
2. **Outer cannot feed inner.** A weak claim can never be cited as support for a stronger
   one, within or across topics.
3. **Moral and framing claims cannot occupy the factual Core** — no matter how strongly
   held, including by the operator.
4. **Metaphysical claims take no tier at all.** "God exists" and "no god exists" are the
   same kind of claim; the evidence axis measures neither, in either direction. They live
   on an attributed-positions layer instead — argued, discussed, never ranked.
5. **Self-assertion scores zero.** A website asserting its author is right is a
   restatement of the claim, not evidence for it. Only claimant-independent provenance
   moves anything inward.
6. **Claim text is immutable.** The tier was earned by that exact sentence. Revise it and
   the revision earns its own placement.
7. **Accusations against living, identifiable people carry a heightened evidence bar.**
   Unadjudicated allegation stays marked as allegation. "Named in a deposition," "named
   in an unvetted tip," and "named in a conviction" are three different universes, and
   placement reasons must say which.
8. **Popularity moves nothing.** No count of supporters, followers, or upvotes ever
   changes a tier. Only evidence surviving review does.

The engine has refused its own author. During testing, the developer submitted a claim
about the engine's own integrity, backed by their own passing test suite — and the engine
placed it at Outer: *your tests restate your claim; they don't independently verify it;
the path inward is someone who isn't you auditing the rules.* That refusal is the
product working.

## What exists today

- **The evidence engine** — Express + SQLite backend with the rules as schema constraints
  and triggers, React frontend, adversarially tested (a permanent pressure-test suite
  attempts laundering, circular support, self-published stacking, cross-topic smuggling,
  and edit-after-placement on every run).
- **Three hand-built topics:** MKUltra, COINTELPRO, and the Replication Crisis — each
  spanning the full range from documented Core to faithfully-stated-and-debunked edge.
- **2D and 3D views** of every onion — concentric rings, or nested spherical shells with
  claims as tiles, sharing one dial and one dataset. The 3D layer has zero write access.
- **The depth dial** — Core-only by default, deeper layers by choice, existence never
  concealed.
- **Source library with integrity ripple** — sources are single entities; discredit one
  and every claim leaning on it re-evaluates in the same transaction.
- **A private parking lot** for half-formed claims — outside the epistemics entirely,
  unlinkable, invisible to every view, until a note is ready to become a claim and earn
  its placement like everything else.
- **Topic export/import** that runs every item back through the rules layer — a tampered
  export is refused with the same plain-language reasons as a live violation.

## What's specced and staged

- **The AI companion** — bring your own API key, any model. Two-layer persona: an
  immutable integrity core (its win condition is your claims *surviving scrutiny*, not
  promotion — it argues against you, surfaces adverse sources unprompted, and never
  proposes tiers) with a swappable character-card personality on top. During analysis
  the personality is structurally excluded from reasoning, then renders the findings in
  voice. The companion advises; the rules decide; it has zero write access.
- **Multiplayer and adversarial review** — persistent pseudonymous identity, claims
  moved by other people's challenges, reputation earned as much by careful demotion as
  by confirmation, dissent preserved rather than steamrolled.
- **The shared universe** — everyone spawns inside a vast sphere on the same bedrock of
  established claims; user-hosted sections as creative 3D worlds built around their
  topics (kit-based building free, custom and AI-generated content through an approval
  gate); travel past what the community has built; the companion embodied as an avatar
  at your side. The world's geometry *is* the epistemology.

## Philosophy, stated plainly

- **The tool must be able to tell its own user "no."** A truth engine that exempts its
  author's convictions is a mirror, not an instrument.
- **The edge is a workspace, not a landfill.** Weak claims aren't hidden — they're stated
  faithfully, next to their empty evidence shelf, with what's missing written down. The
  claim discredits or redeems itself by where the evidence puts it.
- **"Censored" only counts with a capture.** Every source is archived and hashed at
  submission, so scrubbing can't erase what was documented — and a vanished post with no
  capture can't borrow the censorship excuse.
- **One rigorous system, variable depth.** The professional gets provenance chains,
  calibrated confidence, and reproducible method; the newcomer gets a legible view onto
  the same foundation — never a simplified fake. People learn media literacy by watching
  real work held to a real standard.
- **No side owns it.** The tiers have to be trusted by people who disagree about
  everything else. That constraint is not a limitation on the project — it is the
  project.

## Privacy posture

Participation is pseudonymous by design — reputation attaches to a persistent handle,
never a legal identity. The system stores references and verified captures of public
material, not content warehouses. Activity trails are minimized: collect little, retain
briefly, never link support or donation identity to in-game identity.

## Running it

```
npm install
npm run dev     # app at localhost:5173
npm test        # the full suite, pressure tests included
npm run reset   # restore the pristine seed
```

## Contributing

The engine and rules are open source, and the project's own credibility claim sits at
Outer until people who aren't its author audit it. The path inward is you: run the
suite, read `server/rules.js`, try to cheat the engine, and file what you find. Claims,
topics, code, and challenges are all contributions.

## Status

Solo-built, stages 1 through 2.5 complete and adversarially verified. Companion (2.8),
a second-genre stress topic (2.75), taxonomy revision (2.9), and multiplayer (3) are
specced, in order. The roadmap runs to the shared universe (6). Funding: grants and
donations, with the creative layer as the long-term commercial tail.
