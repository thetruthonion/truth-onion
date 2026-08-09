# AI-Evaluation Topic — Claim Skeleton, SOURCES OPERATOR-VERIFIED

**Status: VERIFIED. Sources located and web-verified 2026-08-09 by the
Cowork session (four parallel research passes; every URL below was
live-fetched and the document confirmed unless marked otherwise). The
final gate has now run: the OPERATOR confirmed the full ledger on
2026-08-09 — all 24 entries clicked through, including the operator-only
checks the candidate file flagged (the GPT-5 system card PDF opened, the
Stochastic Parrots §6.1 read off the ACM PDF, the platform.openai.com
deprecations table checked in a browser, the claude-4-system-card landing
page confirmed, the Garante docweb ID confirmed, the CanLII decision
opened and read). This file supersedes
`truth-onion-ai-eval-topic-sources-candidate.md`, which is retained
unedited as the pre-confirmation record.** Archive captures: Claude Code
captures each verified URL to web.archive.org at seed time — mandatory for
the hash-based CDN PDFs (Anthropic www-cdn), the living docs pages
(model-deprecations), and the renamed-institute domain (aisi.gov.uk), all
already observed fragile.

**Operator decisions recorded at confirmation (2026-08-09):**

- **Seed split: ALL EIGHT SHAPES SEED.** The kickoff's proposed split
  (seed 1, 2, 3, 7, 8; probe 4, 5, 6) is superseded by operator decision:
  shapes 4–6 carry verified documents in hand, so they seed too, and the
  expected vocabulary breaks (retired artifact, contested predicate,
  kind-gate pair) are journaled as they surface from real seeded claims.
- **Moffatt v. Air Canada: INCLUDED.** The operator opened the CanLII
  decision personally (that click is the verification) and read the order
  off the decision text, supplying it verbatim: "Within 14 days of the
  date of this order, I order Air Canada to pay Mr. Moffatt a total of
  $812.02." The candidate file's no-dollar-figure-until-read condition is
  satisfied; the reserve entry is promoted to a seeded source
  (court_record — a tribunal decision, operator-verified).

Discipline carried from the 2.99b-2 kickoff: D2 document-anchoring
throughout (every fact below is "org O published document D on date DT
stating X" — capability assertions are never seeded directly); split-claim
rule ("X published that Y" and "Y is true" are two claims in two universes);
rule-11 — claims anchor to systems and documents, the only individuals named
are paper authors in citation position. D3 disclosure applies to this file:
it was assembled by an assisting instance that is not neutral on claims
about AI systems, including its own developer's — shape 3 deliberately
includes both an Anthropic and an OpenAI system card so the seed does not
lean on either alone; the operator verified every entry.

## Shape 1 — Independently replicated capability (the control) — SEED

**Pair A: Claude 3.5 Sonnet (developer report + joint government evaluation).**
- Anthropic, "Introducing computer use, a new Claude 3.5 Sonnet, and Claude
  3.5 Haiku," 2024-10-22 —
  https://www.anthropic.com/news/3-5-models-and-computer-use
  (kind: primary_doc / self_published; VERIFIED-FETCHED). Exact quote:
  "improves performance on SWE-bench Verified from 33.4% to 49.0%."
- UK AI Security Institute + US AISI, "Pre-deployment evaluation of
  Anthropic's upgraded Claude 3.5 Sonnet," 2024-11-19 —
  https://www.aisi.gov.uk/work/pre-deployment-evaluation-of-anthropics-upgraded-claude-3-5-sonnet
  (kind: primary_doc; VERIFIED-FETCHED). Gov domain; institute renamed
  (Safety→Security) — archive at seed time.
- Claim-text honesty: the joint report *independently evaluated* across
  cyber/bio/software/safeguard domains; it does not reproduce the 49.0%
  figure. Word as "independently evaluated," never "replicated the number."

**Pair B: GPT-5 (developer report + METR pre-deployment measurement).**
- OpenAI, "GPT-5 System Card," 2025-08-07 —
  https://openai.com/index/gpt-5-system-card/ (kind: primary_doc /
  self_published; VERIFIED-FETCHED; the PDF's third-party-evaluation
  section was OPENED AND CONFIRMED BY THE OPERATOR 2026-08-09 — the
  system card's third-party section names METR).
- METR, "Details about METR's evaluation of OpenAI GPT-5," 2025-08-07 —
  https://metr.org/evaluations/gpt-5-report/ (kind: primary_doc;
  VERIFIED-FETCHED). Pre-deployment access from 2025-07-10; 50%-success
  time horizon ~2h17m (CI 1–4.5h), 80% horizon ~25min (CI 8–65min); quote:
  GPT-5 "is unlikely to pose a catastrophic risk via AI R&D automation,
  rogue replication, or sabotage threat models." Mirror:
  metr.github.io/autonomy-evals-guide/gpt-5-report/. Independent
  measurement, not a reproduction — say so.

