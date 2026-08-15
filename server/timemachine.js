// SPDX-License-Identifier: AGPL-3.0-only
// Stage 2.95: the time machine. READ-SIDE ONLY — every function here takes a
// db and returns JSON; nothing writes, and no write path imports this module.
// The map replays itself from the record: what it believed, when, and why it
// changed its mind. The system does not quietly become correct — it shows
// its corrections.
//
// THE LOG EPOCH (a 2.95 design ruling). No general event log existed before
// the `events` table (2026-07-27). The replay exposes that honestly:
// - Scrubbing before the epoch shows "recorded history begins here" — never
//   an empty map passing itself off as "nothing had happened yet".
// - Backfill comes ONLY from records that carry their own timestamps (claim
//   creation, challenge rows with tier changes, kernel-link creation). Every
//   backfilled event is origin:'derived' — visually and in data distinct
//   from origin:'log'. Unknown actor stays null — never guessed, never
//   defaulted to a name.
// - No pre-epoch view presents itself as complete: complete:false, and the
//   payload says why.
//
// SCOPE EVENTS (a 2.95 design ruling): the 2.9 audit certified the schema has NO
// scope-event or hash-supersession record types (Legal Amendments F/G
// unimplemented). This replay therefore covers EVIDENCE EVENTS ONLY; scope
// tombstone rendering is deferred until those record types exist. Recorded
// in PROJECT-STATE; the record types are deliberately not invented here.

import { rank, statusFor, truncate, TIERS, RuleError } from './rules.js';
import { getTopicClaims, getClaim } from './db.js';

// sqlite datetime('now') is UTC 'YYYY-MM-DD HH:MM:SS'; normalize anything
// the client sends (ISO etc.) into the same shape so string comparison is
// chronological comparison.
export function normTs(ts) {
  if (!ts) return null;
  const s = String(ts).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new RuleError(`Unreadable timestamp "${truncate(String(ts), 40)}".`, {
      rule: 'invalid_input'
    });
  }
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function logEpoch(db) {
  return db.prepare('SELECT MIN(created_at) AS t FROM events').get()?.t || null;
}

const TIER_MOVE = /^(\S+) → (\S+)$/;

// Per-claim tier moves, uniformly from challenge rows — every tier change
// since Stage One writes a challenge row with "a → b" and its own timestamp,
// so this one source covers pre- and post-epoch alike.
function tierMoves(db, claimId) {
  return db
    .prepare(
      `SELECT created_at, resulting_tier_change, type, outcome, description
       FROM challenges WHERE claim_id = ? ORDER BY created_at, id`
    )
    .all(claimId)
    .map((ch) => {
      const m = TIER_MOVE.exec(ch.resulting_tier_change || '');
      return m && TIERS.includes(m[1]) && TIERS.includes(m[2])
        ? { at: ch.created_at, from: m[1], to: m[2], type: ch.type, outcome: ch.outcome, description: ch.description }
        : null;
    })
    .filter(Boolean);
}

function tierAt(claim, moves, ts) {
  let tier = null;
  // Last move at-or-before ts wins; if the first move is after ts, the claim
  // held that move's from-tier; with no moves at all, the current tier held
  // from creation.
  for (const mv of moves) {
    if (mv.at <= ts) tier = mv.to;
  }
  if (tier) return tier;
  const firstLater = moves.find((mv) => mv.at > ts);
  return firstLater ? firstLater.from : claim.radial_tier;
}

// ---- error vs. supersession ----------------------------------------------
// The reason this stage exists: "correctly placed on then-available
// evidence, later superseded" must not flatten into "mis-placed and
// corrected". Classified MECHANICALLY from the record; when the record
// cannot say, the move stays unlabeled — never guessed.
//   superseded — an outward move driven by evidence that changed after the
//     placement (type contradicting_evidence, or bad_source with a source
//     change recorded between placement and the move).
//   corrected  — an outward move judging the placement itself wrong on the
//     then-known record (mis_tiered / equivocation / layer_mismatch).
export function classifyMove(mv, { evidenceChangedSincePlacement }) {
  if (rank(mv.to) < rank(mv.from)) return null; // inward moves are promotions
  if (mv.type === 'contradicting_evidence') return 'superseded';
  if (mv.type === 'bad_source') {
    return evidenceChangedSincePlacement ? 'superseded' : null;
  }
  if (['mis_tiered', 'equivocation', 'layer_mismatch'].includes(mv.type)) return 'corrected';
  return null;
}

