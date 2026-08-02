# Truth Onion — Post-Release Design Capture: Practice Mode & Claim Pages

Recorded design, not buildable now. Both items queue AFTER the release
checklist completes; neither touches the launch path. This document reviews
the operator's practice-mode note against current state and captures the
claim-pages concept, so post-release kickoffs start from here rather than
from memory.

---

## Part 1 — Practice Mode (operator note, reviewed 2026-07-30)

The note (`truth-onion-practice-mode-note.md`) stands as design authority
for the mode, with the following reconciliations:

**Struck (stale premise):** the release-path argument — "the demo has been
held for multiplayer" — is superseded by the release decision record; the
demo ships publicly through 2.97. What survives: practice mode remains
low-liability (documented historical cases, no living-person user content,
no attribution) and is therefore an early *follow-on*, not a gate-escape.
Its audience/auditor benefits stand: people trying to beat the grader are
stress-testing the engine, which moves the credibility claim inward.

**Answered from settled precedent (not reopened):** the leaderboard
question. The 2.95 statistics rule (readouts, never leaderboards) and the
popularity refusal answer it: self-progress only, no ranked participants.
A practice leaderboard would reinstate, inside the learner's head, the
pressure the platform structurally bars from placement.

**Architecture already in hand:**
- Tutor-not-oracle is the tour pattern: script navigates and grades,
  companion narrates and interrogates. The model never decides a grade.
- Grading is deterministic: the vetted key encodes best answer + acceptable
  band + authored explanation per gradable element (source tiers, kind,
  layer, radial placement, detection tasks). Key-driven, rules-layer style;
  bands prevent false precision on legitimately two-tier cases.
- Blind presentation is a read-side mode over existing case data; vetted
  placements are the answer key — platform topics count twice.
- The strain journal is the difficulty syllabus, per the note's ladder.
- Scoring rewards correct demotion equal to correct promotion.

**Flagged for its own decision later:**
- Contest-the-key: the challenge mechanic in embryo — likely the cheapest
  multiplayer prototype available, on cases where nobody can be defamed.
  Design it as such deliberately when scoped.
- Consumability mitigations (partial cases, subsets, variants) and minimum
  viable case count: open, decide at kickoff.
- Crypto bridge stays inside the existing line: the platform maps
  attributions already made in public documents; it never originates them.
- Ship inside the demo vs. own front door: open; note that claim pages
  (Part 2) may make "own front door" nearly free.

---

## Part 2 — Claim Pages (captured 2026-07-30)

**Concept:** every claim has a stable, shareable, server-rendered permalink
— a fact-check-article-shaped page generated entirely from the record, where
every element is auditable. The distribution layer: shared like a
fact-checker link, checkable unlike one.

**Page contents (all derived from the record, no editorial layer):**
- Header: claim text, tier chip in tier color, kind, status
  (confirmed/refuted/etc.); off-axis claims render their off-axis
  explanation and are never presented as ranked.
- Why it sits here (placement reason), verbatim from the record.
- Evidence: sources with their tiers and zero-weight flags; challenges
  filed, outcomes, survivals — the case for and against, as recorded.
- Related claims: an embedded mini-map / link tree walking recorded support
  links (solid) and kernel links (broken, with gap statements) to
  neighboring claims' pages. Visual grammar identical to the engine's.
- History: the claim's event timeline, with a link into the engine's
  scrubber at that claim.
- Audit affordances: every section links into the engine at the relevant
  spot; "verify this yourself" carries the clone-the-repo path.

**Binding honesty rules (the ones that make it the product):**
1. **Status travels inseparably, including share previews.** OpenGraph/
   social metadata carries tier and status in the card itself — a refuted
   claim must unfurl as refuted, never as a neutral headline. Same rule
   family as tier-carrying search results; pinned by test on the metadata.
2. Generated from the record only; if it isn't in the record, it isn't on
   the page. No page-side prose, no summaries the record didn't write.
3. Tombstones/redactions render as such; a page never resurrects what the
   boundary refused (2.95 rule extends to pages).
4. Read-only, rate-limited, cacheable; inherits every demo protection.

**Open at kickoff:** URL scheme and stability across seed rebuilds;
whether pages render historical states directly or link into the scrubber;
whether topic-level pages exist alongside claim pages.