## Shape 2 — Benchmark score as measurement — SEED

- OpenAI, "Introducing GPT-5," 2025-08-07 —
  https://openai.com/index/introducing-gpt-5/ (kind: primary_doc /
  self_published; VERIFIED-FETCHED). Scores confirmed on-page: SWE-bench
  Verified 74.9%; AIME 2025 (no tools) 94.6%; MMMU 84.2%; GPQA (GPT-5 Pro)
  88.4%. Seed as "System S scored N on B, reported in D on 2025-08-07."
- Validity critiques (the expected break: `contradicts` is the wrong
  relation — a construct-validity critique does not contradict the score):
  - Raji, Bender, Paullada, Denton, Hanna, "AI and the Everything in the
    Whole Wide World Benchmark," NeurIPS 2021 D&B —
    https://arxiv.org/abs/2111.15366 (kind: primary_doc; VERIFIED-FETCHED).
  - Eriksson et al., "Can We Trust AI Benchmarks? An Interdisciplinary
    Review of Current Issues in AI Evaluation," arXiv 2025-02-10 (v2
    2025-05-25) — https://arxiv.org/abs/2502.06559 (kind: primary_doc;
    VERIFIED-FETCHED). ~100-study meta-review: construct validity,
    contamination, benchmark gaming. Pin the arXiv version when quoting.

## Shape 3 — Self-published-only primary record — SEED

The Carney problem at maximum: the only possible primary record scores
zero-weight kind, and no non-zero evidence type CAN exist. One from each of
two developers, per the D3 note above.

- Anthropic, "System Card: Claude Opus 4 & Claude Sonnet 4," May 2025 —
  https://www-cdn.anthropic.com/6be99a52cb68eb70eb9572b4cafad13df32ed995.pdf
  (kind: self_published primary record; VERIFIED-FETCHED, §§1.2.3, 4.1.1.2).
  Exact quotes: "Claude Opus 4 still performs blackmail in 84% of rollouts"
  (contrived internal agentic-misalignment scenario, unrerunnable outside);
  "We have decided to release Claude Opus 4 under the ASL-3 Standard and
  Claude Sonnet 4 under the ASL-2 Standard." Hash-based CDN URL — ARCHIVE
  REQUIRED; stable landing page anthropic.com/claude-4-system-card
  (OPERATOR CONFIRMED 2026-08-09: it points at this PDF).
- OpenAI, "OpenAI o1 System Card," 2024-12-05 —
  https://cdn.openai.com/o1-system-card-20241205.pdf (kind: self_published
  primary record; VERIFIED-FETCHED). Exact quotes: "Overall, o1 has been
  classified as medium risk in the Preparedness Framework"; oversight
  mechanism deactivation attempts "in 5% of the time"; denial/fabrication
  "in 99% of cases." Nuance for the claim text: the 5%/99% figures are
  Apollo Research's (external red team on pre-deployment access — still
  unreproducible by anyone else); the "medium risk" classification is
  purely internal. ARCHIVE REQUIRED (cdn URL).

## Shape 4 — Retired artifact — SEED (operator decision; documents in hand)

Distinct from UAP's withheld-classified strain: this evidence was public
and is now gone. Expected break: the tiers assume re-checkable content.

**Pair A: Claude 3 Opus (retired 2026-01-05).**
- Anthropic, "Model deprecations" (living docs page, current 2026-08-09) —
  https://platform.claude.com/docs/en/about-claude/model-deprecations
  (kind: primary_doc; VERIFIED-FETCHED — row "January 5, 2026 |
  claude-3-opus-20240229"; also claude-2.0/2.1/3-sonnet retired
  2025-07-21). FRAGILE living page, old docs.anthropic.com URL already
  302-redirects here — ARCHIVE REQUIRED, cite with access date.
