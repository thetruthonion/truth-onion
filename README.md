# The Truth Onion

**An investigation game where evidence decides everything — including when you're wrong.**

**Live demo:** https://demo.thetruthonion.org/ · **Source:** https://github.com/thetruthonion/truth-onion

The Truth Onion maps real topics as layered spheres of claims. The better-proven a claim,
the closer it sits to the center. The wilder and less-supported, the further out. Claims
move inward only by surviving challenge, and outward the moment their evidence fails.
The rules are write-time constraints in the database itself: they cannot be overridden
at runtime, not even by the operator.

It is part research tool, part game, and — on the roadmap — a shared 3D universe built
literally on what's been established.

---

## Why this exists

Every existing venue for figuring out what's true fails in one of two directions. Social
platforms reward whatever is most gripping, so the fringe outruns the documented.
Institutional fact-checking hands down verdicts without showing enough of the work, so
much of the audience simply doesn't trust it. Both fail the same person: someone who
wants to know what's established, what's contested, and what's empty — and wants to
check the reasoning themselves.

The Truth Onion is built for that person. It doesn't tell you what to believe. It shows
you where every claim sits, why it sits there, and exactly what evidence would move it.

## The layers and the dial

Every topic is an onion of tiers: **Core** (claims backed by primary documents and
court records that survived challenge), **Inner** (well-supported, credible dispute
remaining), **Middle** (partial support), **Outer** (speculative — stated faithfully,
with the path inward written down), and **Outermost** (checked and failed — kept
visible so nothing gets re-litigated forever).

By default you see the Core only; nothing speculative is on screen. Turning the
**depth dial** outward brings the further tiers into view. The dial hides content,
never existence — the count of what sits deeper is always shown, so nothing is
quietly withheld. Uncertainty is opt-in: you choose how far down the rabbit hole
your view reaches. The same record renders as flat concentric rings or nested
spherical shells — the 2D and 3D views described below.

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

These constraints bind the author's claims exactly as they bind anyone's. Under the
self-assertion rule, the author's own tests are self-assertion — which is why the
project's credibility claim sits at Outer until independently audited (see
Contributing).

## What exists today

- **The evidence engine** — Express + SQLite backend with the rules as pure functions
  plus schema constraints and triggers, React frontend, adversarially tested (a
  permanent pressure-test suite attempts laundering, circular support, self-published
  stacking, cross-topic smuggling, and edit-after-placement on every run).
