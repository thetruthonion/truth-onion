// SPDX-License-Identifier: AGPL-3.0-only
// The rules layer. Every write that could change a claim's standing runs
// through here. There is no override path — the UI never gets to decide.

export const TIERS = ['core', 'inner', 'middle', 'outer', 'outermost'];
export const KINDS = ['empirical', 'metaphysical', 'historical'];
export const LAYERS = ['factual', 'moral', 'framing'];
export const SOURCE_TIERS = [
  'primary_doc',
  'court_record',
  'reputable_secondary',
  'single_outlet',
  'self_published',
  'anonymous'
];
// is_origin_of marks the source that COINED the claim. It contributes zero
// promotional weight — a claim's origin citing itself is adjacent to
// self-assertion. It exists for honest provenance display only.
export const RELATIONS = ['supports', 'contradicts', 'is_origin_of'];
// kernel_of (Stage 2.9) is a CLAIM-to-claim relation: an outer claim pointing
// at its nearest established kernel. Zero evidentiary weight, exactly like
// is_origin_of — it can never move a tier, never count as support, never
// satisfy a placement requirement. It shows where the evidence stops; it does
// not support the claim that carries it.
export const KERNEL_RELATION = 'kernel_of';
export const CHALLENGE_TYPES = [
  'bad_source',
  'contradicting_evidence',
  'equivocation',
  'mis_tiered',
  'layer_mismatch',
  // 2.99b: the claim's KIND is wrong as written (empirical ↔ metaphysical
  // ↔ historical). Two-phase only — the single-shot challenge path refuses
  // it; see proposeKindChallenge/adjudicateKindChallenge.
  'kind_mismatch'
];
export const CHALLENGE_OUTCOMES = ['upheld', 'rejected'];

// 2.99b: the adjudication standard for kind_mismatch — the gate's own
// resolvability test, restated wherever the challenge surfaces. Not "is
// the topic respectable," not "does evidence currently exist" — could it.
export const KIND_ADJUDICATION_STANDARD =
  'The resolvability test: could the tool\'s evidence types — documents, court records, reporting, data — bear on this exact sentence, in either direction? Not whether such evidence currently exists; whether it could.';

// The one honest path when any other write tries to move kind.
export const KIND_IMMUTABLE_MESSAGE =
  'Kind changes only through an upheld kind_mismatch challenge — raise one and state which evidence type could bear on this sentence.';
export const DIRECTIONS = ['help', 'harm', 'neutral'];

export function rank(tier) {
  const i = TIERS.indexOf(tier);
  return i === -1 ? 99 : i;
}

// A source carries weight only if it supports the claim, is not the
// claimant's own publication (self-assertion scores zero), and is not
// anonymous or self-published. Everything else is a restatement, not evidence.
// The relation check also guarantees kernel_of can never carry weight even if
// a kernel link were ever mis-shaped into a source object — only 'supports'
// weighs anything, here and nowhere else.
export function carriesWeight(source) {
  return (
    source.relation === 'supports' &&
    !source.is_claimant_self_published &&
    source.tier !== 'anonymous' &&
    source.tier !== 'self_published'
  );
}