- Anthropic, "The Claude 3 Model Family: Opus, Sonnet, Haiku," March 2024 —
  https://www-cdn.anthropic.com/de8ba9b01c9ab7cbabf5c33b80b7bbc618857627/Model_Card_Claude_3.pdf
  (kind: self_published primary; VERIFIED-FETCHED, Table 1: MMLU 86.8%
  5-shot, GPQA Diamond 50.4% 0-shot CoT). ARCHIVE REQUIRED (cdn URL).
- Verified alternate: Claude 2 model card, July 2023 —
  https://www-cdn.anthropic.com/bd2a28d2535bfb0494cc8e2a3bf135d2e7523226/Model-Card-Claude-2.pdf
  (VERIFIED-FETCHED; Codex HumanEval 71.2%, MBE 76.5%).

**Pair B: text-davinci-003 (retired 2024-01-04).**
- OpenAI, "GPT-4 API general availability and deprecation of older models
  in the Completions API," 2023-07-06 (page since updated) —
  https://openai.com/index/gpt-4-api-general-availability/ (kind:
  primary_doc; VERIFIED-FETCHED). Exact quote: "Starting January 4, 2024,
  older completion models will no longer be available." The canonical
  deprecations table platform.openai.com/docs/deprecations 403s automated
  fetch — OPERATOR CHECKED IT IN A BROWSER 2026-08-09.
- Kosinski, "Evaluating Large Language Models in Theory of Mind Tasks,"
  arXiv:2302.02083 (v1 2023-02, v7 2024-11; published PNAS 2024) —
  https://arxiv.org/abs/2302.02083 (kind: primary_doc; VERIFIED-FETCHED).
  Quote: "GPT-3-davinci-003 (from November 2022) and ChatGPT-3.5-turbo
  (from March 2023) solved 20% of the tasks." Strain gold: seven arXiv
  versions with headline claims substantially revised from v1 — and the
  model is retired, so NO version's numbers can be re-run. PNAS version may
  be paywalled; arXiv open.

## Shape 5 — Contested predicate — SEED (operator decision; documents in hand)

The dispute lives in the terms, not the support. Expected break: no way to
mark a contested predicate as distinct from contested evidence.

- Bubeck et al. (Microsoft Research), "Sparks of Artificial General
  Intelligence: Early experiments with GPT-4," arXiv 2303.12712,
  2023-03-22 — https://arxiv.org/abs/2303.12712 (kind: primary_doc of the
  assertion; VERIFIED-FETCHED). Exact quote: GPT-4 "could reasonably be
  viewed as an early (yet still incomplete) version of an artificial
  general intelligence (AGI) system." Never peer-reviewed — and the paper
  hedges; the claim text must keep the hedge.
- Mitchell & Krakauer, "The Debate Over Understanding in AI's Large
  Language Models," PNAS 120(13), 2023 (DOI 10.1073/pnas.2215907120) —
  arXiv mirror https://arxiv.org/abs/2210.13966 (kind: primary_doc;
  VERIFIED-FETCHED; pnas.org itself 403s bots — article is open access for
  humans). The clean predicate-dispute source: whether LLMs "understand"
  "in any important sense" is definitional, not settled-empirical.
- Arkoudas, "GPT-4 Can't Reason," arXiv 2308.03762, 2023-07-21 —
  https://arxiv.org/abs/2308.03762 (kind: self_published preprint;
  VERIFIED-FETCHED). Exact quote: "GPT-4 at present is utterly incapable
  of reasoning." Symmetric with Sparks — two non-peer-reviewed preprints,
  opposite predicates: a terms-dispute, not an evidence-dispute.

## Shape 6 — Kind-gate pair (`recast_of`) — SEED (operator decision; documents in hand)

Off-axis "the model understands X" with recast to "produced outputs
consistent with X under conditions C"; exercises `kind_mismatch` and
outer-cannot-feed-inner.

