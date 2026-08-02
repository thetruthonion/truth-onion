# Taxonomy strains — log, don't solve

Places where the source-tier taxonomy (`primary_doc / court_record /
reputable_secondary / single_outlet / self_published / anonymous`) strained
against real material. Recorded so the taxonomy redesign — which happens once,
deliberately, before Stage Three ships, informed by more than one topic genre —
starts from evidence rather than memory.

The taxonomy itself is deliberately untouched in Stage 2.5.

---

## 1. A study is primary for its conduct, secondary for its conclusions

Encountered building **The Replication Crisis**. A published study (e.g. Open
Science Collaboration 2015) is the *primary record* that the replication
project happened and what it measured — but for the conclusion a claim draws
from it, it functions more like a secondary source. The taxonomy has one slot
per source, so the builder must pick a side and explain in the citation text.
Current practice: tag `primary_doc` when the claim is about what the project
found; explain in the citation annotation.

## 2. Against-interest statements have no tier expression

Dana Carney's 2016 public statement disavowing her own power-posing paper is,
in real epistemology, unusually strong evidence — a primary actor speaking
against her own interest. The taxonomy sees only a self-published web page
(zero weight) or, generously, a `primary_doc`. There is no slot that captures
"self-published, but against the speaker's own interest, about their own
work." Current practice: tag `primary_doc` with the ambiguity noted in the
citation text.

## 3. Origin vs. support (partially addressed in Stage 2.5)

Ioannidis (2005) is the *origin* of "most published research findings are
false" — attaching it as `supports` was nearly self-assertion (the claim's
source citing the claim's coiner). Stage 2.5 added the `is_origin_of`
attachment relation: zero promotional weight, displayed as provenance. This
solves the *relation* side; the strain that remains is on the *tier* side — a
theoretical-model paper is neither a primary document nor reporting, and the
taxonomy has no slot for "published argument/model."

## 4. (New, Stage 2.5) One physical document, many evidentiary roles

Noticed during the library migration: the same document (OSC 2015) was
entered twice with different annotations — once supporting the Core
replication-rates claim, once contradicting the Outermost nihilist claim. The
library model now makes it one entity with two attachments, which is right —
but the *annotation* ("what part of this document matters here") currently
lives in the citation text, so merging identical citations only works when
the builder typed identical strings. A future model may want per-attachment
notes separate from the source's canonical citation.

---

## Legal genre — Purdue Pharma & the Sacklers mini-build

Second-genre strain input (the legal-record genre), per the strain-hunting
mini-build. Entries below use that session's format. The source-tier
vocabulary itself remains untouched — these are logged, not solved.

### Entry 5 — Court filing vs. agency description (genre: legal)
Claim: Purdue Pharma L.P. pleaded guilty to a three-count felony information — one count of dual-object conspiracy to defraud the United States and violate the Food, Drug, and Cosmetic Act, and two counts of conspiracy to violate the federal Anti-Kickback Statute — on November 24, 2020, in the U.S. District Court for the District of New Jersey.
Document kind: a corporate guilty plea (a court filing) — but the attached source is the DOJ case page, an agency description that links the filing rather than being it.
What the vocabulary forced: court_record is correct for the document kind, but the accessible source is a DOJ (prosecuting-party) page → reputable_secondary at best. One reputable_secondary earns only middle, status "contested."
What was lost: the schema can't say "the underlying document IS a court record; I just can't attach the filing, only the agency's description of it." An adjudicated federal felony conviction is under-placed by three rings the moment you're honest about the attachment.
Workaround used: placed at middle (earned tier); to reach core, pull the filed plea agreement + Information off the docket — which the companion cannot open.

### Entry 6 — Verification as promise vs. mechanical fact (genre: legal / architecture)
Not a source-tier strain — a verification-architecture finding surfaced by the same case, logged here because it governs whether ANY legal-record source can be trusted before it is tiered.
Claim (the trigger): the 2020/2026 Purdue plea facts (Judge Madeline Cox Arleo, D.N.J. Newark, April 28 2026 acceptance + sentencing, "36 victims spoke," the $3.544B fine / $2B forfeiture structure, and a claimed "$225M collected").
What the vocabulary/tooling forced: the sidekick presented these as "confirmed against live sources," but verification was a MODEL PROMISE, not a mechanical fact — nothing bound "confirmed" to a real fetch. The companion demonstrated the hazard in BOTH directions: it asserted unverified specifics AND "corrected" a TRUE fact ("36 victims," which is verbatim in the DOJ page) into false uncertainty. An unverified retraction is as false as an unverified assertion.
The wall underneath it: bare HTTP fetchers (a client-side fetch(); the assistant's WebFetch) get 403/CORS on justice.gov and cannot reach PACER at all — which is precisely WHY legal records push toward agency-page sources (compounds Entry 5). A real browser, or a plain server-side fetch, gets 200; the 403 was fetcher-infrastructure, not site policy.
What was lost: without a mechanical check, "I could not reach the primary filing" launders into "confirmed," and the tier a source earns rests on an unverifiable assertion. The schema/tooling had no artifact distinguishing "verified against the live page" from "the model says so."
Workaround used (now built): a server-side, SSRF-guarded fetch proxy (no headless browser needed — plain Node fetch defeats the 403); fetch_url and a new verify_source(url, quote) route through it; `verified` is a server-computed substring match on the actually-fetched page, logged and visible. Live result: the real DOJ quote verified TRUE; the "$225M collected" figure verified FALSE (absent from the page) and was excluded. Residual: PACER / login-gated dockets remain unreachable, so the FILED court record still can't be verified — Entry 5's court-filing-vs-agency-description strain is unchanged; verification now makes the agency page trustworthy, not a substitute for the filing.

**Correction (appended 2026-07-27; disproven 2026-07-20):** the parenthetical
"no headless browser needed — plain Node fetch defeats the 403" was wrong as
stated. Plain fetch defeats the *bot-block*, not *JavaScript rendering* —
those are two different walls, and both occur on the same domain:
justice.gov `criminal-vns` pages are server-rendered and readable by plain
fetch, while `/archives/opa/pr/` releases return 200 with an empty JS shell
that only a real browser can read. The proxy now runs plain fetch first and
falls back to a headless browser on an unreadable shell or bot-block status;
an unreadable page is reported as *inconclusive*, never "not found." The
entry above stands as written, per the append-only discipline.

---

When a new strain is hit, append it here with the topic and claim that
surfaced it. Do not patch the taxonomy piecemeal.