// ---- Stage 2.9: kernel-link rules -----------------------------------------
// The full review for creating a kernel link. Returns { rule, reason }
// failures; empty means the link may exist. Placement functions never read
// kernel links (zero weight is structural), and this function never reads
// evidence (a kernel link cannot be earned — only stated honestly).
export function kernelLinkFailures({ outer, kernel, gap = {} }) {
  const failures = [];
  if (!outer || !kernel) {
    failures.push({ rule: 'invalid_input', reason: 'Both claims must exist.' });
    return failures;
  }
  if (outer.id === kernel.id) {
    failures.push({
      rule: 'invalid_input',
      reason: 'A claim cannot be its own kernel.'
    });
    return failures;
  }
  if (outer.kind === 'metaphysical' || kernel.kind === 'metaphysical') {
    failures.push({
      rule: 'metaphysical_off_axis',
      reason:
        'Metaphysical claims sit off the radial axis — they can neither overreach from a kernel nor serve as one.'
    });
    return failures;
  }
  if (rank(kernel.radial_tier) >= rank(outer.radial_tier)) {
    failures.push({
      rule: 'kernel_must_be_inward',
      reason: `A kernel is the established ground a claim overreaches from — it must sit strictly inward. "${truncate(kernel.text)}" sits at ${kernel.radial_tier}; this claim sits at ${outer.radial_tier}.`
    });
  }
  // The gap statement is the payload, not paperwork. Refusal names the
  // missing piece — "no" is useless without "because of this".
  const missing = [];
  if (!gap.establishes || !String(gap.establishes).trim()) missing.push('what the kernel establishes');
  if (!gap.asserts_beyond || !String(gap.asserts_beyond).trim()) missing.push('what this claim asserts beyond it');
  if (!gap.path_inward || !String(gap.path_inward).trim()) missing.push('the path inward (what evidence would close the gap)');
  if (missing.length) {
    failures.push({
      rule: 'gap_statement_required',
      reason: `A kernel link requires a gap statement; missing: ${missing.join('; ')}.`
    });
  }
  return failures;
}

export function tallySources(sources) {
  const weighted = sources.filter(carriesWeight);
  const strong = weighted.filter(
    (s) => s.tier === 'primary_doc' || s.tier === 'court_record'
  ).length;
  const reputable = weighted.filter((s) => s.tier === 'reputable_secondary').length;
  const single = weighted.filter((s) => s.tier === 'single_outlet').length;
  const zeroWeight = sources.filter(
    (s) => s.relation === 'supports' && !carriesWeight(s)
  ).length;
  const contradictingSources = sources.filter(
    (s) =>
      s.relation === 'contradicts' &&
      !s.is_claimant_self_published &&
      ['primary_doc', 'court_record', 'reputable_secondary'].includes(s.tier)
  );
  return {
    strong,
    reputable,
    single,
    zeroWeight,
    contradictingSources,
    credibleContradictions: contradictingSources.length
  };
}

const tally = tallySources;

function zeroWeightNote(t) {
  if (t.zeroWeight === 0) return '';
  const one = t.zeroWeight === 1;
  return ` (${t.zeroWeight} of its sources ${one ? 'is' : 'are'} anonymous or self-published and ${one ? 'carries' : 'carry'} zero weight)`;
}

// What the evidence attached to a claim actually earns at a given tier.
// Returns a plain-language reason string, or null if the tier is earned.
export function evidenceFailure(targetTier, sources) {
  const t = tally(sources);
  switch (targetTier) {
    case 'core':
      if (t.strong < 2) {
        return `Core requires at least two independent primary documents or court records; this claim has ${t.strong}${zeroWeightNote(t)}.`;
      }
      if (t.credibleContradictions > 0) {
        // Name the blocker: the user must know WHICH source stands in the way.
        const named = t.contradictingSources
          .map((s) => `"${truncate(s.citation, 80)}"`)
          .join(', ');
        return `Credible contradicting evidence is on record: ${named} — a claim cannot sit in Core while that stands unresolved.`;
      }
      return null;
    case 'inner':
      if (t.strong >= 1 || t.reputable >= 2) return null;
      return `Inner requires at least one primary document or court record, or two reputable secondary sources; this claim has ${t.strong} primary and ${t.reputable} reputable secondary${zeroWeightNote(t)}.`;
    case 'middle':
      if (t.strong >= 1 || t.reputable >= 1 || t.single >= 2) return null;
      return `Middle requires at least one reputable secondary source (or two independent single-outlet reports); this claim has none that carry weight${zeroWeightNote(t)}.`;
    default:
      // outer and outermost are the honest home of weak claims — no bar.
      return null;
  }
}

