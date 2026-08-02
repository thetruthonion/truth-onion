# Truth Onion — Stage 2.98 Kickoff: Claim Pages & Review Status (give this to Claude Code)

Final pre-release feature stage (supersedes 2.97's claim to that title, by
operator decision — the distribution layer ships at launch). Runs after the
2.97 punch list is verified. Read `PROJECT-STATE.md` first. Read-side and
presentation plus one small schema reservation; no rule changes, no new
write paths.

**Standing rule (permanent):** nothing created this session is removed
before operator verification.

## A. Claim pages — release-grade v1

Every claim gets a stable, server-rendered, read-only permalink page,
generated entirely from the record.

Contents, in order:
- Header: claim text, tier chip in tier color, kind chips, status
  (confirmed / refuted / etc.). Off-axis claims render the off-axis
  explanation and are never presented as ranked proven/unproven.
- Review status line (scope C).
- Why it sits here — the placement reason, verbatim from the record.
- Evidence: sources with tiers and zero-weight flags; challenges with
  outcomes and survivals — the case for and against, exactly as recorded.
- Kernel links with their gap statements (broken-line grammar in whatever
  static form renders honestly); support links; each related claim linking
  to its own page (link-tree form).
- History: the claim's event timeline; a link opens the engine's scrubber
  at this claim.
- Audit affordances: every section links into the engine at the relevant
  spot; footer carries "verify this yourself" with the clone-the-repo path.

Binding rules:
1. **Status travels inseparably, including share previews.** OpenGraph /
   social metadata carries status and tier in the card title/description —
   a refuted claim must unfurl as refuted, never as a neutral headline.
   Pinned by test on the rendered metadata.
2. Generated from the record only. If it isn't in the record, it isn't on
   the page — no page-side prose, no summaries the record didn't write.
3. Tombstones and redactions render as such at every point; a page never
   resurrects what the boundary refused.
4. Read-only, rate-limited, cacheable; every demo protection applies to
   page routes (403 on mutation, reset-safe, fetch-proxy absent).
5. URL scheme must survive seed rebuilds for seeded claims — stable IDs or
   slugs; record the scheme in PROJECT-STATE.

**Stretch (build only if v1 lands early; otherwise report as deferred):**
an interactive embedded mini-map on the page. The static link tree is the
release requirement; the widget is not.

## B. In-engine linkage

- "Page" affordance on the claim panel (copy link / open page).
- Search results and chain view gain nothing new — pages link INTO the
  engine, not the reverse, beyond the panel affordance.

## C. Review-status indicator

- Every claim panel and claim page shows the claim's independent-review
  state, derived from review events in the record. A `review` event type is
  reserved in the events schema (append-only, same actor/timestamp/reason
  shape); no path writes one yet.
- Current honest state everywhere: "Independent review: none yet —
  single-curator record." Plain, unhidden, unapologetic. Reasoning: the
  credibility claim is currently unaudited and the honest display says so;
  this line is the visible socket that contest-the-key (2.99) and
  multiplayer review (Stage 3) plug into.
- No review-submission machinery of any kind this stage — display and
  schema reservation only.

## Out of scope — refused, not negotiated

- Review submission, moderation, or any anonymous write surface.
- Editorializing on pages; any content not derived from the record.
- Proving Grounds work of any kind (2.99).
- Interactive time machine embedded in pages (scrubber link suffices for
  release).

## Definition of done

1. Every seeded claim serves a page with all listed sections; off-axis and
   refuted claims render per their rules; spot-checked by operator on at
   least: one core claim, one refuted claim with a kernel link, one
   off-axis claim.
2. Share-preview metadata carries status/tier — pinned by test; verified by
   pasting a refuted claim's URL into a preview debugger and reading
   "refuted" in the card.
3. Record-only generation pinned (test: a fixture field absent from the
   record does not appear on the page).
4. Page routes pass the mutation pressure test and rate limiting; URL
   scheme stable across a seed rebuild (tested).
5. Review-status line renders on panels and pages from the reserved event
   type; with zero review events it reads the honest single-curator line.
6. Full suite green including new tests; report totals by suite.
7. PROJECT-STATE updated: URL scheme, metadata shape, stretch status,
   anything tried and rejected.

Stop at the definition of done. Anything new that surfaces is reported, not
built. End with one line each: decided / finished / scrapped. Nothing built
this session is cleaned up.