// ---- the merged timeline --------------------------------------------------
// origin:'log' = contemporaneous events (epoch forward, actor recorded).
// origin:'derived' = pre-epoch backfill from self-timestamped records,
// actor null. Logged and derived never overlap: derived rows are emitted
// only for timestamps before the epoch.
export function topicTimeline(db, topicId) {
  const epoch = logEpoch(db);
  const now = db.prepare(`SELECT datetime('now') AS t`).get().t;
  const events = db
    .prepare('SELECT * FROM events WHERE topic_id = ? ORDER BY created_at, id')
    .all(topicId)
    .map((e) => ({
      at: e.created_at,
      action: e.action,
      claim_id: e.claim_id,
      actor: e.actor,
      detail: e.detail,
      reason: e.reason,
      origin: 'log'
    }));

  const derived = [];
  const pre = (at) => epoch == null || at < epoch;
  for (const c of db.prepare('SELECT id, text, created_at, radial_tier FROM claims WHERE topic_id = ?').all(topicId)) {
    if (pre(c.created_at)) {
      derived.push({
        at: c.created_at,
        action: 'claim_created',
        claim_id: c.id,
        actor: null,
        detail: '',
        reason: `"${truncate(c.text)}" entered the record.`,
        origin: 'derived'
      });
    }
    for (const ch of db
      .prepare('SELECT * FROM challenges WHERE claim_id = ? ORDER BY created_at, id')
      .all(c.id)) {
      if (!pre(ch.created_at)) continue;
      const m = TIER_MOVE.exec(ch.resulting_tier_change || '');
      derived.push({
        at: ch.created_at,
        action: m ? (rank(m[2]) > rank(m[1]) ? 'demotion' : 'promotion') : 'challenge_recorded',
        claim_id: c.id,
        actor: null,
        detail: ch.resulting_tier_change,
        reason: ch.description,
        origin: 'derived'
      });
    }
    for (const k of db
      .prepare('SELECT * FROM claim_kernels WHERE claim_id = ?')
      .all(c.id)) {
      if (pre(k.created_at)) {
        derived.push({
          at: k.created_at,
          action: 'kernel_link_created',
          claim_id: c.id,
          actor: null,
          detail: `kernel is #${k.kernel_id}`,
          reason: `Establishes: ${k.gap_establishes}`,
          origin: 'derived'
        });
      }
    }
  }

  const all = [...events, ...derived].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return { epoch, now, events: all };
}

