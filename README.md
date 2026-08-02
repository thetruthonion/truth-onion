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

Turn the **depth dial** and shells materialize around the core: Inner (well-supported,
credible dispute remaining), Middle (partial support), Outer (speculative — stated
faithfully, with the path inward written down), Outermost (checked and failed — kept
visible so nothing gets re-litigated forever).

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
7. **Record entities are never hard-deleted.** Sources leave the case only through a
   proposed-and-adjudicated withdrawal with a stated reason; links end only through
   recorded adjudication. What left, and why, stays visible.
8. **Popularity moves nothing.** No count of supporters, followers, or upvotes ever
   changes a tier. Only evidence surviving review does. Search ranking is lexical-only
   by construction, for the same reason.

The engine has refused its own author. During testing, the developer submitted a claim
about the engine's own integrity, backed by their own passing test suite — and the engine
placed it at Outer: *your tests restate your claim; they don't independently verify it;
the path inward is someone who isn't you auditing the rules.* That refusal is the
product working.

## What exists today

- **The evidence engine** — Express + SQLite backend with the rules as pure functions
  plus schema constraints and triggers, React frontend, adversarially tested (a
  permanent pressure-test suite attempts laundering, circular support, self-published
  stacking, cross-topic smuggling, and edit-after-placement on every run).
- **Three curated topics in the shipped seed:** MKUltra, COINTELPRO, and the Replication
  Crisis — each spanning the full range from documented Core to
  faithfully-stated-and-debunked edge, every seeded source carrying its canonical link
  or an honest label (audited).
- **2D and 3D views** of every onion — concentric rings, or nested spherical shells with
  claims as record-derived tiles, sharing one dial and one dataset. The 3D layer has
  zero write access.
- **Kernel links and lineages** — a debunked claim shows the true core it overreaches
  from: what the kernel establishes, what was asserted beyond it, and the evidence path
  inward. Zero weight in every direction, by structure.
- **The BYOK research companion** — bring your own API key (OpenRouter, Anthropic,
  Gemini; keys never touch the server, proven per adapter). Two-pass mask-lift: analysis
  runs with the character card structurally absent, then a mechanical fidelity gate
  checks the persona render against the record. Read-only tools; live web search on
  your own key; mechanical source verification in the full engine.
- **The time machine** — scrub any topic or claim back through the recorded event log;
  reconstructions name what cannot be honestly rebuilt instead of guessing.
- **Claim pages** — stable, script-free, server-rendered permalinks (`/claim/<id>`)
  whose share cards carry status inseparably; each page has its own on-page time
  machine and feedback form (append-only quarantine, no identity fields).
- **A guided tour and setup walkthrough**, a **portable parking lot** (device-local in
  the demo, versioned export/import), and **topic export/import** that runs every item
  back through the rules layer.

## What's staged next

- **The Proving Grounds (2.99)** — a sandbox where visitors act as Curator, Contributor,
  and Reviewer against the rules for real; sandbox saves import into multiplayer at
  Stage 3 through the rules layer, entry by entry.
- **Multiplayer and adversarial review** — persistent pseudonymous identity, claims
  moved by other people's challenges, dissent preserved rather than steamrolled.
- **The shared universe** — everyone spawns inside a vast sphere on the same bedrock of
  established claims; the world's geometry *is* the epistemology.

## Running it

Requires **Node.js 22.5+** (the database is the built-in `node:sqlite` — no native
build step; developed on Node 24).

```
npm install
npm run dev     # app at http://localhost:5173, API on 3111
```

The database lives at `server/data/truth-onion.db`, seeded on first run.
Other commands:

- `npm test` — the full suite: 19 files, 251 tests, run against the real API with the
  real seed, in memory. Definition-of-done, adversarial pressure, every stage's pins
  (kernel grammar, time machine, tour, parking, claim pages, record permanence), demo
  read-only enforcement, companion grounding/key privacy, the SSRF-guarded fetch proxy,
  the release checklist (seed curation, encoding, showcase boundary, rate limits,
  deploy gate), and the history fixture (the demo ships the real curated record with
  its recorded timestamps — nothing re-stamped at build time).
- `npm run build-demo` — build the read-only showcase package into `demo/`
  (hosted image: `docker build -f deploy/Dockerfile .` — see `deploy/README.md`).
- `npm run export -- "<topic>"` / `npm run import -- <file>` — move topics through the
  rules layer; a tampered export is refused with the normal plain-language reasons.
- `npm run reset` — wipe and reseed (**hand-built topics are destroyed — export first**).

## The public demo (showcase)

The hosted demo is **read-only, enforced server-side** — every mutation answers 403,
every route is rate-limited, and the database resets to the pristine curated seed on
every restart. **The companion's fetch proxy (`/api/fetch`) is deliberately absent from
the showcase**: a keyless public fetcher would be an open relay, so `fetch_url` /
`verify_source` surface an honest "not available in this demo" message instead. Clone
this repo and run the full engine locally to use mechanical source verification — and
to try to cheat the rules yourself.

## Philosophy, stated plainly

- **The tool must be able to tell its own user "no."** A truth engine that exempts its
  author's convictions is a mirror, not an instrument.
- **The edge is a workspace, not a landfill.** Weak claims aren't hidden — they're stated
  faithfully, next to their empty evidence shelf, with what's missing written down.
- **One rigorous system, variable depth.** The professional gets provenance chains and
  reproducible method; the newcomer gets a legible view onto the same foundation —
  never a simplified fake.
- **No side owns it.** The tiers have to be trusted by people who disagree about
  everything else. That constraint is not a limitation on the project — it is the
  project.

## Contributing

The engine and rules are open source, and the project's own credibility claim sits at
Outer until people who aren't its author audit it. The path inward is you: run the
suite, read `server/rules.js`, try to cheat the engine, and file what you find. Claims,
topics, code, and challenges are all contributions.

## Documents

`PROJECT-STATE.md` is the working picture of the build; `DECISIONS.md` holds designs
agreed but deliberately not built; `TAXONOMY-STRAINS.md` is the append-only strain
journal behind the coming taxonomy revision; the `truth-onion-*.md` files are the specs,
kickoffs, and addenda the code comments cite.

## License

**Pending.** The license is an open operator decision; `LICENSE` is a placeholder to be
filled the day it lands, and nothing here should be assumed licensed until it does.

## Status

Solo-built. Stages 1 through 2.98b complete and adversarially verified; the public
release checklist is executed and the repo is prepared for its first public push. Next:
the Proving Grounds sandbox (2.99a), then the one deliberate taxonomy revision (2.99b),
then multiplayer (3). The roadmap runs to the shared universe (6).
