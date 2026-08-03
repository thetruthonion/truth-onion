# UAP Topic — Claim Skeleton DRAFT (awaiting operator source verification)

**Status: DRAFT — NOT SEEDED.** Per the 2.99b kickoff and the 2.75
convention: the operator locates and verifies every source; Claude Code
assists with citation formatting and archive-capture links and invents
nothing. **No source below has been verified; none enters the seed until
it is.** Release pin R1 therefore still reads "the curated three" — it
amends to four in the same change that seeds this topic, after operator
verification. The engine machinery this topic exercises (kind_mismatch,
recast_of) is built and pinned (stage299b suite).

Seeding discipline, applied without exception:
- **The split-claim rule:** "X testified that Y" and "Y is true" are two
  claims in two different universes. Sworn testimony is Core-grade
  evidence that the testimony occurred and near-zero evidence for its
  content absent artifacts.
- Placement reasons name the document kind (rule-11 style).
- **Rule-11 pass:** claims naming living, identifiable people carry the
  heightened bar with no celebrity exception. Living persons named below:
  **David Grusch** (all claim texts are split-claim forms about testimony
  occurring, never assertions about him or by-him-asserted content);
  **Paul Bennewitz** (deceased 2003 — historical); AARO officials are not
  named individually. Operator reviews every final text against rule 11.

## Topic

- **Name:** `UAP: Disclosure, Evidence, and Overreach` (operator may
  rename; the topic-shape gate requires a subject, not a proposition ✓)
- **Description (draft):** "Government UAP disclosure — releases,
  hearings, and reports — and the claims built on them. Chosen because
  the genre splits testimony from content, releases from depictions, and
  documented disinformation from the phenomena it imitated: the full
  range of evidence tiers, under live national attention."

## Core candidates (primary docs and congressional records throughout)

1. **"In April 2020 the Department of Defense officially released three
   Navy videos (FLIR, GIMBAL, GOFAST) depicting unidentified aerial
   phenomena."**
   - kind: historical · layer: factual · proposed: core
   - Candidate sources (UNVERIFIED): DoD press release "Statement by the
     Department of Defense on the Release of Historical Navy Videos"
     (April 27, 2020), defense.gov; the released files on the Naval Air
     Systems Command FOIA reading room.
   - Split-claim note: this claims the RELEASE occurred — not what the
     footage depicts. (Strain candidate #3 below.)
2. **"On July 26, 2023 the House Oversight subcommittee held a hearing on
   UAP at which David Grusch testified under oath that the U.S. operates
   a UAP crash-retrieval and reverse-engineering program."**
   - kind: historical · layer: factual · proposed: core
   - Candidate sources (UNVERIFIED): the hearing record/transcript
     (oversight.house.gov; congress.gov video/record); Grusch's written
     opening statement as submitted.
   - THE split-claim exemplar: Core-grade that he testified to it;
     near-zero for the program itself (which sits at Outer, below).
3. **"AARO (the All-domain Anomaly Resolution Office) was established in
   2022, and its 2024 Historical Record Report Volume 1 states it found
   no verifiable evidence of extraterrestrial technology or a hidden
   reverse-engineering program."**
   - kind: historical · layer: factual · proposed: core
   - Candidate sources (UNVERIFIED): the AARO Historical Record Report
     Vol. 1 (aaro.mil / defense.gov); the establishing NDAA provision.
   - As a claim about WHAT THE REPORT STATES — not that its finding is
     true. `relation: contradicts` attachment to the Outer retrieval
     claim once verified.
4. **"The FY2022–FY2024 NDAAs contain UAP reporting provisions, including
   protections for whistleblowers reporting UAP-related programs."**
   - Candidate sources (UNVERIFIED): the public laws on congress.gov
     (specific sections operator-verified).

## Inner/Middle candidates

5. **"The U.S. Air Force fed fabricated UFO material to civilian Paul
   Bennewitz in the 1980s — a documented disinformation operation against
   a civilian."** — the propaganda counter-layer.
   - kind: historical · proposed: middle pending sources (the admissions
     are largely secondary: Doty's on-record statements, reporting, and
     books — operator decides what the documents earn; candidate sources
     UNVERIFIED: reputable secondary accounts, any released records).
   - Attach `relation: contradicts` where it bears on specific
     released-material claims.
6. **"Independent analyses dispute that the three released Navy videos
   show phenomena beyond conventional explanation (parallax, glare, and
   sensor artifacts are candidate explanations)."**
   - kind: empirical · proposed: middle/inner per verified analyses
     (UNVERIFIED candidates: Mick West/Metabunk analyses as
     single_outlet/self_published — tier per taxonomy, which is itself a
     strain candidate).

## Outer candidates (stated faithfully, path inward explicit)

7. **"The United States operates a UAP crash-retrieval and
   reverse-engineering program."**
   - kind: empirical · proposed: outer — testimony-backed; placement
     reason: sworn testimony is evidence the testimony occurred;
     the program claim awaits inspectable artifacts. Path inward:
     released artifacts, corroborating documents that can be inspected.
8. **"The government's released UAP materials are a controlled
   disinformation operation."**
   - kind: empirical · proposed: outer — sits on its own evidence (the
     documented Bennewitz history makes the CLASS real; this instance
     needs its own documents). Path inward stated.

## Outermost candidate (debunked specifics, never fortified)

9. Operator selects the expansive debunked specific (e.g. a specific
   claimed-crash narrative contradicted by released records) — created at
   outer and pushed out through the real debunker flow with a kernel fan,
   as the existing topics do.

## Off-axis + the recast pair (exercises Part 2 end to end)

10. **"Non-human intelligences exist as supernatural or spiritual
    beings."** — kind: metaphysical · layer: framing — the attributed
    position, rendered with its explanation, never ranked.
11. **"The beings described in religious texts as angels and demons were
    extraterrestrial visitors."** — kind: historical (empirical-
    historical) · proposed: outer/outermost per its evidence ·
    **`recast_of: #10`** — the mapped revival route. Demonstrably unable
    to lean on claim #7 (outer-cannot-feed-inner on exactly the chain a
    disclosure narrative wants to build — pin in the seed tests when
    seeded).

## Expected strains (log in TAXONOMY-STRAINS.md AS THE BUILD HITS THEM — 4+ targets)

1. **DOPSR-cleared testimony:** cleared-for-public-release ≠
   reviewed-as-true; the tier vocabulary has no expression for the
   difference.
2. **Testimony asserting uninspectable classified documents:** the tier
   vocabulary assumes inspectable content.
3. **A government release as primary record of WHAT, exactly:** the
   release proves the government released it — not what the footage
   depicts.
4. **Leaked-footage provenance:** chain of custody has no tier
   expression.
5. (Likely) **Analysis-of-footage tiering:** technical debunking by
   named individuals on self-published platforms — self_published tier
   vs. reproducible method.

## What happens next (operator)

1. Operator verifies each candidate source (live URL or archive capture,
   document kind confirmed). Claude Code formats citations and archive
   links on request — nothing enters unverified.
2. Seed module written (seed.js or the history-fixture path per the
   curated-record discipline), split-claim texts finalized, rule-11 pass.
3. R1 amended to four; residue scan, double-seed, and release suites
   extended; strains logged from the actual build; demo rebuilt.
