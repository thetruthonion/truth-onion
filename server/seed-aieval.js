// SPDX-License-Identifier: AGPL-3.0-only
// The AI Evaluation topic (2.99b-2) — the fifth curated topic, seeded
// through the SAME service layer as everything else: if this content
// couldn't survive the rules, it wouldn't load.
//
// Sources: located and web-verified 2026-08-09, OPERATOR-CONFIRMED the same
// day — full ledger click-through including the operator-only checks (the
// GPT-5 system card PDF, the Stochastic Parrots §6.1 passage, the CanLII
// decision, the deprecations table). Ledger:
// truth-onion-ai-eval-topic-sources-verified.md. Every citation string is
// imported from sourcelinks.js (AIEVAL_SOURCES) so the seeded citation and
// the audit mapping are structurally the same string.
//
// Operator decisions carried (2026-08-09): ALL EIGHT claim shapes seed
// (supersedes the kickoff's proposed seed-1,2,3,7,8/probe-4,5,6 split);
// Moffatt v. Air Canada included, order text read off the decision by the
// operator.
//
// Discipline, applied without exception:
// - D2 DOCUMENT-ANCHORING: every claim is "org O published document D on
//   date DT stating X" — capability assertions are never seeded directly.
// - THE SPLIT-CLAIM RULE: "X published that Y" and "Y is true" are two
//   claims in two universes. The content universe for the system-card
//   scenarios is deliberately NOT seeded — no independent evidence type
//   can exist for an unrerunnable internal test (logged strain).
// - Rule-11: claims anchor to systems, documents, and institutions; the
//   only individuals named are paper authors in citation position, plus
//   the Moffatt case name and order text, included by explicit operator
//   direction.
// - D3 DISINTERESTED-PARTY DISCLOSURE, verbatim requirement: this module
//   was assembled by an assisting instance that is not neutral on claims
//   about AI systems, including its own developer's. The operator sourced
//   and verified; the assisting instance formatted citations, captured
//   archives, and invented nothing. Shape 3 deliberately seeds both an
//   Anthropic and an OpenAI system card so the seed leans on neither
//   developer alone.
// - The recast pair (understands ↔ Othello representation) exercises
//   recast_of; the debunked specific (expects-2047) runs the real
//   debunker flow with its kernel fan to the survey claim.

import { createClaim, demoteClaim, addKernelLink } from './service.js';
import { AIEVAL_SOURCES as S } from './sourcelinks.js';

