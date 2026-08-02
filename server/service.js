// All writes go through this module. Tier changes happen in exactly three
// places — createClaim, promoteClaim (must survive the automatic challenge
// battery), and demote (outward only). There is no direct tier setter.

import {
  TIERS,
  KINDS,
  LAYERS,
  SOURCE_TIERS,
  RELATIONS,
  KERNEL_RELATION,
  CHALLENGE_TYPES,
  rank,
  placementFailures,
  earnedTier,
  tierPreview,
  verticalFailure,
  kernelLinkFailures,
  topicShapeFailures,
  statusFor,
  truncate,
  RuleError
} from './rules.js';
import { getClaim, getTopicClaims, getTopicSources } from './db.js';

// Stage 2.9 (audit F): every state-changing operation appends to the event
// log — actor, timestamp, reason. 2.95's replay is only as honest as this;
// the table itself refuses UPDATE/DELETE.
function logEvent(db, { actor = 'local', action, claim_id = null, topic_id = null, detail = '', reason }) {
  db.prepare(
    'INSERT INTO events (actor, action, claim_id, topic_id, detail, reason) VALUES (?,?,?,?,?,?)'
  ).run(actor, action, claim_id, topic_id, String(detail || ''), String(reason).trim());
}

export function listEvents(db, { claimId, topicId } = {}) {
  if (claimId != null) {
    return db.prepare('SELECT * FROM events WHERE claim_id = ? ORDER BY id').all(claimId);
  }
  if (topicId != null) {
    return db.prepare('SELECT * FROM events WHERE topic_id = ? ORDER BY id').all(topicId);
  }
  return db.prepare('SELECT * FROM events ORDER BY id').all();
}

function reject(failures, earned) {
  const first = failures[0];
  throw new RuleError(failures.map((f) => f.reason).join(' '), {
    rule: first.rule,
    earned_tier: earned
  });
}

// Re-entrant transactions via savepoints, so composite operations (ripple
// deletes, imports) can reuse the single-claim primitives safely.
let txDepth = 0;
function tx(db, fn) {
  const sp = `sp_${txDepth++}`;
  db.exec(`SAVEPOINT ${sp}`);
  try {
    const out = fn();
    db.exec(`RELEASE ${sp}`);
    return out;
  } catch (e) {
    db.exec(`ROLLBACK TO ${sp}`);
    db.exec(`RELEASE ${sp}`);
    throw e;
  } finally {
    txDepth--;
  }
}

function validateSourceFields(src) {
  if (!SOURCE_TIERS.includes(src.tier)) {
    throw new RuleError(`Unknown source tier "${src.tier}".`, { rule: 'invalid_input' });
  }
  if (!src.citation || !String(src.citation).trim()) {
    throw new RuleError('Every source needs a citation.', { rule: 'invalid_input' });
  }
}

function validateRelation(relation) {
  if (relation === KERNEL_RELATION) {
    // Refuse by name: kernel_of connects claims, not sources, and weighs
    // nothing either way — routing it through a source attachment would be
    // the reverse halo wearing an evidence costume.
    throw new RuleError(
      'kernel_of is a claim-to-claim relation and carries zero evidentiary weight — it cannot be attached as a source relation. Link the claims instead.',
      { rule: 'invalid_input' }
    );
  }
  if (!RELATIONS.includes(relation)) {
    throw new RuleError(
      `Source relation must be one of: ${RELATIONS.join(', ')}.`,
      { rule: 'invalid_input' }
    );
  }
}

// Library sources are one entity with many attachments — never copies.
// Textually identical citations within a topic resolve to the same entity.
function findOrCreateSource(db, topicId, src) {
  validateSourceFields(src);
  const citation = String(src.citation).trim();
  // 2.98b: withdrawn library entries never silently revive through
  // find-or-create — an identical citation becomes a NEW active entity; the
  // withdrawn one keeps its state and its reason.
  const existing = db
    .prepare(
      'SELECT * FROM sources WHERE topic_id = ? AND citation = ? AND withdrawn_at IS NULL LIMIT 1'
    )
    .get(topicId, citation);
  if (existing) return existing.id;
  return db
    .prepare(
      'INSERT INTO sources (topic_id, tier, citation, url, is_claimant_self_published) VALUES (?,?,?,?,?)'
    )
    .run(topicId, src.tier, citation, src.url || '', src.is_claimant_self_published ? 1 : 0)
    .lastInsertRowid;
}

function attachSource(db, claimId, sourceId, relation) {
  validateRelation(relation);
  const lib = db.prepare('SELECT withdrawn_at FROM sources WHERE id = ?').get(sourceId);
  if (lib?.withdrawn_at != null) {
    throw new RuleError(
      'That source is withdrawn from the library — withdrawn evidence cannot be newly attached.',
      { rule: 'invalid_input' }
    );
  }
  const dup = db
    .prepare('SELECT withdrawn_at FROM claim_sources WHERE claim_id = ? AND source_id = ?')
    .get(claimId, sourceId);
  if (dup && dup.withdrawn_at == null) {
    throw new RuleError('That source is already attached to this claim.', {
      rule: 'invalid_input'
    });
  }
  if (dup) {
    // Re-attaching a withdrawn attachment revives the row — the withdrawal
    // stays on the record via its event; the attachment is active again.
    db.prepare(
      'UPDATE claim_sources SET relation = ?, withdrawn_at = NULL, withdrawn_reason = NULL WHERE claim_id = ? AND source_id = ?'
    ).run(relation, claimId, sourceId);
    return;
  }
  db.prepare('INSERT INTO claim_sources (claim_id, source_id, relation) VALUES (?,?,?)').run(
    claimId,
    sourceId,
    relation
  );
}

// Resolve a mixed sources payload (inline definitions or {source_id}) into
// hydrated-source shape for the rules, WITHOUT writing anything yet.
function resolveSourcesPayload(db, topicId, entries) {
  return entries.map((e) => {
    validateRelation(e.relation || 'supports');
    if (e.source_id != null) {
      const src = db.prepare('SELECT * FROM sources WHERE id = ?').get(e.source_id);
      if (!src) throw new RuleError('No such source in the library.', { rule: 'invalid_input' });
      if (src.topic_id !== topicId) {
        throw new RuleError('That source belongs to another topic\'s library.', {
          rule: 'invalid_input'
        });
      }
      return {
        source_id: src.id,
        tier: src.tier,
        citation: src.citation,
        url: src.url,
        relation: e.relation || 'supports',
        is_claimant_self_published: !!src.is_claimant_self_published
      };
    }
    validateSourceFields(e);
    return {
      source_id: null,
      tier: e.tier,
      citation: String(e.citation).trim(),
      url: e.url || '',
      relation: e.relation || 'supports',
      is_claimant_self_published: !!e.is_claimant_self_published
    };
  });
}

function normVertical(v = {}) {
  return {
    direction: v.direction || 'neutral',
    magnitude: v.direction && v.direction !== 'neutral' ? Number(v.magnitude ?? 1) : 0,
    evidenced: !!v.evidenced
  };
}