// ---- state at a timestamp -------------------------------------------------
// Reconstructed BACKWARD from the present: current state is ground truth,
// logged events undo changes since the epoch, derived records undo what they
// can before it. Anything the record cannot reconstruct is flagged, present
// with a `reconstructed` marker, or listed in reconstruction_notes — shown,
// never silently guessed.
export function topicAtTime(db, topicId, rawTs) {
  const ts = normTs(rawTs);
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
  if (!topic) throw new RuleError('No such topic.', { rule: 'invalid_input' });
  const epoch = logEpoch(db);
  const preEpoch = epoch != null && ts < epoch;
  const notes = [];

  const events = db
    .prepare('SELECT * FROM events WHERE topic_id = ? AND created_at > ? ORDER BY created_at, id')
    .all(topicId, ts);

  const attachedAfter = new Map(); // claim_id -> Set(source ids attached after ts)
  const detachedAfter = new Map(); // claim_id -> [{source_id, reason}] detached after ts
  const supportsAdded = [];
  const supportsRemoved = [];
  const kernelRemovedAfter = new Map(); // claim_id -> [{kernel_id, reason}]
  const verticalTouched = new Set();
  for (const e of events) {
    const sid = /#(\d+)/.exec(e.detail || '');
    if (e.action === 'source_attached' && e.claim_id != null && sid) {
      (attachedAfter.get(e.claim_id) ?? attachedAfter.set(e.claim_id, new Set()).get(e.claim_id)).add(Number(sid[1]));
    } else if (e.action === 'source_detached' && e.claim_id != null && sid) {
      (detachedAfter.get(e.claim_id) ?? detachedAfter.set(e.claim_id, []).get(e.claim_id)).push({
        source_id: Number(sid[1])
      });
    } else if (e.action === 'library_source_deleted') {
      // 2.98b: library withdrawals keep their rows, so claims reconstruct
      // exactly — the incompleteness note is only true of legacy hard
      // deletes, whose rows are genuinely gone.
      const lm = /source #(\d+)/.exec(e.detail || '');
      const survives = lm && db.prepare('SELECT 1 FROM sources WHERE id = ?').get(Number(lm[1]));
      if (!survives) {
        notes.push(`A library source ("${truncate(e.reason, 60)}") was deleted after this moment; claims that held it may show fewer sources here than they truly had.`);
      }
    } else if (e.action === 'support_link_added') {
      const m = /#(\d+) supports #(\d+)/.exec(e.detail || '');
      if (m) supportsAdded.push([Number(m[1]), Number(m[2])]);
    } else if (e.action === 'support_link_removed') {
      const m = /#(\d+) no longer supports #(\d+)/.exec(e.detail || '');
      if (m) supportsRemoved.push([Number(m[1]), Number(m[2])]);
    } else if (e.action === 'kernel_link_removed' && e.claim_id != null) {
      const m = /#(\d+)/.exec(e.detail || '');
      // 2.98b: removal events carry the authored gap statement — replay
      // renders it verbatim. Older events without it fall to the honest
      // placeholder below.
      const gm = /establishes: (.*) — asserts beyond: (.*) — path inward: (.*)$/.exec(e.detail || '');
      (kernelRemovedAfter.get(e.claim_id) ?? kernelRemovedAfter.set(e.claim_id, []).get(e.claim_id)).push({
        kernel_id: m ? Number(m[1]) : null,
        reason: e.reason,
        ...(gm ? { gap: { establishes: gm[1], asserts_beyond: gm[2], path_inward: gm[3] } } : {})
      });
    } else if (e.action === 'vertical_set' && e.claim_id != null) {
      verticalTouched.add(e.claim_id);
    }
  }

  // Amendment A full-lifecycle replay: which withdrawal proposals were
  // PENDING at ts — from the event record, so adjudicated proposals still
  // render at the moments they were open (row state clears on adjudication).
  // Keyed 'claimId:sourceId' for attachment scope, 'lib:sourceId' for
  // library scope; the latest proposal at-or-before ts is pending unless a
  // resolution (effect or rejection) landed at-or-before ts after it.
  const lifecycle = db
    .prepare(
      `SELECT * FROM events WHERE topic_id = ? AND action IN
       ('withdrawal_proposed','withdrawal_rejected','source_detached','library_source_deleted')
       ORDER BY created_at, id`
    )
    .all(topicId);
  const pendingAt = new Map(); // key -> {at, reason}
  for (const e of lifecycle) {
    const lib = /library source #(\d+)/.exec(e.detail || '');
    const att = /source #(\d+)/.exec(e.detail || '');
    const key =
      e.action === 'library_source_deleted' && att
        ? `lib:${att[1]}`
        : lib
          ? `lib:${lib[1]}`
          : e.claim_id != null && att
            ? `${e.claim_id}:${att[1]}`
            : null;
    if (!key) continue;
    if (e.created_at > ts) continue;
    if (e.action === 'withdrawal_proposed') pendingAt.set(key, { at: e.created_at, reason: e.reason });
    else pendingAt.delete(key); // resolved (effect or rejection) by ts
  }

  const current = getTopicClaims(db, topicId);
  const claims = [];
  for (const c of current) {
    if (c.created_at > ts) continue; // not yet in the record
    const moves = tierMoves(db, c.id);
    const tier = c.radial_tier == null ? null : tierAt(c, moves, ts);
    const attAfter = attachedAfter.get(c.id) || new Set();
    let sources = c.sources.filter((s) => !attAfter.has(s.id));
    const present = new Set(sources.map((s) => s.id));
    // 2.98b: withdrawals keep their rows — anything withdrawn AFTER this
    // moment restores verbatim (relation and citation intact, no guessing).
    for (const w of c.withdrawn_sources || []) {
      if (w.withdrawn_at > ts && !attAfter.has(w.id) && !present.has(w.id)) {
        const { withdrawn_at, withdrawn_reason, withdrawn_scope, ...active } = w;
        sources = [...sources, { ...active, reconstructed: true }];
        present.add(w.id);
      }
    }
    // Legacy path: pre-2.98b hard detaches have no surviving attachment row;
    // fall back to the library entity, then to an honest unrecoverable note.
    for (const d of detachedAfter.get(c.id) || []) {
      if (present.has(d.source_id)) continue;
      const lib = db.prepare('SELECT * FROM sources WHERE id = ?').get(d.source_id);
      if (lib) {
        sources = [...sources, { ...lib, relation: 'supports', reconstructed: true }];
        present.add(d.source_id);
      } else {
        notes.push(`Claim #${c.id} held a source (#${d.source_id}) at this moment whose record no longer exists; shown as unrecoverable.`);
      }
    }
    const kernel_links = c.kernel_links.filter((l) => l.created_at <= ts);
    for (const gone of kernelRemovedAfter.get(c.id) || []) {
      kernel_links.push({
        kernel_id: gone.kernel_id,
        reconstructed: true,
        removed_later: gone.reason,
        gap_establishes:
          gone.gap?.establishes ??
          '(link later removed — gap statement not retained in the event record)',
        gap_asserts_beyond: gone.gap?.asserts_beyond ?? '',
        gap_path_inward: gone.gap?.path_inward ?? '',
        contested: false
      });
    }
    let supports_claims = c.supports_claims.filter(
      (sid) => !supportsAdded.some(([a, b]) => a === c.id && b === sid)
    );
    for (const [a, b] of supportsRemoved) if (a === c.id) supports_claims = [...supports_claims, b];
    let supported_by = c.supported_by.filter(
      (sid) => !supportsAdded.some(([a, b]) => b === c.id && a === sid)
    );
    for (const [a, b] of supportsRemoved) if (b === c.id) supported_by = [...supported_by, a];

    const verticalUnknown = verticalTouched.has(c.id);
    claims.push({
      ...c,
      radial_tier: tier,
      status: c.radial_tier == null ? c.status : statusFor(tier),
      // Proposal annotations come from the EVENT record (authoritative for
      // every moment — row state clears on adjudication): shown exactly in
      // the windows they were pending, never retroactively.
      sources: sources.map((s) => {
        const pend =
          pendingAt.get(`${c.id}:${s.id}`) ||
          (pendingAt.has(`lib:${s.id}`) ? { ...pendingAt.get(`lib:${s.id}`), scope: 'library' } : null);
        const { withdrawal_proposed, ...clean } = s;
        return pend ? { ...clean, withdrawal_proposed: { scope: 'claim', ...pend } } : clean;
      }),
      // Withdrawals that had already happened by this moment stay visible
      // as withdrawals — diminished then, diminished now (2.98b).
      withdrawn_sources: (c.withdrawn_sources || []).filter((w) => w.withdrawn_at <= ts),
      challenges: c.challenges.filter((ch) => ch.created_at <= ts),
      kernel_links,
      overreached_by: [], // reverse links are recomputable client-side; omitted in snapshots
      supports_claims,
      supported_by,
      ...(verticalUnknown
        ? {
            vertical: { direction: 'neutral', magnitude: 0, evidenced: false },
            vertical_unknown: true
          }
        : {})
    });
  }

  if (preEpoch) {
    notes.push(
      'This moment predates recorded history (the log epoch). What is shown is derived from records that carry their own timestamps; source attachments and link operations from this period were never recorded and cannot be reconstructed.'
    );
  }

  return {
    topic_id: topic.id,
    ts,
    epoch,
    pre_epoch: preEpoch,
    complete: !preEpoch,
    claims,
    reconstruction_notes: notes
  };
}