// Full placement review for a claim at a target tier. Returns an array of
// { rule, reason } failures; empty array means the placement survives.
// `db` and `claimId` are optional — pass them to also check support links.
export function placementFailures({ kind, layer, targetTier, sources, db, claimId }) {
  const failures = [];

  if (kind === 'metaphysical') {
    failures.push({
      rule: 'metaphysical_off_axis',
      reason:
        'This is a metaphysical claim — it cannot be resolved by documents or observation in either direction, so it cannot be placed on the rings at all. It belongs in the "not empirically decidable" list.'
    });
    return failures;
  }

  if (!TIERS.includes(targetTier)) {
    failures.push({ rule: 'invalid_tier', reason: `Unknown tier "${targetTier}".` });
    return failures;
  }

  if (targetTier === 'core' && (layer === 'moral' || layer === 'framing')) {
    failures.push({
      rule: 'no_moral_or_framing_in_core',
      reason:
        layer === 'moral'
          ? 'This is a moral claim — a value judgment. It can be held and attributed, but it cannot sit in the factual Core, no matter how strongly held or how well the underlying facts are sourced.'
          : 'This is a framing claim — it adds characterization beyond what the facts carry. It cannot sit in the factual Core.'
    });
  }

  const ev = evidenceFailure(targetTier, sources);
  if (ev) failures.push({ rule: 'insufficient_evidence', reason: ev });

  // Outer cannot feed inner: a claim may not rest on supporters weaker than
  // the tier it wants to occupy. When the supporter lives in another topic,
  // say so — the user has to know which onion to look in.
  if (db && claimId != null) {
    const ownTopic = db.prepare('SELECT topic_id FROM claims WHERE id = ?').get(claimId);
    const supporters = db
      .prepare(
        `SELECT c.id, c.text, c.radial_tier, c.topic_id, t.name AS topic_name
         FROM claim_supports cs
         JOIN claims c ON c.id = cs.supporter_id
         JOIN topics t ON t.id = c.topic_id
         WHERE cs.supported_id = ?`
      )
      .all(claimId);
    for (const s of supporters) {
      if (rank(s.radial_tier) > rank(targetTier)) {
        const where =
          ownTopic && s.topic_id !== ownTopic.topic_id
            ? `${s.radial_tier} in the ${s.topic_name} topic`
            : s.radial_tier;
        failures.push({
          rule: 'outer_cannot_feed_inner',
          reason: `This claim relies on "${truncate(s.text)}", which sits at ${where} — a claim cannot be supported by one in a weaker tier.`
        });
      }
    }
  }

  return failures;
}

// The innermost tier this claim's evidence currently earns.
export function earnedTier({ kind, layer, sources, db, claimId }) {
  if (kind === 'metaphysical') return null;
  for (const tier of TIERS) {
    if (
      placementFailures({ kind, layer, targetTier: tier, sources, db, claimId })
        .length === 0
    ) {
      return tier;
    }
  }
  return 'outermost';
}

// Tier-requirements preview: the floor, never the promise. floor_met is
// computed from the SAME placementFailures call the promotion battery runs,
// so there is no path where the preview green-lights a promotion the battery
// would refuse — they cannot diverge because they are one function.
export function tierPreview({ kind, layer, sources, db, claimId, currentTier }) {
  if (kind === 'metaphysical' || !currentTier) return [];
  const t = tallySources(sources);
  const inwardTiers = TIERS.filter((tier) => rank(tier) < rank(currentTier));
  return inwardTiers.map((tier) => {
    const failures = placementFailures({ kind, layer, targetTier: tier, sources, db, claimId });
    const supportsOk = !failures.some((f) => f.rule === 'outer_cannot_feed_inner');
    const checks = [];
    if (tier === 'core') {
      if (layer !== 'factual') {
        checks.push({ label: `${layer} claims cannot occupy Core — barred by rule`, met: false });
      }
      checks.push({
        label: `≥ 2 primary documents / court records — you have ${t.strong}`,
        met: t.strong >= 2
      });
      checks.push({
        label: `no unresolved credible contradictions — you have ${t.credibleContradictions}`,
        met: t.credibleContradictions === 0
      });
    } else if (tier === 'inner') {
      checks.push({
        label: `≥ 1 primary/court record (you have ${t.strong}) — or ≥ 2 reputable secondary (you have ${t.reputable})`,
        met: t.strong >= 1 || t.reputable >= 2
      });
    } else if (tier === 'middle') {
      checks.push({
        label: `≥ 1 primary/court (you have ${t.strong}) or ≥ 1 reputable secondary (you have ${t.reputable}) or ≥ 2 single-outlet (you have ${t.single})`,
        met: t.strong >= 1 || t.reputable >= 1 || t.single >= 2
      });
    } else {
      checks.push({ label: 'no evidence bar — the honest home of weak claims', met: true });
    }
    checks.push({
      label: `no supporting claims weaker than ${tier}`,
      met: supportsOk
    });
    return {
      tier,
      floor_met: failures.length === 0,
      checks,
      failures: failures.map((f) => f.reason)
    };
  });
}