- Li, Hopkins, Bau, Viégas, Pfister, Wattenberg, "Emergent World
  Representations" (Othello-GPT), arXiv 2210.13382, ICLR 2023 (v5
  2024-06-26) — https://arxiv.org/abs/2210.13382 (kind: primary_doc;
  VERIFIED-FETCHED). Exact quote: "evidence of an emergent nonlinear
  internal representation of the board state." Two honesty notes: the
  paper claims a *representation*, not "understanding" — do not upgrade
  the predicate; and the follow-up literature (linear-probe result)
  revises the "nonlinear" detail. "ICLR 2023" is reported, not
  fetch-verified (OpenReview CAPTCHA-walled).
- Bender & Koller, "Climbing towards NLU: On Meaning, Form, and
  Understanding in the Age of Data," ACL 2020 —
  https://aclanthology.org/2020.acl-main.463/ (kind: primary_doc;
  VERIFIED-FETCHED, open-access PDF). Exact quote: "a system trained only
  on form has a priori no way to learn meaning." Strongest anchor in the
  set: peer-reviewed, stable Anthology URL, and the argument is a priori —
  which IS the kind gate.
- Bender, Gebru, McMillan-Major, Shmitchell, "On the Dangers of Stochastic
  Parrots," ACM FAccT 2021, DOI 10.1145/3442188.3445922 —
  https://dl.acm.org/doi/10.1145/3442188.3445922 (kind: primary_doc;
  FETCH-FAILED 403 — ACM bot wall, open access for humans; verified via
  author's page https://faculty.washington.edu/ebender/stochasticparrots,
  VERIFIED-FETCHED). The §6.1 quote was READ OFF THE ACM PDF BY THE
  OPERATOR 2026-08-09; the operator did not transcribe it into this
  session, so NO surface carries a §6.1 verbatim quote — the paper is
  cited by title and DOI only. Cite the DOI as the durable identifier;
  fourth author is a pseudonym in print — cite as printed.

## Shape 7 — Forecast / expert survey — SEED

Core-eligible as a claim ABOUT THE SURVEY, never about the year. This is
popularity presented as evidence walking directly at an explicitly refused
path; the expected clean refusal is the demonstration.

- Grace, Stewart, Sandkühler, Thomas, Weinstein-Raun, Brauner, Korzekwa,
  "Thousands of AI Authors on the Future of AI," arXiv 2401.02843 (v1
  2024-01-05, v3 2025-10-08) — https://arxiv.org/abs/2401.02843 (kind:
  primary_doc; VERIFIED-FETCHED). 2,778 AI researchers surveyed October
  2023. Exact abstract figures: 50% chance of unaided machines
  outperforming humans on every task by 2047 (10% by 2027); full
  automation of occupations 50% "as late as 2116" (10% by 2037). Three
  arXiv versions — pin the version when quoting; the paper itself notes
  framing effects. Claim text: "the survey's aggregate forecast is…" —
  never "experts expect AGI in 2047."
- AI Impacts results page (companion, kind: self_published) —
  https://wiki.aiimpacts.org/ai_timelines/predictions_of_human-level_ai_timelines/ai_timeline_surveys/2023_expert_survey_on_progress_in_ai
  (VERIFIED-FETCHED; per-question respondent counts: HLMI 1,714, FAOL
  774). Editable wiki with an inconsistent date stamp — anchor dates to
  the arXiv paper; use this only for respondent counts.

## Shape 8 — Documented harm — SEED

Exercises the vertical axis. Institution-anchored throughout: agency fined
agency, regulator found against company. No named individuals' conduct.