export function createTopic(db, { name, description }) {
  if (!name || !String(name).trim()) {
    throw new RuleError('A topic needs a name.', { rule: 'invalid_input' });
  }
  // 2.9d topic-shape gate: a topic is a subject, not a proposition. The
  // rules refuse claim-shaped names no matter which client submits them;
  // the UI only renders this refusal, it never pre-decides it.
  const shape = topicShapeFailures(name);
  if (shape.length) reject(shape, undefined);
  const exists = db
    .prepare('SELECT 1 FROM topics WHERE lower(name) = lower(?)')
    .get(String(name).trim());
  if (exists) {
    throw new RuleError(`A topic named "${String(name).trim()}" already exists.`, {
      rule: 'invalid_input'
    });
  }
  const { lastInsertRowid: id } = db
    .prepare('INSERT INTO topics (name, description) VALUES (?,?)')
    .run(String(name).trim(), String(description || '').trim());
  logEvent(db, {
    action: 'topic_created',
    topic_id: Number(id),
    reason: `Topic "${String(name).trim()}" created.`
  });
  return db.prepare('SELECT * FROM topics WHERE id = ?').get(id);
}

export function createClaim(db, p) {
  if (!p.text || !String(p.text).trim()) {
    throw new RuleError('A claim needs text.', { rule: 'invalid_input' });
  }
  if (!KINDS.includes(p.kind)) {
    throw new RuleError(`Kind must be one of: ${KINDS.join(', ')}.`, { rule: 'invalid_input' });
  }
  if (!LAYERS.includes(p.layer)) {
    throw new RuleError(`Layer must be one of: ${LAYERS.join(', ')}.`, { rule: 'invalid_input' });
  }
  if (!p.placement_reason || !String(p.placement_reason).trim()) {
    throw new RuleError(
      'Every claim carries a placement_reason — say why it sits where it sits (or what is missing).',
      { rule: 'placement_reason_required' }
    );
  }
  const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(p.topic_id);
  if (!topic) throw new RuleError('Unknown topic.', { rule: 'invalid_input' });

  const sources = resolveSourcesPayload(db, p.topic_id, p.sources || []);

  let tier = null;
  if (p.kind === 'metaphysical') {
    if (p.radial_tier) {
      // The user tried to put a metaphysical claim on the rings. Say no.
      reject(
        placementFailures({ kind: p.kind, layer: p.layer, targetTier: p.radial_tier, sources }),
        null
      );
    }
  } else {
    tier = p.radial_tier;
    if (!TIERS.includes(tier)) {
      throw new RuleError(`Pick a radial tier: ${TIERS.join(', ')}.`, { rule: 'invalid_input' });
    }
    const failures = placementFailures({ kind: p.kind, layer: p.layer, targetTier: tier, sources });
    if (failures.length) {
      reject(failures, earnedTier({ kind: p.kind, layer: p.layer, sources }));
    }
  }

  const vertical = normVertical(p.vertical);
  const vErr = verticalFailure(vertical, sources);
  if (vErr) throw new RuleError(vErr, { rule: 'vertical_requires_evidence' });

  return tx(db, () => {
    const { lastInsertRowid: id } = db
      .prepare(
        `INSERT INTO claims
         (topic_id, text, kind, layer, radial_tier, vertical_direction,
          vertical_magnitude, vertical_evidenced, status, placement_reason)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        p.topic_id,
        String(p.text).trim(),
        p.kind,
        p.layer,
        tier,
        vertical.direction,
        vertical.magnitude,
        vertical.evidenced ? 1 : 0,
        statusFor(tier),
        String(p.placement_reason).trim()
      );
    for (const s of sources) {
      const sourceId = s.source_id ?? findOrCreateSource(db, p.topic_id, s);
      attachSource(db, id, sourceId, s.relation);
    }
    // Placement inward of "outer" counts as a promotion and must survive the
    // automatic review; record that survival on the claim's record.
    if (tier && rank(tier) < rank('outer')) {
      db.prepare(
        `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change)
         VALUES (?,?,?,?,?)`
      ).run(
        id,
        'mis_tiered',
        `Automatic placement review at "${tier}": evidence requirements met; claim survived.`,
        'rejected',
        `placed at ${tier}`
      );
    }
    logEvent(db, {
      actor: p.actor,
      action: 'claim_created',
      claim_id: Number(id),
      topic_id: p.topic_id,
      detail: `placed at ${tier ?? 'off-axis (metaphysical)'}`,
      reason: String(p.placement_reason).trim()
    });
    return getClaim(db, id);
  });
}

export function promoteClaim(db, claimId, targetTier) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  if (claim.kind === 'metaphysical') {
    throw new RuleError(
      'This is a metaphysical claim — it has no radial tier and cannot be promoted onto the rings.',
      { rule: 'metaphysical_off_axis' }
    );
  }
  if (!TIERS.includes(targetTier) || rank(targetTier) >= rank(claim.radial_tier)) {
    throw new RuleError(
      `Promotion must move inward. This claim sits at ${claim.radial_tier}.`,
      { rule: 'invalid_input' }
    );
  }

  const failures = placementFailures({
    kind: claim.kind,
    layer: claim.layer,
    targetTier,
    sources: claim.sources,
    db,
    claimId
  });
  const earned = earnedTier({
    kind: claim.kind,
    layer: claim.layer,
    sources: claim.sources,
    db,
    claimId
  });

  if (failures.length) {
    // The promotion attempt IS a challenge, and the challenge was upheld:
    // the claim does not belong at the target tier. Record the pushback.
    db.prepare(
      `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change)
       VALUES (?,?,?,?,?)`
    ).run(
      claimId,
      'mis_tiered',
      `Promotion review to "${targetTier}" failed: ${failures.map((f) => f.reason).join(' ')}`,
      'upheld',
      `stays at ${claim.radial_tier}`
    );
    logEvent(db, {
      action: 'promotion_failed',
      claim_id: claimId,
      topic_id: claim.topic_id,
      detail: `stays at ${claim.radial_tier}; target was ${targetTier}`,
      reason: failures.map((f) => f.reason).join(' ')
    });
    reject(failures, earned);
  }

  return tx(db, () => {
    db.prepare(
      `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change)
       VALUES (?,?,?,?,?)`
    ).run(
      claimId,
      'mis_tiered',
      `Promotion review to "${targetTier}": evidence requirements met; claim survived challenge.`,
      'rejected',
      `${claim.radial_tier} → ${targetTier}`
    );
    // A promotion can close the very gap a kernel link records: if this claim
    // rises to (or past) its kernel's tier, the "evidence stops here" premise
    // is falsified and the link is severed, recorded — never silently kept as
    // a lie, never allowed to block the earned move (zero weight cuts both
    // ways). The schema trigger backstops the direction rule.
    const severedKernels = severInvalidKernelLinks(db, claim, targetTier, `promotion to ${targetTier}`);
    db.prepare('UPDATE claims SET radial_tier = ?, status = ? WHERE id = ?').run(
      targetTier,
      statusFor(targetTier),
      claimId
    );
    logEvent(db, {
      action: 'promotion',
      claim_id: claimId,
      topic_id: claim.topic_id,
      detail: `${claim.radial_tier} → ${targetTier}`,
      reason: `Promotion review to "${targetTier}": evidence requirements met; claim survived challenge.`
    });
    const result = getClaim(db, claimId);
    return severedKernels.length ? { ...result, severed_kernel_links: severedKernels } : result;
  });
}

// Sever kernel links a tier move would invalidate (direction must stay
// strictly kernel-inward-of-outer), inside the caller's transaction, each
// removal recorded in the event log with the move as its reason.
// 2.98b: a departing kernel link takes its authored gap statement into the
// event record, so replay can render it verbatim instead of a placeholder.
function kernelGapDetail(l) {
  return `kernel was #${l.kernel_id} — establishes: ${l.gap_establishes} — asserts beyond: ${l.gap_asserts_beyond} — path inward: ${l.gap_path_inward}`;
}