- **The curated topics in the shipped seed:** MKUltra, COINTELPRO, the Replication
  Crisis, UAP disclosure, and AI evaluation — each spanning the full range from
  documented Core to faithfully-stated-and-debunked edge, every seeded source carrying
  its canonical link or an honest label (audited; the UAP and AI-evaluation genres also
  exercise the split-claim rule — "X testified that Y" and "Y is true", "the report
  states X" and "X is true", are pairs of claims in two different universes).
- **2D and 3D views** of every onion — concentric rings, or nested spherical shells with
  claims as record-derived tiles, sharing one dial and one dataset. The 3D layer has
  zero write access.
- **Kernel links and lineages** — a debunked claim shows the true core it overreaches
  from: what the kernel establishes, what was asserted beyond it, and the evidence path
  inward. Zero weight in every direction, by structure.
- **The BYOK research companion** — bring your own API key (OpenRouter, Anthropic,
  Gemini; keys never touch the server, and the test suite proves it per adapter).
  Two-pass mask-lift: analysis runs with the character card structurally absent, then a
  mechanical fidelity gate checks the persona render against the record. Read-only
  tools; live web search on your own key; mechanical source verification in the full
  engine.
- **The Proving Grounds sandbox** — act as Curator, Contributor, and Reviewer against
  the real rules layer; a proposer never upholds their own entry, enforced in code.
  Sandbox saves export as files — the same save files the drop box accepts.
- **The time machine** — scrub any topic or claim back through the recorded event log;
  reconstructions name what cannot be honestly rebuilt instead of guessing.
- **Claim pages** — stable, script-free, server-rendered permalinks (`/claim/<id>`)
  whose share cards carry status inseparably; each page has its own on-page time
  machine and feedback form (append-only quarantine, no identity fields).
- **A guided tour and setup walkthrough**, a **portable parking lot** (device-local in
  the demo, versioned export/import), and **topic export/import** that runs every item
  back through the rules layer.

## What's staged next

- **One deliberate taxonomy revision** — the append-only strain journal is its input
  set; drop-box submissions are read-only study material for it, never engine input.
- **A heightened evidence bar for claims about living, identifiable people** — a named
  gate in the rules layer that lands before multiplayer opens. Until it ships, it is a
  roadmap item, not a present-tense promise.
- **Multiplayer and adversarial review** — persistent pseudonymous identity, claims
  moved by other people's challenges, dissent preserved rather than steamrolled.
  Sandbox saves enter multiplayer only entry by entry, through the rules layer.
- **The shared universe** — everyone spawns inside a vast sphere on the same bedrock of
  established claims; the world's geometry *is* the epistemology.

## Running it

```
npm install
npm run dev
```

The Node.js requirement is pinned in `package.json` (`engines`); the database is Node's
built-in `node:sqlite`, so there is no native build step. The dev server prints its
local URLs; the database lives at `server/data/truth-onion.db`, seeded on first run.
Other commands:

- `npm test` — the full suite (current totals are stated in `PROJECT-STATE.md`), run
  against the real API with the real seed, in memory. Definition-of-done, adversarial
  pressure, the pins for
  every shipped feature (kernel grammar, time machine, tour, parking, claim pages,
  record permanence, sandbox personas), demo read-only enforcement, companion
  grounding and key privacy, the SSRF-guarded fetch proxy, the release checklist (seed
  curation, encoding, showcase boundary, rate limits, deploy gate), and the history
  fixture (the demo ships the real curated record with its recorded timestamps —
  nothing re-stamped at build time).
- `npm run build-demo` — build the read-only showcase package into `demo/`
  (hosted image: see `deploy/README.md`).
- `npm run export -- "<topic>"` / `npm run import -- <file>` — move topics through the
  rules layer; a tampered export is refused with the normal plain-language reasons.
- `npm run reset` — wipe and reseed (**hand-built topics are destroyed — export first**).

## The public demo

The hosted demo is live at **https://demo.thetruthonion.org/** and is **read-only,
enforced server-side** — every mutation is refused at the API, every route is
rate-limited, and the database resets to the pristine curated seed on every restart.
Your first write creates a private sandbox copy; export a save file to keep your work.

Voluntary: contribute your save file or feedback through the **anonymous drop box** —
the contribute/feedback surface on the demo's main page, or the save controls. It shows
us where the rules and the vocabulary strain, which is exactly what improves the engine.
The channel is payload-only: no account, no email, no identity fields — we don't ask
who you are and don't retain anything that says. Drops are read by the operator; no
response is guaranteed, and nothing ever sends automatically. You'd be sending your own
drafts and reasons, so read the file first — it's yours. Before submitting, read the
**"what not to submit"** policy in `CONTRIBUTING.md` — in particular, this project
does not solicit classified or otherwise restricted material. If you'd
like a reply, use email instead: contact@thetruthonion.org.

**The companion's fetch proxy is deliberately absent from the hosted demo**: a keyless
public fetcher would be an open relay, so `fetch_url` / `verify_source` surface an
honest "not available in this demo" message instead. Clone this repo and run the full
engine locally to use mechanical source verification — and to try to cheat the rules
yourself.

## What this is not

- **Not a debunking site, and not a belief site.** The map doesn't take sides; the
  evidence does.
- **Not a content warehouse.** The record stores claims, placement reasons, and sources
  with their canonical links — a map of where evidence lives.
- **Not for sale.** No ads, no pay-for-placement, no data sales. Placement can't be
  bought, because popularity moves nothing — only evidence surviving review does.

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

The engine and rules are open source, and the project's own credibility claim sits, by
its own rules, at Outer: the author's tests are self-assertion. The path inward is you
— someone who isn't the author — running the suite, reading `server/rules.js`, trying
to cheat the engine, and filing what you find. Claims, topics, code, and challenges are
all contributions.

Contributions are accepted under the Developer Certificate of Origin (sign-off, not a
CLA) — see `CONTRIBUTING.md`. Vulnerability reporting and the drop box's data-handling
rules are in `SECURITY.md`; what not to submit is in `CONTRIBUTING.md`. Pseudonymous contribution is
welcome and expected.

## Documents

`CONTRIBUTING.md`, `LICENSING.md`, and `SECURITY.md` govern contribution, licensing,
and reporting. `PROJECT-STATE.md` is the working picture of the build; `DECISIONS.md`
holds designs agreed but deliberately not built; `TAXONOMY-STRAINS.md` is the
append-only strain journal behind the coming taxonomy revision.

## License

The engine (all code in this repository) is licensed under **AGPL-3.0-only**; the
verbatim license text is `LICENSE`. The record content (claims, placement reasons, gap
statements, seeded fixtures) is licensed under **CC BY-SA 4.0**; the verbatim text is
`LICENSE-CONTENT`. The license files are the terms — nothing in this README or
`LICENSING.md` modifies them.

## Status

Solo-built by **Onionwright**. Launched 2026-08-09 and operator-verified end to end:
the live demo at https://demo.thetruthonion.org/ running the curated topics, with the
full suite green behind the deployed build (current totals are stated in
`PROJECT-STATE.md`). The full single-player
ladder — engine, companion, time machine, claim pages, record permanence, sandbox — is
complete and adversarially verified. Next: the one deliberate taxonomy revision, then
multiplayer. The roadmap runs to the shared universe.

*The center is the same for everyone. That's the point.*