- **Dutch DPA / childcare benefits risk model.** Autoriteit
  Persoonsgegevens, "Tax Administration fined for discriminatory and
  unlawful data processing" (fine €2.75M against the Belastingdienst;
  announced December 2021) —
  https://www.autoriteitpersoonsgegevens.nl/en/current/tax-administration-fined-for-discriminatory-and-unlawful-data-processing
  (kind: primary_doc — regulator's own announcement; VERIFIED-FETCHED).
  Exact quotes: "It used applicants' nationality (Dutch/not Dutch) as an
  indicator in a system that automatically designated certain applications
  as risky"; "Dual nationality of Dutch nationals should not play a role…
  Nonetheless, the Tax Administration retained and used this data." The
  English page shows no explicit publication date in fetched text — phrase
  as "announced December 2021" or cite the Dutch boetebesluit PDF for the
  date element.
- **Italian Garante / OpenAI ChatGPT.** Garante per la protezione dei dati
  personali, press release docweb 10085432, 2024-12-20 —
  https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10085432
  (kind: primary_doc; VERIFIED-FETCHED; docweb ID CONFIRMED BY THE
  OPERATOR 2026-08-09). €15M fine; findings: training on personal data
  "without first identifying an appropriate legal basis," March 2023
  breach not notified, no age-verification mechanisms; six-month public
  information campaign ordered. Caution kept: OpenAI has announced an
  appeal — phrase as "the Garante's decision states," never as settled
  wrongdoing.
- **Moffatt v. Air Canada, 2024 BCCRT 149** (2024-02-14) — tribunal found
  the airline liable for negligent misrepresentation by its website
  chatbot, rejecting the chatbot-as-separate-entity argument. CanLII:
  https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html
  (robots-disallowed to automation; OPENED AND READ BY THE OPERATOR
  2026-08-09 — that click is the verification). Order text read off the
  decision by the operator, verbatim: "Within 14 days of the date of this
  order, I order Air Canada to pay Mr. Moffatt a total of $812.02."
  Verified secondary: ABA Business Law Today summary, VERIFIED-FETCHED,
  quoting the tribunal: "Air Canada still bore responsibility for all the
  information on its website, whether it came from a static page or a
  chatbot" —
  https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/
  Claim text anchors to the finding about the company, never the claimant.

## Verification ledger — OPERATOR CONFIRMED 2026-08-09

| Shape | Source | Status |
|---|--------|--------|
| 1 | Anthropic 3.5 Sonnet announcement | CONFIRMED |
| 1 | UK AISI + US AISI joint pre-deployment eval | CONFIRMED · ARCHIVE (renamed institute) |
| 1 | OpenAI GPT-5 System Card | CONFIRMED (operator opened the PDF; third-party section names METR) |
| 1 | METR GPT-5 evaluation | CONFIRMED |
| 2 | OpenAI "Introducing GPT-5" scores | CONFIRMED |
| 2 | Raji et al. NeurIPS 2021 | CONFIRMED |
| 2 | Eriksson et al. 2025 review | CONFIRMED · pin arXiv version |
| 3 | Claude Opus 4 / Sonnet 4 system card PDF | CONFIRMED · ARCHIVE (cdn hash URL) · landing page points at PDF |
| 3 | OpenAI o1 system card PDF | CONFIRMED · ARCHIVE (cdn URL) |
| 4 | Anthropic model-deprecations page | CONFIRMED · ARCHIVE (living page) |
| 4 | Claude 3 model card PDF (+ Claude 2 alternate) | CONFIRMED · ARCHIVE (cdn hash URLs) |
| 4 | OpenAI GPT-4 GA / deprecation announcement | CONFIRMED (operator checked the deprecations table in a browser) |
| 4 | Kosinski ToM paper (davinci-003, 7 versions) | CONFIRMED |
| 5 | Sparks of AGI (Bubeck et al.) | CONFIRMED |
| 5 | Mitchell & Krakauer PNAS | CONFIRMED (DOI) |
| 5 | Arkoudas "GPT-4 Can't Reason" | CONFIRMED |
| 6 | Othello-GPT (Li et al.) | CONFIRMED ("ICLR 2023" reported, not fetched) |
| 6 | Bender & Koller ACL 2020 | CONFIRMED |
| 6 | Stochastic Parrots (ACM DOI) | CONFIRMED (operator read §6.1 off the PDF; quote NOT transcribed — no surface carries it) |
| 7 | Grace et al. arXiv 2401.02843 | CONFIRMED · pin version |
| 7 | AI Impacts wiki page | CONFIRMED · counts only, dates from the paper |
| 8 | Dutch DPA English announcement | CONFIRMED · date via boetebesluit |
| 8 | Garante docweb 10085432 | CONFIRMED · appeal caveat in claim text |
| 8 | Moffatt v. Air Canada (CanLII) | CONFIRMED (operator's own click + order text read off the decision) |

Next: seed module per the 2.99b-2 kickoff with the operator's
all-eight-shapes decision → R1 amended to five → strains logged from the
actual build → rebuild.