function severInvalidKernelLinks(db, claim, newTier, why) {
  const invalid = db
    .prepare(
      `SELECT ck.id, ck.claim_id, ck.kernel_id, ck.gap_establishes, ck.gap_asserts_beyond,
              ck.gap_path_inward, o.text AS outer_text, o.radial_tier AS outer_tier,
              k.text AS kernel_text, k.radial_tier AS kernel_tier
       FROM claim_kernels ck
       JOIN claims o ON o.id = ck.claim_id
       JOIN claims k ON k.id = ck.kernel_id
       WHERE ck.claim_id = ? OR ck.kernel_id = ?`
    )
    .all(claim.id, claim.id)
    .filter((l) => {
      const outerRank = l.claim_id === claim.id ? rank(newTier) : rank(l.outer_tier);
      const kernelRank = l.kernel_id === claim.id ? rank(newTier) : rank(l.kernel_tier);
      return kernelRank >= outerRank;
    });
  const del = db.prepare('DELETE FROM claim_kernels WHERE id = ?');
  for (const l of invalid) {
    del.run(l.id);
    logEvent(db, {
      action: 'kernel_link_removed',
      claim_id: l.claim_id,
      topic_id: claim.topic_id,
      detail: kernelGapDetail(l),
      reason: `Severed by ${why} of claim #${claim.id}: a kernel must sit strictly inward of the claim that overreaches from it, and this move closes that gap.`
    });
  }
  return invalid.map((l) => ({ id: l.id, claim_id: l.claim_id, kernel_id: l.kernel_id }));
}

// Demotion: outward only, one step or many, no evidence bar — easy on
// purpose. `established_facts` is the debunker flow: restate what IS
// established, then push the remainder out to the tier it earns.
export function demoteClaim(
  db,
  claimId,
  { target_tier, reason, type = 'mis_tiered', established_facts, kernel, actor }
) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  if (claim.kind === 'metaphysical') {
    throw new RuleError('Metaphysical claims are off the rings — nothing to demote.', {
      rule: 'metaphysical_off_axis'
    });
  }
  if (!TIERS.includes(target_tier) || rank(target_tier) <= rank(claim.radial_tier)) {
    throw new RuleError(
      `Demotion must move outward. This claim sits at ${claim.radial_tier}.`,
      { rule: 'invalid_input' }
    );
  }
  if (!reason || !String(reason).trim()) {
    throw new RuleError('Demotion needs a stated reason — that reason becomes the placement_reason.', {
      rule: 'placement_reason_required'
    });
  }
  if (!CHALLENGE_TYPES.includes(type)) {
    throw new RuleError(`Unknown challenge type "${type}".`, { rule: 'invalid_input' });
  }

  return tx(db, () => {
    // Sever support links this claim can no longer honestly hold up.
    const severed = db
      .prepare(
        `SELECT c.id, c.text, c.radial_tier, c.topic_id, t.name AS topic_name
         FROM claim_supports cs
         JOIN claims c ON c.id = cs.supported_id
         JOIN topics t ON t.id = c.topic_id
         WHERE cs.supporter_id = ?`
      )
      .all(claimId)
      .filter((c) => rank(c.radial_tier) < rank(target_tier));
    const del = db.prepare(
      'DELETE FROM claim_supports WHERE supporter_id = ? AND supported_id = ?'
    );
    for (const c of severed) {
      del.run(claimId, c.id);
      // 2.98b audit fix: severance was returned in the payload but never
      // logged — replay could not reconstruct these links. Now it can.
      logEvent(db, {
        actor,
        action: 'support_link_removed',
        claim_id: claimId,
        topic_id: claim.topic_id,
        detail: `#${claimId} no longer supports #${c.id}`,
        reason: `Severed by demotion to ${target_tier}: a ${target_tier} claim cannot support one at ${c.radial_tier}.`
      });
    }

    const newReason =
      (established_facts && String(established_facts).trim()
        ? `Established: ${String(established_facts).trim()} — `
        : '') + String(reason).trim();

    db.prepare(
      `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change)
       VALUES (?,?,?,?,?)`
    ).run(claimId, type, newReason, 'upheld', `${claim.radial_tier} → ${target_tier}`);

    // Moving outward can invalidate links where THIS claim is the kernel —
    // its overreachers must still sit strictly outward of it.
    const severedKernels = severInvalidKernelLinks(db, claim, target_tier, `demotion to ${target_tier}`);

    db.prepare(
      'UPDATE claims SET radial_tier = ?, status = ?, placement_reason = ? WHERE id = ?'
    ).run(target_tier, statusFor(target_tier), newReason, claimId);

    logEvent(db, {
      actor,
      action: 'demotion',
      claim_id: claimId,
      topic_id: claim.topic_id,
      detail: `${claim.radial_tier} → ${target_tier}`,
      reason: newReason
    });

    // The debunker flow's second half (Stage 2.9): the correct/demote pair
    // produces kernel + remainder, and the kernel link between them is part
    // of the correction — created here, through the same rules as manual
    // creation. Gap defaults come from what the demote already stated; the
    // path inward reuses the tier-preview mechanic (its unmet requirements
    // ARE the path inward, given a second job).
    let kernelLink = null;
    if (kernel && kernel.kernel_id != null) {
      const fresh = getClaim(db, claimId);
      const gap = {
        establishes:
          (kernel.establishes && String(kernel.establishes).trim()) ||
          (established_facts && String(established_facts).trim()) ||
          '',
        asserts_beyond:
          (kernel.asserts_beyond && String(kernel.asserts_beyond).trim()) || fresh.text,
        path_inward:
          (kernel.path_inward && String(kernel.path_inward).trim()) ||
          derivePathInward(db, fresh)
      };
      kernelLink = addKernelLink(db, claimId, {
        kernel_id: kernel.kernel_id,
        ...gap,
        origin: 'debunker',
        actor
      }).kernel_link;
    }

    return {
      claim: getClaim(db, claimId),
      severed_supports: severed.map((c) => ({
        id: c.id,
        text: truncate(c.text),
        ...(c.topic_id !== claim.topic_id ? { topic: c.topic_name } : {})
      })),
      ...(severedKernels.length ? { severed_kernel_links: severedKernels } : {}),
      ...(kernelLink ? { kernel_link: kernelLink } : {})
    };
  });
}

// The path inward, derived from the same preview the promotion battery runs:
// the first inward tier's unmet requirements, stated as what would move it.
function derivePathInward(db, claim) {
  const tiers = tierPreview({
    kind: claim.kind,
    layer: claim.layer,
    sources: claim.sources,
    db,
    claimId: claim.id,
    currentTier: claim.radial_tier
  });
  const next = tiers[tiers.length - 1]; // nearest inward tier
  if (!next) return '';
  const unmet = next.checks.filter((c) => !c.met).map((c) => c.label);
  return unmet.length
    ? `to reach ${next.tier}: ${unmet.join('; ')}`
    : `meets the ${next.tier} floor — promotion review is the path inward`;
}