**Synergy note:** claim pages give practice mode a shareable artifact and a
front door; practice mode gives claim pages an audience selected for rigor.
Sequencing suggestion (operator's call at the time): claim pages first —
smaller, read-side, amplifies the released demo and the grant narrative —
then practice mode.

---

## Amendment A (2026-07-30) — restructured by operator decision

Supersedes this document's sequencing and its framing of practice mode as a
standalone post-release product. What changed:

- **Claim pages moved INTO the release** as Stage 2.98 (own kickoff issued;
  release decision record Amendment B). Part 2 above stands as design
  authority for the page contents and binding rules; the 2.98 kickoff
  governs release scope (interactive embeds are stretch, not requirement).
- **Practice mode is absorbed into a restructured Stage 2.99 — the Proving
  Grounds:** the parked sandbox idea + practice grading + strain
  collection, as one stage. Its purpose is upgraded: practice users
  generate strain evidence at community scale — banded grading deltas ARE
  strain signal — so the strain journal stops being a single curator's
  diary. Stage 2.99 culminates in the one deliberate taxonomy revision,
  unchanged in its singularity, now executed on that evidence base.
- **Sandbox full mode:** visitors work a private copy — attack the seeded
  claims, add their own, with sources and reasoning — and export a
  versioned save file (parking-lot contract extended to record-shaped
  work). At Stage 3, save files import into multiplayer through the rules
  layer, entry by entry; nothing in a file has standing until it passes.
- **Central unsolved design question of 2.99, named deliberately:** how
  strain data comes home without an anonymous free-text write surface, an
  identity store, or a moderation burden — all refused. Candidate paths:
  aggregated grading deltas as signal, constrained-category flags, and
  voluntary export-file submission via the repo. Decide at 2.99 kickoff,
  not before.
- Part 1's reconciliations stand (leaderboard closed: self-progress only;
  tutor-not-oracle on the tour pattern; deterministic key-band grading;
  contest-the-key as the challenge prototype — now explicitly the first
  review-event writer plugging into the 2.98 review-status socket).

---

## Amendment B (2026-07-31) — strain-return pipeline (working design)

Answers the "central unsolved design question" above; finalize at the 2.99
kickoff. Operator constraints honored by construction: anonymized at
minimum, handed over willingly, writes sandboxed on receipt, batch-processed
to inform the revision; contributors' own saves apply to the real engine
only at Stage 3 through the rules layer.

**Stage 1 — constrained capture (client-side).** The local strain ledger
holds structured data only: grading deltas (case, element, key band, given
answer), refusal telemetry (which rule fired on which attempted action),
and vocabulary flags from an enumerated category list pinned to case/claim
IDs. **No free text in the submission format, by schema** — free text lives
only in the user's own save file, which is a separate artifact and is never
part of a strain report.

**Stage 2 — consent at the edge.** Submission is explicit and
user-initiated; the exact payload is shown human-readably before sending.
No identity fields exist in the schema; the server persists payload only
and drops request metadata after the rate-limit check. Optional (decide at
kickoff): a content-hash receipt lets a contributor prove inclusion in a
batch without identity.

**Stage 3 — quarantine inbox.** Submissions land in an append-only ingest
store that is structurally outside the record: schema-validated at the door
(refusals name the blocker), size-capped, rate-limited, and never read by
the engine — not map, not search, not replay, not narration manifests.
Nothing submitted ever renders to anyone.

**Stage 4 — curator aggregation.** An offline operator-side tool aggregates
the inbox into patterns; the operator reviews and authors journal entries
citing aggregate patterns, never individual submissions. The strain journal
remains single-curator in voice; the community supplies its evidence base.

**Invariant guard, explicit:** report volume is a prompt to look, never a
force that moves. No count of submissions changes any tier or revises any
term by weight of numbers; changes route through evidence rules or the one
deliberate 2.99 revision. Popularity stays refused even when it arrives as
feedback.

---

## Amendment C (2026-07-31) — Sybil resistance for adjudication (Stage 3 design)

Operator question: two-phase withdrawal means a dedicated actor needs only
two accounts — proposer and adjudicator. Is there an effective bar?

**Honest premise:** no absolute bar exists without verified identity, and
identity storage is refused. The design target is therefore: insufficient,
expensive, low-yield, self-incriminating. Four layers, all derived from
already-settled decisions:

1. **Standing-gated adjudication.** Adjudication rights require earned
   standing computed from the replayable log (survived challenges,
   placements that held) — the already-decided reputation-from-replay rule
   doing double duty. Fresh accounts have zero standing; the two-account
   attack becomes an N-track-record attack.
2. **Contest window instead of approver.** Proposed withdrawals sit in a
   public, global pending queue for a window: uncontested and rule-clean →
   effect; contested by anyone with standing → escalated adjudication.
   Collusion succeeds only if no honest actor is watching; an accomplice
   cannot approve a proposal into effect, and any stranger can stop one.
3. **Enumerated, checkable grounds.** Withdrawal is maintenance, not
   judgment: duplicate / mis-attachment / superseded-by-better-copy /
   boundary violation — each verifiable against the record. Upholding a
   false ground plants a permanently replayable lie in the event log:
   evidence for reversal and standing-destruction of both accounts. The
   record prosecutes its own vandals. Dislike of evidence routes to the
   challenge system, never to withdrawal.
4. **Low damage ceiling by prior construction.** Nothing destroyed,
   everything visible with reasons, replay shows exact sequence,
   re-adjudication restores with zero loss. Vandalism that is public,
   staked, reversible, and audit-trailed is the least rewarding kind.

**Residual risk, stated:** an unwatched corner can take temporary damage
until noticed. The design bounds blast radius and guarantees recovery; it
does not guarantee zero dents. No text may claim otherwise.

Supporting bounds at Stage 3 scoping: proposal rate limits per actor;
standing at stake on reversed frivolous filings (skin in the game).
