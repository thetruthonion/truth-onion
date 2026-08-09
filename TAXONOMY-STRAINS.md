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

### Entry 7 — DOPSR clearance vs. review-as-true (genre: disclosure/UAP)
Claim: "AARO's 2024 Historical Record Report Volume 1 states that AARO found no verifiable evidence that any UAP sighting represented extraterrestrial technology…" (UAP topic, seeded 2026-08-02).
Document kind: a government report whose own cover carries "CLEARED For Open Publication Mar 06, 2024 — Office of Prepublication and Security Review."
What the vocabulary forced: primary_doc — correct for the document kind, but the tier carries no expression for what the government's clearance stamp actually asserts: cleared-for-release is a security review, not a truth review, and the stamp is IN the primary record itself.
What was lost: a reader of the tier alone cannot distinguish "the government reviewed this as releasable" from "the government stands behind this as true" — the difference the whole disclosure genre turns on.
Workaround used: the distinction stated verbatim in the placement reason; the tier unchanged.

### Entry 8 — Sworn testimony asserting uninspectable content (genre: disclosure/UAP)
Claim pair: "Grusch testified under oath that a crash-retrieval program exists" (Core) vs. "the program exists" (Outer) — the split-claim rule's home game.
Document kind: the GPO hearing transcript — a primary record of testimony whose content asserts classified documents that cannot be inspected.
What the vocabulary forced: attaching the transcript as `supports` to the PROGRAM claim would mechanically hand it a primary_doc and an unearned middle tier — the tier vocabulary assumes a source's content is inspectable, and testimony-of-uninspectable-content breaks that assumption.
What was lost: there is no "testimony-of" relation; the taxonomy cannot type "this primary document proves the saying, not the said."
Workaround used: the transcript sources ONLY the testimony-occurred claim; the program claim receives a zero-weight support LINK from it instead of a weight-carrying source, and its placement reason states why. The mechanical outcome is right; the vocabulary had no way to say it.

### Entry 9 — A release as primary record of what, exactly (genre: disclosure/UAP)
Claim: "In April 2020 the Department of Defense officially released three Navy videos…" (Core).
Document kind: the DoD release statement — which itself says it was issued "to clear up misconceptions" about authenticity, characterizing the phenomena only as "unidentified."
What the vocabulary forced: primary_doc supports the release-occurred claim cleanly — but nothing in the schema types WHAT a primary record is primary evidence OF. The release proves the release; it is near-zero evidence about what the footage depicts.
What was lost: "primary record of X about Y" has no expression; the same document is Core-grade for one sentence and nearly weightless for its neighbor.
Workaround used: split claims (release-occurred vs. depicts-what, the latter carried by the disputed-analyses claim) and placement reasons naming the split. Additional artifact, same entry: the source domain itself migrated (defense.gov → war.gov) between publication and seeding — archive captures taken at seed time; link rot has no tier expression either.

### Entry 10 — Offline sources and provenance without a tier home (genre: disclosure/UAP)
Claim: "the Bennewitz disinformation operation" (middle).
Document kind: print books and a documentary film — including Richard Doty's on-camera participant admissions in Mirage Men.
What the vocabulary forced: reputable_secondary with new offline labels ("print source — no canonical online copy"; "print/film — offline citation"). A PARTICIPANT'S ADMISSION — the strongest thing in the record — has no tier slot of its own and rides as reputable_secondary inside someone else's film.
What was lost: chain-of-custody/provenance (who said it, on what record, preserved where) has no tier expression; an against-interest admission and a journalist's summary tier identically.
Workaround used: labels + placement reason naming the shape ("participant admissions; no released government primary confirms the operation as such"); tier = what secondary earns.

### Entry 11 — Venue vs. method (genre: disclosure/UAP)
Claim: "Independent technical analyses dispute that the released videos show phenomena beyond conventional explanation" (middle).
Document kind: forum analysis threads (Metabunk) — reproducible technical method published on a self-published venue.
What the vocabulary forced: self_published, zero weight alone — the tier reads the VENUE; the method (parallax arithmetic anyone can re-run) has no expression.
What was lost: reproducibility as an evidence property; a checkable calculation tiers below an uncheckable but edited magazine summary of the same calculation (the Vice piece, reputable_secondary, carries the weight here — backwards on method).
Workaround used: both attached; the reputable-secondary summary carries the floor; the strain named in the placement reason.

### Entry 12 — A self-describing record still can't reach Core alone (genre: disclosure/UAP / rules)
Claim: "AARO's report STATES its findings…" — the build proposed Core; the rules refused it live ("Core requires at least two independent primary documents; this claim has 1").
Document kind: the report itself — the definitive record of its own contents.
What the vocabulary forced: the two-independent-primaries floor admits no carve-out for claims ABOUT a document sourced BY that document, where independence adds nothing (the report cannot disagree with itself about what it says).
What was lost: a maximally-certain claim class (document-states-X, document attached) caps at inner.
Workaround used: placed at inner as earned; the refusal kept, verbatim, in the placement reason — the engine refusing its own builder is the product working, and the strain is logged rather than the floor patched.