// A raised challenge, adjudicated. Upheld → the claim moves OUTWARD (or is
// recorded with no change). A challenge can never move a claim inward.
//
// Stage 2.9: a challenge may instead target a kernel link (kernel_link_id)
// or a support-link hop ({hop: {supporter_id, supported_id}}) — the same
// machinery, types, and outcomes; the challenge just names its target.
// Upheld link challenges remove the link (recorded); a rejected one stands
// on the record and the link renders as questioned. Link challenges never
// move a tier — a kernel link has zero weight in every direction.
export function challengeClaim(
  db,
  claimId,
  { type, description, outcome, resulting_tier, kernel_link_id, hop, actor }
) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  if (!CHALLENGE_TYPES.includes(type)) {
    throw new RuleError(`Challenge type must be one of: ${CHALLENGE_TYPES.join(', ')}.`, {
      rule: 'invalid_input'
    });
  }
  if (!description || !String(description).trim()) {
    throw new RuleError('A challenge needs a description of what is wrong.', {
      rule: 'invalid_input'
    });
  }
  if (outcome !== 'upheld' && outcome !== 'rejected') {
    throw new RuleError('Challenge outcome must be "upheld" or "rejected".', {
      rule: 'invalid_input'
    });
  }

  // ---- kernel-link challenge ----
  if (kernel_link_id != null) {
    if (resulting_tier) {
      throw new RuleError(
        'A kernel-link challenge contests the link, not the claim\'s standing — it cannot carry a resulting tier. Raise a separate challenge on the claim itself.',
        { rule: 'invalid_input' }
      );
    }
    const link = db
      .prepare('SELECT * FROM claim_kernels WHERE id = ? AND claim_id = ?')
      .get(kernel_link_id, claimId);
    if (!link) {
      throw new RuleError('No such kernel link on this claim.', { rule: 'invalid_input' });
    }
    return tx(db, () => {
      const upheld = outcome === 'upheld';
      db.prepare(
        `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change, kernel_link_id)
         VALUES (?,?,?,?,?,?)`
      ).run(
        claimId,
        type,
        String(description).trim(),
        outcome,
        upheld ? `kernel link to #${link.kernel_id} removed` : 'no change — kernel link survived',
        kernel_link_id
      );
      logEvent(db, {
        actor,
        action: 'challenge_recorded',
        claim_id: claimId,
        topic_id: claim.topic_id,
        detail: `${type} · ${outcome} · kernel link #${kernel_link_id}`,
        reason: String(description).trim()
      });
      if (upheld) {
        db.prepare('DELETE FROM claim_kernels WHERE id = ?').run(kernel_link_id);
        logEvent(db, {
          actor,
          action: 'kernel_link_removed',
          claim_id: claimId,
          topic_id: claim.topic_id,
          detail: kernelGapDetail(link),
          reason: `Challenge upheld: ${String(description).trim()}`
        });
      }
      return { claim: getClaim(db, claimId), severed_supports: [] };
    });
  }

  // ---- support-hop challenge ----
  if (hop && hop.supporter_id != null && hop.supported_id != null) {
    if (resulting_tier) {
      throw new RuleError(
        'A hop challenge contests one support link, not the claim\'s standing — it cannot carry a resulting tier.',
        { rule: 'invalid_input' }
      );
    }
    const exists = db
      .prepare('SELECT 1 FROM claim_supports WHERE supporter_id = ? AND supported_id = ?')
      .get(hop.supporter_id, hop.supported_id);
    if (!exists) {
      throw new RuleError('No such support link.', { rule: 'invalid_input' });
    }
    if (claimId !== hop.supporter_id && claimId !== hop.supported_id) {
      throw new RuleError(
        'A hop challenge is raised on one of the two linked claims.',
        { rule: 'invalid_input' }
      );
    }
    return tx(db, () => {
      const upheld = outcome === 'upheld';
      db.prepare(
        `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change, hop_supporter_id, hop_supported_id)
         VALUES (?,?,?,?,?,?,?)`
      ).run(
        claimId,
        type,
        String(description).trim(),
        outcome,
        upheld
          ? `support link #${hop.supporter_id} → #${hop.supported_id} severed`
          : 'no change — support link survived',
        hop.supporter_id,
        hop.supported_id
      );
      logEvent(db, {
        actor,
        action: 'challenge_recorded',
        claim_id: claimId,
        topic_id: claim.topic_id,
        detail: `${type} · ${outcome} · hop #${hop.supporter_id} → #${hop.supported_id}`,
        reason: String(description).trim()
      });
      if (upheld) {
        removeSupport(db, hop.supporter_id, hop.supported_id, {
          actor,
          reason: `Hop challenge upheld: ${String(description).trim()}`
        });
      }
      return { claim: getClaim(db, claimId), severed_supports: [] };
    });
  }

  // ---- ordinary claim challenge ----
  if (outcome === 'rejected') {
    db.prepare(
      `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change)
       VALUES (?,?,?,?,?)`
    ).run(claimId, type, String(description).trim(), 'rejected', 'no change — claim survived');
    logEvent(db, {
      actor,
      action: 'challenge_recorded',
      claim_id: claimId,
      topic_id: claim.topic_id,
      detail: `${type} · rejected`,
      reason: String(description).trim()
    });
    return { claim: getClaim(db, claimId), severed_supports: [] };
  }
  if (claim.kind === 'metaphysical' || !resulting_tier || resulting_tier === claim.radial_tier) {
    db.prepare(
      `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change)
       VALUES (?,?,?,?,?)`
    ).run(claimId, type, String(description).trim(), 'upheld', 'no tier change');
    logEvent(db, {
      actor,
      action: 'challenge_recorded',
      claim_id: claimId,
      topic_id: claim.topic_id,
      detail: `${type} · upheld · no tier change`,
      reason: String(description).trim()
    });
    return { claim: getClaim(db, claimId), severed_supports: [] };
  }
  if (rank(resulting_tier) < rank(claim.radial_tier)) {
    throw new RuleError(
      'An upheld challenge can only move a claim outward. Promotion has its own review and must survive it.',
      { rule: 'challenge_moves_outward_only' }
    );
  }
  return demoteClaim(db, claimId, {
    target_tier: resulting_tier,
    reason: String(description).trim(),
    type,
    actor
  });
}

// Attach a source to a claim — an existing library source ({source_id}) or
// an inline definition (find-or-create in the topic library). Attaching
// evidence never auto-promotes; promotion still has to survive review.
export function addSource(db, claimId, payload) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  const [resolved] = resolveSourcesPayload(db, claim.topic_id, [payload]);
  return tx(db, () => {
    const sourceId = resolved.source_id ?? findOrCreateSource(db, claim.topic_id, resolved);
    attachSource(db, claimId, sourceId, resolved.relation);
    logEvent(db, {
      actor: payload.actor,
      action: 'source_attached',
      claim_id: claimId,
      topic_id: claim.topic_id,
      detail: `source #${sourceId} (${resolved.relation})`,
      reason: `Attached "${truncate(resolved.citation)}" as ${resolved.relation}.`
    });
    return getClaim(db, claimId);
  });
}

// Re-evaluate one claim after evidence was removed from it; demote to the
// earned tier if the current placement no longer holds.
function reevaluateClaim(db, claimId, why) {
  const fresh = getClaim(db, claimId);
  if (fresh.kind === 'metaphysical') return { claim: fresh, demoted: false };
  const failures = placementFailures({
    kind: fresh.kind,
    layer: fresh.layer,
    targetTier: fresh.radial_tier,
    sources: fresh.sources,
    db,
    claimId
  });
  if (failures.length === 0) return { claim: fresh, demoted: false };
  const earned = earnedTier({
    kind: fresh.kind,
    layer: fresh.layer,
    sources: fresh.sources,
    db,
    claimId
  });
  const from = fresh.radial_tier;
  const result = demoteClaim(db, claimId, {
    target_tier: earned,
    reason: `${why} and the remaining sources no longer support ${fresh.radial_tier}: ${failures
      .map((f) => f.reason)
      .join(' ')}`,
    type: 'bad_source'
  });
  return { ...result, demoted: true, from, to: earned };
}