// ---- Stage 2.9d: topic-shape gate ----------------------------------------
// A topic is a SUBJECT — an entity, program, event, or area of inquiry — not
// a proposition. These are deterministic HEURISTICS: they catch the obvious
// claim-shapes, not all possible ones, and every refusal says so. No LLM in
// the rules layer, ever. Enforced here, not in the UI: a UI-only check is
// decoration; enforcement lives where writes happen.
const QUESTION_START =
  /^(is|are|was|were|do|does|did|can|could|will|would|should|has|have|had|why|how|who|whom|when|where|what|which)\b/i;
const COPULA = /\b(is|are|was|were)\b/i;
const CAUSAL =
  /\b(causes?|caused|causing|proves?|proved|proven|means|meant|shows?|showed|shown|demonstrates?|demonstrated|implies|implied|leads?\s+to|led\s+to|results?\s+in|resulted\s+in)\b/i;

export function topicShapeFailures(name) {
  const t = String(name || '').trim();
  if (!t) return [];
  const problems = [];
  if (/[.!?]+$/.test(t)) {
    problems.push('it ends in sentence punctuation — a subject is a name, not a sentence');
  }
  if (QUESTION_START.test(t) || /\?/.test(t)) {
    problems.push('it reads as a question');
  }
  // The copula check skips the first word so "Is God real?" is caught by the
  // question check (its own reason) while names never trip on a leading word.
  const afterFirstWord = t.replace(/^\S+\s*/, '');
  if (COPULA.test(afterFirstWord)) {
    problems.push('it has "X is/are/was/were Y" shape — that asserts something about a subject');
  }
  if (CAUSAL.test(t)) {
    problems.push('it uses a causal or propositional verb (causes/proves/means/shows/…) — that is a claim doing work');
  }
  if (problems.length === 0) return [];
  return [
    {
      rule: 'topic_reads_as_claim',
      reason:
        `"${truncate(t, 80)}" reads as a claim, not a subject: ${problems.join('; ')}. ` +
        `Topics are what claims are ABOUT. Name the subject instead — for "Christ is God", ` +
        `create a topic like "God" or "Christian theology" and add this sentence as a claim there, ` +
        `where it can earn a place on the rings. (This check is a heuristic: it catches obvious ` +
        `claim-shapes, not every possible one.)`
    }
  ];
}

// Vertical placement (help/harm) requires documented outcomes, never conviction.
export function verticalFailure({ direction, magnitude, evidenced }, sources) {
  if (!DIRECTIONS.includes(direction)) {
    return `Unknown vertical direction "${direction}".`;
  }
  if (direction === 'neutral') return null;
  if (!evidenced) {
    return `Vertical placement (${direction}) requires documented outcomes. Mark it evidenced and attach sources — conviction alone cannot move a claim up or down.`;
  }
  if (!sources.some(carriesWeight)) {
    return `Vertical placement (${direction}) is marked evidenced, but no attached source carries weight — anonymous or self-published sources cannot document an outcome.`;
  }
  const m = Number(magnitude);
  if (!Number.isInteger(m) || m < 1 || m > 3) {
    return 'Vertical magnitude must be 1, 2, or 3.';
  }
  return null;
}