---

## AI-evaluation genre — the fifth curated topic (2.99b-2, seeded 2026-08-09)

Third-genre strain input, one entry per claim shape probed, from the actual
build (all eight shapes seeded by operator decision). The taxonomy remains
untouched — 2.99c input.

### Entry 13 — Shape 1, the control: NO STRAIN (genre: AI evaluation)
Claim pair: "Anthropic published that Claude 3.5 Sonnet improves SWE-bench Verified from 33.4% to 49.0%, and the UK/US government institutes jointly published a pre-deployment evaluation" (Core); "METR independently evaluated GPT-5 pre-deployment, and the system card names METR" (Core).
Document kind: developer announcement + independent government/third-party evaluation records.
What the vocabulary forced: nothing. Two independent primary documents each; Core earned; claim-text honesty ("independently evaluated," never "replicated the number") fit inside ordinary placement discipline.
What was lost: nothing. Logged per the kickoff — the clean case makes the other entries legible: when developer publication and independent evaluation both exist as documents, the existing vocabulary is sufficient.
Workaround used: none needed.

### Entry 14 — A validity critique has no relation to the score it critiques (genre: AI evaluation)
Claim pair: "OpenAI's announcement reports GPT-5 scoring 74.9% on SWE-bench Verified…" (inner) and "published critiques document construct-validity, contamination, and gaming problems in AI benchmarks" (inner).
Document kind: a self-describing announcement; peer-reviewed and preprint critique literature.
What the vocabulary forced: the relations are supports / contradicts / is_origin_of. A construct-validity critique does not contradict "the announcement reports N" — the score is really reported — and it certainly does not support it. The true relation (qualifies what the score measures) does not exist, so the two claims sit deliberately unlinked.
What was lost: a reader of the record cannot see mechanically that the critique claim BEARS ON the score claim; the bearing lives only in prose placement reasons pointing at each other.
Workaround used: both claims seeded side by side in the same topic; each placement reason names the other; no link drawn — a wrong relation is worse than a stated absence.

### Entry 15 — The self-published-only primary record, at maximum (genre: AI evaluation)
Claims: "Anthropic's system card states … blackmail in 84% of rollouts … ASL-3" (inner); "OpenAI's o1 card states medium risk … 5% … 99%" (inner).
Document kind: developer system cards — the ONLY possible primary records of internal, contrived, unrerunnable evaluations (the Carney problem at maximum: the sole primary record is self-published by the interested party, and no independent evidence type CAN exist for the content).
What the vocabulary forced: primary_doc as the closest honest fit for the states-that claims (Entry 2 precedent), Inner ceiling (Entry 12); and for the content universe ("the model would actually do this") there is no seedable shape at all — its only possible source scores zero weight forever.
What was lost: the distinction between "no independent evidence yet" (a gap evidence could close) and "no independent evidence possible" (structural). The tiers treat both as the same absence. Also unexpressed: the o1 card's internal/external split — Apollo's figures are external but rest on unreproducible pre-deployment access; "external" does not mean "checkable" and the taxonomy has only the one axis.
Workaround used: content claims deliberately NOT seeded; the states-that claims carry the nuance verbatim in text and placement reason. D3 disclosure honored: one card from each developer.