// 2.98b: the reason gate every withdrawal passes through — refused without
// one, blocker named. The record keeps what left and why; a reason-less
// withdrawal would leave the why blank forever.
function requireWithdrawalReason(reason) {
  if (!reason || !String(reason).trim()) {
    throw new RuleError(
      'Withdrawal requires a stated reason — the record keeps what left and why, and that reason is permanent.',
      { rule: 'withdrawal_reason_required' }
    );
  }
  return String(reason).trim();
}

// 2.98b Amendment A: withdrawal is TWO-PHASE — challenge-shaped, built as
// PARALLEL machinery rather than challenge rows (challenges require a
// claim_id and contest a claim's standing or a link; a withdrawal targets
// an attachment or a library entity, which has no single claim). The
// challenge SHAPE is kept: file with a mandatory reason → visible pending
// state with ZERO rule effect → adjudicate upheld (effect fires NOW,
// recorded with the reused detach/delete event types so replay timing is
// exact) or rejected (the attempt stays permanently in the event record,
// like a failed promotion).
//
// Stated asymmetry (settled): additions take effect immediately and answer
// to challenges afterward; removals adjudicate before effect. The record
// can absorb weak additions; it cannot absorb silent subtractions.

// File a withdrawal proposal against one claim's attachment. No effect —
// the source keeps counting toward every floor until adjudication.
export function proposeWithdrawal(db, claimId, sourceId, { reason, actor } = {}) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  const why = requireWithdrawalReason(reason);
  return tx(db, () => {
    const att = db
      .prepare('SELECT cs.withdrawn_at, cs.proposed_at, s.citation FROM claim_sources cs JOIN sources s ON s.id = cs.source_id WHERE cs.claim_id = ? AND cs.source_id = ?')
      .get(claimId, sourceId);
    if (!att) {
      throw new RuleError('That source is not attached to this claim.', { rule: 'invalid_input' });
    }
    if (att.withdrawn_at != null) {
      throw new RuleError('That source is already withdrawn from this claim.', { rule: 'invalid_input' });
    }
    if (att.proposed_at != null) {
      throw new RuleError('A withdrawal is already proposed for this source — adjudicate it first.', { rule: 'invalid_input' });
    }
    db.prepare(
      `UPDATE claim_sources SET proposed_at = datetime('now'), proposed_reason = ? WHERE claim_id = ? AND source_id = ?`
    ).run(why, claimId, sourceId);
    logEvent(db, {
      actor,
      action: 'withdrawal_proposed',
      claim_id: claimId,
      topic_id: claim.topic_id,
      detail: `source #${sourceId} "${truncate(att.citation)}" — no effect until adjudication`,
      reason: why
    });
    return { claim: getClaim(db, claimId), proposed: true };
  });
}

// Adjudicate a pending attachment withdrawal. Upheld: the 2.98b effect —
// withdrawn status, diminished render, ripple — fires NOW, at adjudication
// time. Rejected: the source stands; the attempt is permanent history.
export function adjudicateWithdrawal(db, claimId, sourceId, { outcome, note, actor } = {}) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  if (!['upheld', 'rejected'].includes(outcome)) {
    throw new RuleError(`Adjudication outcome must be "upheld" or "rejected".`, { rule: 'invalid_input' });
  }
  return tx(db, () => {
    const att = db
      .prepare('SELECT cs.proposed_at, cs.proposed_reason, s.citation FROM claim_sources cs JOIN sources s ON s.id = cs.source_id WHERE cs.claim_id = ? AND cs.source_id = ?')
      .get(claimId, sourceId);
    if (!att || att.proposed_at == null) {
      throw new RuleError('No withdrawal is proposed for this source.', { rule: 'invalid_input' });
    }
    const extra = note && String(note).trim() ? ` — ${String(note).trim()}` : '';
    if (outcome === 'rejected') {
      db.prepare(
        'UPDATE claim_sources SET proposed_at = NULL, proposed_reason = NULL WHERE claim_id = ? AND source_id = ?'
      ).run(claimId, sourceId);
      logEvent(db, {
        actor,
        action: 'withdrawal_rejected',
        claim_id: claimId,
        topic_id: claim.topic_id,
        detail: `source #${sourceId} "${truncate(att.citation)}" stands`,
        reason: `Proposal ("${truncate(att.proposed_reason, 120)}") rejected by curator${extra}.`
      });
      return { claim: getClaim(db, claimId), outcome: 'rejected' };
    }
    db.prepare(
      `UPDATE claim_sources SET withdrawn_at = datetime('now'), withdrawn_reason = ?, proposed_at = NULL, proposed_reason = NULL
       WHERE claim_id = ? AND source_id = ?`
    ).run(att.proposed_reason, claimId, sourceId);
    // Event type reused from detach — the EFFECT event, stamped at
    // adjudication time so replay timing is exact.
    logEvent(db, {
      actor,
      action: 'source_detached',
      claim_id: claimId,
      topic_id: claim.topic_id,
      detail: `source #${sourceId} "${truncate(att.citation)}" withdrawn — adjudicated by curator${extra}`,
      reason: att.proposed_reason
    });
    return { ...reevaluateClaim(db, claimId, 'Evidence was withdrawn'), outcome: 'upheld' };
  });
}

// File a withdrawal proposal against a LIBRARY entity. No effect — every
// claim leaning on it keeps its full standing until adjudication.
export function proposeLibraryWithdrawal(db, sourceId, { reason, actor } = {}) {
  const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId);
  if (!source) throw new RuleError('No such source.', { rule: 'invalid_input' });
  if (source.withdrawn_at != null) {
    throw new RuleError('That source is already withdrawn from the library.', { rule: 'invalid_input' });
  }
  if (source.proposed_at != null) {
    throw new RuleError('A library withdrawal is already proposed for this source — adjudicate it first.', { rule: 'invalid_input' });
  }
  const why = requireWithdrawalReason(reason);
  return tx(db, () => {
    db.prepare(`UPDATE sources SET proposed_at = datetime('now'), proposed_reason = ? WHERE id = ?`).run(why, sourceId);
    logEvent(db, {
      actor,
      action: 'withdrawal_proposed',
      topic_id: source.topic_id,
      detail: `library source #${sourceId} "${truncate(source.citation)}" — no effect until adjudication`,
      reason: why
    });
    return { source_id: sourceId, proposed: true };
  });
}