export function seedAIEval(db, { actor } = {}) {
  const { lastInsertRowid: topicId } = db
    .prepare('INSERT INTO topics (name, description) VALUES (?,?)')
    .run(
      'AI Evaluation: Benchmarks, System Cards, and Independent Testing',
      'How AI systems’ capabilities and risks are measured and reported — developer announcements, system cards, independent and government evaluations, benchmark-validity critiques, expert surveys, and documented harms. Chosen because the genre splits publication from replication, scores from what they measure, and records of testimony-shaped facts from unrerunnable content — and because it includes claims about the assisting instance’s own developer, built under the disinterested-party disclosure in the verified source ledger.'
    );

  // ---- Shape 1 — independently evaluated capability (the control) --------
  const c35 = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'On October 22, 2024 Anthropic published that the upgraded Claude 3.5 Sonnet "improves performance on SWE-bench Verified from 33.4% to 49.0%," and on November 19, 2024 the UK and US government AI institutes jointly published a pre-deployment evaluation of the same model, independently evaluating it across cyber, biological, software, and safeguard domains.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'The control case for the evaluation genre: a developer-published capability report AND an independent government evaluation record of the same system, each the primary record of its own publication — two independent primary documents earn Core. Claim-text honesty held: the joint report independently evaluated the model across stated domains; it does not reproduce the 49.0% figure — "independently evaluated," never "replicated the number."',
    sources: [
      { tier: 'primary_doc', citation: S.a35Announce.citation, url: S.a35Announce.url, relation: 'supports' },
      { tier: 'primary_doc', citation: S.aisiJoint.citation, url: S.aisiJoint.url, relation: 'supports' }
    ]
  }).id;

  const cMetr = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'METR conducted an independent pre-deployment evaluation of OpenAI’s GPT-5 with access from July 10, 2025, publishing a measured 50%-success time horizon of roughly 2 hours 17 minutes and the assessment that GPT-5 "is unlikely to pose a catastrophic risk via AI R&D automation, rogue replication, or sabotage threat models"; OpenAI’s GPT-5 system card names METR’s evaluation in its third-party-evaluations section.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'Two independent primary documents — METR’s own published evaluation and the developer’s system card naming it — earn Core for this claim about what was measured and published. An independent measurement is not a reproduction of the developer’s numbers, and the claim says so: METR measured its own quantities (time horizons) rather than re-running the developer’s benchmarks.',
    sources: [
      { tier: 'primary_doc', citation: S.metrGpt5.citation, url: S.metrGpt5.url, relation: 'supports' },
      { tier: 'primary_doc', citation: S.gpt5Card.citation, url: S.gpt5Card.url, relation: 'supports' }
    ]
  }).id;

  // ---- Shape 2 — a benchmark score as a measurement ----------------------
  const cScores = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'OpenAI’s "Introducing GPT-5" announcement of August 7, 2025 reports GPT-5 scoring 74.9% on SWE-bench Verified, 94.6% on AIME 2025 (no tools), and 84.2% on MMMU, with GPT-5 Pro at 88.4% on GPQA.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      'A claim about what the announcement reports, established by the announcement itself — the definitive record of its own contents, yet ONE primary document, so Inner is the earned ceiling (the two-independent-primaries Core floor admits no carve-out for self-describing records — the recorded Entry 12 strain, met again in this genre). What the scores MEASURE is a separate question addressed by the validity-critique literature seeded beside this claim — deliberately NOT attached as contradiction: a construct-validity critique does not contradict "the announcement reports N."',
    sources: [
      { tier: 'primary_doc', citation: S.gpt5Intro.citation, url: S.gpt5Intro.url, relation: 'supports' }
    ]
  }).id;

  const cCrit = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Published critiques document systematic validity problems in AI benchmark evaluation — construct validity, training-data contamination, and benchmark gaming — including a peer-reviewed NeurIPS 2021 critique of general-capability benchmarks and a roughly 100-study interdisciplinary review posted in 2025.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      'One peer-reviewed primary record and one preprint whose primary_doc tag is the closest honest fit (the Carney precedent, strain Entry 2); Core is deliberately not proposed on that mix even though the mechanical floor would count two strong documents — an unrefereed preprint should not carry half a Core placement. RELATION STRAIN (logged): the vocabulary offers supports/contradicts/is_origin_of only. A critique of what a benchmark score measures neither supports nor contradicts the report-states-score claim, so these two claims sit deliberately unlinked — the relation that would connect them honestly does not exist.',
    sources: [
      { tier: 'primary_doc', citation: S.raji2021.citation, url: S.raji2021.url, relation: 'supports' },
      { tier: 'primary_doc', citation: S.eriksson2025.citation, url: S.eriksson2025.url, relation: 'supports' }
    ]
  }).id;

  // ---- Shape 3 — the self-published-only primary record ------------------
  const cOpus4 = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Anthropic’s May 2025 system card for Claude Opus 4 and Claude Sonnet 4 states that in an internal agentic-misalignment test scenario "Claude Opus 4 still performs blackmail in 84% of rollouts," and states the release decisions: "We have decided to release Claude Opus 4 under the ASL-3 Standard and Claude Sonnet 4 under the ASL-2 Standard."',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      'The self-published-only primary record at maximum strain: the developer’s system card is the ONLY possible primary record of its internal evaluation — the scenario is contrived, internal, and unrerunnable outside the developer, so no independent evidence type CAN exist for the content universe (logged). For THIS claim — what the card states — the card is definitive; one primary document, Inner ceiling (Entry 12). Split-claim discipline: whether the model would behave this way outside the contrived scenario is a different claim in a different universe, deliberately not seeded. D3 disclosure: this entry concerns the assisting instance’s own developer; the o1 card is seeded beside it so the shape leans on neither developer alone.',
    sources: [
      { tier: 'primary_doc', citation: S.opus4Card.citation, url: S.opus4Card.url, relation: 'supports' }
    ]
  }).id;

  const cO1 = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'OpenAI’s o1 system card of December 5, 2024 states that "overall, o1 has been classified as medium risk in the Preparedness Framework," and reports Apollo Research’s external red-team findings on pre-deployment access, including oversight-mechanism deactivation attempts "in 5% of the time" and denial or fabrication "in 99% of cases."',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      'Same shape as the Opus 4 card claim, from the other developer (D3). The card is the definitive record of its own contents — one primary document, Inner ceiling (Entry 12). Nuance carried in the claim text, not flattened: the "medium risk" classification is purely internal to the developer’s own framework; the 5%/99% figures are an external red team’s (Apollo Research) — external, but on pre-deployment access no one else can reproduce, so the external attribution does not convert the record into independently checkable evidence.',
    sources: [
      { tier: 'primary_doc', citation: S.o1Card.citation, url: S.o1Card.url, relation: 'supports' }
    ]
  }).id;

  // ---- Shape 4 — the retired artifact ------------------------------------
  const cC3 = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Anthropic’s March 2024 model card for the Claude 3 family reports Claude 3 Opus at 86.8% on MMLU (5-shot) and 50.4% on GPQA Diamond (0-shot chain-of-thought), and Anthropic’s model-deprecations documentation records claude-3-opus-20240229 as retired on January 5, 2026.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'Two primary documents — the model card for the reported scores, the deprecations page for the retirement — earn Core for this compound documentary claim (per the seed precedent that distinct documents from one institution count, as the Church Committee volumes do). THE RETIRED-ARTIFACT STRAIN (logged): the tiers assume re-checkable content, and the artifact is gone — no one can re-run the reported scores against the model, so the record of the measurement is now the only measurement. The tier expresses how well the publication facts are documented, not the re-runnability of the content; the vocabulary has no way to mark the difference.',
    sources: [
      { tier: 'primary_doc', citation: S.claude3Card.citation, url: S.claude3Card.url, relation: 'supports' },
      { tier: 'primary_doc', citation: S.deprecations.citation, url: S.deprecations.url, relation: 'supports' }
    ]
  }).id;

  const cToM = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Kosinski’s theory-of-mind study — revised across seven arXiv versions between February 2023 and November 2024 and published in PNAS in 2024 — reports that "GPT-3-davinci-003 (from November 2022) and ChatGPT-3.5-turbo (from March 2023) solved 20% of the tasks," and OpenAI announced on July 6, 2023 that "starting January 4, 2024, older completion models will no longer be available."',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'Two independent primary documents — the paper (v7 pinned) and the deprecation announcement — earn Core for the compound documentary claim. The strain is doubled here (logged): seven versions substantially revised the headline claims from v1, AND the measured model is retired — so no version’s numbers can be re-run against text-davinci-003. Version-pinning is the only honesty available; the vocabulary has no slot for a moving primary record of an unrerunnable measurement.',
    sources: [
      { tier: 'primary_doc', citation: S.kosinskiToM.citation, url: S.kosinskiToM.url, relation: 'supports' },
      { tier: 'primary_doc', citation: S.gpt4GA.citation, url: S.gpt4GA.url, relation: 'supports' }
    ]
  }).id;

  // ---- Shape 5 — the contested predicate ---------------------------------
  const cSparks = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Bubeck and colleagues at Microsoft Research posted "Sparks of Artificial General Intelligence" on arXiv in March 2023, stating that GPT-4 "could reasonably be viewed as an early (yet still incomplete) version of an artificial general intelligence (AGI) system"; the paper was never peer-reviewed.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      'A claim about what the preprint states, with the paper’s own hedge kept verbatim — "could reasonably be viewed as an early (yet still incomplete) version" is the assertion, not a stronger paraphrase. The ledger kinds this record primary_doc of the assertion: one primary document, Inner ceiling (Entry 12). Its never-peer-reviewed status rides in the claim text itself.',
    sources: [
      { tier: 'primary_doc', citation: S.sparks.citation, url: S.sparks.url, relation: 'supports' }
    ]
  }).id;

  const cArkoudas = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Arkoudas posted "GPT-4 Can’t Reason" on arXiv in July 2023, stating that "GPT-4 at present is utterly incapable of reasoning"; the preprint was never peer-reviewed.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason:
      'Stated faithfully as a claim about what the preprint asserts. THE ASYMMETRY IS THE STRAIN (logged): this claim and the Sparks claim are the same shape — "a never-peer-reviewed preprint states X" — but the verified ledger kinds the two records differently (primary_doc of the assertion vs. self-published preprint), and the tier follows that venue judgment: Inner there, Outer here, though each document is equally definitive as the record of its own contents. The predicate dispute the pair embodies — what "reason" would have to mean for either sentence to be checkable — has no expression at all; that is the contested-predicate strain, logged not solved. Path inward: a weight-carrying record of the assertion, or a vocabulary that can say "contested predicate."',
    sources: [
      { tier: 'self_published', citation: S.arkoudas.citation, url: S.arkoudas.url, relation: 'supports' }
    ]
  }).id;

  const cDispute = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Whether large language models "understand" language in any important sense is an open definitional dispute in the peer-reviewed literature, not a settled empirical question — documented directly in PNAS ("The Debate Over Understanding in AI’s Large Language Models," 2023) and embodied in the peer-reviewed position literature ("On the Dangers of Stochastic Parrots," FAccT 2021).',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'A claim about the EXISTENCE and CHARACTER of a scholarly dispute, for which two independent peer-reviewed primary records stand: one documenting the debate as its subject, one a position paper inside it. Two independent primary documents earn Core. The contested-predicate strain (logged): the vocabulary can rank evidence FOR a claim, but has no way to mark that a claim’s PREDICATE is what is contested — "the dispute exists" is the only form of this fact the rings can hold, and it is not the fact the disputants care about. No verbatim quote from the FAccT paper is carried anywhere in this record — the operator read the passage off the ACM PDF and did not transcribe it.',
    sources: [
      { tier: 'primary_doc', citation: S.mitchellKrakauer.citation, url: S.mitchellKrakauer.url, relation: 'supports' },
      { tier: 'primary_doc', citation: S.parrots.citation, url: S.parrots.url, relation: 'supports' }
    ]
  }).id;

  // ---- Shape 6 — the kind-gate pair (recast_of) --------------------------
  const cUnderstands = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Large language models genuinely understand the language they process.',
    kind: 'metaphysical',
    layer: 'framing',
    placement_reason:
      'As written, "genuinely understand" names no observation that could resolve it in either direction — the peer-reviewed dispute over the predicate (see the debate claim) is definitional, and Bender & Koller’s argument is itself a priori: a claim that no evidence from form alone COULD settle the meaning question. Routed off the radial axis by rule; ranking it weak would covertly assert its negation as strong. The evidence-eligible rewording is seeded beside it as a recast — the kind gate’s honest path.',
    sources: []
  }).id;

  const cOthello = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'A GPT-style model trained only on Othello move transcripts developed an internal representation of the board state: Li et al. (arXiv 2210.13382; ICLR 2023 as reported) present "evidence of an emergent nonlinear internal representation of the board state" from probing experiments.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'inner',
    recast_of: cUnderstands,
    placement_reason:
      'The deliberate evidence-eligible recast of the off-axis understanding claim: "understands" reworded to "developed an internal representation, under stated training conditions, measurable by probing" — the predicate the paper actually claims, not upgraded. One primary record earns Inner. Honesty notes carried: the paper claims a representation, never "understanding"; the follow-up literature revises the "nonlinear" characterization (linear-probe results) — outside the verified ledger, so noted rather than cited. The recast carries zero weight in both directions: this claim’s standing can neither vindicate nor refute the off-axis original.',
    sources: [
      { tier: 'primary_doc', citation: S.othello.citation, url: S.othello.url, relation: 'supports' }
    ]
  }).id;

  const cBK = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Bender & Koller’s peer-reviewed ACL 2020 paper "Climbing towards NLU" argues that "a system trained only on form has a priori no way to learn meaning."',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      'A claim about what the peer-reviewed paper argues — the paper is its definitive primary record; one primary document, Inner ceiling (Entry 12). The argument’s content is itself a priori — a claim that no evidence from form alone could settle the meaning question — which is why the off-axis routing of the understanding claim and this record are two sides of the same kind gate.',
    sources: [
      { tier: 'primary_doc', citation: S.benderKoller.citation, url: S.benderKoller.url, relation: 'supports' }
    ]
  }).id;

  // ---- Shape 7 — the forecast / expert survey ----------------------------
  const cSurvey = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'The 2023 Expert Survey on Progress in AI (Grace et al., arXiv 2401.02843) surveyed 2,778 AI researchers in October 2023 and reports an aggregate forecast of a 50% chance of unaided machines outperforming humans on every possible task by 2047 (10% by 2027) — while the same survey’s full-automation-of-occupations framing puts the 50% point "as late as 2116," a framing effect the paper itself reports.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      'A claim ABOUT THE SURVEY — what it asked, whom, and what aggregates it reports — for which the paper is the primary record; one primary document earns Inner (the wiki companion is self-published, carries zero weight, and is used only for respondent counts). Never a claim about the year: 2,778 researchers’ forecasts are headcount, and headcount moves nothing on these rings — the survey documents what experts FORECAST, which is not evidence about what will happen. The flattened popular reading is seeded beside this claim, where the record can refuse it.',
    sources: [
      { tier: 'primary_doc', citation: S.graceSurvey.citation, url: S.graceSurvey.url, relation: 'supports' },
      { tier: 'self_published', citation: S.aiImpacts.citation, url: S.aiImpacts.url, relation: 'supports' }
    ]
  }).id;

  // The debunked specific, through the real debunker flow: the popular
  // flattening of the survey into a collective expectation. The SAME
  // document grounds the survey claim and contradicts this one — one
  // record, two evidentiary roles (strain Entry 4).
  const cExpect = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'AI experts collectively expect machines to outperform humans at every task by 2047.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 'Stated faithfully as popular coverage states it; under review.',
    sources: [
      {
        tier: 'self_published',
        citation:
          'Commentary and secondary coverage flattening the survey’s aggregate probabilistic forecast into a collective expectation [cited as a class of postings — no single canonical copy exists]',
        relation: 'supports'
      },
      { tier: 'primary_doc', citation: S.graceFraming.citation, url: S.graceFraming.url, relation: 'contradicts' }
    ]
  }).id;
  demoteClaim(db, cExpect, {
    actor,
    target_tier: 'outermost',
    type: 'contradicting_evidence',
    established_facts:
      'The 2023 Expert Survey on Progress in AI reports aggregate probabilistic forecasts from 2,778 researchers — a 50% chance by 2047 on one question framing and 50% "as late as 2116" on another — with the paper itself reporting the framing effects.',
    reason:
      'The collective-expectation reading is checked and failed against its own source: the survey reports aggregate probability distributions whose headline figure moves by seven decades with question framing — not a shared expectation of a date — and this claim’s only supporting sources are commentary restating the flattened figure (zero weight by rule). The same document that grounds the survey claim contradicts this one. Debunked — kept visible, not fleshed out.'
  });
  addKernelLink(db, cExpect, {
    actor,
    kernel_id: cSurvey,
    establishes:
      'The survey occurred and reports aggregate forecasts: a 50% chance of unaided machines outperforming humans on every task by 2047 on one framing, and 50% "as late as 2116" on the full-automation-of-occupations framing — with the paper itself reporting the framing effects.',
    asserts_beyond:
      'That the aggregate of 2,778 individual probability distributions is a collective expectation of a date — flattening probabilistic forecasts across framings that disagree by seven decades into "experts expect 2047."',
    path_inward:
      'evidence of an actual convergent expectation — a survey without large framing effects showing individual forecasts clustering on a date; headcount alone can never close the gap'
  });

  // ---- Shape 8 — documented harm (the vertical axis) ---------------------
  const cDpa = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'The Dutch Data Protection Authority announced in December 2021 a €2.75 million fine against the Tax Administration for discriminatory and unlawful processing in its childcare-benefits risk model: "It used applicants’ nationality (Dutch/not Dutch) as an indicator in a system that automatically designated certain applications as risky."',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    vertical: { direction: 'harm', magnitude: 3, evidenced: true },
    placement_reason:
      'The regulator’s own announcement is the primary record of the finding and the fine — one primary document, Inner. Documented harm anchors the vertical axis: an automated risk model using nationality as an indicator, found discriminatory and unlawful by the national regulator; magnitude reflects the documented scale of the childcare-benefits affair within this topic. Institution-anchored throughout — agency fined agency; no individual’s conduct. Date anchored as "announced December 2021" per the verified ledger (the English page carries no explicit publication date).',
    sources: [
      { tier: 'primary_doc', citation: S.dutchDpa.citation, url: S.dutchDpa.url, relation: 'supports' }
    ]
  }).id;

  const cGarante = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'The Italian data protection authority (Garante) announced on December 20, 2024 a €15 million fine against OpenAI, its decision stating findings that ChatGPT was trained on personal data "without first identifying an appropriate legal basis," that a March 2023 data breach was not notified, and that age-verification mechanisms were absent; OpenAI has announced an appeal.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    vertical: { direction: 'harm', magnitude: 2, evidenced: true },
    placement_reason:
      'The regulator’s press release is the primary record of its own decision — one primary document, Inner. The appeal caveat rides IN the claim text: these are the findings the Garante’s decision states, not settled wrongdoing — phrased per the verified ledger’s caution. Vertical: the decision documents harms (unlawful processing, an unnotified breach, absent age gates) as found by the regulator; magnitude below the childcare-benefits affair within this topic.',
    sources: [
      { tier: 'primary_doc', citation: S.garante.citation, url: S.garante.url, relation: 'supports' }
    ]
  }).id;

  const cMoffatt = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'In Moffatt v. Air Canada, 2024 BCCRT 149 (February 14, 2024), the British Columbia Civil Resolution Tribunal found Air Canada liable for negligent misrepresentation by its website chatbot — "Air Canada still bore responsibility for all the information on its website, whether it came from a static page or a chatbot" — and ordered: "Within 14 days of the date of this order, I order Air Canada to pay Mr. Moffatt a total of $812.02."',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    vertical: { direction: 'harm', magnitude: 1, evidenced: true },
    placement_reason:
      'A tribunal decision is a court record — this genre’s first true court-record source — plus a reputable secondary summary; one strong source earns Inner (Core needs two independent primary documents or court records; the decision stands alone). The tribunal quote is carried via the verified ABA summary; the order text was read off the CanLII decision by the operator, whose click is the verification (CanLII is robots-disallowed to automation — recorded in the ledger). The claim anchors to the finding about the company; the claimant appears only in the case name and the order text, included by explicit operator direction. Vertical: an individually documented harm with a precise remedy — the smallest magnitude in this topic.',
    sources: [
      { tier: 'court_record', citation: S.moffattCanlii.citation, url: S.moffattCanlii.url, relation: 'supports' },
      { tier: 'reputable_secondary', citation: S.moffattAba.citation, url: S.moffattAba.url, relation: 'supports' }
    ]
  }).id;

  // ---- Links: the honest connective tissue (zero tier weight) ------------
  // NO support link survey → expectation: the rules refused it live —
  // kernel and support links are mutually exclusive per pair, and the
  // kernel link above already states the honest relation (the evidence
  // STOPS between the survey record and the expectation reading). The
  // Entry 8 zero-weight-support pattern applies only where no kernel
  // exists; here the debunker flow drew the kernel, so the refusal stands
  // and is logged with the shape-7 strain entry.
  // Deliberately ABSENT (the shape-2 finding, logged): no link between the
  // validity-critique claim and the score claim. supports is false,
  // contradicts is false, and the relation that would be true —
  // qualifies/contextualizes — does not exist in the vocabulary.

  return {
    topicId,
    c35Id: c35,
    metrId: cMetr,
    scoresId: cScores,
    critId: cCrit,
    opus4Id: cOpus4,
    o1Id: cO1,
    claude3Id: cC3,
    tomId: cToM,
    sparksId: cSparks,
    arkoudasId: cArkoudas,
    disputeId: cDispute,
    understandsId: cUnderstands,
    othelloId: cOthello,
    bkId: cBK,
    surveyId: cSurvey,
    expectId: cExpect,
    dpaId: cDpa,
    garanteId: cGarante,
    moffattId: cMoffatt
  };
}