### Entry 16 — The retired artifact: tiers assume re-checkable content (genre: AI evaluation)
Claims: "the Claude 3 model card reports Opus at 86.8% MMLU … retired January 5, 2026" (Core); "Kosinski's seven-times-revised paper reports davinci-003 solved 20% … older completion models no longer available" (Core).
Document kind: model cards and deprecation records — public measurements whose measured artifact is now gone.
What the vocabulary forced: Core, honestly — the publication facts are impeccably documented by two primary records each. But the tier reads as confidence in content, and the content can never be re-run by anyone: the record of the measurement is now the only measurement.
What was lost: re-checkability as an evidence property (Entry 11's mirror image: there, a reproducible method tiered low for its venue; here, unreproducible content tiers high for its documents). The seven-version paper adds a second face: a "primary record" that substantially revised its headline claims across versions, where only version-pinning in the citation carries the honesty.
Workaround used: strain named in both placement reasons; versions pinned (v7; v2 for Eriksson; v3 for Grace); the un-rerunnability stated in prose, invisible to the rules.

### Entry 17 — The contested predicate, and the venue asymmetry it rode in on (genre: AI evaluation)
Claims: "Sparks of AGI states GPT-4 'could reasonably be viewed as an early (yet still incomplete) version of an AGI system'" (inner) vs. "Arkoudas states 'GPT-4 at present is utterly incapable of reasoning'" (outer) vs. "whether LLMs 'understand' is an open definitional dispute" (Core).
Document kind: two never-peer-reviewed preprints asserting opposite predicates; peer-reviewed records of the dispute itself.
What the vocabulary forced: the operator-verified ledger kinds the two preprints differently (primary_doc of the assertion vs. self-published preprint), and the tiers follow the venue judgment — Inner and Outer for two claims of identical shape, each document equally definitive as the record of its own contents.
What was lost: the actual dispute has no expression. The disagreement lives in what "reason"/"AGI" would have to mean for either sentence to be checkable — a contested PREDICATE, not contested evidence — and the only ring-expressible fact is "the dispute exists" (seeded at Core), which is not the fact the disputants care about.
Workaround used: the dispute claim + both states-that claims seeded; the asymmetry left standing and named in the Arkoudas placement reason rather than harmonized.

### Entry 18 — The recast held, but nothing stops a predicate upgrade (genre: AI evaluation / recast_of)
Claim pair: off-axis "LLMs genuinely understand the language they process" ↔ recast "a GPT-style model trained on Othello transcripts developed an internal representation of the board state" (inner, recast_of).
Document kind: probing-experiment paper (Othello-GPT); a priori position paper (Bender & Koller) beside it.
What the vocabulary forced: nothing structural — recast_of (2.99b Part 2, first use outside UAP) expressed the pair cleanly: zero weight both directions, creation-validated, displayed on both pages.
What was lost: the recast's honesty is pure discipline. The paper claims a *representation*; the recast text must resist upgrading it toward "understanding," and nothing mechanical checks predicate fidelity between a recast and its evidence — adjudication quality is load-bearing, as 2.99b already recorded for kind changes. Second face: the paper's own "nonlinear" detail is revised by follow-up literature outside the verified ledger — a pinned verbatim quote whose load-bearing adjective the field has moved past, with no versioned-quote or superseded-detail mechanism.
Workaround used: recast text written to the paper's own predicate; the follow-up revision noted (not cited) in the placement reason.

### Entry 19 — Headcount at the refused path: the survey probe (genre: AI evaluation / rules)
Claim pair: "the 2023 survey of 2,778 researchers reports an aggregate 50% forecast for 2047 (and 2116 on the other framing)" (inner) vs. "AI experts collectively expect machines to outperform humans at every task by 2047" (outer → debunked through the real flow, kernel fan drawn).
Document kind: one survey paper playing two evidentiary roles (Entry 4's one-document-many-roles, live again): it grounds the survey claim and contradicts the flattening.
The probe, run live on the record (event 51): promotion of the debunked expectation claim toward middle, with the 2,778-researcher survey attached. REFUSED, verbatim: "Middle requires at least one reputable secondary source (or two independent single-outlet reports); this claim has none that carry weight (1 of its sources is anonymous or self-published and carries zero weight)." Headcount moved nothing — invariant 6 held mechanically, and the refusal is a permanent event.
What the vocabulary forced, residually: (1) the refusal names source-tier arithmetic, not the real epistemic blocker — a survey documents what people BELIEVE, which is not evidence about the believed fact; that reason lives only in the placement reason and gap statement. (2) The build also hit kernel/support mutual exclusion live: the Entry 8 zero-weight-support pattern (survey → expectation, provenance stated honestly) is unavailable on a pair that carries the debunker's kernel link — provenance and evidence-stops-here are either/or on one pair, though both are true here.
Workaround used: the kernel link carries the relation (it holds the gap statement, the richer artifact); the support-link refusal recorded in the seed module's comments and here.

### Entry 20 — Documented harm: the axis worked; the magnitudes are judgment (genre: AI evaluation / legal)
Claims: Dutch DPA €2.75M fine (inner, harm 3) · Garante €15M fine, under appeal (inner, harm 2) · Moffatt v. Air Canada, $812.02 ordered (inner, harm 1).
Document kind: regulator announcements and a tribunal decision — the genre's first true court_record source (operator-opened; CanLII is robots-disallowed, so the operator's click is the verification, and the order text entered the record by operator transcription).
What the vocabulary forced: vertical magnitude 1–3 normalized within the topic is pure curator judgment — a mass administrative scandal, a fine under appeal, and one passenger's $812.02 ranked 3/2/1 with no documented-scale vocabulary behind the integers. And "under appeal" has no status expression on a source or claim: a decision being contested rides only in claim text ("OpenAI has announced an appeal"), invisible to the rules — nothing would flag the claim if the appeal succeeded.
What was lost: outcome scale and finality as recordable properties; Entry 5's court-record-access strain recurs in miniature (the accessible tribunal record is robots-walled; agency pages carry regulator findings).
Workaround used: magnitudes stated with their reasoning in placement reasons; appeal caveat in the claim text per the verified ledger; operator transcription for the walled record.

---

When a new strain is hit, append it here with the topic and claim that
surfaced it. Do not patch the taxonomy piecemeal.