// Adjudicate a pending library withdrawal. Upheld: the entity is withdrawn
// and every leaning claim re-evaluates NOW, in one operation — the ripple
// fires at adjudication time, never at filing time. Rejected: the entity
// stands; the attempt is permanent history.
export function adjudicateLibraryWithdrawal(db, sourceId, { outcome, note, actor } = {}) {
  const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId);
  if (!source) throw new RuleError('No such source.', { rule: 'invalid_input' });
  if (!['upheld', 'rejected'].includes(outcome)) {
    throw new RuleError(`Adjudication outcome must be "upheld" or "rejected".`, { rule: 'invalid_input' });
  }
  if (source.proposed_at == null) {
    throw new RuleError('No library withdrawal is proposed for this source.', { rule: 'invalid_input' });
  }
  const extra = note && String(note).trim() ? ` — ${String(note).trim()}` : '';
  return tx(db, () => {
    if (outcome === 'rejected') {
      db.prepare('UPDATE sources SET proposed_at = NULL, proposed_reason = NULL WHERE id = ?').run(sourceId);
      logEvent(db, {
        actor,
        action: 'withdrawal_rejected',
        topic_id: source.topic_id,
        detail: `library source #${sourceId} "${truncate(source.citation)}" stands`,
        reason: `Proposal ("${truncate(source.proposed_reason, 120)}") rejected by curator${extra}.`
      });
      return { source_id: sourceId, outcome: 'rejected' };
    }
    const attached = db
      .prepare('SELECT claim_id FROM claim_sources WHERE source_id = ? AND withdrawn_at IS NULL')
      .all(sourceId)
      .map((r) => r.claim_id);
    db.prepare(
      `UPDATE sources SET withdrawn_at = datetime('now'), withdrawn_reason = ?, proposed_at = NULL, proposed_reason = NULL WHERE id = ?`
    ).run(source.proposed_reason, sourceId);
    // Event type reused from the old library delete — the EFFECT event,
    // stamped at adjudication time so replay timing is exact.
    logEvent(db, {
      actor,
      action: 'library_source_deleted',
      topic_id: source.topic_id,
      detail: `source #${sourceId}; ${attached.length} claim(s) re-evaluate — adjudicated by curator${extra}`,
      reason: `"${truncate(source.citation)}" withdrawn from the library: ${source.proposed_reason}`
    });
    const affected = attached.map((claimId) => {
      const r = reevaluateClaim(
        db,
        claimId,
        `The source "${truncate(source.citation)}" was withdrawn from the library`
      );
      return {
        claim_id: claimId,
        demoted: r.demoted,
        ...(r.demoted ? { from: r.from, to: r.to } : {}),
        claim: r.claim ?? getClaim(db, claimId)
      };
    });
    return { withdrawn_source: source.citation, affected, outcome: 'upheld' };
  });
}

// ---------------------------------------------------------------- kernel links
// Stage 2.9. Creation — manual or from the debunker flow — runs through the
// rules layer like every write; the schema triggers say no a second time.
export function addKernelLink(
  db,
  claimId,
  { kernel_id, establishes, asserts_beyond, path_inward, origin = 'manual', actor }
) {
  const outer = getClaim(db, claimId);
  const kernel = kernel_id != null ? getClaim(db, kernel_id) : null;
  if (!outer || !kernel) throw new RuleError('No such claim.', { rule: 'invalid_input' });

  const failures = kernelLinkFailures({
    outer,
    kernel,
    gap: { establishes, asserts_beyond, path_inward }
  });
  if (failures.length) reject(failures, undefined);

  const dup = db
    .prepare('SELECT 1 FROM claim_kernels WHERE claim_id = ? AND kernel_id = ?')
    .get(claimId, kernel_id);
  if (dup) {
    throw new RuleError('That kernel link already exists.', { rule: 'invalid_input' });
  }
  const support = db
    .prepare(
      `SELECT 1 FROM claim_supports
       WHERE (supporter_id = ? AND supported_id = ?) OR (supporter_id = ? AND supported_id = ?)`
    )
    .get(kernel_id, claimId, claimId, kernel_id);
  if (support) {
    throw new RuleError(
      `A support link already connects these claims — evidence runs whole between them. A kernel link marks where evidence STOPS; the two cannot both be true of the same pair. Remove the support link first if the connection is genuinely broken.`,
      { rule: 'kernel_contradicts_support' }
    );
  }

  return tx(db, () => {
    const { lastInsertRowid: id } = db
      .prepare(
        `INSERT INTO claim_kernels (claim_id, kernel_id, gap_establishes, gap_asserts_beyond, gap_path_inward, origin)
         VALUES (?,?,?,?,?,?)`
      )
      .run(
        claimId,
        kernel_id,
        String(establishes).trim(),
        String(asserts_beyond).trim(),
        String(path_inward).trim(),
        origin === 'debunker' ? 'debunker' : 'manual'
      );
    logEvent(db, {
      actor,
      action: 'kernel_link_created',
      claim_id: claimId,
      topic_id: outer.topic_id,
      detail: `kernel is #${kernel_id} "${truncate(kernel.text)}" (${origin})`,
      reason: `Establishes: ${String(establishes).trim()} — asserts beyond: ${String(asserts_beyond).trim()}`
    });
    const fresh = getClaim(db, claimId);
    return {
      claim: fresh,
      kernel_link: fresh.kernel_links.find((l) => l.id === Number(id))
    };
  });
}

// 2.98b: the direct remove-kernel-link affordance is GONE (it was a hard
// delete with an optional reason). A kernel link now leaves the record only
// through recorded adjudication — a kernel-link challenge upheld — or
// rules-layer severance on tier moves; both log the full gap statement.

export function addSupport(db, supporterId, supportedId) {
  const supporter = getClaim(db, supporterId);
  const supported = getClaim(db, supportedId);
  if (!supporter || !supported) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  if (supporter.id === supported.id) {
    throw new RuleError('A claim cannot support itself.', { rule: 'invalid_input' });
  }
  // Stage Two: support links may cross topic boundaries. The tier constraint
  // and cycle behavior apply identically across topics as within them.
  if (supporter.kind === 'metaphysical' || supported.kind === 'metaphysical') {
    throw new RuleError(
      'Metaphysical claims sit off the radial axis — they can neither give nor receive evidentiary support on the rings.',
      { rule: 'metaphysical_off_axis' }
    );
  }
  if (rank(supporter.radial_tier) > rank(supported.radial_tier)) {
    const cross = supporter.topic_id !== supported.topic_id;
    const topicName = (id) => db.prepare('SELECT name FROM topics WHERE id = ?').get(id)?.name;
    const supporterWhere = cross
      ? `${supporter.radial_tier} in the ${topicName(supporter.topic_id)} topic`
      : supporter.radial_tier;
    const supportedWhere = cross
      ? `${supported.radial_tier} in the ${topicName(supported.topic_id)} topic`
      : supported.radial_tier;
    throw new RuleError(
      `"${truncate(supporter.text)}" sits at ${supporterWhere} — a ${supporter.radial_tier} claim cannot support one at ${supportedWhere}. Outer cannot feed inner, within or across topics.`,
      { rule: 'outer_cannot_feed_inner' }
    );
  }
  // Whole-vs-broken: a kernel link between this pair says evidence stops
  // here; a support link would say it connects. Refuse with the reason named
  // (the schema trigger refuses again below the code).
  const kernelBetween = db
    .prepare(
      `SELECT 1 FROM claim_kernels
       WHERE (kernel_id = ? AND claim_id = ?) OR (kernel_id = ? AND claim_id = ?)`
    )
    .get(supporterId, supportedId, supportedId, supporterId);
  if (kernelBetween) {
    throw new RuleError(
      'A kernel link connects these claims — it marks where the evidence STOPS between them. A support link would contradict it. Remove the kernel link first if the evidence genuinely connects.',
      { rule: 'kernel_contradicts_support' }
    );
  }
  const exists = db
    .prepare('SELECT 1 FROM claim_supports WHERE supporter_id = ? AND supported_id = ?')
    .get(supporterId, supportedId);
  if (!exists) {
    return tx(db, () => {
      db.prepare('INSERT INTO claim_supports (supporter_id, supported_id) VALUES (?,?)').run(
        supporterId,
        supportedId
      );
      logEvent(db, {
        action: 'support_link_added',
        claim_id: supporterId,
        topic_id: supporter.topic_id,
        detail: `#${supporterId} supports #${supportedId}`,
        reason: `"${truncate(supporter.text)}" recorded as supporting "${truncate(supported.text)}".`
      });
      return getClaim(db, supporterId);
    });
  }
  return getClaim(db, supporterId);
}