// ---- Stage 2.99a: simulated-persona standing gates ------------------------
// Three PRESET personas let one visitor exercise the multiplayer safety
// machinery inside their private sandbox copy before multiplayer exists.
// The permission table below is PROVISIONAL — illustrative of Stage 3,
// thresholds not final — and standing is preset for demonstration, never
// earned; that honesty label ships everywhere personas surface.
//
// The gates live HERE, in the rules layer, because the sandbox UI renders
// refusals and never pre-decides them — same as every other rule. The
// engine's own seat (actor 'local', or any non-persona actor) is ungated:
// these gates activate only for the simulated personas, so sandbox and
// engine remain the same code path with the same refusals everywhere else.
export const PERSONAS = ['curator', 'contributor', 'reviewer'];
export const PERSONA_HONESTY_LABEL =
  'simulated role · standing preset for demonstration, not earned; real standing rules arrive with multiplayer';

// Operations only the Curator seat may perform in the provisional table.
// Contributor and Reviewer may add claims and sources through the rules,
// file challenges, and propose withdrawals; Reviewer may also adjudicate
// proposals filed by OTHER actors.
const CURATOR_ONLY_OPS = new Set([
  'promote',
  'demote',
  'set_vertical',
  'create_kernel_link',
  'add_support_link',
  'create_topic',
  'import_topic'
]);

// personaGateFailures({actor, operation, proposer, outcome}) → [{reason}].
// `proposer` is the actor who filed the proposal being adjudicated (read
// from the event log — the record, not a new column); `outcome` is the
// adjudication outcome sought. Retraction of one's own proposal (rejecting
// it) stays permitted; upholding one's own is the first in-code enforcement
// of the proposer-never-upholds rule.
export function personaGateFailures({ actor, operation, proposer, outcome } = {}) {
  if (!PERSONAS.includes(actor) || actor === 'curator') return [];
  if (operation === 'adjudicate') {
    if (actor === 'contributor') {
      return [
        {
          reason:
            `Contributor standing (${PERSONA_HONESTY_LABEL}) adjudicates nothing — it may add claims and sources, file challenges, and propose withdrawals. Adjudication needs Reviewer or Curator standing.`
        }
      ];
    }
    if (actor === 'reviewer' && proposer === actor && outcome === 'upheld') {
      return [
        {
          reason:
            'The proposer never upholds their own proposal: this withdrawal was filed by the same Reviewer now adjudicating it. Retracting your own proposal (rejecting it) stays permitted; upholding it needs a different actor.'
        }
      ];
    }
    return [];
  }
  if (CURATOR_ONLY_OPS.has(operation)) {
    return [
      {
        reason:
          `${operation.replace(/_/g, ' ')} is Curator-seat machinery in this provisional table (illustrative of Stage 3, thresholds not final). ${actor === 'reviewer' ? 'Reviewer' : 'Contributor'} standing (${PERSONA_HONESTY_LABEL}) may add claims and sources through the rules, file challenges, and propose withdrawals${actor === 'reviewer' ? ', and adjudicate proposals filed by other actors' : ''}.`
      }
    ];
  }
  return [];
}

// Status is derived from standing, never set directly — one less thing to fake.
export function statusFor(tier) {
  if (tier === 'core') return 'confirmed';
  if (tier === 'outermost') return 'refuted';
  return 'contested';
}

export function truncate(text, n = 60) {
  return text.length > n ? text.slice(0, n - 1) + '…' : text;
}

export class RuleError extends Error {
  constructor(message, { rule = 'rule_violation', earned_tier } = {}) {
    super(message);
    this.status = 422;
    this.rule = rule;
    this.earned_tier = earned_tier;
  }
}
