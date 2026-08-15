# Truth Onion — state of the project

Written 2026-07-20; updated 2026-08-11, third session that date (repo document
removal per operator ruling — see §3.2r; the second 08-11 session was the
public-tree removal, §3.2q; the first corrected this
header's date lag and added the living-people gate to the Stage 3+ list). A working handoff document:
what exists, why it is shaped the way it is, what was tried and abandoned, and
what is still open. The design documents (the spec, its addendum, the stage
kickoffs and their addenda) remain
the source of intent and live in the build supervision workstream — removed
from this repository 2026-08-11 per operator ruling (§3.2r); this describes
the state of the build against them.

---

## 1. What it is, in one paragraph

An evidence engine. Claims about a topic sit on five concentric rings by **how
well-supported they are** (core → outermost), with a second vertical axis for
**documented outcome** (helped / harmed). The rules that decide placement are
enforced at the data layer with no override path, so the tool can — and
routinely does — refuse its own operator. A BYOK research companion rides along
as a read-only advisor with a character-card personality layer that cannot
reach the ledger. The eventual goal (Prototypes 4–6) is a shared spatial world
whose geometry *is* the epistemology; nothing about that is built yet, and the
current stage deliberately assumes none of it.

**Status: LAUNCHED 2026-08-09 — public repository at
github.com/thetruthonion/truth-onion, demo live at demo.thetruthonion.org,
five topics, 289 tests / 21 suites green (operator-verified 2026-08-11 on his
own machine, stage299a H11 passing), published head 1504395. Last stage
shipped: 2.99b-2, the AI-evaluation fifth topic. Next: Stage 2.99c, the
taxonomy revision — then multiplayer (Stage 3). Everything below this line is
the accretive pre-release and launch history, kept in place and read in date
order; this sentence is the only current-status statement in the file.
Superseded by it, kept for the record: "Stage 2.98 complete — claim pages,
review-status socket, and the operator's anonymized feedback path. Final
pre-release feature stage (by operator decision, superseding 2.97's claim to
the title). Next: the public release checklist — then 2.99 (the Proving
Grounds, per the post-release design capture Amendment A), then Stage 3."
The header add-claim question is resolved: the FEEDBACK link replaced it
(operator decision); adding a claim lives in the search dropdown. Operator addition
(2026-07-29): CONFIRM-BEFORE-MUTATE — adding or removing a record entity
(support/kernel links, source attach/detach/library-delete, claim submit,
topic create, parked-entry delete, import-replace) asks first via one
inline confirm bar, routed through run()'s confirm option. The frozen
(time-scrubbed) refusal runs BEFORE the confirm; the rules layer still
decides after it. Challenges/promote/demote keep their own deliberate
multi-field flows without a second confirm — extend if wanted. Pinned
(stage297 E7).** 289 tests passing across twenty-one suites. **Drop-box
UI fix session (2026-08-09, §3.2n correction): the reported demo-side
upload panel did NOT exist — built now on the main page as the one
combined "contribute / feedback" surface (operator ruling); stale
gmail address swept to contact@thetruthonion.org everywhere it renders.
Reported, not verified.** **Stage 2.99b-2 (2026-08-09, §3.2p): the
AI-evaluation FIFTH topic SHIPPED — R1 amended a second time to the
curated five (operator supersession of the 2026-08-08 live-only ruling,
on the record in the kickoff); all eight claim shapes seeded by operator
decision from the operator-confirmed sources ledger; strains 13–20
journaled including the no-strain control; the fifth topic exposed and
fixed a real limit bug (express body cap silently below the sandbox size
cap — save re-import would have failed on the grown record). Reported,
not verified.** **Stage 2.99a
(sandbox core & personas) built 2026-08-02 — see §3.2m — and the
operator-inspection punch list executed same day (§3.2m-i): api-level
copy-on-first-write (diagnosed and pinned end-to-end), fog sentence
replaced, feedback copy-box, anchored confirms and save popovers,
rejected withdrawals permanently rendered, and the save-parity engine
(mirror everywhere + labeled file modes). Awaiting operator verification
in the running build.** The
taxonomy revision moved to Stage 2.99 (operator decision 2026-07-27,
amendment appended to the 2.9 addendum). **Release prep executed
2026-08-01 (§3.2k): checklist items 0a–3 verified, repo initialized with a
clean first commit, Fly.io deploy artifacts + build-time deploy gate in
place. Stopped before push and deploy — those are the operator's:
create the Fly account (MFA, monitored thetruthonion.org address) and the
GitHub remote, push, deploy, then checklist items 4–7 against the hosted
URL.** Under version control as of this session (§8 risk closed).
**License day (2026-08-09): the stub is filled.** LICENSE now carries the
verbatim AGPL-3.0-only text (byte-exact from gnu.org/licenses/agpl-3.0.txt,
sha256-verified); LICENSE-CONTENT added with the verbatim CC BY-SA 4.0
legalcode; README's License section and package.json ("AGPL-3.0-only")
updated in the same change, exactly as the stub's own instructions
prescribed. SPDX headers: none existed; added same day (operator
instruction, second pass) as line 1 of all 87 tracked source files —
`//` on js/mjs/jsx, `/* */` on the stylesheet, `<!-- -->` on index.html,
`#` on deploy/Dockerfile and fly.toml; md/json/ignore files untouched.
Suite re-run green after insertion, totals unchanged.
The setup-notes section was deleted from LICENSING.md, which lives in the
document tree's legal folder, not this repo — if it is meant to ship in
the repo root (its own text says "at the root of this repository"), that
move is a separate operator decision. Pre-push scan clean: no DB blob,
secret, key, or .env-shaped file among the tracked files; the single
pattern hit is the pinned fake-key fixture in stage29d; .gitignore covers
every family. Full suite green, totals unchanged. Reported, not verified;
the operator commits as Onionwright. **Doc-removal session (2026-08-11,
§3.2r): the seventeen internal working documents are out of HEAD per
operator ruling; the three citing comments repointed at the build
supervision workstream; the dangling `§` citations rewritten out of the
code and tests; suite green at baseline counts, unchanged. Reported, not
verified.** **Edit visit (2026-08-15): twenty-six operator-ruled corrections
applied here (lead status line, scoped headlines, dangling citations, stale
counts and stages); a five-reader fan-out then swept the repository and its
thirteen confirmed findings were fixed under same-day operator rulings —
including the strict rule that no repository file cites a document outside
the repository, applied across this file, code comments, tests, and README.
b-019 landed the splitting convention, the workstream-reader agent, and the
rebuild-before-reporting rule in CLAUDE.md. client/dist and demo/ rebuilt
(untracked local artifacts; the stale copies carried two pre-removal `§`
strings). Suite green at 289 across 21, unchanged. Pushed as commits
095422e and 2d0dd31; this status entry rides one commit above them.
Reported, not verified.**

**Standing rule (operator, 2026-07-27, applies to every future session):**
nothing created during a build session — verification fixtures, seeded data,
test artifacts in the live DB — is removed before operator verification.
Cleanup is a separate step, proposed and operator-approved.

---

## 2. Architecture

### 2.1 Three enforcement layers, one direction of trust

```
client/  React + Vite. Presentation and the companion. Trusted with NOTHING.
server/  Express + SQLite (node:sqlite). rules.js + service.js + schema CHECKs.
tests/   Twenty-one suites, 289 tests, against the real API with the real
         seed, in memory.
```

The rule that organizes everything: **the UI never decides.** Every write that
could change a claim's standing goes through `server/rules.js`, and there is no
API endpoint that sets a tier directly. The client cannot cheat because the
client is never asked. This is why the frontend can be rewritten freely (2D →
3D was additive) without touching a single epistemic guarantee.

### 2.2 The rules layer (`server/rules.js`)

Pure functions over `{kind, layer, targetTier, sources}` returning
plain-language failures. The important structural choices:

- **`placementFailures()` is the single arbiter.** `earnedTier()` walks tiers
  calling it; `tierPreview()` calls it for each inward tier. The preview
  therefore *cannot* green-light a promotion the battery would refuse — they
  are not two implementations kept in sync, they are one function called twice.
- **`statusFor(tier)` derives status** (core→confirmed, outermost→refuted, else
  contested). Status is never settable, so it can't be faked independently of
  standing.
- **`carriesWeight(source)`** is the self-assertion rule in code: a source
  carries weight only if it *supports*, is not claimant-self-published, and is
  not anonymous or self-published. Everything else is a restatement.
- **Failures name the blocker.** A contradiction refusal cites the specific
  contradicting citation text. "No" is useless without "because of this."

Backstops live below the code: SQLite `CHECK` constraints for
moral/framing-not-in-core and metaphysical-takes-no-tier, and triggers for
outer-cannot-feed-inner. Two independent layers say no.

### 2.3 The companion (`client/src/companion/`)

A read-and-talk layer with a hard structural boundary, not a behavioral one.

| File | Role |
|---|---|
| `providers.js` | BYOK transport. `guardProviderUrl` is the choke point. |
| `tools.js` | The read-only manifest + executor. Unknown name → refusal. |
| `search.js` | Live search, fetch, and mechanical verification. |
| `pipeline.js` | The two-pass mask-lift + fidelity gate + chat turn. |
| `cards.js` | Character-card parsing and the persona prompt block. |
| `store.js` | localStorage: settings, keys, card — isolated entries. |
| `threads.js`, `tts.js`, `builder.js`, `hash.js` | Conversations, voice, card builder, prompt hash. |

Data flow for a claim narration:

```
claim record ──► pass 1 (core prompt only, card STRUCTURALLY absent)
                    └─► substance manifest (JSON) ──► groundCheck vs record
                                                          │
                    ┌─────────────────────────────────────┘
                    ▼
                 pass 2 (core + card) ──► fidelity gate ──► pass? render
                                                       └──► fail? interleaved
```

The two passes exist because analysis and voice must not share a context. In
pass 1 the card is *absent from the request*, not merely instructed against —
so no persona can color a finding. Pass 2 gets a fixed manifest and is a
render-only task.

### 2.4 The verification path (built this week)

```
companion tool ──► /api/fetch (same-origin, keyless, GET)
                       └─► fetch-proxy.js: SSRF guard → plain fetch
                                              │ unreadable shell or 403/429?
                                              ▼
                                    browser-render.js: headless Edge/Chrome
                                              │
                                              ▼
                             mechanical substring check → {verified}
```

`verified` is computed server-side from text that was actually retrieved. It is
a fact the model cannot author. Results carry `via: "fetch" | "browser"` so the
record shows *how* a page was read.

---

## 3. Design decisions and why

### 3.1 The engine

**Rules at the data layer, never the UI.** The product IS the refusal. A rule
that lives in a form validator is a suggestion; a rule in `rules.js` plus a
schema `CHECK` is a property. Every later stage (multiplayer, federation,
user-hosted worlds) assumes this, which is why the spec forbids skipping ahead.

**Claim text is immutable.** A tier is earned by an exact sentence. If text
could drift after placement, a claim could earn Core saying one thing and
quietly come to say another — the single most dangerous silent failure the
model allows. `PATCH`/`PUT` on a claim throws by design. A revision is a new
claim that earns its own placement.

**Hard to promote, easy to demote — of a claim's tier, and only that.**
Promotion requires surviving the review battery and is recorded pass-or-fail in
challenge history; demotion is one step with a stated reason. The asymmetry is
the epistemics of tier movement. It says nothing about removing a record
entity: withdrawing a source, ending an attachment, severing a link — those
adjudicate before they have any effect at all (§3.2j, "stated asymmetry
(settled)"). The two couple in practice, because a demotion usually follows a
source being discredited or withdrawn and that upstream act is gated, with the
ripple re-evaluating every dependent claim in the same transaction. So the
route outward runs through an adjudicated gate even where the final step is one
move. A summary of this sentence that drops the scope is wrong.

**Metaphysical claims take no radial tier.** Ranking "God exists" as weakly
supported covertly asserts its negation as strong. Routing it off-axis keeps
the tool from becoming an anti-anything engine. Note the deliberate seam:
*empirical* claims attached to belief systems (young-earth timelines) still get
mapped and can still land debunked.

**Depth 1 is the default.** Uncertainty is opt-in. Opening the app shows what
is established and nothing else; reaching the speculative edge is a deliberate
act of dialing outward. Critically, the dial never conceals the *existence* of
deeper material — counts stay visible ("8 more claims at deeper levels"), only
content waits. A filter that hid its own hiding would be a lie.

**The parking lot sits outside the epistemics entirely.** No tier, no weight,
no linkability, absent from every view and count. Half-formed thoughts need a
home that isn't the outer ring, or the outer ring becomes a junk drawer and
stops meaning "checked and weak."

**`is_origin_of` carries zero weight.** Attaching Ioannidis 2005 as *supporting*
"most published findings are false" was nearly self-assertion — the claim's
coiner cited as evidence for the claim. The relation displays provenance
honestly while contributing nothing promotional.

**Source library with ripple.** A source is one entity per topic attached to
many claims. Withdrawing it re-evaluates every dependent claim, demoting each
to what its remaining evidence earns. **Two later refinements are load-bearing
and this summary is read past them, so they are stated here: the source is
never deleted** — it stays in the library listing marked withdrawn (§3.2j) —
**and the withdrawal has zero rule effect until it is adjudicated**, at which
point the ripple fires through every dependent claim in one transaction (§3.2j
Amendment A). Convenience was the excuse; integrity is the reason.

### 3.2 The companion

**Structural protection, not content policing.** Card validation used to reject
"programmed agreement" instructions by string-matching persona text. That was
removed by operator ruling: the mask lift already removes the card from
analysis, so string-checking was a lock on a door that no longer existed — and
a bypassable rule teaches hiding rather than honesty. The real floor is the
immutable core prompt no card touches. **Cards may now contain any persona
content.**

**Keys never touch the server — as a property.** `guardProviderUrl` refuses to
attach credentials to any request resolving to the app's own origin (or to a
relative URL, which would resolve there). The promise is enforced by a guard
with a test, not by discipline.

**The write boundary is the executor, not the prompt.** The manifest contains
no mutating operation, and any tool name outside it throws `RefusedToolError`.
Adding search routed new tools through `makeCompanionExecutor` precisely
so the refusal path stayed identical — a name in neither set is still refused.

**The character is present in 100% of responses.** On fidelity-gate
failure the pipeline makes ONE attempt then degrades automatically to
*interleaved* — gated record blocks with in-character commentary between them.
The earlier behavior (retry, then fall back to bare analysis) is gone: a
character that vanishes when the news is complicated is a character that
signals "now the machine is talking," which is both worse UX and worse
epistemics.

**The gate checks substance, not wording.** Numerals, proper nouns, tier
anchors, and terms of art ("zero weight", "not established") must survive;
ordinary vocabulary belongs to the voice and is free. A gate on wording would
have made every persona sound the same, defeating the point of personas.

**Topic context is injected, never requested.** The active topic's id
and name go into the system prompt with an instruction to use the id in tool
calls and never show it. An internal database id surfacing to an operator is a
leak of the machine into the fiction.

**Verification is mechanical and three-valued.** `verify_source` may only
support the words "verified" / "confirmed" when the server-side check returns
`verified: true`. The three states are `true` (present), `false` on a readable
page (genuinely absent), and `inconclusive` (page unreadable — *nothing was
learned*). The core prompt states the rule that took a real bug to earn: **an
unverified correction is as false as an unverified assertion.**

### 3.2d Stage 2.9d — providers, cards, gate, global search

**Provider adapters (`client/src/companion/providers.js`), verified per
provider:** OpenRouter (openai shape, works browser-direct) · Anthropic
(direct; permitted WITH the `anthropic-dangerous-direct-browser-access`
opt-in header) · Google Gemini (direct; CORS served; key rides the
`x-goog-api-key` HEADER, never the query string — URL keys land in server
logs) · OpenAI (direct) is LISTED AS UNSUPPORTED: api.openai.com serves no
CORS headers, the settings entry is disabled with the honest reason and a
pointer at OpenRouter, and `buildChatRequest` throws plainly rather than
falling back. **Keys never touch the server is load-bearing and permanent:**
no relay for any provider, ever — a relay would make the public demo host a
handler of visitors' API keys. Key privacy is pinned PER ADAPTER (key never
in URL, never at app origin, always in the right header). End-to-end calls
against live providers require the operator's own keys; wire shapes are
pinned by test.