// 2.98b: no longer routed as a direct affordance — a support link now ends
// only through recorded adjudication (a hop challenge upheld, which calls
// this with the challenge's description as the reason) or rules-layer
// severance on demotion. The reason is mandatory either way.
export function removeSupport(db, supporterId, supportedId, { reason, actor } = {}) {
  const why = requireWithdrawalReason(reason);
  const gone = db
    .prepare('DELETE FROM claim_supports WHERE supporter_id = ? AND supported_id = ?')
    .run(supporterId, supportedId);
  if (gone.changes > 0) {
    const supporter = getClaim(db, supporterId);
    logEvent(db, {
      actor,
      action: 'support_link_removed',
      claim_id: supporterId,
      topic_id: supporter?.topic_id ?? null,
      detail: `#${supporterId} no longer supports #${supportedId}`,
      reason: why
    });
  }
  return getClaim(db, supporterId);
}

export function setVertical(db, claimId, v) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  const vertical = normVertical(v);
  const vErr = verticalFailure(vertical, claim.sources);
  if (vErr) throw new RuleError(vErr, { rule: 'vertical_requires_evidence' });
  return tx(db, () => {
    db.prepare(
      'UPDATE claims SET vertical_direction = ?, vertical_magnitude = ?, vertical_evidenced = ? WHERE id = ?'
    ).run(vertical.direction, vertical.magnitude, vertical.evidenced ? 1 : 0, claimId);
    logEvent(db, {
      actor: v.actor,
      action: 'vertical_set',
      claim_id: claimId,
      topic_id: claim.topic_id,
      detail: `${vertical.direction} · magnitude ${vertical.magnitude} · evidenced ${vertical.evidenced}`,
      reason:
        vertical.direction === 'neutral'
          ? 'Vertical placement cleared to neutral.'
          : `Vertical placement set to ${vertical.direction} (${vertical.magnitude}) on documented outcomes.`
    });
    return getClaim(db, claimId);
  });
}

export function getTierPreview(db, claimId) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  return {
    claim_id: claim.id,
    current_tier: claim.radial_tier,
    // The floor, never the promise — see rules.tierPreview.
    note: 'Meeting the floor does not guarantee promotion — the review battery (and, later, human challengers) still rules.',
    tiers: tierPreview({
      kind: claim.kind,
      layer: claim.layer,
      sources: claim.sources,
      db,
      claimId,
      currentTier: claim.radial_tier
    })
  };
}

// ---------------------------------------------------------------- lineages
// Stage 2.9 read-side. A kernel link renders as a traced path through the
// intermediate claims that genuinely share the lineage. THE ROUTING RULE IS
// ENFORCED HERE, where routes are computed, not in the renderer: the only
// edges walked are recorded support links, so a nearest-looking neighbor with
// no evidentiary relation can never appear on a path. If no support chain
// connects kernel to claim, the route is the bare two-point break — a wide
// void is its own honest signal.
export function getLineages(db, claimId) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });

  const summary = (c) => ({ id: c.id, text: c.text, tier: c.radial_tier, layer: c.layer });
  const hopContested = db.prepare(
    'SELECT COUNT(*) AS n FROM challenges WHERE hop_supporter_id = ? AND hop_supported_id = ?'
  );

  const lineages = (claim.kernel_links || []).map((link) => {
    // Shortest support-chain from the kernel outward to this claim, walked
    // over supporter → supported edges only. Deterministic: neighbors are
    // visited in id order.
    const parent = new Map([[link.kernel_id, null]]);
    const queue = [link.kernel_id];
    let found = false;
    while (queue.length && !found) {
      const at = queue.shift();
      const next = db
        .prepare('SELECT supported_id FROM claim_supports WHERE supporter_id = ? ORDER BY supported_id')
        .all(at)
        .map((r) => r.supported_id);
      for (const n of next) {
        if (parent.has(n)) continue;
        parent.set(n, at);
        if (n === claim.id) {
          found = true;
          break;
        }
        queue.push(n);
      }
    }

    let pathIds = [link.kernel_id];
    if (found) {
      pathIds = [];
      for (let at = claim.id; at != null; at = parent.get(at)) pathIds.unshift(at);
    }
    const pathClaims = pathIds.map((id) => (id === claim.id ? claim : getClaim(db, id)));
    const hops = [];
    for (let i = 0; i + 1 < pathIds.length; i++) {
      hops.push({
        supporter_id: pathIds[i],
        supported_id: pathIds[i + 1],
        contested: hopContested.get(pathIds[i], pathIds[i + 1]).n > 0
      });
    }
    // The break sits where sourcing runs out: after the last claim the chain
    // genuinely reaches. Its width is the evidentiary distance — how many
    // tiers of unearned ground the outer claim asserts across.
    const lastEvidenced = found ? pathClaims[pathClaims.length - 2] : pathClaims[0];
    const distance = Math.max(1, rank(claim.radial_tier) - rank(lastEvidenced.radial_tier));
    return {
      kernel_link_id: link.id,
      origin: link.origin,
      contested: link.contested,
      kernel: { ...summary(pathClaims[0]) },
      // Intermediates only — the renderer already has the outer claim.
      path: pathClaims.slice(0, found ? pathClaims.length - 1 : pathClaims.length).map(summary),
      hops,
      reaches_claim: found,
      break: {
        after_claim_id: lastEvidenced.id,
        distance,
        max_distance: TIERS.length - 1,
        gap: {
          establishes: link.gap_establishes,
          asserts_beyond: link.gap_asserts_beyond,
          path_inward: link.gap_path_inward
        }
      }
    };
  });

  return { claim_id: claim.id, tier: claim.radial_tier, lineages };
}

// ---------------------------------------------------------------- global search
// Stage 2.9d (Amendment A). Lexical match quality ONLY — bm25 is a pure
// text-relevance function; tier is DISPLAYED on every hit and is never a
// ranking input in either direction (boosting core would bury debunked
// claims, and "kept visible" is the point of the outermost shell). Every
// result carries its epistemic context inseparably: tier, kind, off-axis
// flag, topic, and which field matched — a tier-stripped search result lets
// asserted read as proven.
export function searchRecord(db, query, { limit = 80 } = {}) {
  const q = String(query || '').trim();
  if (!q) return { query: q, results: [] };
  // Quote each token so user text can never inject FTS operators.
  const fts = q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `"${w.replace(/"/g, '')}"`)
    .join(' ');
  let rows;
  try {
    rows = db
      .prepare(
        `SELECT field AS matched_field, claim_id, topic_id, content,
                bm25(search_index) AS rank
         FROM search_index WHERE search_index MATCH ? ORDER BY rank LIMIT ?`
      )
      .all(fts, limit);
  } catch {
    return { query: q, results: [] };
  }
  const topicName = db.prepare('SELECT name FROM topics WHERE id = ?');
  const claimRow = db.prepare(
    'SELECT id, text, radial_tier, kind, layer, status FROM claims WHERE id = ?'
  );
  const results = [];
  for (const r of rows) {
    const c = claimRow.get(r.claim_id);
    if (!c) continue;
    results.push({
      topic: { id: r.topic_id, name: topicName.get(r.topic_id)?.name || '' },
      claim_id: c.id,
      claim_text: truncate(c.text, 140),
      tier: c.radial_tier,
      kind: c.kind,
      layer: c.layer,
      status: c.status,
      off_axis: c.radial_tier == null,
      matched_field: r.matched_field,
      snippet: truncate(r.content, 160)
    });
  }
  return { query: q, results };
}