export function claimAtTime(db, claimId, rawTs) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  const snap = topicAtTime(db, claim.topic_id, rawTs);
  const at = snap.claims.find((c) => c.id === claimId) || null;
  return {
    ts: snap.ts,
    epoch: snap.epoch,
    pre_epoch: snap.pre_epoch,
    complete: snap.complete,
    existed: !!at,
    claim: at,
    reconstruction_notes: snap.reconstruction_notes
  };
}

// ---- claim history --------------------------------------------------------
// The full interleaved record for one claim: placements, moves (with the
// superseded/corrected classification where the record supports one),
// FAILED promotion attempts, attachments, challenges, kernel links — each
// carrying origin ('log' or 'derived') and its timestamp, so the reader can
// SEE what was known when, and the rendering cannot flatten it.
export function claimHistory(db, claimId) {
  const claim = getClaim(db, claimId);
  if (!claim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  const epoch = logEpoch(db);
  const pre = (at) => epoch == null || at < epoch;

  // Actors come from the LOG where the log has them; anywhere else they stay
  // null and render as "unknown" — never guessed, never defaulted to a name.
  const actorFor = new Map(
    db
      .prepare('SELECT action, created_at, actor FROM events WHERE claim_id = ?')
      .all(claimId)
      .map((e) => [`${e.action}@${e.created_at}`, e.actor])
  );

  const entries = [];
  // 2.99a punch 13: if the creation event recorded a proposed-vs-landed
  // delta (author asked for a tier the floors refused), render it — the
  // same house pattern as failed promotions, never flattened away.
  let createdText = `Entered the record${claim.radial_tier ? '' : ' (off-axis)'}.`;
  const createdEv = db
    .prepare(`SELECT detail FROM events WHERE claim_id = ? AND action = 'claim_created' ORDER BY id LIMIT 1`)
    .get(claimId);
  const deltaMatch = /(\{"proposed_tier".*\})/.exec(createdEv?.detail || '');
  if (deltaMatch) {
    try {
      const d = JSON.parse(deltaMatch[1]);
      createdText += ` Author proposed ${d.proposed_tier}; floors placed ${d.landed_tier}.`;
    } catch {}
  }
  entries.push({
    at: claim.created_at,
    kind: 'created',
    origin: pre(claim.created_at) ? 'derived' : 'log',
    actor: actorFor.get(`claim_created@${claim.created_at}`) ?? null,
    text: createdText
  });

  const moves = tierMoves(db, claimId);
  // Evidence-change timestamps for the supersession classification: logged
  // source events on this claim.
  const sourceEvents = db
    .prepare(
      `SELECT created_at, action FROM events
       WHERE claim_id = ? AND action IN ('source_attached','source_detached','library_source_deleted')
       ORDER BY created_at`
    )
    .all(claimId);
  let lastPlacement = claim.created_at;
  for (const mv of moves) {
    const evidenceChangedSincePlacement = sourceEvents.some(
      (se) => se.created_at > lastPlacement && se.created_at <= mv.at
    );
    const cls = classifyMove(mv, { evidenceChangedSincePlacement });
    const mvKind = rank(mv.to) > rank(mv.from) ? 'demotion' : 'promotion';
    entries.push({
      at: mv.at,
      kind: mvKind,
      origin: pre(mv.at) ? 'derived' : 'log',
      actor: actorFor.get(`${mvKind}@${mv.at}`) ?? null,
      from: mv.from,
      to: mv.to,
      classification: cls,
      text: mv.description
    });
    lastPlacement = mv.at;
  }

  for (const ch of claim.challenges) {
    const m = TIER_MOVE.exec(ch.resulting_tier_change || '');
    if (m) continue; // rendered as a move above
    const failed = /^stays at /.test(ch.resulting_tier_change || '');
    entries.push({
      at: ch.created_at,
      kind: failed ? 'promotion_failed' : 'challenge',
      origin: pre(ch.created_at) ? 'derived' : 'log',
      actor:
        actorFor.get(`challenge_recorded@${ch.created_at}`) ??
        actorFor.get(`promotion_failed@${ch.created_at}`) ??
        null,
      outcome: ch.outcome,
      type: ch.type,
      text: ch.description
    });
  }

  for (const e of db
    .prepare(
      `SELECT * FROM events WHERE claim_id = ? AND action IN
       ('source_attached','source_detached','kernel_link_created','kernel_link_removed',
        'support_link_added','support_link_removed','vertical_set',
        'withdrawal_proposed','withdrawal_rejected',
        'kind_challenge_proposed','kind_challenge_rejected','kind_changed')
       ORDER BY created_at, id`
    )
    .all(claimId)) {
    entries.push({
      at: e.created_at,
      kind: e.action,
      origin: 'log',
      actor: e.actor,
      text: e.reason,
      detail: e.detail
    });
  }
  // 2.99a punch 5: LIBRARY-scope withdrawal proposals/rejections carry no
  // claim_id (they target the library entity), so the per-claim query above
  // misses them — every claim HOLDING the source lists them here. Display
  // must never forget what the record remembers.
  for (const e of db
    .prepare(
      `SELECT * FROM events WHERE claim_id IS NULL AND action IN
       ('withdrawal_proposed','withdrawal_rejected') ORDER BY created_at, id`
    )
    .all()) {
    const m = /^library source #(\d+)/.exec(e.detail || '');
    if (!m) continue;
    const held = db
      .prepare('SELECT 1 FROM claim_sources WHERE claim_id = ? AND source_id = ?')
      .get(claimId, Number(m[1]));
    if (held) {
      entries.push({ at: e.created_at, kind: e.action, origin: 'log', actor: e.actor, text: e.reason, detail: e.detail });
    }
  }
  for (const k of claim.kernel_links) {
    if (pre(k.created_at)) {
      entries.push({
        at: k.created_at,
        kind: 'kernel_link_created',
        origin: 'derived',
        actor: null,
        text: `Kernel link to #${k.kernel_id}: ${k.gap_establishes}`
      });
    }
  }

  entries.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return { claim_id: claimId, epoch, entries };
}

// ---- topic health ---------------------------------------------------------
// Readouts, never leaderboards: TOPIC AGGREGATES ONLY. No actor appears in
// any statistic; nothing here feeds tiers or reputation; nothing ranks
// participants or claims as achievement. Pinned by test on the payload.
export function topicStats(db, topicId) {
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
  if (!topic) throw new RuleError('No such topic.', { rule: 'invalid_input' });
  const claims = db
    .prepare('SELECT id, radial_tier, created_at FROM claims WHERE topic_id = ?')
    .all(topicId);
  const now = db.prepare(`SELECT datetime('now') AS t`).get().t;
  const days = (a, b) =>
    Math.max(0, (Date.parse(b.replace(' ', 'T') + 'Z') - Date.parse(a.replace(' ', 'T') + 'Z')) / 86400000);

  let promotions = 0;
  let demotions = 0;
  let supersededCount = 0;
  let correctedCount = 0;
  let unclassified = 0;
  let challengesUpheld = 0;
  let challengesRejected = 0;
  let failedPromotions = 0;
  const tierResidency = Object.fromEntries(TIERS.map((t) => [t, { days: 0, spans: 0 }]));
  let totalMoves = 0;

  for (const c of claims) {
    const rows = db
      .prepare('SELECT * FROM challenges WHERE claim_id = ? ORDER BY created_at, id')
      .all(c.id);
    challengesUpheld += rows.filter((r) => r.outcome === 'upheld').length;
    challengesRejected += rows.filter((r) => r.outcome === 'rejected').length;
    failedPromotions += rows.filter((r) => /^stays at /.test(r.resulting_tier_change || '')).length;

    const moves = tierMoves(db, c.id);
    totalMoves += moves.length;
    const sourceEvents = db
      .prepare(
        `SELECT created_at FROM events WHERE claim_id = ? AND action IN ('source_attached','source_detached','library_source_deleted')`
      )
      .all(c.id)
      .map((r) => r.created_at);
    let lastAt = c.created_at;
    let lastTier = moves.length ? moves[0].from : c.radial_tier;
    for (const mv of moves) {
      if (rank(mv.to) > rank(mv.from)) {
        demotions++;
        const cls = classifyMove(mv, {
          evidenceChangedSincePlacement: sourceEvents.some((se) => se > lastAt && se <= mv.at)
        });
        if (cls === 'superseded') supersededCount++;
        else if (cls === 'corrected') correctedCount++;
        else unclassified++;
      } else {
        promotions++;
      }
      if (lastTier && tierResidency[lastTier]) {
        tierResidency[lastTier].days += days(lastAt, mv.at);
        tierResidency[lastTier].spans++;
      }
      lastAt = mv.at;
      lastTier = mv.to;
    }
    if (lastTier && tierResidency[lastTier]) {
      tierResidency[lastTier].days += days(lastAt, now);
      tierResidency[lastTier].spans++;
    }
  }

  return {
    topic_id: topic.id,
    claims_on_rings: claims.filter((c) => c.radial_tier != null).length,
    migrations: { promotions, demotions, failed_promotions: failedPromotions },
    churn_moves_per_claim: claims.length ? +(totalMoves / claims.length).toFixed(2) : 0,
    survival_days_by_tier: Object.fromEntries(
      TIERS.map((t) => [
        t,
        tierResidency[t].spans
          ? +(tierResidency[t].days / tierResidency[t].spans).toFixed(1)
          : null
      ])
    ),
    challenge_outcomes: { upheld: challengesUpheld, rejected: challengesRejected },
    demotion_character: {
      superseded_by_later_evidence: supersededCount,
      corrected_placements: correctedCount,
      unclassified
    },
    supersession_rate: demotions ? +(supersededCount / demotions).toFixed(2) : null
  };
}