**Card import (2.9d B):** picker, drag-drop, and paste all funnel through
`validateCardText` — SHAPE validation only (the no-content-policing ruling stands: any persona content
is legal); refusals name the blocker; export/import round-trips losslessly
(pinned). **Composer** auto-grows to 140px then scrolls; Enter sends,
Shift+Enter newlines. **Panel widths** persist in `onion.ui.*` (own family,
clamped bounds, never sent to the server, reset-survival pinned).

**Topic-shape gate (rules layer).** `topicShapeFailures` in rules.js —
deterministic heuristics, no LLM: trailing sentence punctuation; question
forms (leading interrogative or "?" anywhere); copula "X is/are/was/were Y"
(first word exempt so the question check owns "Is God real?"); causal/
propositional verbs (causes/proves/means/shows/implies/leads to/results in).
The refusal names the blocker and the honest path ("create a topic like
'God' … add this as a claim there") and states it is a heuristic — the gate
catches obvious claim-shapes, not all possible ones. The UI submits and
renders the refusal; it never pre-decides. **Seed-curation note:** live
topic #6 "Christ is God" is exactly the mistaken claim-shaped topic; it
predates the gate, remains untouched this stage (no removal machinery), and
is release seed-curation.

**Global record search (Amendment A).** FTS5 `search_index`, trigger-
maintained, derived-data only: claim text, placement reasons, source
citations (per attachment so every hit carries a claim's tier), kernel gap
statements, challenge text. Parked notes have NO trigger and provably never
enter the index. Ranking is bm25 — lexical relevance only; tier is displayed
on every hit and never a ranking input in either direction (boosting core
would bury debunked claims, and "kept visible" is the point of the
outermost shell). Every result carries tier/kind/off-axis/topic/matched-
field inseparably (payload pinned). Typeahead quick-jump unchanged;
submitting opens the full-results overlay grouped by topic; opening a hit is
deliberate navigation and extends the dial when the claim sits deeper.
Deferred by the amendment, recorded: faceted entity/location/date search —
needs structured metadata the schema doesn't have; guessing it would break
the never-guessed rule. Revisit at corpus scale, post-multiplayer.

### 3.2i Stage 2.98 — claim pages, review socket, feedback quarantine

**Claim pages** (`server/claimpages.js`, routes `/claim/<id>`): stable,
server-rendered, read-only permalinks generated ENTIRELY from the record —
header with tier/kind/status chips, review line, verbatim placement
reason, evidence with weights, challenges with outcomes, kernel links with
full gap statements in static broken-line grammar, support link tree
(each related claim → its page), interleaved history with the
superseded/corrected marks, audit links into the engine, clone-the-repo
footer. **URL scheme: `/claim/<id>`** — seeded ids are deterministic
(fixed-order seed), pinned by a double-seed test. **Status travels
inseparably**: `<title>` and OpenGraph title/description carry
`[STATUS · tier]` — a refuted claim unfurls as refuted (pinned; verified
live: "[REFUTED · outermost tier] MKUltra evolved into…"). Off-axis
claims render their explanation, never a rank. Record-only generation
pinned (the page grows only when the record grows). Pages inherit every
demo protection: non-GET → 405, rate limiter mounted on `/claim`,
cacheable (max-age 60). **Look:** the public site's palette
(parchment/pastel/Georgia serif, matching truthonion-site). *(Superseded
below: the dark-mode half of this line — the engine's Void Indigo/neon via
prefers-color-scheme — was reversed by operator correction in this same
section. Pages are LIGHT/PASTEL ONLY, and the neon set and
prefers-color-scheme are pinned ABSENT, P7/P8.)*
**Stretch (interactive embedded mini-map): DEFERRED** — the static link
tree ships; report per kickoff.

**2.98 correction (operator inspection): THE CLAIM PAGE IS A DOCUMENT.**
The operator hit /claim/28 through the Vite dev origin, whose SPA fallback
swallowed the route and mounted the full engine — not the feature. Fixed
three ways, all pinned: (1) vite proxies /claim to the engine server, so
the document serves identically in dev and production; (2) pages are
LIGHT/PASTEL ONLY — the earlier dark-mode request is superseded by the
correction ("the engine is dark/neon; the page is light/pastel — instantly
distinguishable, by design"): no prefers-color-scheme, no neon hex
anywhere on a page; (3) not-the-SPA is structural — a page contains no
<script> tag and references no engine bundle asset (article-class weight,
renders with JS off, view-source shows the claim). The bridge is two
doors: the page's prominent "Open in the engine" deep link (?claim=<id> —
the SPA resolves it on load: topic opened, claim selected single-click,
dial extended, param cleared) and the panel's "page ↗" affordance.

**Operator additions after the correction (2026-08-01):**
- **Hero + logo.** The page carries the site's masthead mark (inline SVG,
  light variant: indigo T-glyph + pastel rings + wordmark) and an indigo
  hero band with the pastel ring art behind the claim headline, chips, and
  the engine door — the layout family of thetruthonion.org. Indigo #131A2A
  is the light palette's own ink; the engine's neon set and
  prefers-color-scheme remain pinned absent (P7/P8).
- **On-page time machine.** Scrubbing happens on the page itself, not by
  bouncing to the engine: every recorded moment of the claim is a plain
  `?at=<timestamp>` link (a "Time machine" track of stops + history
  timestamps as links), and `/claim/<id>?at=` renders the document as it
  stood then — reconstructed server-side from `claimAtTime`, so the page
  stays script-free. Historical views: banner "as it stood on … — a
  reconstruction from the record, read-only"; share title carries "as of";
  robots noindex + canonical to the present; pre-epoch views say they
  predate recorded history; not-yet-created moments say the claim was
  absent (never guessed); placement-reason honesty (the record keeps only
  the current wording — noted on every reconstruction); the feedback form
  is deferred to the present document; unreadable ?at is a 400 with the
  message, not a 404. Pinned in P9/P10.

**Review-status socket (kickoff C):** `review` reserved as an events
action (append-only, same shape); `reviewStatus()` derives the display; NO
path writes one (pinned per server file). Zero events read: "Independent
review: none yet — single-curator record." — on every claim panel and
page. Contest-the-key (2.99) and Stage 3 review plug in here.

**Anonymized feedback (operator addition):** the header feedback link
REPLACED the add-claim button (flow stays in the search dropdown), and
every claim page carries a feedback form. Design honors the strain-return
constraints: payload = enumerated category + free text only, shown in full
before sending; NO identity fields exist in the schema; size-capped
(2000), rate-limited (5/min), append-only quarantine table with **no read
endpoint at all** — never in search, replay, or any surface (all pinned);
the operator reads it offline via sqlite. POST /api/feedback is registered
BEFORE the demo read-only gate deliberately: feedback is not a record
mutation, and demo visitors are exactly who it's for. Volume is a prompt
to look, never a force that moves.

### 3.2h Stage 2.97 — the portable parking lot

**One adapter, two backends** (`client/src/parking.js`). The full engine
keeps server-backed parking unchanged (routed through the adapter). Demo
mode stores notes DEVICE-LOCALLY under `onion.parking.notes`: the demo
branch of the adapter is constructed WITHOUT the api object, so a visitor's
notes structurally cannot touch the server (pinned with a poisoned-proxy
test and verified against the built demo package: zero parking network
requests; notes survive reloads and the demo's boot-time DB reset). The
demo UI says plainly that notes live in this browser only. "Make it a
claim" stays full-engine-only.

**The export format (the forward-compat contract), version 1:**
`{ format: 'truth-onion-parking', version: 1, exported_at, items: [{ text
(required), created_at?, topic?, claim?, sources?: [{url?, title?, why?}],
reasoning? }] }` — pretty-printed so the owner recognizes their own work in
a text editor. Export is user-initiated only; nothing auto-uploads, ever.

**Import**: picker + drag-drop onto the parking tab; validated WHOLE with
the blocker named (bad JSON, wrong/missing format or version, future
version, malformed items) — never partial, never coerced. Merge is the
default with duplicate detection on normalized note content; replace sits
behind an explicit confirmation. Imports land in the parking lot and only
the parking lot: parking.js never imports the api client and references no
record entity; the App import handler drives only the adapter (both
pinned). In server mode, structured items are flattened to labeled text
for the text-only parked_notes table — reported in the result notice,
never silent. On-device (demo) storage keeps structured fields losslessly.

Settled and untouched: parked notes have no epistemic standing, deletion
stays unlogged, demo mutations still 403, the demo DB still resets pristine.

**Amendment A (2026-07-29) — park-in-place & resumable work.** The parked
unit is SUSPENDED WORK: `{kind, context ref, draft, note, timestamps}`,
kinds `note · claim-draft · challenge · source-attach · claim-pointer`.
Park buttons live on the add-claim form, the challenge form, the
source-attach form, and every claim panel (pointer + note); parking never
submits anything. Resume navigates back — topic, claim (extending the dial
if needed, like search hits), form, every field as left. **The park
freezes the draft, never the world (pinned):** `resolveParkedRef` resolves
the reference against today's topics at render/resume time; the stored
claim snippet is labeled "noted as" in the listing and never presented as
current; a dangling pointer degrades to a fully readable draft with the
reason named. Submission after resume goes through the rules exactly as if
never parked. The export format is **version 2** (v1 files read forever as
notes); structured entries ride the full engine's text column as a JSON
envelope (`{"@parked":…}`), decoded by the adapter — lossless in both
backends, no schema change; the raw envelope never surfaces as entry text
(caught live, pinned). Merge dedup now keys on the whole parked unit
(kind + note + text + draft). The notepad input auto-grows (composer
pattern).

### 3.2g Stage 2.96 — setup walkthrough & guided tour

**One script, two voices** (`client/src/tour/`). `stops.js` holds the nine
grounding docs — cold open, depth dial, tier colors, claim panel, chain
view, search, off-axis, time scrubber (incl. the epoch boundary demoed
live, one minute before the epoch), showcase boundary + clone path. The
FRAMEWORK executes each stop's `apply` spec through App callbacks — view,
depth, selection, chain, tabs, scrub — deterministically; the tour holds no
API access and cannot dispatch (pinned). Keyless mode renders the doc
verbatim: no canned chat, no fake companion (pinned — no assistant-styled
literals). Keyed mode voices the doc through the visitor's own adapter with
the substance gate; a dropped-substance render or provider failure falls
back to the written doc with the reason named. A stop with no grounding doc
REFUSES before any model call — the companion does not invent UI (pinned).
In-stop Q&A is grounded in the stop doc and has no record tools; questions
needing the record are pointed at the companion panel (decision recorded).

**Setup walkthrough**: provider (unsupported ones disabled with the honest
reason) → key source + honest cost note ("your key and your spend") → the
TRUE guarantee, phrased no stronger than the key-privacy tests pin →
paste → live test call via chatComplete with named failures → optional card
import → a fork, never a wall. Companion-mode tour requires a passing test
call — the tour never fakes a companion.

**Cold open intact:** the invite is a small dismissible card, offered once
(`onion.ui.tourOffered`), never a takeover, deferring to the demo intro;
re-launchable from the header (❔ tour). Skippable/resumable, keyboard
navigable, reduced-motion respected.

**Panel placement (operator correction, 2026-07-28):** the tour box must
never sit on what a stop is showing. Every stop carries a default corner
(`panelPos` — sidebar stops go bottom-left, map stops bottom-right, pinned
for the sidebar stops), and the whole panel drags by its header; a dragged
position wins for the rest of the tour. "Skip setup" now falls through to
the written tour instead of dead-ending (a wall is not a fork); a separate
✕ closes outright.

### 3.2f Stage 2.95 — the time machine

**Reconstruction runs BACKWARD from the present** (`server/timemachine.js`,
read-only by construction — no `.run()` in the module, pinned). Current
state is ground truth; logged events undo changes since the epoch; tier
timelines come uniformly from challenge rows ("a → b" with their own
timestamps), which cover pre- and post-epoch alike. Detached sources are
restored into past views from the library (flagged `reconstructed`);
removed kernel links restore as stubs; a post-ts `vertical_set` renders the
past vertical as unknown-at-equator rather than guessed. What cannot be
reconstructed is named in `reconstruction_notes` — shown, never papered
over.

**The log epoch is first-class** (kickoff Amendment A). Epoch =
2026-07-27 22:19:01 on the live DB. Scrubbing earlier shows "recorded
history begins here"; pre-epoch views carry `complete:false` and a
banner; backfilled events are `origin:'derived'` with `actor:null` —
distinct in data and in rendering (dashed badge, "actor: unknown").
History actors are LOG-sourced or null, never defaulted (a first cut
hardcoded 'local' for post-epoch entries — caught and fixed; pinned).
Trade-off restated: seeded topics have thin pre-epoch replay; honest
thinness beats fabricated depth.

**Error vs. supersession** is classified mechanically in claim history:
`contradicting_evidence` (or `bad_source` with a recorded evidence change
since placement) → "superseded by later evidence"; `mis_tiered`/
`equivocation`/`layer_mismatch` → "corrected placement"; anything else
stays unlabeled. Failed promotions render as "refused" entries. The
history is the interleaved record — placements, moves, attachments,
challenges in time order — so what-was-known-when is visible, not
flattened.

**Strict read-only, structurally:** all six time-machine endpoints are
GET; no write route accepts a timestamp; every client write funnels
through run(), which consults `timeState.writeBlockedReason` and refuses
with the reason and the way back. Scrubbed double-click selects only
(chain view and narration read the present record — decision recorded).
Scrub state lives in App, so it composes with the dial and survives the
2D/3D toggle.

**Statistics are readouts, never leaderboards:** topic aggregates only —
migrations (with refused promotions counted), churn, survival days per
tier, challenge outcomes, demotion character, supersession rate. The
payload keys no actor/user/name/ranking/top-N fields (pinned recursively).

**Scope-event deferral (kickoff D):** the schema has no scope-event or
hash-supersession record types (Legal Amendments F/G unimplemented), so
the replay covers evidence events only; tombstone/redaction rendering is
deferred until those records exist, and a test pins that they were not
invented here.

### 3.2e Stage 2.9d Amendment B — honest progress & working view

**The stage indicator is wired to real pipeline events and nothing else.**
`pipeline.js` exports STAGES and fires `onStage` exactly at real
transitions; nothing advances on a timer; skipped stages never fire; a
mid-stage error carries the stage it failed in ("failed while drafting in
voice — …"). Label→pipeline mapping: `manifest` "reading the record…" =
pass-1 bare-core manifest + groundCheck (groundCheck is synchronous and
mechanical, so it shares the pass-1 stage rather than flashing for 0ms) ·
`analysis` "consulting the record…" = chat pass-1 tool loop · `render`
"drafting in voice…" = pass-2 persona render · `gate` "checking the draft
against the record…" = fidelity check · `interleave` = interleaved-mode
commentary · `interleave_degrade` = post-gate-failure re-render. Pinned by
sequence tests per mode, including the induced mid-stage failure.

**Nothing streams pre-gate.** No pass streams today at all — the pipeline
has no token callback (pinned by source scan), so the gate always sees, and
the operator only ever sees, completed checked text. The stage indicator
carries the wait. If post-gate streaming is ever added, only gated text may
stream.

**The working view is real or absent — never fabricated.**
`normalizeResponse` surfaces a `reasoning` field ONLY when the provider
actually returned a separate thinking channel (Anthropic `thinking` blocks;
Gemini `thought` parts — which are also excluded from narration text;
OpenRouter `reasoning`). No channel → no field → no section (absent rather
than guessed, same rule as the vertical axis). Working notes are component
state captured at the callModel boundary: never a message, so never in
threads, never pinnable, never persisted; the pipeline output provably never
carries reasoning (pinned). Scratch-styled (hatched, warning-bordered,
labeled "ungated working notes").

**Per-stage timings** print to the dev console and render as a small
monospace line after each response — measurement first, optimization
deliberately out of scope.

**Claim-picker search (operator request).** The three connect-a-claim
dropdowns (support target, kernel target, demote-kernel) are now search
inputs: empty focus lists the claim's own onion first with an honest "N
claims in other onions — type to search them" hint; typing ranks across all
onions with the same pinned lexical-only ranker; candidates stay pre-filtered
by the caller (dial-visible, tier-eligible), and the picker fetches nothing
(pinned). The attach-a-source library select got the same treatment
(`SourcePicker.jsx`): search the topic library by citation, same ranker, no
reach beyond the attachable candidates it is handed (pinned).

### 3.2c Stage 2.9c — color system, tabs, search

**Tier tokens live in ONE file: `client/src/tokens.js`** (the design
authority is archived in the build supervision workstream, not this
repository). The neon set colors dark surfaces (3D tiles, 2D rings, chips, legend);
the pastel set is defined and reserved for light/reading surfaces, which do
not exist in-app yet. JS consumers import the maps; CSS consumers use the
`--tier-*` variables injected by `applyTokens()` at boot — the stylesheet
never restates a tier hex, pinned by test (K2 scans every client source).
Hue now encodes TIER, not claim kind: tiles and 2D nodes are tier-colored;
kind moved to outline treatment (chips: solid/dashed/dotted borders, no
fills; 2D nodes: stroke dash pattern) so kind can never be misread as tier.
The UI ground moved to Void Indigo with Vellum secondary ink, per the brief.
Reported near-collision, kept per kickoff rule 4: the refuted/critical red
(#d03b3b) sits near the inner-tier neon (#FF5E3A); they never appear as the
same element kind (status is stroke/chip, tier is fill), so no change made.

**Tabs are presentation only.** Claim panel: Claim (identity + support and
kernel links + link challenges — links are the claim's standing, so they
live with it) · Sources · Move (tier floors, promote/demote, claim
challenges) · History (one row per record, id-anchored so the 2.95 timeline
jump can land without rework). Topic panel: About · Parking Lot · Off-axis.
All form state lives in the parent, so switching tabs never loses input;
pending input shows a dot, never auto-switches; arrows/Home/End navigate;
reduced-motion disables the pane fade. The Off-axis tab respects the dial:
below depth 5 it shows the honest count and a dial-out button, never the
text.

**Search replaces the topic row; ranking is lexical-only by construction.**
`client/src/searchRank.js` scores a (query, text) string pair and can read
nothing else — no activity, recency, challenge counts, or tier. Reasoning: a
search that surfaces "active" claims first is a soft popularity channel, and
popularity moving visibility is adjacent to popularity moving claims —
refused. Pinned four ways: decoy-field invariance, tier-neutral tiebreaks,
determinism, and a source scan for banned identifiers. Claim results respect
the dial: hidden matches are counted ("N more at deeper levels — extend
dial"), never excerpted. Selecting a claim uses single-click semantics
(panel opens, no chain view). The current topic shows as a header chip.

### 3.3 Stage 2.9 — kernel links and lineages

**A kernel link is annotation, not support — the placement functions never
read it.** `claim_kernels` is a separate table the placement functions never
query, so zero weight is structural, not policed. *Scope, because the headline
has been quoted past it: the rules layer does read the table elsewhere — it
refuses a kernel and support link on the same pair, and severs a falsified
link inside a promotion's transaction. What never reads it is anything that
computes weight or placement.* The explicit guards on top (a
`kernel_of` source relation refused by name; `carriesWeight` keyed to
`'supports'` alone) close the mis-shaping paths. Pinned by tests that a claim
kernel-linked to a two-primary-doc Core claim still fails every floor.

**Zero weight cuts both ways: a kernel link can never block an earned move.**
If a claim's evidence later earns the kernel's tier, promotion proceeds and
the now-falsified link is severed inside the same transaction, recorded in the
event log with the promotion as its reason. Keeping it would render a lie;
blocking the move would give the link weight. A schema trigger backstops the
direction rule against any other tier-move path.

**Kernel and support links are mutually exclusive per pair, at both layers.**
A kernel link says evidence STOPS between two claims; a support link says it
connects them. The rules refuse the contradiction with the reason named, and
triggers refuse it again below the code. This is the whole-vs-broken grammar
enforced at the data layer, not just drawn.

**The routing rule lives where routes are computed.** `getLineages` walks only
recorded support links (BFS, deterministic order) from kernel toward the outer
claim. A nearest-looking neighbor with no evidentiary relation cannot appear on
a path because there is no code path that would add it. If no support chain
reaches the claim, the route is the bare two-point break — a wide void is its
own honest signal.

**Style derives from kind at the data-to-render boundary.**
`client/src/lineageRender.js` emits every line the 3D view draws. `style` is
computed from `kind` (support→solid, kernel→broken) and is not an input, so no
code path can render a kernel link whole — pinned by test, including an
adversarial forged-payload case.

**Deselect: stay-put, Escape goes home.** Both behaviors were prototyped;
return-home on every deselect was jarring when hopping between neighboring
claims mid-exploration, so deselect keeps the camera where the story ended
(orbit target re-centers), and Escape is the deliberate release that tweens
back to the canonical resting framing. The addendum's own bias ("possibly:
stay on deselect, home on Escape") held up. *(2.9b: the empty-space-click-
goes-home part is superseded — an empty click now only restores state; the
camera never moves except on Escape.)*

**Tile materials derive from the record, always.** Mass/finish = weight-
carrying source count; weathering = challenges survived; pulse = a challenge
or re-tier within 30 days. No stored appearance fields — pinned by a test
that greps the claims schema for any.

### 3.3b Stage 2.9b — legibility & seeding (supersessions)

**Interaction supersession (2.9b, replaces the 2.9 select behavior).**
Single-click = tile select + evidence panel ONLY — no lineage draw, no
clearing, no reframing. Double-click on a claim with a kernel lineage = the
CHAIN VIEW: every tile not in the chain clears fully (no ghosting), the chain
rotates globe-style about the vertical axis — animated, unhurried — until it
lies legible across the visible face, and narration rides over the cleared
state. Double-click without a lineage: no clearing, narration only. Empty
click restores the full sphere AT THE CURRENT DIAL DEPTH — the whole model is
a pure reducer (`client/src/interaction.js`) whose transitions are pinned by
test, including "no transition but the dial touches depth." Inside the chain,
clicking a chain tile selects it for the panel and the chain persists.
Lineage chips step the camera along the path node by node; in a fan, the
active lineage draws and the others reduce to a minimal kernel indication.

**Rest-state legibility (2.9b, replaces the Voronoi tessellation).** Tiles
are small, crisp, discrete discs; open space on the sphere is correct and
expected. Size comes from `placement.tileAngularRadius(ringRadius, count)` —
the function admits no claim at all, so evidence weight has no path into
size (pinned structurally by signature and behaviorally). The sphere idles
rotating globe-style at rest; picking converts hits into globe-local space
and a click outside a tile's angular radius is honestly empty space.

**Open space is transparent — the dyson-sphere reading (operator correction,
2026-07-27).** The first cut kept an opaque shell base, which made a
nearly-empty outermost tier read as a dark ball hiding everything inside —
and left nothing visible to click, so the mouse felt stuck in rotation mode.
Corrected: the inter-tile background is transparent (alphaTest discard, so
the depth buffer stays honest with no transparency-sorting artifacts), inner
shells show through the gaps, and picking walks the ray near-to-far — a
click in a gap passes through to the first tile behind it. This supersedes
the Stage-One "clicking always targets the outermost visible shell" rule:
clicking targets what the eye actually sees. Camera handling: side-to-side
orbit is endless; vertical tilt is clamped to ±15° around the equator view
so outcome latitudes stay readable and the poles never flip overhead.

**Second round of operator corrections (2026-07-27), all applied:**
- *Chain presentation is SIDE-ON.* The first cut rotated the chain to face
  the camera — but a chain runs mostly radially, so face-on is end-on:
  foreshortened to a barely-visible line whose break looked closed. The
  alignment now lands the chain 90° off the camera azimuth (nearest side),
  fully extended, break visibly open.
- *The chain view fires for support links too.* A middle claim's evidentiary
  descent is a chain (all solid, no break) — kernel links are not required.
  Double-click on any claim with kernel OR support links clears and presents.
- *Narration is offered, never automatic.* Double-click no longer invokes
  the companion; it shows a "Narrate claim #N?" button over the sphere, and
  narration runs only when asked. The offer withdraws when selection moves.
- *Tiles wrap the ±180° texture seam* (the half-tile bug) and the refuted
  mark is a single diagonal strike inside the disc with a fine rim — no more
  broken-image look.

**Third round of operator corrections (2026-07-27), all applied:**
- *Weathering moved from face to RIM.* Face scratches read as noise/artifacts
  rather than material. Challenge survival now wears the tile's EDGE — a
  thicker, darker, notched rim for battle-tested claims, a thin pristine rim
  for never-challenged ones. The only mark that ever crosses a face is the
  refuted diagonal (the 2D view's ✕, kept for debunked claims only).
- *The chain is framed, not just rotated.* Shell radii span only a couple of
  world units, so a chain viewed at full-sphere distance is a stub. After
  the side-on rotation the camera now glides in until the chain fills the
  view. On restore, if the zoom left the camera inside the shells it glides
  back out past the outermost; otherwise stay-put holds.
- *The chain is the CONNECTED support component, both directions.* The first
  cut walked supported_by only, so 26 (rests on 24) never showed 30 (which
  24 props up). Membership now walks support links both ways; every drawn
  edge keeps its recorded direction.
- *Chain labels ladder; the kernel line sweeps.* Node labels take rotating
  height bands ordered along the chain, so no two can overlap; the gap
  statement sits in its own band below the line. The broken kernel line is
  no longer a straight hop: it travels an S-shaped sweep out into space —
  swinging wide and hooking back — so the leap has visible length and the
  break sits on a journey, not a stub. (The straight render survives nowhere;
  the whole-vs-broken boundary test is unaffected — style still derives from
  kind.)

**Fourth round of operator corrections (2026-07-27), all applied:**
- *No painted highlight inside tiles.* The "polish" specular sweep read as a
  light glowing inside the tile and carried nothing; mass now lives in the
  fill's saturation/depth alone.
- *Shells are double-sided.* A tile reads — and clicks — the same from
  inside the sphere as from outside; the far hemisphere is part of the
  world, not a void.
- *Sparse rings stagger.* siteFor is seeded per tier, so a lone tile on one
  shell can never sit radially stacked over a lone tile on the next (pinned
  by test T3).
- *The kernel sweep is half-sphere scale.* Swing raised from ~1 world unit
  to ≥2.6 (and 1.6× the straight distance), with stronger outward drift —
  the curve leaves the neighborhood and hooks back. The chain framing now
  includes the curve's own extent so the sweep never exits the view.
- *Labels get UNIQUE bands.* Alternating above/below the node with magnitude
  growing every pair — no two labels can share a height — and label sprites
  shrank to 0.85× to cut footprint.

**Outcome latitude (2.9b).** Latitude encodes documented outcome from the
record only: netting-to-~zero outcome evidence rides ON the equator line;
nothing attached sits in the band just above/below (4–11°, never on the
line, never past 11°); documented direction earns displacement (16–70°),
magnitude normalized within the topic. The bands cannot overlap — pinned.
No guide ring is drawn; the equator population is a natural cluster.
Weathering keeps its single meaning (challenge survival); netted-vs-undecided
is carried by position, not material.

### 3.4 Storage durability

Keys, the active card, and threads each live in their **own** `onion.companion.*`
localStorage entry, never inside the settings blob. A single bad write or parse
failure can no longer take another down with it. `loadSettings` returns
`_ok: false` on a parse failure so the caller refuses to overwrite — the
"vanish bug," where a failed read let a subsequent save clobber a good key.
All app resets are server-side DB operations that cannot reach browser storage;
this is asserted by test rather than assumed.

---

## 4. Conventions

**Documents.** `README.md` describes what exists and how to run it.
`DECISIONS.md` holds designs agreed but deliberately *not built*.
`TAXONOMY-STRAINS.md` is append-only evidence for a future redesign.
`PROJECT-STATE.md` (this file) is the working picture.

**Strain journal format.** Numbered entries with: the claim that surfaced it,
document kind, *what the vocabulary forced*, *what was lost*, *workaround used*.
Genre sections group entries (Replication Crisis 1–4, legal 5–6). Entries are
appended and never revised into agreement with later understanding — a
superseded entry gets a correction appended, not a rewrite.

**Section numbering in code comments — resolved 2026-08-11 (§3.2r).** The
`§9b`-family citations referenced 2.9d-era documents pasted into a session
and never saved; they could not be made to resolve. Every such citation was
rewritten to state the constraint it stood in for, or dropped where the
comment already stated it. That sweep covered code and tests only — this
document itself was swept the same way on 2026-08-15, when eleven kickoff-era
citations (§11, §12b, §12c, §13b, §13c, §14, and one `spec §4`) were found
live in it and dropped or restated on the same rule (and on 2026-08-15 the
rule was widened by operator ruling: no repository file cites a document
that is not in the repository — the fact is carried inline instead). The
only `§` references remaining anywhere are real citations to published
statutes and papers — inside seeded source strings and the records
describing the operator's checks — this file's own self-citations, and
historical passages describing the removed citations without making them;
all resolve. Do not reintroduce section-number citations to documents that
do not live in this repository.

**Code comments explain *why*, never *what*.** The house style is a short
paragraph at the head of a module stating the threat it defends against or the
decision it encodes, and inline notes only where the reasoning is invisible
from the code. Comments justify constraints; they never narrate mechanics.

**Test naming is a prefix + a sentence that states the guarantee**, e.g.
`D12b3. a read failure never lets a save clobber the good key (the vanish bug)`,
`V4. a 200 EMPTY SHELL (JS-rendered) is inconclusive, NEVER a confident "not found"`.
Prefixes group by concern (D = durability/demo, V = verification, B = browser,
S = search, F = fidelity fallback, P = proxy guard, C = card/gate). Tests are
plain `node:assert` scripts with a hand-rolled runner printing `PASS`/`FAIL` and
a count — no framework, run directly by `node`.

**Refusal messages are plain language, name the blocker, and state the honest
path.** Never "invalid input"; always "Core requires at least two independent
primary documents or court records; this claim has 0."

**Companion role in operator sessions** (standing constraint): citation
formatting, archive capture, verbatim journaling, export. It does **not**
source, draft claim text, or infer strains. Journal entries are
operator-dictated and recorded verbatim.

---

## 5. What is built

**Engine (Stage 1 → 2.5) — complete.**
Five tiers + vertical axis; kinds and layers; the categorization gate; the full
rule set with schema backstops; promotion battery with challenge history;
demote/correct (debunker) flow; challenges; source library with ripple
re-evaluation; tier-requirements preview; parking lot; `is_origin_of`;
export/import through the rules layer; multi-topic; depth dial; 3D onion view
(Three.js — discrete crisp tiles on nested shells; the Voronoi full-surface
tessellation was superseded at 2.9b, see §7); read-only demo package + Docker
deploy variant.

**Companion (Stage 2.8) — complete.**
BYOK provider layer (OpenRouter, Anthropic, Google Gemini — OpenAI direct is
UNSUPPORTED, no CORS; see §3.2d) with the key
guard; read-only tool manifest (5 tools) with executor refusal; two-pass
mask-lift with the substance-fidelity gate and automatic interleaved degrade;
character cards (standard card JSON, structured `powers` declarations); TTS
(Web Speech default, BYOK premium voices, visible fallback notice); prompt-hash
display; isolated storage for keys/card/threads.

**Live search + verification — complete.**
`web_search` (OpenRouter online plugin, or Brave/Tavily/Exa with a dedicated
key), `fetch_url`, `verify_source`; deterministic host→tier pre-classification
with an explicit "unclassifiable → strain candidate" signal; SSRF-guarded
server fetch proxy; headless-browser fallback for JS-rendered pages; tri-state
verification; every search/fetch/verify logged.

**Stage 2.9 — kernel links & lineages — complete.**
`kernel_of` claim-to-claim relation with mandatory three-part gap statement
(establishes / asserts-beyond / path-inward), zero evidentiary weight, strict
kernel-inward direction, refusals naming the blocker, schema backstops (CHECK
+ triggers, including kernel-and-support mutual exclusion per pair); debunker
flow auto-creates the link (path-inward derived from the tier preview);
kernel and hop challenges through the existing challenge machinery (upheld
removes the link, rejected marks it questioned); routed lineages computed
server-side (`/api/claims/:id/lineage` — routes walk only recorded support
links); converging fans with independent break points and lineage stepping;
whole-vs-broken grammar pinned at the data-to-render boundary
(`client/src/lineageRender.js` — style derives from kind, not an input);
rest/hover/select/double-click interaction model with record-derived tile
materials (mass/weathering/pulse); lineage-aware narration with the gap
statement in the groundable record; pin-to-notebook (isolated
`onion.companion.notebook` entry, no API path); append-only `events` table
recording every state change with actor, timestamp, reason — with two stated
exceptions, both disclosed where they arise: parked notes (§3.2j, outside the
epistemics entirely) and source-metadata correction, for which no event type
exists.

**Stage 2.9b — legibility & seeding — complete.** Chain view on double-click
with the single-click supersession (see §3.3b); discrete crisp tiles with
idle globe rotation; outcome-latitude vertical axis; kernel links seeded for
all debunked claims (see the seeding report in §6).

## 3.2j Stage 2.98b — record permanence & source links (2026-08-01)

**Principle enacted:** record entities are never hard-deleted through any
UI or API path — they change status, with a reason, and remain visible in
a diminished state. *One stated exception, below: a parked note is truly
deletable and unlogged, because it carries no tier, weight or place on the
rings and so cannot make a replay dishonest.* Two independent layers say no: the rules layer refuses
first in plain language; schema triggers (`trg_sources_no_delete`,
`trg_attach_no_delete`) refuse again beneath the code.

**Hard-delete affordance inventory (all resolved):**
- *Source detach (⨯)* → **withdraw from this claim**: mandatory reason
  (422 `withdrawal_reason_required` without one), attachment row keeps
  `withdrawn_at`/`withdrawn_reason` (schema v4), renders struck/diminished
  on the Sources tab and the claim page ("Withdrawn — no longer part of
  the case", with reason, date, and the review line), ripple identical to
  the old detach. `POST /api/claims/:id/sources/:sourceId/withdraw`;
  the DELETE verb answers 405 with the principle stated.
- *Library delete (⌫lib)* → **withdraw from library**: same reason gate;
  the entry stays in the library listing marked withdrawn; every leaning
  claim re-evaluates in one operation; withdrawn evidence cannot be newly
  attached (refused, named), and find-or-create never silently revives a
  withdrawn entity — an identical citation becomes a new active one.
- *Kernel-link remove (✕)* / *support-link remove (✕)* → **affordance
  removed entirely** (the kickoff's second option). Links are relations
  whose ends both remain fully visible; they now end only through recorded
  adjudication — the existing kernel-link/hop challenge machinery (reason,
  outcome, permanent challenge row) — or rules-layer severance on tier
  moves. Chosen over withdrawn-status rows because the tier rules and
  schema triggers read the link tables directly, and "no tier logic
  changes" is binding. `removeKernelLink` is deleted; `removeSupport` is
  unrouted, reason-mandatory, called only by the hop-challenge path.
- *Claims, topics, challenges*: verified — no delete path exists in UI or
  API. *Parking lot*: stated exception, truly deletable, unlogged, kept.
- *Bonus audit fix*: demotion's support-link severance previously returned
  in the payload but logged NO event — replay could not reconstruct those
  links. It now logs `support_link_removed` per severed link.

**Event-type reuse (none added at the time — see Amendment A below, which
adds `withdrawal_proposed` and `withdrawal_rejected` for the proposal and
rejection legs; the EFFECT events remain reused):** withdrawal reuses
`source_detached` and
`library_source_deleted` (same semantics, now always carrying the
operator's reason); link ends reuse `kernel_link_removed` /
`support_link_removed`. Kernel removal events now carry the full authored
gap statement in `detail`, and replay renders it verbatim instead of the
"not retained" placeholder. Replay reconstructs withdrawn sources from
their SURVIVING rows (relation intact, no guessing); the legacy event-based
path remains for pre-2.98b hard deletes.

**Review socket (B):** the honest single-curator line renders on withdrawn
entries (panel + page) and on source attach/withdraw history entries.
Display only; still no writer.

**Source link audit (C):** every seeded source linked or honestly labeled
— 48 sources: 40 linked (Senate originals 94755_I/II/III + 95mkultra,
govinfo STATUTE-90-Pg3006 for Private Law 94-126, Ford Library, FBI Vault,
CourtListener API-confirmed opinions, DOIs, archive.org for the defunct
Carney statement and the Marks book), 6 class-labeled, 2 could-not-verify
(Media PA cache, the Nov 1964 King letter) — labeled, not guessed. Single
mapping in `server/sourcelinks.js`, applied by `seed()` and once to the
live DB (38 rows; disclosed — no event type exists for source-metadata
correction and the kickoff forbids new types). The 2.98b source-audit table
that drove this mapping is archived in the build supervision workstream, not
in this repository. Seed-lint pinned (stage298b C1).

**Also this session (operator requests):** the claim-page logo mark now
links to https://thetruthonion.org/ and the masthead is sticky
(position:sticky, top:0) so the mark stays visible during scroll.

**Amendment A (2026-08-01) — withdrawal adjudicates before it takes
effect.** Auditable vandalism is still vandalism: one actor's filing no
longer subtracts anything. Withdrawal is two-phase, challenge-shaped:
- **Filing proposes** (schema v5: `proposed_at`/`proposed_reason` on
  sources + claim_sources; reason still mandatory; `withdrawal_proposed`
  event). The proposal renders on the source immediately — "withdrawal
  proposed — {reason} · keeps its full standing until adjudication" — but
  has ZERO rule effect, structurally: every rule reads `withdrawn_*`
  alone, and `withdrawn_*` is set only by adjudication. Pinned: file a
  proposal, floors and tier-preview byte-identical (A9).
- **Adjudication**: upheld → the 2.98b effect (withdrawn status,
  diminished render, ripple) fires at adjudication time, recorded with the
  REUSED effect events (`source_detached`/`library_source_deleted`) so
  replay timing is exact; rejected → the source stands and the attempt is
  permanent history (`withdrawal_rejected` event), like a failed
  promotion. Endpoints: `POST …/withdraw` (file) and
  `POST …/withdraw/adjudicate {outcome}` (both scopes).
- **Implementation choice (reported per the latitude):** PARALLEL
  machinery, not challenge rows — challenges require a claim_id and
  contest a claim's standing or a link; a withdrawal targets an attachment
  or a library entity (no single claim). The challenge SHAPE is kept
  (file → adjudicate → both outcomes permanent); the challenge table is
  not overloaded.
- **Curator honesty:** "Adjudicated by curator · Independent review: none
  yet — single-curator record" renders on pending proposals, withdrawn
  entries, and proposal/rejection history lines (panel + page). Stage 3
  swaps the adjudicator for the review pipeline with no schema change;
  bad-actor bounding is Stage 3 scope, noted and not built — the
  Sybil-resistance design is held in the build supervision workstream's
  post-release design capture, not in this repository.
- **Stated asymmetry (settled):** additions take effect immediately and
  answer to challenges afterward; removals adjudicate before effect.
- **Replay:** proposal and adjudication are distinct events; the pending
  window shows the source ACTIVE with its proposal annotation
  (reconstructed from the event record, so adjudicated proposals still
  render in the windows they were open); effect is never retroactive to
  filing time. Pinned in A9–A11.
- **UI (operator request):** the two withdraw buttons became ONE
  "Withdrawal ▾" dropdown offering "from this claim…" / "from the
  library…"; the form files a proposal; pending proposals carry
  uphold/reject controls, both confirmed. Pinned in A12.

## 3.2k Release prep (2026-08-01) — checklist 0a–3 + Fly.io artifacts

Executed per the release decision record (items 0a, 0a-i, 0b, 0c, 1, 2, 2a,
2b, 3) and the Fly.io handoff. **Stops before push and deploy** — the
operator creates the Fly account and the GitHub remote, pushes, and deploys.

**0a — seed curation.** The shipped seed is structurally curated: the
pristine demo DB is built from `server/seed.js` (MKUltra + COINTELPRO) plus
the versioned `exports/the-replication-crisis.json` fixture imported through
the rules layer — the live DB (which holds the "Christ is God" test topic,
Purdue, and the empty Epstein topic) is never the source of what ships, and
stays intact. Pinned R1: shipped topics are exactly the curated three, with
a residue scan over every claim.

**0a-i — encoding.** Diagnosis: the mojibake is STORED, not render-time —
the five curl-era gap statements in the live DB carry U+FFFD (four
`claim_kernels` rows + five `events.reason` rows; the render path was
already clean: `<meta charset="utf-8">` plus Express's `charset=utf-8`
Content-Type). The live rows stay as they are (live record intact; its
correction remains the separately-approved re-creation). The SHIPPED seed
now carries the four kernel links authored directly in `seed.js` with
correct typography — the logged data correction to the seed the decision
record prescribes — so the demo ships the debunker-lineage content clean.
(The fifth live link, RC #28→#22, was removed by the operator on the live
DB and is deliberately not resurrected in the seed.) Pinned R2 (zero U+FFFD
in any text column of the shipped seed), R3 (charset pinned by header and
meta on every claim page; zero U+FFFD on every page), R4 (the four links,
en-/em-dashes verified).

**0b/0c — repo.** Initialized (`main`), `.gitignore` before the first
commit (DB files + `server/data/`, `.env*`, `node_modules`, `client/dist`,
`demo/`, `.claude/settings.local.json`); README rewritten from the public
draft to the current build (what/run/suites/showcase-proxy-absent/license-
pending); LICENSE committed as an explicit stub — filled the day the
operator's license lands, never guessed — with `package.json` pointing at
it; all kickoff/spec/addendum docs committed so `§` citations resolve.
Verified staged: no DB blob, no secret (pattern scan), Epstein export empty.
**The §8 "no version control" risk is closed.**
*[Superseded in part, 2026-08-11 — operator ruling at the fifth
reconciliation:
the "committed so `§` citations resolve" line stays on the record as what
was done, but no longer governs. The rationale was empty at the time — the
`§` citations in shipped code resolved to nothing in or out of the repo,
and the committed set was never complete. The seventeen internal documents
came out of HEAD in the doc-removal session (§3.2r); CLAUDE.md's rule —
kickoff documents live in the build supervision workstream — governs.]*

**1 — rebuild.** Demo package rebuilt with everything through 2.98b; booted
and verified live: three curated topics, `/api/fetch` 404, mutations 403,
kernel fans present and clean, curator labels rendering. Full suite green —
totals in the table below (243 across eighteen suites).

**2 — showcase message.** `fetch_url` / `verify_source` in the demo surface
"Mechanical verification is not available in this demo — clone the repo to
run mechanical verification locally…" (constant
`SHOWCASE_VERIFY_UNAVAILABLE` in `companion/search.js`). Two layers: the
executor short-circuits on the demo flag (`proxyAbsent`, wired from
`/api/meta` demo_mode through App → Companion) and never issues the doomed
request; and a live 404 from `viaProxy` converts to the same answer —
"fetch proxy error 404" can no longer surface. `verify_source` answers in
the tri-state: `verified:false, quote_found:null, inconclusive:true` —
nothing was learned. Pinned R5/R6.

**2a — proxy-path audit (the enumeration).** Every code path that can touch
the absent fetch proxy:
1. `client/src/companion/search.js → viaProxy` — the ONLY client reference
   to `/api/fetch` (pinned by source scan, R7), reached by exactly two
   tools: `fetch_url` and `verify_source`. Both degrade to the showcase
   answer (above).
2. Server registration: `/api/fetch` exists only when `demo` is false
   (pinned D4/D5); the demo package does not even ship
   `fetch-proxy.js`/`browser-render.js`.
3. `web_search` — never touches the proxy (BYOK browser→provider).
4. Source-attach flows and parked source drafts — no verify step exists in
   them; nothing calls the proxy (2b labels carry the honesty instead).
5. The tour — holds no API access at all (2.96 pin).
6. Future (2.99a): sandbox attach must attach-and-weigh normally with
   verification simply marked absent, using the shared labels in
   `client/src/verifyStatus.js` — the constant is already the single copy.

**2b — verification-status labels.** Recorded sources: `verification:
'curator'` is DERIVED (never stored) from the 2.98b audit mapping in
`sourcelinks.js` — every URL-carrying entry was resolved live in that
audit; the label "mechanically verified locally by curator" renders on the
Sources tab and claim pages. Class-labeled/could-not-verify entries keep
their in-citation honesty labels and get no chip. Demo-attached sources:
`client/src/verifyStatus.js` holds the one copy of the boundary text
("not verified — the live verifier is deliberately switched off on this
public demo; it runs in the full engine (clone the repo) and will verify
this source automatically when your save is imported at multiplayer"); the
demo parking store stamps `source-attach` drafts `verification: 'pending'`,
which rides the save file (export) losslessly — and NO other machinery
exists behind it. Pinned R8/R8b.

**3 — rate limiting.** Already mounted on `/api` and `/claim` with the
demo-boot default of 120 req/min/IP (feedback keeps its own 5/min); now
pinned for BOTH route families plus the nonzero boot default (R9).

**Deploy artifacts (Fly.io).** `deploy/Dockerfile` (multi-stage, portable):
`npm ci` → **`RUN npm test` — the deploy gate; a red suite, including a
build that silently reacquires the fetch proxy (D4), means no image
exists** → `npm run build-demo` seeds the pristine DB AT IMAGE BUILD from
the versioned fixtures → a runtime stage with no browser binary and no
VOLUME. Root `fly.toml` (at the root so `fly deploy`'s build context is the
repo): shared-cpu-1x, 512MB, scale-to-zero, **no [mounts] stanza ever** —
the DB resets on every deploy/restart by design; persistence is client-side
saves. `deploy/README.md` documents the operator flow, the $10/mo spend
alert (operator sets it in the dashboard), and test-window upsizing
(bill-by-hours: scale up for the window, scale back after).
`build-demo.mjs` no longer generates deploy files — they are authored,
reviewed artifacts pinned by R10. Root `.dockerignore` keeps DBs and local
installs out of the image context.

**Recorded constraint for the 2.99b kickoff (not built now):** the app
database never holds strain submissions — ephemeral hosting makes that
silent data loss. Ship-out-on-write to operator-controlled durable storage,
or refuse honestly.

## 3.2l Fixture history export (2026-08-01, fix session pre-2.99a)

**The demo's pristine DB is now a RESTORE of the exported curated record,
not a build-time re-seed.** The old build (seed.js + RC import at build
time) stamped build-day timestamps over everything, so the demo's time
machine showed a fake single-day history. Now:

- **Export** (`scripts/export-history.mjs`): given topic names (default the
  curated three), extracts the COMPLETE record from the live DB — claims,
  sources, attachments with withdrawal state, support links, kernel links,
  challenges, adjudications, and the full event log with original
  timestamps, reasons, and actors — into
  `exports/curated-record.history.json` (format `truth-onion-history`,
  version 1). Everything else (other topics, parked notes, feedback) is
  excluded by construction; a support link or event crossing the curation
  boundary aborts the export rather than silently cutting. The script runs
  the same identity bar as the repo scrub (name/email/paths — refuses on
  hit) and reports actor values for review.
- **Encoding corrections, disclosed:** the curl-era U+FFFD (4 kernel rows +
  5 event reasons) is repaired at export by three deterministic context
  rules (digit–digit → en-dash, letter's → apostrophe, space-flanked →
  em-dash); every repaired field is listed in the fixture's `corrections`
  array (14 fields); an unplaceable U+FFFD aborts — reported, never
  guessed. The LIVE DB rows remain untouched (record intact).
- **Restore** (`server/history.js` `restoreHistory`): inserts verbatim —
  ids, timestamps, actors — inside one transaction, into an empty DB only.
  Not a rules-layer replay (the rules already ruled on each row when it
  happened); the schema CHECKs and triggers still stand under every
  insert. Withdrawal state applies in two phases (attach active, then
  update to the recorded withdrawal) so the FTS maintenance triggers see
  the live record's own sequence. Post-restore verification: per-table
  counts match the fixture, zero U+FFFD anywhere.
- **Honesty preserved, verified live on the rebuilt package:** epoch
  2026-07-27 22:19:01 (the recorded first event, as on the live DB);
  pre-epoch entries render origin `derived` with actor null (22 derived +
  6 logged on MKUltra); logged events keep recorded actors (`local`,
  `claude (2.9b seeding)`); RC's pre-creation window shows the epoch
  treatment (pre_epoch, complete:false, zero claims, the predates-recorded-
  history note) — never blank; the operator's 2026-08-01 withdrawal of the
  claim-20 Church Committee attachment restores withdrawn with its reason
  verbatim, out of search, propose+adjudicate both on the record.
- **Recorded spans** (earliest → latest per topic): MKUltra 2026-07-11
  22:41:52 → 2026-07-28 00:54:27 · COINTELPRO 2026-07-11 22:41:52 →
  2026-08-01 21:00:42 · The Replication Crisis 2026-07-12 02:45:11 →
  2026-07-30 22:53:47.
- **Judgment reported, not decided:** events 1–4 (the Stage 2.9 build-
  verification kernel links on claim #9, created and removed 2026-07-27)
  are INCLUDED — they are self-describing record history and they anchor
  the epoch exactly where PROJECT-STATE records it. If the operator rules
  them test residue, re-export excluding them moves the epoch to
  2026-07-28 00:54:27. Event id 10 (the excluded test topic's creation)
  leaves its id gap in the fixture — ids verbatim, never compacted.
- Pinned in `tests/history.test.mjs` (H1–H7): double-restore identity with
  the fixture, no build-day stamping, epoch + derived/actor-null markers,
  per-topic scrubber spans, FFFD-free fixture with disclosed corrections,
  withdrawal restoration, identity bar, curation boundary. Release suite
  R1–R4/R8 now build the pristine DB the new way. seed.js is unchanged and
  remains the fresh-engine/local-dev seed (fresh timestamps are honest
  there — the record genuinely begins at first boot).

## 3.2m Stage 2.99a — sandbox core & personas (2026-08-02)

**One surface, copy-on-first-write (Amendment C, supersedes the two-door
model).** Every visitor lands in the engine browsing the canonical curated
record. The FIRST attempted write — add a claim, attach a source, file a
challenge — transparently creates a private session copy and the write
lands in it; the shared record's 403-everything posture is untouched (its
refusal message now points at the door: "your first write creates a
private copy where the rules answer to you"). Reads never create or
consume a session (pinned by a full-route crawl). The client routes
writes to the copy: `run()` is the single funnel and intercepts exactly
once.

**Session architecture.** `server/sandbox.js` `makeSandboxManager`: each
copy is an in-memory SQLite restored by `restoreHistory` from the SAME
curated-record fixture the pristine DB is built from, served by an app
built by the SAME `buildApp` (`sandbox: true` = writes on, fetch proxy
still absent, no static, no reachable page routes). Not a fork,
structurally: sandbox.js imports neither rules nor routes (pinned), and a
refusal sampler (zero-weight-at-core, floor-not-met, reason-less
withdrawal, topic-shape gate) fires byte-identically in-copy and
in-engine (pinned). Parent routes: `POST /api/sandbox/copy` (before the
read-only gate; body may carry a save), `GET /sandbox/:sid/save`,
`/sandbox/:sid/api/*` delegated to the copy's app; `/sandbox` inherits
the demo rate limiter.

**Limits (recorded for host sizing):** 24 concurrent copies · 30-minute
idle TTL (sweep every minute; wipe = close + delete, pinned) · 8 MB
per-copy size cap (413 refuses growth, reading continues) · cap gates
first-write only with the honest full-message; reading never blocks.

**The indicator is the honesty organ** (client/src/sandboxState.js, pure
functions, pinned): "canonical record" → "your copy — diverged from the
record" with a divergence view (the copy's events past the canonical
baseline — the same append-only log, persona actors shown) and a
view-canonical/return toggle. A write while viewing canonical rejoins the
copy first.

**Personas (provisional table — illustrative of Stage 3, thresholds not
final; standing PRESET, never earned; the honesty label rides every
surface).** Gates live in `rules.js` (`personaGateFailures`), inert for
non-persona actors ('local' = the engine seat), enforced in service ops;
the sandbox app clamps the actor header to the known set.
- **Curator** — full current-engine powers in the copy.
- **Contributor** — add claims/sources, file challenges and withdrawal
  proposals; adjudicates nothing.
- **Reviewer** — Contributor powers + adjudicates proposals filed by
  OTHER actors. **Proposer-never-upholds, first in-code enforcement:** the
  proposer is read from the event log (the withdrawal_proposed event's
  actor — no new column); reviewer-upholds-own refused with the named
  blocker; retraction (rejecting one's own) stays permitted.
- Curator-only ops: promote, demote, set-vertical, kernel link, support
  link, topic create, import. Noted seam for Stage 3: challenges are the
  existing single-shot machinery (outcome included), so "file a
  challenge" currently carries its own adjudication — the two-phase
  challenge split arrives with real multiplayer review.
- The copy's event log records personas as actors; replay renders genuine
  multi-actor history (pinned).

**Save files (extends the 2.97 contract to record-shaped work).** Format
`truth-onion-sandbox-save` v1: `{format, version, saved_at,
standing_note, record}` where `record` is the full record-shaped export
(`exportRecord`: topics/claims/sources/attachments/supports/kernels/
challenges/events — the history-fixture shape). `standing_note` restates
the settled contract verbatim: personas/standing are simulation data; at
Stage 3 imports pass the real rules layer entry by entry; nothing carries
standing in from a file. Import = a fresh session restored from the save
(same restore path as everything else); round-trip pinned event-for-
event. Tampered saves refused whole with the blocker named.

**Autosave (Amendment B, prompt at first write per C).** One format, no
forks — the autosaved artifact IS the save endpoint's JSON. Chromium:
File System Access handle, picked once, written debounced ("autosaving to
{filename}"). Elsewhere: browser storage (`onion.sandbox.autosave`) with
an exit nudge and a download button ("autosaving in this browser —
download to keep it anywhere else"). Modes always labeled, never one
unlabeled checkmark; write failures surface immediately through the
status callback (pinned). A browser autosave found at boot offers resume
— never auto-imports.

**Entry card (Amendment A/C): doors, not teaching.** The two facts no
visitor may miss plus two doors (Explore the record · Take the tour); all
instruction lives in the tour; the tour's boundary stop became the
FIRST-WRITE stop (attempt a write, watch the marker flip, read a refusal,
meet the personas, save — clone path retained). Copy-review pinned: no
guarantee-shaped sentence on card, stops, or sandbox notes.

**Feedback (Amendment B): the in-product pipe is REMOVED** — endpoint,
modal, quarantine table (an ephemeral DB cannot keep an accept-then-lose
inbox promise; the operator's live DB keeps its existing table). The
affordance is a mailto to contact@thetruthonion.org (category-prefilled
subject) in the header and on claim pages; durable in-product feedback is
2.99b scope. Pinned: no route (403/404), no table in fresh schemas, no
orphaned machinery.

**Claim pages: canonical only, honestly impermanent.** Copy-only claims
have no public page (404 — "links go live at multiplayer", structural:
the parent forwards only /sandbox/:sid/api and /save); page footer and
the panel's page/copy-link affordances carry the impermanence line: the
demo host is temporary by design; permanent addresses arrive with
multiplayer.

**Tried and rejected this session:**
- *Monkey-patching window.fetch for copy routing* — rejected: the api.js
  wrapper is the single client HTTP funnel already; a global patch would
  also intercept BYOK provider calls it must never touch.
- *A `proposed_by` column for proposer-never-upholds* — rejected: the
  event log already records the proposer as the filing event's actor; a
  second copy of that fact could drift from the record.
- *Per-request DB resolution inside one app instance* — rejected in favor
  of one buildApp per copy: the same constructor everywhere is the
  same-code-path guarantee, and a resolver would thread session identity
  through every route.
- *Rewriting demo parking to server-parking-in-copy* — kept device-local
  (2.97 settled, poisoned-proxy pinned): parking has no epistemic
  standing, so it is not record-shaped work and never creates a copy.

### 3.2m-i — 2.99a punch list (operator inspection, 2026-08-02)

**1 — first write halted (DIAGNOSIS, as required).** The gap between the
pinned test and the lived flow: the stage299a suite pinned the SERVER
routes and the pure interception logic, and `run()` did intercept — but
the add-topic and add-claim forms predate `run()` and call the api module
directly, so they hit the shared record's 403, and AddClaim renders any
non-422 error in the refusal-banner styling. The pin never covered "every
client write path uses the funnel" — a UI-wrapper funnel cannot make that
guarantee. **Fix, structural:** copy-on-first-write moved INTO api.js —
the one client HTTP funnel — so no component can bypass it: any mutating
/api call in demo mode creates the copy transparently (single in-flight
guard), the write proceeds, events notify the app (copy-created /
write-rerouted / wrote). Pinned E3 by driving the REAL api module through
add-claim AND add-topic from canonical view, end-to-end, one copy,
canonical untouched. Verified live in the running build: submit → claim
placed → indicator flips → save popover + one-time plain birth notice
adjacent to the action; no halt, no banner.

**2 — fog sentence replaced** everywhere it surfaced (card, 403 refusal,
indicator title, birth notice): "your own private copy — add claims,
attach sources, file challenges; the rules accept or refuse them, with
reasons." Pinned (F1: new copy present, old phrase absent).

**3 — feedback is a copy box:** the header button opens an anchored
popover — selectable address + copy button, mailto as secondary inside
it; claim pages (pinned script-free) use a pure `<details>` popover with
a select-all address and the mailto secondary. Nothing auto-launches.

**4 — proximity:** confirms now render ANCHORED to the asking control
(rect captured from the focused button at ask time; the old panel slot is
the no-rect fallback); autosave failure surfaces in a popover AT the save
cluster with the download action. **Audit of remaining distant surfaces
(reported, not silently fixed):** run()'s success notices and the
rules-refusal banner still render at the sidebar top — for Move-tab
actions that is above the trigger; AddClaim's own refusals are already
inline under its form; parking import results render in the topic panel.
Operator call on whether the sidebar-top notice/rejection area moves too.

**5 — rejected withdrawals render permanently (2.98b DoD-8).** Root
causes found: the History tab fetched once per claim id and never
re-fetched after an adjudication (stale display while the log
remembered), and LIBRARY-scope withdrawal events carry no claim_id so no
claim's history ever listed them. Fixed: history re-fetches on every
claim reload; claimHistory folds library-scope proposals/rejections into
every holding claim; hydrate() derives per-source `rejected_withdrawals`
(proposer from the filing event, adjudicator from the rejection event,
reasons, timestamps) from the event log; the source row carries the
compact expandable "withdrawal rejected — attempt on record" marker; the
History count includes attempts. Pinned E4, both scopes.

**6 — autosave bug + surfacing.** The crash ("dt.current.write is not a
function") was the app calling `.write()` on the autosaver, which was a
bare function — the browser-fallback path died on its first change and
only the corner banner knew. Superseded by the punch-8 engine (below);
regression pinned: the old wiring is gone, the engine is the one save
path, and the fallback write path has its own test now.

**7 — header layout:** clustered — [indicator · what differs · view
canonical], [depth · time], [persona + caption], [save status + actions +
both save popovers], feedback at the right edge. No control removed.

**8 — save first, parity split.** `makeSaveEngine` splits autosave's two
jobs: JOB 1, the browser-storage mirror, writes on EVERY change in EVERY
browser (Chromium included — revoked-handle protection; resume offered on
return, never auto-imported; the mirror is never the resting place — the
file is). JOB 2 keeps the file current per mode: 'file' (FSA, silent
debounced 1.5s), 'download' (chosen not imposed; batched ~12s so a burst
yields one download; numbered-copies trade-off disclosed at the choice),
'manual' (staleness badge "file N changes behind", one-click update, exit
nudge when behind). Setup opens with a REAL save — picker or download —
autosave maintains, never originates; skip stays available with the
mirror still protecting. Equal-dignity labels ("autosaving to
{filename}" / "autosaving to Downloads" / "protected in-browser — file N
changes behind"); deficiency framing removed and pinned absent. Pinned
E2: mirror both classes, batching, staleness accuracy, revoked-handle
fallback without loss, visible failure.

**9 — sandbox claim pages: generated, session-scoped, honestly
unshareable** (corrects the prior misreading — the page exists as part of
the sandbox experience; only the PUBLIC address waits for multiplayer).
`GET /sandbox/:sid/claim/:id` renders the standard article page from the
COPY's data — every claim in the copy gets one, including the copy's
versions of canonical claims (a diverged #1 shows the visitor's rejected
withdrawal; public /claim/1 stays canon). All existing page rules apply
(light/pastel, record-only, script-free, status-inseparable header) plus:
the honest banner ("This page renders your private copy — visible in this
browser session only, not shareable. A public address arrives when this
claim is imported at multiplayer."), NO share metadata (no canonical/OG/
twitter — nothing implies a usable public link; robots noindex), every
internal link (related claims, time-machine stops, back-to-now)
session-scoped via a basePath thread through the renderer, and
Cache-Control no-store. The in-engine affordance routes EVERY claim to a
live page: canonical undiverged → public page; copy-only (id past the
canonical baseline) or diverged (claim ids on the copy's post-baseline
events) → the session page, labeled "session page ↗" with the honest
hint. Expired/unknown sessions answer a styled 410 naming the TTL wipe
with a way back; the public /claim not-found is now a styled,
blocker-naming page (never the bare "No such claim." string) that says
where a missing id could live. Pinned G1–G3; verified live on the built
package.

**10 — save preferences ride the file; resume re-prompts nothing the
browser doesn't mandate.** The save gains an optional `preferences` block
(`{autosave_mode: 'file'|'download'|'manual', setup_complete}`), composed
client-side by `decorateSave` (the file, the mirror, and the manual
download are ONE artifact); v1 files without it import unchanged. Resume:
restore record AND preferences; the pure `resumePlan` decides the single
browser-mandated prompt, if any — non-FSA modes restore fully silently;
Chromium's file handle persists in IndexedDB beside the mirror (handles
are structured-cloneable; localStorage can't hold them) and reconnects
with at most the browser's one-tap permission confirm, surfaced with its
one-line why; a missing handle asks exactly one "pick where" with the
why (browsers cannot carry handles in files). A file-mode save opened on
a non-FSA browser restores as 'manual' (same file kept current by
one-click updates — recorded decision, no dead mode). Declining resume =
fresh visitor. Pinned H10.

**11 — the voluntary save-contribution ask.** One consistent line
(operator's copy verbatim) at the save-setup prompt, the README, and the
save moments — dismissible, once per session, never gating; no endpoint
exists and nothing sends automatically; the README adds the true-scope
caveat (read by the operator; no response guaranteed). Pinned H11.

**12 — the refusals log rides the save.** A thin client-side recorder
(`client/src/refusalLog.js`): rules refusals are recorded at the ONE HTTP
funnel (api.js's 422 path — no component can render a refusal the ledger
missed) with `{when, action, target, persona, source:'rules',
blocker_code, blocker_text, inputs_as_submitted}`; client-side blocks
(the scrubbed-view write guard) record with `source:'client'`. The ledger
rides `decorateSave` and the mirror; import/resume seeds it and
ACCUMULATES across sessions. Zero server involvement; the read-it-first
line covers consent. Pinned H12.

**13 — proposed-vs-landed in the creation event.** `createClaim` accepts
the author's original `proposed_tier` (AddClaim carries it on earned-tier
resubmits); when it differs from the landed tier, the rules compute
`floors_failed` at submit and the claim_created event detail carries
`{proposed_tier, landed_tier, floors_failed}`; claimHistory renders
"Author proposed middle; floors placed outer." — the failed-promotions
house pattern — so panel and page show it, and it rides every save for
free. No-delta creations keep the plain detail unchanged. Pinned H13;
verified live.

**14 — session lineage.** The save's `session` block:
`{started_at, resumed_from: {saved_at, fingerprint} | null}` — fresh
copies start the arc, resume/import name the ancestor (FNV-1a fingerprint
of the record). A contributed save reads as an arc, not a snapshot.
Pinned H14. (Strain flags deliberately NOT built — recorded as
proving-grounds kickoff input alongside the notes below.)

**Verify-and-report (b — silent zero):** confirmed and reported, not
fixed. With direction help/harm and `evidenced`, an out-of-range
magnitude refuses loudly ("Vertical magnitude must be 1, 2, or 3."); a
directional-but-unevidenced vertical refuses loudly too ("requires
documented outcomes"). But with direction NEUTRAL, `normVertical` forces
magnitude to 0 SILENTLY — the operator's harm/10000000 landing as
neutral/0 means the submitted path was (or was normalized through) the
neutral branch: a refusal without a named blocker, exactly as the punch
suspected. The magnitude field also stays enabled while direction is
neutral. Recorded for the 2.99b kickoff; nothing changed.

**Verify-and-report (c — topic-shape gate scope):** confirmed —
`topicShapeFailures(name)` checks the NAME only; `createTopic` never
passes the description through any gate, so a claim-shaped description
("The engine proves to be auditable…") passes untouched. The description
loophole is recorded for the 2.99b kickoff, not fixed here.

**Verify-and-report (magnitude, NOT fixed per instruction):** the rules
layer DOES refuse out-of-range magnitude when the vertical is directional
and evidenced — refusal text: "Vertical magnitude must be 1, 2, or 3."
(both at claim creation and setVertical). With direction NEUTRAL, the
typed magnitude is normalized to 0 and never persists — the FIELD
accepted "10000000" but the record never did. If a directional submit
appeared to accept it, that would be a bug; it could not be reproduced —
the likely lived case was the neutral path. Reported; nothing changed.

## 3.2n Anonymous drop box (2026-08-02, dropbox handoff)

**The strain-return quarantine inbox has its durable home on the SITE
infrastructure** — a Netlify Function + Netlify Blobs on thetruthonion.org
(the operator's site account), never the disposable demo host, never the
app database (standing constraint satisfied). Contribution no longer taxes
identity as its price.

**The Function** (`netlify/functions/dropbox.mjs`, in the SITE repo — a
separate tree from this repository, deployed to Netlify):
one POST endpoint (`/api/dropbox`) accepting save-file contributions
(`{kind:'save', save}`, format-sniffed, ≤10 MB) and anonymous feedback
(`{kind:'feedback', category ∈ enum, message ≤2000}`, ≤4 KB), plus the
urlencoded path for the script-free claim pages' plain HTML form (a
cross-origin form POST needs no script and no CORS). Refusals name
blockers. Storage is APPEND-ONLY, PAYLOAD-ONLY: object key = timestamp +
content hash; no IP, UA, or headers ever written (the throttle reads the
IP in memory and discards it) — pinned by `test/dropbox.test.mjs` (6
tests, D2 is the payload-only pin). Honest defense posture stated in the
source and pinned: free-tier Netlify has no real edge rate limiting, so
size caps + schema validation are the primary defenses with best-effort
per-instance throttling. Receipt DECIDED AT BUILD: included — the content
hash returns, so a contributor can later prove inclusion without
identity. CORS `*` (anonymous by design). Deploy notes in
`README-DEPLOY.md`: needs a build step (git-connect or `netlify deploy
--prod --build`) — drag-and-drop won't bundle `@netlify/blobs`; the
OPERATOR deploys from the Netlify account.

**Demo-side UI:** the anonymous feedback box RETURNS as the primary path
(header popover: category + message, "exactly this is sent — no identity,
no account", engine-never-reads-it and volume-is-a-prompt lines restored —
true again because durable storage exists), email inside as the
if-you'd-like-a-reply option. "Contribute save" lives in the save cluster:
shows what will be sent (the file, nothing else), offers
download-to-review-first, sends, shows the receipt. Unreachable endpoint
(site down, box not yet deployed) → said plainly with the email fallback —
never a silent failure, never a fake success (pinned I1). Claim pages
carry the plain-form drop box with the same copy; mailto stays secondary.
Item-11 copy updated everywhere (ask, README): drop box primary.
**Anonymity copy rule pinned:** "we don't ask who you are and don't retain
anything that says" — never "untraceable/invisible" (source scan, I1).

**Rider C — the silent vertical zero, manners fixed (rule unchanged):**
when a submission carries vertical input the rules will not record
(neutral direction + typed magnitude), createClaim and setVertical
responses carry `vertical_notice` ("Outcome direction/magnitude not
recorded — no documented outcome evidence attached; the axis stays empty
rather than guessed.") surfaced as a non-blocking notice at submit; the
AddClaim magnitude field now DISABLES visibly with the same why while
direction is neutral (it used to hide, letting a stale typed value ride a
neutral submission into the silent zero — the operator's lived case).
Directional refusals unchanged and still loud. Pinned I2. (The
description-gate loophole is NOT here — canonical topics' own
descriptions are legitimate prose containing assertions; gating them
needs real design; recorded for 2.99c.)

**C2 — site numbers:** `whats-built.html` refreshed from the current
build (276→ now 278 at commit time — see the rule) and restructured: one
`<!-- BUILD-NUMBERS -->` block holds the headline + rows, refreshed as
one obvious edit from the shipped build's `npm test` report on deploy
day; no number on the site may exceed what the shipped suites report;
release checklist item-7 includes eyeballing live-site-vs-live-demo.
**Reported, not rewritten:** the site's "Designed, not built" section
still lists kernel links and the time machine, which are long since
built — operator prose, flagged for the deploy-day pass rather than
edited unprompted.

**Launch interaction (restated):** the license remains the only launch
gate; if the site Function isn't deployed by launch, the demo panels
already say so honestly and fall back to email, and the drop box follows
by site redeploy — the two deploys are independent by design.

### 3.2n-i — correction: the save-file upload panel did not exist (UI fix, 2026-08-09)

The paragraph above reported a save-file upload path; the operator — the
verifier — found on 2026-08-09 that no drop-or-pick upload panel existed
anywhere in the demo app. What actually existed: the header feedback
popover (wired, honest states) and a "contribute save" button that only
renders inside the save cluster AFTER a visitor has created a private copy
(`demo && sbx.sid`), and sends the current copy — not a picked file. A
session report is a restatement of the claim, not evidence for it.

Built this session, per the operator's placement ruling (2026-08-09):
- **One main-page surface** — the header button is now "✉ contribute /
  feedback"; its popover carries the anonymous feedback form AND the
  save-file path: drop or pick a file, parsed through
  `parseSaveFileText(text)` in `client/src/dropbox.js` — the funnel takes
  the file's TEXT alone, so filename/size/metadata structurally cannot
  enter the payload (`{kind:'save', save}` and nothing else, pinned
  stage299a I3). Parse failures name the blocker and say nothing was
  sent; unreachable endpoint states it plainly with the email fallback
  (pinned I4). The save-cluster "contribute save" affordance is kept.
- **Email correction sweep (operator decision):** every render surface
  showing the old gmail address now shows contact@thetruthonion.org —
  `client/src/dropbox.js` (FEEDBACK_EMAIL), `server/claimpages.js`
  (FEEDBACK_ADDRESS), `client/src/sandboxState.js` (CONTRIBUTION_ASK),
  README.md, this file's §3.2m mailto note, and the address pins in
  stage298/stage299a suites. Git commit identity untouched (stays the
  Onionwright noreply configuration).
- Verified in the running dev build: popover renders on the main page,
  bad file → named refusal, good file → ready state with local-only
  filename; send not exercised against the live endpoint (wire shape
  pinned by test instead).
- **Correction, same day:** the operator booted the demo and saw no
  change — the demo runs the BUILT package under `demo/`, and the session
  had changed source without rerunning `npm run build-demo`. Rebuilt
  (after killing a stale node process holding the known `demo/` lock) and
  re-verified against the demo package itself on :3199: combined surface,
  upload section, corrected address; old address absent from `demo/app`.
  Session rule going forward: a UI change isn't demo-visible until
  build-demo runs — rebuild before reporting.

## 3.2o Stage 2.99b — kind adjudication & the recast relation (2026-08-02)

**Decision re-recorded (operator, 2026-08-02, so it isn't relitigated):
the metaphysical gate stands unchanged.** The kind gate is a resolvability
test on individual claims, not a topic ban — disclosure-era claims are
almost entirely empirical under the existing definition and route on-axis
already. A "metaphysical-with-evidence" ring category was considered and
DECLINED: any claim the tool's evidence types can touch is by definition
empirical, so the category admits nothing new — and it would re-open the
asymmetry the gate exists to prevent.

**Part 1 — kind_mismatch (built, pinned).** The routing decision becomes
contestable; nothing else can move kind. Schema v6: claims gain
`kind_proposed_at/to/reason` + `recast_of`; the challenges type CHECK
gains 'kind_mismatch' via an in-place table rebuild (rows verbatim, ids
preserved; migration idempotent — the live DB migrates at its next boot).
Two-phase like withdrawal: file with the mandatory resolvability argument
(the standard is IN the refusal and the UI copy: could the tool's
evidence types bear on this exact sentence, in either direction — not
whether such evidence exists, whether it could); zero effect pending;
rejected → permanent challenge row + events. Upheld:
- off-axis → on-axis: enters at exactly `earnedTier()` over its attached
  evidence — no free inward movement; the placement reason states the
  route and that the battery still rules (launder pinned K1: the pushed
  recategorized claim refuses core/inner/middle on zero-weight sources).
- on-axis → off-axis: tier/vertical cleared; kernel links severed FIRST
  (tier triggers would abort the update; gap statements retained in
  events), support links end through removeSupport with logged
  `support_link_removed` per link; dependents re-evaluate in the SAME
  transaction via reevaluateClaim (K2). **Reported nuance, not fudged:**
  support links carry zero placement weight by design, so severance alone
  cannot demote a dependent whose own sources earn its tier — the
  transactional re-evaluation is the discipline, and it demotes exactly
  what genuinely fails (the kickoff's "assert it demoted" is unreachable
  by construction because no claim can ever sit where its own sources
  don't put it; stated here rather than manufactured in a test).
- empirical ↔ historical: kind corrects in place, tier untouched.
- **New event type `kind_changed`** (from/to + adjudication reason) —
  stated per the kickoff's latitude; proposal/rejection get
  `kind_challenge_proposed`/`kind_challenge_rejected`; claimHistory and
  pages render the lifecycle; replay reconstructs it (K5).
- No other mover: direct PATCH/PUT with kind → `kind_immutable` refusal
  naming the honest path; the single-shot challenge path refuses the type
  with the two-phase pointer (K3). Persona gates + proposer-never-upholds
  apply to kind adjudication; retraction of one's own permitted (K6).
  Honest cost stated: adjudication quality is now epistemically
  load-bearing; the single-curator line renders on kind adjudications.

**Part 2 — recast_of (built, pinned).** A zero-weight claim→claim
relation set at creation only: an on-axis claim naming the OFF-AXIS claim
it deliberately rewords. Validated (original must be off-axis; the recast
must not be metaphysical); zero weight both directions pinned (R1): the
recast cannot cite the original as support, and the original's standing
never moves with the recast's fate — a recast landing Core does not
vindicate it, one landing Outermost does not refute it (the strawman
shield, demoted-recast test). Displayed on both pages ("Empirical recast
of: …" / "Evidence-eligible rewordings of this off-axis claim: … →
tier/status") and in the off-axis tab; AddClaim gains the optional
picker; UI copy states the Part 1/Part 2 distinction (the challenge never
rewords; the recast never recategorizes). Honest cost accepted and
stated: a visible revival template, fully accountable to the evidence
axis — strictly better than unrecorded recasting. Saves round-trip both
new columns (R2).

**Part 3 — UAP topic: DRAFTED, NOT SEEDED.** Per the kickoff's own
division of labor (operator locates and verifies every source; Claude
Code invents nothing), no source could be verified in this build session,
so nothing entered the seed. The full claim skeleton is archived in the
build supervision workstream for the operator's verification pass: split-claim
discipline throughout (testified-that vs. is-true), candidate primary
documents flagged UNVERIFIED, the Bennewitz disinformation counter-layer,
the recast pair (off-axis "supernatural beings" ↔ historical
"angels-were-extraterrestrials" via recast_of), rule-11 flags on living
persons, and the 4+ strain targets (DOPSR clearance, uninspectable
classified documents, release-proves-what, leaked-footage provenance).
**R1 still reads "the curated three"** — it amends to four in the same
change that seeds the verified topic; strain entries log from the actual
build, not from the sketch. DoD items 6–8 therefore await the operator's
source-verification session; items 1–5 and 9 are done.

### 3.2o-i — the UAP topic SEEDED (operator go, 2026-08-02/03)

**R1 IS AMENDED: the demo ships the curated FOUR** — the operator
confirmed the verified source ledger and directed the seed. Built as
`server/seed-uap.js`, seeded through the SAME service layer as every
topic (11 claims, 20 sources), into: (1) `seed()` for fresh engines,
(2) the LIVE record through the rules layer with actor
`claude (2.99b seeding)` (16 events, topic id 7 — ids 34–44), and
(3) the re-exported curated fixture (4 topics, 42 claims, 28 events;
topic-id gap 4–6 is the curation, visible, never compacted). Double-seed
determinism holds; residue scan, R1/R4, history spans/actors/ids, and
the entry-card/README/site copy all updated to four.

**The build's own honesty artifacts:**
- **The rules refused the builder** — the AARO claim was proposed at Core
  and refused live ("Core requires at least two independent primary
  documents; this claim has 1"); it sits at inner with the refusal in its
  placement reason. Logged as strain Entry 12.
- **The split-claim rule made mechanical:** the GPO transcript sources
  ONLY the testimony-occurred claim; the retrieval-program claim (outer)
  gets a zero-weight support link from it instead of a weight-carrying
  source, plus AARO's finding attached as contradicts. Strain Entry 8.
- **The recast pair is live:** off-axis #43 ("supernatural beings") ↔
  historical recast #44 ("angels were extraterrestrial visitors"),
  linked recast_of, with the disclosure chain drawn (#40 outer supports
  #44 outer) — and promotion of the recast inward refused, pinned.
- **Claim 9 selection (operator-swappable, flagged):** the outermost
  debunked specific is the metal-sample claim — chosen because its
  contradicting primary record (AARO's ordinary-and-terrestrial
  assessment) was already in the verified ledger; demoted through the
  real debunker flow with a kernel fan to the AARO claim (#42 ← #36).
- **Strains logged from the actual build: Entries 7–12** (DOPSR
  clearance vs. review-as-true; testimony of uninspectable content;
  release-proves-what + domain migration; offline sources/provenance —
  new PRINT/FILM/CLASS_WORKS honest labels added; venue-vs-method;
  self-describing record capped below Core). Six entries against the 4+
  target; the taxonomy itself untouched.
- **Archive captures (mandatory for .gov):** Save Page Now accepted for
  the PL 117-263 PDF, the GovInfo record, and the GPO transcript;
  existing Wayback captures confirmed for the war.gov release statement
  (2026-07), the ORIGINAL defense.gov URL (2025-08 — pre-migration), the
  Congress.gov event page, and DD-3212. NAVAIR's FOIA reading room
  refused SPN (520, dynamic page) and has no capture — reported, not
  papered over; the release statement itself carries the substantive
  load and is captured on both domains.
- **Boot-crash class CLOSED (bit twice):** seed-uap.js was initially
  missing from build-demo's fixed copy list — the same failure as the
  original fetch-proxy incident. Fixed, and now pinned by R11: the
  release suite walks the local-import closure of the shipped file list,
  so a new import in a shipped module fails the suite instead of
  crashing the package on boot.
- Sourcelinks gained the 13 UAP url-entries (curator-verified chips
  derive; verification record: web-verified 2026-08-02,
  operator-confirmed) and the three offline labels.

## 3.2p Stage 2.99b-2 — the AI-evaluation FIFTH topic, SHIPPED (2026-08-09)

**Supersession stated (operator decision, 2026-08-09, from the 2.99b-2
kickoff): T2 (ship vs live-only) is answered — SHIP.** This supersedes the
reconciliation ruling of 2026-08-08 that the AI-evaluation topic runs as a
live-only strain mini-build and that the seed stays the curated four.
**Release pin R1 amends a SECOND time: the shipped seed is the curated
FIVE** — MKUltra, COINTELPRO, Replication Crisis, UAP, AI Evaluation. The
named costs (second R1 amendment, extended residue scan, double-seed
determinism, release-suite extension, operator source verification on the
release path) were accepted on the record by the operator. The set-aside
topics stay dropped.

**Operator decisions at session start (recorded in the operator-verified
sources ledger, archived in the build supervision workstream):**
the full 24-entry sources ledger confirmed 2026-08-09 including every
operator-only check (GPT-5 system card PDF opened — third-party section
names METR; Stochastic Parrots §6.1 read off the ACM PDF and deliberately
NOT transcribed, so no surface carries that quote; the CanLII decision
opened, order text supplied verbatim: "…pay Mr. Moffatt a total of
$812.02"); **ALL EIGHT claim shapes seed** (supersedes the kickoff's
proposed seed/probe split — shapes 4–6 carry verified documents, so they
seed and their breaks journal from real claims); **Moffatt v. Air Canada
included** as the genre's first true court_record source.

**Built:** `server/seed-aieval.js` (19 claims through the service layer:
4 core · 10 inner · 1 outer · 1 outermost via the real debunker flow with
its kernel fan · 1 off-axis metaphysical · 1 recast via `recast_of` —
first use outside UAP; verticals harm 3/2/1 on the documented-harm
claims), wired into `seed()` and build-demo's ship list (R11 covered).
Citation strings live ONCE in `sourcelinks.js` (`AIEVAL_SOURCES`,
26 url-entries) and the seed imports them — the seeded citation and the
audit mapping are structurally the same string. Seeded into: (1) `seed()`
for fresh engines, (2) the LIVE record through the rules layer, actor
`claude (2.99b-2 seeding)` (topic id 8, claims 45–63, events 30–50, plus
event 51 — see below), (3) the re-exported curated fixture (5 topics,
61 claims, 91 sources, 50 events; topic-id gap 4–6 and event-id gap 10
honest, never compacted). Double-seed determinism holds; residue scan
clean; zero U+FFFD in the shipped seed (the 15 pre-existing curl-era live
rows repair at export, as before).

**The build's own honesty artifacts:**
- **The rules refused the builder twice, live.** (1) The seed's planned
  zero-weight support link (survey → expectation, the Entry 8 pattern)
  was refused: kernel and support links are mutually exclusive per pair,
  and the debunker flow had drawn the kernel — the kernel carries the
  relation; refusal kept in the module comments and Entry 19. (2) The
  shape-7 probe, run deliberately on the live record: promotion of the
  debunked expectation claim toward middle with the 2,778-researcher
  survey attached — REFUSED ("…this claim has none that carry weight"),
  a permanent `promotion_failed` event (id 51) that SHIPS in the fixture
  (pinned in H7). Headcount moved nothing; invariant 6 held mechanically.
- **A real bug, found by growth and fixed:** `express.json()`'s default
  100kb body cap sat silently below the sandbox's designed 8 MB per-copy
  size cap — the five-topic save file crossed 100kb and save re-import
  broke (caught by D1/H10/H14 going red). Fixed: parser limit 10mb,
  ABOVE the sandbox cap, with the why in the code — the cap that refuses
  oversized work is the sandbox's own, with its honest message, never
  the parser's.
- **Split-claim discipline throughout:** the system-card content
  universes ("the model would actually do this") are deliberately NOT
  seeded — no independent evidence type can exist for an unrerunnable
  internal scenario (Entry 15); "the card states X" claims cap at inner
  per the Entry 12 ceiling, met again in this genre.
- **D3 disclosure honored:** shape 3 seeds one Anthropic and one OpenAI
  system card so the record leans on neither developer alone; the topic
  description names the disclosure.
- **Archive captures: every ledger URL has a Wayback snapshot.** All
  mandatory ones confirmed (both www-cdn hash PDFs, the o1 cdn PDF, the
  living deprecations page 2026-08-04, aisi.gov.uk 2025-08-27), fresh SPN
  triggered where accepted (Opus 4 card 2026-08-07); METR's existing
  2026-07-19 capture surfaced by SPN redirect; even robots-walled CanLII
  has a 2026-08-01 capture. SPN rate-limited (429) part-way — no capture
  is missing, so nothing was papered over.
- **Strain journal Entries 13–20 appended** (third genre), one per shape
  incl. the shape-1 NO-STRAIN control, the relation gap (a validity
  critique can neither support nor contradict the score it bears on),
  the self-published-only primary record at maximum, the retired
  artifact, the contested predicate + venue asymmetry, recast predicate
  discipline, the survey probe, and harm-magnitude-as-judgment.

**Pins amended, never silently:** release R1 (curated FIVE, both
amendments cited), R4 (+ kernel [60,59]), history H6 (+ the 2.99b-2
actor), H7 (curated FIVE, event ids 1–51 minus 10, event 51 is the
refusal probe), H3b (+ topic 8 span), stage299a C3 (+ actor) and the
entry-card copy pin ("five documented topics"); App.jsx entry card,
README (five topics), export-history default names, and the site's
whats-built.html (Five complete topics + AI Evaluation card; the site's
test number stays for the deploy-day C2 refresh). Suite green at close:
289 passing across twenty-one suites, totals in the table below
(unchanged in count — amendments landed in existing pins).

**Reported, not verified.** The operator verification set for launch now
runs against FIVE topics — gate (a) extends to this topic's source-ledger
click-through (already performed pre-seed 2026-08-09; the launch-gate
click-through against the HOSTED build remains).

**Test suites (289 passing; + 6 drop-box pins in the site repo).**

| Suite | Tests | Covers |
|---|---|---|
| `dod` | 14 | The six Stage One definition-of-done criteria |
| `pressure` | 10 | Tier laundering, zero-weight aggregation, circular support |
| `stage2` | 8 | Cross-topic constraints and cycles, dial independence |
| `stage25` | 11 | Library ripple, parking isolation, origin zero-weight, export/import |
| `stage29` | 28 | Kernel links, lineages, whole-vs-broken boundary, narration, events |
| `stage29b` | 11 | Interaction supersession, tile-size discipline, outcome latitude, stagger |
| `stage29c` | 9 | Tier tokens single-source, kind/tier separation, lexical-only search |
| `stage29d` | 15 | Per-adapter key privacy, card round-trip, UI prefs, topic gate, FTS search |
| `stage29e` | 8 | Real-event stages, stage-named errors, no pre-gate render, honest reasoning |
| `stage295` | 9 | Replay reconstruction, supersession legibility, read-only pin, epoch honesty |
| `stage296` | 6 | Tour completeness, grounded narration refusal, keyless honesty, key phrasing |
| `stage297` | 15 | Device-only demo parking, v1+v2 lossless export, park-in-place, live-resolve resume, parking-only import, confirm-before-mutate |
| `stage298` | 14 | Status-carrying pages + share cards, record-only render, stable URLs, document correction, hero + logo, on-page time machine, review socket, feedback quarantine |
| `stage298b` | 15 | Recorded withdrawal (reason gate, 405s, schema backstop), two-phase propose/adjudicate (zero effect before adjudication, rejected attempts permanent, lifecycle replay), diminished render, adjudication-only link ends, gap retention, severance logging, affordance inventory, Withdrawal dropdown, seed source-link lint |
| `demo` | 5 | Read-only enforcement, zero residue, fetch proxy absent |
| `companion` | 40 | Grounding, isolation, fidelity, keys, tools, search, storage |
| `fetchproxy` | 14 | SSRF guard, mechanical check, shell detection, browser fallback |
| `release` | 12 | Seed curation, zero-U+FFFD + charset pins, showcase message both layers, proxy-path enumeration closed, verification labels, rate-limit families, deploy gate + no-volume |
| `history` | 8 | Restore-is-the-fixture (double rebuild), no build-day stamping, recorded epoch + derived/actor-null, per-topic spans incl. RC pre-creation, disclosed corrections, withdrawal restoration, identity bar, curation boundary |
| `stage299a` | 29 | Drop-box UI-fix pins (payload-only upload funnel I3, unreachable fallback I4), sandbox isolation + reads-create-nothing crawl, honest cap/TTL/size refusals + wipe, same-code-path refusal sampler (structure + behavior), persona gates + proposer-never-upholds + multi-actor replay + honesty labels, save round-trip, indicator/save-engine pure logic (mirror both classes, batching, staleness, revoked-handle fallback), api-funnel first-write end-to-end (punch 1), rejected-withdrawal permanence both scopes (punch 5), doors-not-teaching card + no-fog no-guarantee copy, canonical-only pages + impermanence line |
| `stage299b` | 8 | Kind adjudication: launder refused (earned tier only), on→off severance + transactional ripple with gap retention, no-other-mover (direct edit + single-shot both refused), rejected-persists-zero-effect, kind_changed lifecycle replay, persona/proposer gates; recast_of: creation validation, zero weight both directions + strawman shield, both-page display, save round-trip |

**Content.** MKUltra (12 claims), COINTELPRO (9), The Replication Crisis (10,
hand-built and committed as an export), UAP (11), AI Evaluation (19), Purdue
Pharma & the Sacklers (2, live-only), The Epstein Case (0 — created, empty,
live-only).

---

## 3.2q Public-tree removal session (2026-08-11, second session that date)

Per the operator ruling at reconciliation 2026-08-11 — anything in the public
repo that is not part of the live demo / public release is removed — the full
tree was walked three ways (ship/reference inventory, check against the
record, reference safety) and three files came out of HEAD, history untouched:

- `exports/the-epstein-case-prosecution-files-and-release.json` — the ruled
  removal, confirmed an empty scaffold (zero sources, claims, supports,
  parked); its title names a topic excluded until the living-people bar lands.
- `.claude/launch.json` — machine-specific dev launch config (Windows cmd,
  hardcoded paths); the same machine-local category the repo gitignores
  elsewhere; nothing ships or references it.
- `truth-onion-post-release-design-capture.md` — supervision-workstream
  working context; the repo copy was a stale snapshot (the document-tree
  master has since gained the proposer-never-upholds section this copy
  lacked); it cites a companion note not present in the repo. The status
  paragraph's "post-release design capture Amendment A" citation now resolves
  in the workstream tree only — the same class as the §9b/§12c citations,
  documented in §8.

*[Superseded by §3.2r, 2026-08-11 — the committed kickoff/spec/addendum/audit
documents described below came OUT of HEAD in the doc-removal session. The
paragraph is kept because its reasoning is the record of why they were kept
first. It does not govern.]*

Everything else superficially unreferenced was kept, with reasons: the
committed kickoff/spec/addendum/audit/draft documents were committed
deliberately at release prep "so § citations resolve" (§3.2k 0c), and shipped
code comments and tests cite them stage by stage; `exports/
the-replication-crisis.json` is the versioned fixture the shipped curated
seed was built from (§3.2k 0a); `CLAUDE.md` declares itself public and
governs repo sessions.

**Correction, found by the baseline run (the verification rule proving
itself):** the suite was NOT green at the head this session inherited.
stage299a H11 asserts the README's drop-box ask; the approved truth-forward
README replacement reworded that ask, the replacing session never ran the
suite, and H11 stood red behind a green-believed record from that commit
until this session's pre-removal baseline caught it. The test's expectations
are re-pinned to the approved wording (emphasis markers and line wrap
stripped as presentation); the README itself did not move — it is the
operator-approved text. Suite counts are unchanged.

**Stray, not acted on at the time:** `package-lock.json` never picked up the
`engines`/`license` fields added to `package.json` at the signpost-fix commit;
any `npm install` regenerates it with npm-version-dependent churn attached, so
the sync was left to the operator's machine rather than committed from a
different npm.
*[Superseded 2026-08-11: done. Synced on the operator's machine and pushed as
its own commit, `f05f82c` — exactly four insertions, no unrelated churn,
audited from an independent fresh clone. It was deliberately NOT ridden into
the removal push, so that removal's diff stayed readable in one glance.]*

**Flag for the operator (kept, not removed — flag-the-tension):** the record
points two ways on the committed kickoffs. This document's §3.2k says all
kickoff/spec/addendum docs were committed so § citations resolve;
`CLAUDE.md` says kickoff documents live in the build supervision workstream,
not in this repository; and the in-repo set is partial either way (stage two,
2.5, 2.75, 2.8, 2.9d, 2.99a, 2.99b, 2.99b-2 kickoffs were never committed).
Either the committed set is release material and the gaps are a traceability
hole, or CLAUDE.md's line is the rule and the set is removable under this
same ruling. Operator's call; nothing removed on it this session.

*[Superseded, 2026-08-11: the flag above is resolved — flagging rather than
acting was correct then, and the operator has now ruled (fifth
reconciliation, 2026-08-11). CLAUDE.md's
line is the rule; the kept kickoff/spec/addendum/audit/draft/sources set
came out of HEAD in the next repo session (§3.2r). The "kept, with reasons"
paragraph above stays as what was decided then; it no longer governs. Also
corrected in this pass: the citation above originally read "§3.2k 0b" — the
committed-so-citations-resolve line sits under 0c (§3.2k carries the two as
one combined "0b/0c — repo" bullet), and 0b, the repo-goes-public
resolution, is the decision carrying operator attribution. He was never
asked whether the internal documents should ship.]*

Post-removal verification, reported not verified: full suite green at 289
tests across 21 suites; demo package rebuilt; booted
in-session serving exactly the five curated topics with mutations refused
(403) and the root page 200. Verification is the operator's boot and suite
run, plus a look at the repo tree on GitHub after push.

## 3.2r Repo document removal session (2026-08-11, third session that date)

**Operator ruling at the fifth reconciliation, 2026-08-11: the seventeen
internal working documents at the repository root — stage kickoffs, the spec
and its
addendum, two stage addenda, the source audit, the design brief, the topic
draft, and the verified-sources ledger — come out of HEAD.** They shipped
with the 2026-08-09 publication without anyone being asked whether they
should. The reasoning carried: a kickoff is a stage's *input*, this file is
the *record*; a kickoff goes stale the moment a build deviates and is never
corrected after, so shipping the set put permanently-stale material where an
outside reader meets it before the record. The stated commit rationale ("so
`§` citations resolve", §3.2k 0c) was empty — the `§` citations in shipped
code resolved to nothing anywhere — and the set was never applied evenly
(the stage two, 2.5, 2.75, 2.8, 2.9d, 2.99a, 2.99b and 2.99b-2 kickoffs
were never committed).

What was done, all from HEAD only — no history rewrite, no force, the
removed documents remain in history on the same accepted terms as §3.2q:

- **b-014 verified before anything moved:** the three documents that
  existed only in this repo (`truth-onion-design-brief.md`,
  `truth-onion-2-98b-source-audit.md`, `truth-onion-uap-topic-draft.md`)
  were operator-copied to the build workstream folder; this session
  hash-verified the copies byte-identical (SHA-256) before removal.
- **Seventeen documents `git rm`'d from HEAD** — the fourteen plain
  removals plus the three code-cited ones. The per-file reference table
  from the ruling verified exactly: no extra references, no
  missing paths.
- **The three citing comments repointed** at the build supervision
  workstream: `client/src/tokens.js` (design brief + 2.9c kickoff),
  `server/sourcelinks.js` (the 2.98b audit table, and the ai-eval ledger),
  `server/seed-aieval.js` (the ai-eval ledger). No comment in the kickoff's
  reference set points at a file that is not there — stated at that scope
  deliberately, because this same session found four sites the reference walk
  had missed (below), so a claim over all comments is not one this session
  earned.
- **The dangling `§` citations rewritten or removed.** Each now states the
  constraint it stood in for, or the stale marker is dropped where the
  comment already stated it; none were mapped into the 2.9d A–E scheme
  (that would fabricate a citation). Findings beyond the kickoff's walk,
  reported not absorbed: the same class existed in `server/index.js` (a
  "§4" logging citation), `client/src/styles.css` (two comment headers),
  `tests/stage29d.test.mjs` (one §11 note), plus `§2`/`§4` section numbers
  outside the kickoff's listed set; one §2 label sat in RENDERED UI text
  (the core-prompt hashline, now "the immutable core") and one §12d
  reference inside the Builder's shipped system prompt (now "these terms" —
  the terms are stated in the following clause). No test pinned either
  string. The only `§` left in code is real legal/document citations inside
  seeded source strings and one resolving pointer to this file's §6.
- **Corrections to this file:** §3.2q's "§3.2k 0b" miscitation corrected to
  0c, with the correction noted in the appended supersession — and a
  finding: §3.2k carries the two as ONE combined "0b/0c — repo" bullet,
  not separate lines. Supersessions appended (not rewritten) to §3.2k's
  0b/0c bullet and §3.2q's kept-paragraph and flag; the conventions
  "Section numbering" note replaced (nothing dangling remained IN CODE — the
  scope this session actually swept; this document's own citations were not
  swept until 2026-08-15); the §8
  traceability risk marked CLOSED per that section's own convention; repo
  `CLAUDE.md`'s scope line now states the rule plainly and carries the
  supersession.
- **Suite:** baseline before any change 289 passing / 0 failing across 21
  suites (green — unlike §3.2q's inherited red, nothing stood behind the
  record this time); post-change run identical, 289 / 0 across 21, exit 0.
  The unchanged count is the expected result and it is the result.
- **Head before: `f05f82c`** (confirmed against the kickoff before acting;
  tree clean). The removal commit is the head after — it carries this
  section, so its hash is stated in the session report and confirmed by
  the operator at b-015 (pull-and-push with the identity check).

Delivery on the no-token path: one commit, identity `Onionwright` /
GitHub-noreply checked before the commit; bundle
`truth-onion-doc-removal.bundle` (that exact name — b-015's paste block
depends on it) delivered to the build workstream folder.

Reported, not verified: verification is the operator's b-015 push, a look
at the repo tree on GitHub, and an independent boot and suite run.

---

## 6. What is pending

**Immediate (strain hunt, in flight).**
- **Entry 6 needs a correction appended.** It states "no headless browser
  needed — plain Node fetch defeats the 403." That was disproven on 2026-07-20:
  plain fetch defeats the *bot-block*, not *JavaScript rendering*, and the split
  runs through a single domain (justice.gov `criminal-vns` pages are
  server-rendered; `/archives/opa/pr/` releases are JS shells). Uncorrected, it
  will mislead the Stage 2.9 redesign.
- **Target #2, the civil settlement, is unblocked but not entered.** All nine
  candidate quotes now verify against live pages. Candidate A (DOJ federal
  civil, $2.8B FCA) and B (Sackler $225M, names living people — Rule 11) are
  the clean *settlement ≠ finding of fact* specimens; C (CA AG $6B) verified but
  is really the bankruptcy-releases target wearing a settlement coat. Awaiting
  operator claim text and source choice.
- **Six remaining strain targets** from the mini-build list.
- **Purdue claims #32/#33** sit at middle/contested, under-placed by three rings
  for the Entry 5 reason. Reaching core needs the filed plea agreement and
  Information off the docket — PACER remains unreachable.

**Stage 2.95 — the time machine — BUILT AND SHIPPED (§3.2f).** This entry is
kept because its reasoning is the record, and superseded because the stage
closed: `server/timemachine.js` is read-only by construction, the epoch is
first-class, and suite `stage295` (9 tests) is inside the 289. The two record
types it might have wanted — hash-supersession events and scope events (Legal
Amendments F/G) — still do NOT exist and were deliberately not invented; 2.95
scoped around their absence with `origin:'derived'` / `actor:null`, which is
the design decision this entry left open. *The absence is still a real
constraint on any later stage that wants replay to explain a hash change.*

**Stage 2.99c — the taxonomy redesign** (moved from 2.9 by operator decision
2026-07-27; last stage before multiplayer). *Numbering note: 2.99a, 2.99b and
2.99b-2 shipped under the 2.99 label as feature stages; the redesign this
entry describes is 2.99c, and `ROADMAP.md` entry 3 is its forward chain.* The
whole point of the strain journal, which now stands at twenty entries across
four genre sections — Replication Crisis 1–4, legal 5–6, UAP, and Entries
13–20 (§3.2p) — not the six across two this entry was written against. Not
started, and deliberately so: the taxonomy is revised **once**, never patched
piecemeal.

**Event-log audit findings (2.9, scope F).** Before this stage there was NO
general event log: placements/promotions/demotions lived only in the
challenges table (no actor anywhere), source attach/detach, library deletes,
and support link changes were recorded nowhere, and nothing carried an actor.
Closed in this schema pass with the append-only `events` table (UPDATE/DELETE
refused by trigger): claim_created, promotion, promotion_failed, demotion
(including ripple demotes with the library delete as reason), source_attached,
source_detached, library_source_deleted, support_link_added/removed,
kernel_link_created/removed, challenge_recorded, vertical_set, topic_created —
each with actor (default 'local' until multiplayer supplies real ones),
timestamp, and reason. **Added after this audit, and part of the current set:**
`withdrawal_proposed` and `withdrawal_rejected` (§3.2j Amendment A), and
`kind_changed`, `kind_challenge_proposed`, `kind_challenge_rejected` (§3.2o).
Known residual gaps, reported not papered over: support/kernel link removals
accept an omitted reason and record "no reason stated"; pre-2.9 history exists
only in the challenges table and cannot be back-filled honestly; **and no event
type exists for source-metadata correction, under which 38 live rows were
edited outside the log (§3.2j) — disclosed there and repeated here because a
residual-gap list that omits a gap is the defect this list exists to prevent.**

**Parked-note deletion stays unlogged — SETTLED (operator, 2.9b kickoff). Do
not re-decide it in any later stage** — the guard originally named 2.95, which
has since shipped; it binds 2.99c and Stage 3 the same way. The event log exists so the map can replay honestly;
a parked note has no tier, weight, or place on the rings and cannot affect
the map at any timestamp, so its deletion cannot make a replay dishonest.
Logging it would drag private scratch into a permanent record for zero
replay benefit. Trade-off stated: an unlogged deletion path exists, scoped
to data with zero epistemic standing.

**Seeding report (2.9b, scope D).** Kernel links now exist in the live DB
for every debunked (outermost) claim, authored through the rules layer, in
the event log with actor "claude (2.9b seeding)", and NOT removed (standing
rule): #11 (MKUltra) as a two-kernel fan — #1 existence, #2 exposure; #20
(COINTELPRO) as a two-kernel fan — #13 the program's documented disruption,
#17 the one documented death contribution (Hampton) that the claim
universalizes; #28 (Replication Crisis) → #22, the preregistered replication
projects. Claims with nothing to seed, reported not forced: the Epstein topic
has zero claims; Purdue's two claims sit at middle with no debunked tier.
KNOWN DEFECT awaiting operator-approved correction: the five gap statements
were posted via curl from a shell whose codepage mangled non-ASCII glyphs —
en-dashes and curly apostrophes are stored as U+FFFD (text otherwise
intact). There is no kernel-link update path by design, and the standing
rule forbids delete-and-recreate without approval; the proposed fix is a
same-content re-creation with correct encoding, on operator sign-off.

**Stage 3+ (designed, not built).** Multiplayer and adversarial review;
Matrix/Postgres split with canonical placement never living in the federated
layer; source capture + content hashing; pseudonymous identity;
the heightened evidence bar for claims about living, identifiable people — a
named gate that lands in `rules.js` by Stage 3 at the latest (until it ships,
a roadmap item, not a present-tense promise);
active-investigation mode; the spatial world. `DECISIONS.md` holds the one
design already settled: companion voice renders **once** on the owner's client
and transmits as audio, never re-rendered per listener.

---

## 7. Approaches tried and rejected

**Card content validation by string-matching.** Rejected on the no-content-policing ruling: the
mask lift already removes the card from analysis, so the check guarded nothing,
and a bypassable behavioral rule teaches evasion. Replaced by structural
absence.

**Retry-on-gate-failure, then bare analysis.** Rejected on the fidelity-gate ruling. Retrying a
persona render is a slot machine, and falling back to bare output makes the
character disappear exactly when the record is hardest. Replaced by one attempt
then automatic interleaved delivery.

**Declaring search tools alongside the OpenRouter web plugin.** Caused a live
`400: Tool names must be unique` — the plugin injects its own `web_search`.
Fixed two ways: a mode split (online mode ships the plugin and no search tools)
and a defensive `dedupeTools` in the provider layer. Both kept; the dedupe is
cheap insurance against a future provider doing the same thing.

**Client-side fetch for source verification.** Blocked by CORS on every
third-party page. Moved server-side.

**Believing the 403 was site policy.** `WebFetch` got 403 from justice.gov; a
plain Node server-side fetch got 200. The block was fetcher infrastructure, not
the site. Lesson retained in Entry 6.

**"Plain fetch is enough, no headless browser."** Held for two days, then
disproven — JS-rendered pages return 200 with an empty shell. Now: plain fetch
first, browser only on an unreadable shell or a bot-block status. The fast path
is pinned by a test (`B3`) so the browser never becomes the default.

**Playwright with a downloaded Chromium.** Rejected for weight. `puppeteer-core`
drives the machine's *already-installed* Edge (Chrome if present, `CHROME_PATH`
to override) — a small driver dependency and no browser binary in the tree.

**Treating an unreadable page as "quote not found."** A real defect, caught
before it corrupted the record: the proxy confidently reported that Perry's
verbatim DOJ quotes were absent from pages it had never actually read. This is
the same false-negative class as the companion "correcting" the true "36
victims" claim. Fixed with the tri-state (`quote_found: null`).

**Serving the fetch proxy in demo mode.** Originally made GET-only *so it would
pass* the read-only middleware. That reasoning was backwards and is now
reversed — see §8.

**(2.9) Letting a kernel link block promotion when the gap closes.** Rejected:
that would give a zero-weight annotation tier-moving power in the negative
direction. Replaced by sever-on-promotion, recorded with the move as reason.

**(2.9) Routing through claims that descend from the kernel but have no
relation to the outer claim.** Rejected: "related to the kernel" is not
"shares the lineage" — that path dresses a leap as a gentle slope using real
but irrelevant claims. Routes require a support chain that actually reaches
the outer claim; otherwise the break is drawn bare.

**(2.9) Return-home on every deselect.** Prototyped and rejected by feel —
jarring when reading neighboring claims in sequence. Kept as the Escape /
empty-click gesture instead (see §3.3).

**(2.9) Repainting shell textures per-frame for the contention pulse.**
Rejected for cost; the pulse is additive glow sprites animated in the render
loop over a static texture, so the resting sphere stays cheap.

**(2.9b) Voronoi full-surface tessellation.** Superseded, not merely
restyled: tiles that fill all available surface made every shell read as
uniformly "full" regardless of how much was actually claimed. Discrete tiles
with open space carry that information honestly.

**(2.9b) Lineage-draw on single-click, camera-framing the fan.** Superseded
by operator decision: select had become a loud gesture (clearing, reframing)
for the quietest intent (read one claim). The chain view moved to
double-click, and rotation — not camera flight — does the presenting.

**(2.9b) curl-from-bash for seeding non-ASCII content.** Rejected after it
mangled en-dashes/apostrophes into U+FFFD in five gap statements (see the
seeding report). Any future live-DB content write goes through a Node script
posting UTF-8 explicitly.

---

## 8. Open questions and risks

**No version control — CLOSED (release prep, 2026-08-01).** The repo is
initialized on `main` with a clean first commit (.gitignore in place before
it; no DB blob or secret staged — verified). The operator creates the
remote and pushes; credentials never pass through the agent.

**The `§` numbering points outside the repo — CLOSED (doc-removal session,
2026-08-11, §3.2r).** Comments across the companion cited `§9b`, `§11`,
`§12c`, `§13c`, `§14` as if they were durable references, but those documents
were pasted into chat and never saved. Resolved by the second of the two
paths this entry named: every citation converted to a self-describing
statement of its constraint (the save-into-the-repo path was superseded by
the same ruling that removed the committed documents from HEAD).
*Appended 2026-08-15:* that closure was true of code and tests and was read
as true of the tree. This document carried eleven of the same class until it
was swept on 2026-08-15. Closed for the document too as of that pass; the
scope of the 2026-08-11 closure is stated here so the next reader does not
inherit the wider reading.

**The taxonomy redesign has no scoped shape yet.** Six entries say *where* the
vocabulary strains; none of them proposes a replacement, correctly, since the
journal's discipline is log-don't-solve. But at some point that has to convert
into a design, and the conversion criteria ("enough genres") are not written
down anywhere.
*[Updated 2026-08-15: the journal now stands at twenty entries across four
genre sections (see the 2.99c entry in §6); the conversion criteria remain
unwritten, and by the entry's own terms are now overdue.]*

**Two-source Core may be miscalibrated — and it is NOT genre-specific.**
Entries 5 and 6 bottom out in the same place: an adjudicated federal
conviction earns `middle` because its only attachable source is an agency
page. **The same floor then fired outside the legal genre** — the AARO claim
in the UAP topic was refused live, *"Core requires at least two independent
primary documents; this claim has 1"*, logged as strain Entry 12 (§3.2o). At
least three instances across two genres. It may be a taxonomy gap, or it may
be that "two independent primary documents" is the wrong floor when the
primary document sits behind a paywall or an agency's own publication. **The
original disposition said "decide deliberately in 2.9"; 2.9 and five stages
after it have shipped and the risk is still open, so it belongs to the
taxonomy revision (2.99c, ROADMAP entry 3) with no further deferral.**

**Demo companion behavior with the proxy absent — CLOSED (release item 2).**
The showcase message ships in both layers (demo-flag short-circuit +
404 conversion); `fetch proxy error 404` can no longer reach a visitor.
See §3.2k.

**`puppeteer-core` requires a local Chrome or Edge.** Fine on Windows (Edge
ships with the OS) and on any dev machine; it would need an explicit Chromium in
a container. Nothing depends on it today outside the local engine, and failure
is graceful (inconclusive with a stated reason), but the dependency is real.

**Preview-harness sandboxing blocks the browser spawn.** When the dev server is
started through the agent preview harness, headless Edge cannot launch and
`/api/fetch` degrades to inconclusive. Started normally (`npm run dev`), it
works. Not a product bug, but it will confuse anyone debugging through that path.

### Corrected this session

I reported last turn that the demo package had been "rebuilt with all of it."
**That was wrong**, and verifying it for this document is how it surfaced.
`server/index.js` had gained top-level imports of `fetch-proxy.js` and
`browser-render.js`, but `scripts/build-demo.mjs` copies a fixed file list that
does not include them — so the built demo crashed on boot with
`ERR_MODULE_NOT_FOUND`. It had been broken since the proxy landed.

The fix addressed a second problem the first one exposed: `/api/fetch` is a GET,
so the demo's read-only middleware waved it straight through. A publicly hosted
showcase was therefore offering anonymous callers an open fetcher that could
spawn a headless browser per request — an abuse relay and a trivial resource
sink, with no demo benefit whatsoever. The route is now registered only when
`demo` is false, and both modules are imported lazily so the demo package need
not carry them. Pinned by `demo` tests D4 (absent in demo) and D5 (present in
the local engine). The rebuilt package boots, serves three topics, and answers
404 on `/api/fetch`.
*[Superseded on the count, 2026-08-15: "three topics" was true when this
correction was written. The curated set was later re-cut — Purdue and Epstein
moved to live-only, UAP and AI Evaluation added — and the rebuilt package
serves the five curated topics as of the 2026-08-11 rebuild (§3.2q).]*

---

## 9. Running it

Node 22.13+ required (uses built-in `node:sqlite`, which runs unflagged only
from 22.13.0 — the 22.5 floor previously stated here needed a flag the npm
scripts never pass; built on Node 24; pinned in `package.json` `engines`). On this
machine Node is at `C:\Program Files\nodejs` and is **not on PATH**.

```bash
npm run dev
```

App on http://localhost:5173, API on 3111, database at
`server/data/truth-onion.db`.

```bash
npm test
```

Twenty-one suites, 289 tests, against the real API with the real seed, in memory.

```bash
npm run build-demo
```

Writes the read-only showcase to `demo/` only. It does NOT generate the
`deploy/` artifacts — those are authored, reviewed and pinned by R10 (see
§3.2k); regenerating over them is the mistake this sentence used to invite.
`npm run export -- "<topic>"` and `npm run import -- <file>` move topics through
the rules layer; `npm run reset` wipes and reseeds (**hand-built topics are
destroyed — export first**).