// ---------------------------------------------------------------- parking lot
// Notes, not claims. No tier, no kind, no layer, no placement reason, no
// presence in any onion view, no linkability, no weight — outside the
// epistemics entirely.

export function createParkedNote(db, topicId, { text }) {
  const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(topicId);
  if (!topic) throw new RuleError('Unknown topic.', { rule: 'invalid_input' });
  if (!text || !String(text).trim()) {
    throw new RuleError('A note needs text.', { rule: 'invalid_input' });
  }
  const { lastInsertRowid: id } = db
    .prepare(`INSERT INTO parked_notes (topic_id, text, author, private) VALUES (?,?,?,1)`)
    .run(topicId, String(text).trim(), 'local');
  return db.prepare('SELECT * FROM parked_notes WHERE id = ?').get(id);
}

export function listParkedNotes(db, topicId) {
  return db
    .prepare('SELECT * FROM parked_notes WHERE topic_id = ? ORDER BY id')
    .all(topicId);
}

export function deleteParkedNote(db, noteId) {
  const gone = db.prepare('DELETE FROM parked_notes WHERE id = ?').run(noteId);
  if (gone.changes === 0) throw new RuleError('No such note.', { rule: 'invalid_input' });
  return { deleted: true };
}

// ---------------------------------------------------------------- export/import

export function exportTopic(db, topicId) {
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
  if (!topic) throw new RuleError('No such topic.', { rule: 'invalid_input' });
  // 2.98b: a card is a portable copy of the ACTIVE record — withdrawn
  // library entries stay in this engine's record (diminished, with their
  // reasons); exporting them would re-import as active evidence elsewhere.
  const sources = getTopicSources(db, topicId).filter((s) => !s.withdrawn);
  const claims = getTopicClaims(db, topicId);
  const sourceKey = new Map(sources.map((s, i) => [s.id, i]));
  const claimKey = new Map(claims.map((c, i) => [c.id, i]));
  const supports = [];
  for (const c of claims) {
    for (const sid of c.supports_claims) {
      // Per-topic export: cross-topic links are dropped (logged by caller).
      if (claimKey.has(sid)) supports.push({ supporter: claimKey.get(c.id), supported: claimKey.get(sid) });
    }
  }
  // Kernel links, per-topic like supports: cross-topic links are dropped.
  const kernels = [];
  for (const c of claims) {
    for (const l of c.kernel_links || []) {
      if (claimKey.has(l.kernel_id)) {
        kernels.push({
          claim: claimKey.get(c.id),
          kernel: claimKey.get(l.kernel_id),
          establishes: l.gap_establishes,
          asserts_beyond: l.gap_asserts_beyond,
          path_inward: l.gap_path_inward,
          origin: l.origin
        });
      }
    }
  }
  return {
    format: 'truth-onion-topic',
    version: 1,
    name: topic.name,
    description: topic.description,
    kernels,
    sources: sources.map((s) => ({
      tier: s.tier,
      citation: s.citation,
      url: s.url,
      is_claimant_self_published: s.is_claimant_self_published
    })),
    claims: claims.map((c) => ({
      text: c.text,
      kind: c.kind,
      layer: c.layer,
      radial_tier: c.radial_tier,
      vertical: c.vertical,
      placement_reason: c.placement_reason,
      attachments: c.sources.map((s) => ({ source: sourceKey.get(s.id), relation: s.relation })),
      challenges: c.challenges.map((ch) => ({
        type: ch.type,
        description: ch.description,
        outcome: ch.outcome,
        resulting_tier_change: ch.resulting_tier_change,
        created_at: ch.created_at
      }))
    })),
    supports,
    parked: listParkedNotes(db, topicId).map((n) => ({
      text: n.text,
      author: n.author,
      private: !!n.private,
      created_at: n.created_at
    }))
  };
}

// Import runs every item through the rules layer exactly like the seed does.
// A legal export re-imports cleanly; a tampered one is refused with the
// normal plain-language reasons, and the whole import rolls back.
export function importTopic(db, payload) {
  if (!payload || payload.format !== 'truth-onion-topic') {
    throw new RuleError('Not a Truth Onion topic export.', { rule: 'invalid_input' });
  }
  return tx(db, () => {
    const topic = createTopic(db, { name: payload.name, description: payload.description });
    const sourceIds = (payload.sources || []).map((s) =>
      findOrCreateSource(db, topic.id, s)
    );
    const claimIds = [];
    for (const c of payload.claims || []) {
      const claim = createClaim(db, {
        topic_id: topic.id,
        text: c.text,
        kind: c.kind,
        layer: c.layer,
        radial_tier: c.radial_tier ?? undefined,
        vertical: c.vertical,
        placement_reason: c.placement_reason,
        sources: (c.attachments || []).map((a) => {
          const sid = sourceIds[a.source];
          if (sid == null) {
            throw new RuleError('Import references a source that is not in the export.', {
              rule: 'invalid_input'
            });
          }
          return { source_id: sid, relation: a.relation };
        })
      });
      claimIds.push(claim.id);
      // Historical challenge records are provenance text — they grant
      // nothing (the tier above was re-validated by the rules on creation).
      for (const ch of c.challenges || []) {
        if (!CHALLENGE_TYPES.includes(ch.type)) continue;
        db.prepare(
          `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change, created_at)
           VALUES (?,?,?,?,?,?)`
        ).run(
          claim.id,
          ch.type,
          String(ch.description || ''),
          ch.outcome === 'upheld' ? 'upheld' : 'rejected',
          String(ch.resulting_tier_change || ''),
          ch.created_at || new Date().toISOString()
        );
      }
    }
    for (const link of payload.supports || []) {
      const supporter = claimIds[link.supporter];
      const supported = claimIds[link.supported];
      if (supporter == null || supported == null) {
        throw new RuleError('Import references a claim that is not in the export.', {
          rule: 'invalid_input'
        });
      }
      addSupport(db, supporter, supported);
    }
    for (const link of payload.kernels || []) {
      const outer = claimIds[link.claim];
      const kernel = claimIds[link.kernel];
      if (outer == null || kernel == null) {
        throw new RuleError('Import references a claim that is not in the export.', {
          rule: 'invalid_input'
        });
      }
      // Through the rules like everything else — a tampered gap statement or
      // inverted direction is refused with the normal plain-language reasons.
      addKernelLink(db, outer, {
        kernel_id: kernel,
        establishes: link.establishes,
        asserts_beyond: link.asserts_beyond,
        path_inward: link.path_inward,
        origin: link.origin === 'debunker' ? 'debunker' : 'manual'
      });
    }
    for (const n of payload.parked || []) {
      createParkedNote(db, topic.id, { text: n.text });
    }
    return {
      topic,
      claims: claimIds.length,
      sources: sourceIds.length,
      parked: (payload.parked || []).length
    };
  });
}
