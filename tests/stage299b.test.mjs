// Stage 2.99b pins: kind adjudication & the recast relation. The routing
// decision (on-axis/off-axis) becomes contestable through the same
// two-phase discipline as withdrawal — and NOTHING else can move kind.
// The adjudication standard is the gate's own resolvability test; upheld
// changes grant only what attached evidence earns (no free inward
// movement, no laundering), sever links with logged events, and
// re-evaluate dependents transactionally. recast_of maps the revival
// route honestly: zero weight in both directions, displayed on both ends.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDb, getClaim } from '../server/db.js';
import { restoreHistory, exportRecord } from '../server/history.js';
import { buildApp } from '../server/index.js';
import {
  createClaim,
  challengeClaim,
  proposeKindChallenge,
  adjudicateKindChallenge,
  promoteClaim,
  addSupport
} from '../server/service.js';
import { claimHistory } from '../server/timemachine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(readFileSync(join(root, 'exports', 'curated-record.history.json'), 'utf8'));

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${e.message}`);
  }
}

const fresh = () => {
  const db = openDb(':memory:');
  restoreHistory(db, fixture);
  return db;
};

console.log('\nStage 2.99b — kind adjudication & the recast relation\n');

await test('K1. the launder is refused: upheld metaphysical→empirical grants NOTHING beyond what evidence earns', async () => {
  const db = fresh();
  // A factual-layer metaphysical claim with only zero-weight support — the
  // "God exists" recategorization attack.
  const meta = createClaim(db, {
    topic_id: 1,
    text: 'K1 probe: a higher intelligence directs history.',
    kind: 'metaphysical',
    layer: 'factual',
    placement_reason: 'Not resolvable by documents in either direction.',
    sources: [{ tier: 'self_published', citation: 'K1 proponent site', relation: 'supports', is_claimant_self_published: true }]
  });
  proposeKindChallenge(db, meta.id, {
    to_kind: 'empirical',
    reason: 'K1: alleged historical records could bear on directed-history claims.',
    actor: 'contributor'
  });
  const up = adjudicateKindChallenge(db, meta.id, { outcome: 'upheld', actor: 'curator' });
  assert.equal(up.claim.kind, 'empirical');
  assert.equal(up.claim.radial_tier, 'outer', 'enters at exactly what zero-weight evidence earns — the honest floor');
  assert.match(up.claim.placement_reason, /Arrived on-axis via upheld kind challenge/, 'the placement reason states the route');
  assert.match(up.claim.placement_reason, /promotion battery/, 'and that inward movement still answers to the battery');
  // The push inward: refused by the untouched battery.
  for (const target of ['core', 'inner', 'middle']) {
    assert.throws(
      () => promoteClaim(db, meta.id, target),
      /requires|has 0|carry weight|none that carry/i,
      `promotion to ${target} refused on zero-weight evidence`
    );
  }
  db.close();
});

await test('K2. upheld empirical→metaphysical: every link severs with logged events; dependents re-evaluate in the SAME transaction', async () => {
  const db = fresh();
  // Claim 1 (core) supports #8 and #17 and is the kernel of #11's fan.
  const before = getClaim(db, 1);
  assert.ok(before.supports_claims.length >= 1, 'claim 1 carries support links to sever');
  proposeKindChallenge(db, 1, { to_kind: 'metaphysical', reason: 'K2 probe.', actor: 'contributor' });
  const up = adjudicateKindChallenge(db, 1, { outcome: 'upheld', actor: 'curator' });
  assert.equal(up.claim.kind, 'metaphysical');
  assert.equal(up.claim.radial_tier, null, 'tier cleared — off-axis takes no rank');
  assert.equal(up.claim.vertical.direction, 'neutral', 'vertical cleared');
  assert.ok(up.severed_supports.length >= 1, 'every support link touching it ended');
  assert.ok(up.severed_kernel_links.length >= 1, 'kernel links touching it ended too — off-axis takes no place in a lineage');
  // No dangling link anywhere.
  const dangling = db
    .prepare('SELECT COUNT(*) n FROM claim_supports WHERE supporter_id = 1 OR supported_id = 1')
    .get().n;
  assert.equal(dangling, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM claim_kernels WHERE claim_id = 1 OR kernel_id = 1').get().n, 0);
  // Logged severance, gap statements retained (2.98b discipline).
  const evs = db.prepare(`SELECT action, detail FROM events WHERE reason LIKE '%kind challenge on claim #1 %'`).all();
  assert.ok(evs.filter((e) => e.action === 'support_link_removed').length >= 1, 'support severance logged per link');
  const kernelEv = evs.find((e) => e.action === 'kernel_link_removed');
  assert.match(kernelEv.detail, /establishes:.*asserts beyond:.*path inward:/s, 'the gap statement rode into the event');
  // Dependents re-evaluated IN the adjudication (the response reports the
  // ripple — the same reevaluateClaim the library withdrawal uses). Support
  // links carry zero placement weight BY DESIGN, so severance alone cannot
  // demote a dependent whose own sources earn its tier — the re-evaluation
  // is the discipline, and it demotes exactly what no longer earns its
  // place. Here every dependent's own evidence holds, so none demote; the
  // ripple itself is the pin.
  assert.ok(Array.isArray(up.affected) && up.affected.length >= 1, 'dependents re-evaluated transactionally');
  for (const a of up.affected) assert.equal(typeof a.demoted, 'boolean');
  db.close();
});

await test('K3. NO other mover: direct kind edits and single-shot kind challenges are both refused with the honest path', async () => {
  const db = fresh();
  const server = buildApp(db, { demo: false }).listen(0);
  const base = `http://localhost:${server.address().port}`;
  try {
    for (const method of ['PATCH', 'PUT']) {
      const res = await fetch(`${base}/api/claims/1`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'historical' })
      });
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.rule, 'kind_immutable');
      assert.match(body.error, /Kind changes only through an upheld kind_mismatch challenge/);
      assert.match(body.error, /state which evidence type could bear on this sentence/, 'the honest path is named');
    }
    // The single-shot challenge path refuses the type with the pointer.
    assert.throws(
      () => challengeClaim(db, 1, { type: 'kind_mismatch', description: 'x', outcome: 'upheld' }),
      /two-phase|kind-challenge/i
    );
  } finally {
    server.close();
  }
  db.close();
});

await test('K4. rejected kind challenges persist with ZERO effect, pre- and post-adjudication', async () => {
  const db = fresh();
  const before = JSON.stringify(getClaim(db, 2));
  proposeKindChallenge(db, 2, { to_kind: 'metaphysical', reason: 'K4 probe.', actor: 'contributor' });
  // Pending: zero effect — the claim is byte-identical apart from the
  // visible proposal annotation.
  const pending = getClaim(db, 2);
  assert.equal(pending.kind, 'historical');
  assert.equal(pending.radial_tier, 'core');
  assert.ok(pending.kind_proposal, 'the proposal is visible');
  const { kind_proposal: _p, kind_proposed_at: _a, kind_proposed_to: _t, kind_proposed_reason: _r, ...rest } = pending;
  const { kind_proposed_at: _a2, kind_proposed_to: _t2, kind_proposed_reason: _r2, ...beforeRest } = JSON.parse(before);
  assert.deepEqual(JSON.parse(JSON.stringify(rest)), JSON.parse(JSON.stringify(beforeRest)), 'zero rule effect while pending');
  const rej = adjudicateKindChallenge(db, 2, { outcome: 'rejected', actor: 'curator' });
  assert.equal(rej.outcome, 'rejected');
  assert.equal(getClaim(db, 2).kind, 'historical', 'kind stands');
  // Permanent challenge row, like any other rejected attempt.
  const row = db.prepare(`SELECT * FROM challenges WHERE claim_id = 2 AND type = 'kind_mismatch'`).get();
  assert.equal(row.outcome, 'rejected');
  assert.match(row.description, /rejected/);
  // Replay: proposal and rejection both on the record.
  const hist = claimHistory(db, 2);
  assert.ok(hist.entries.some((e) => e.kind === 'kind_challenge_proposed'));
  assert.ok(hist.entries.some((e) => e.kind === 'kind_challenge_rejected'));
  db.close();
});

await test('K5. the lifecycle replays: kind_changed carries from/to and the adjudication reason; history renders it', async () => {
  const db = fresh();
  proposeKindChallenge(db, 12, { to_kind: 'empirical', reason: 'K5: records could bear on spiritual-war framing claims.', actor: 'contributor' });
  adjudicateKindChallenge(db, 12, { outcome: 'upheld', actor: 'reviewer' });
  const ev = db.prepare(`SELECT * FROM events WHERE action = 'kind_changed' AND claim_id = 12`).get();
  assert.match(ev.detail, /metaphysical → empirical/);
  assert.match(ev.detail, /enters at (outer|outermost)/);
  assert.match(ev.reason, /K5: records could bear/);
  const hist = claimHistory(db, 12);
  assert.ok(hist.entries.some((e) => e.kind === 'kind_changed'), 'history lists the change');
  const upheldRow = db.prepare(`SELECT * FROM challenges WHERE claim_id = 12 AND type = 'kind_mismatch'`).get();
  assert.equal(upheldRow.outcome, 'upheld');
  assert.match(upheldRow.resulting_tier_change, /off-axis → (outer|outermost)/);
  db.close();
});

await test('K6. adjudication quality is load-bearing and gated: personas hold, proposer never upholds their own', async () => {
  const db = fresh();
  proposeKindChallenge(db, 12, { to_kind: 'empirical', reason: 'K6 reviewer files.', actor: 'reviewer' });
  assert.throws(
    () => adjudicateKindChallenge(db, 12, { outcome: 'upheld', actor: 'contributor' }),
    /adjudicates nothing/,
    'contributor adjudicates nothing'
  );
  assert.throws(
    () => adjudicateKindChallenge(db, 12, { outcome: 'upheld', actor: 'reviewer' }),
    /proposer never upholds/i,
    'the filing reviewer cannot uphold their own'
  );
  const retract = adjudicateKindChallenge(db, 12, { outcome: 'rejected', actor: 'reviewer' });
  assert.equal(retract.outcome, 'rejected', 'retraction of one\'s own stays permitted');
  db.close();
});

await test('R1. recast_of: creation-validated, zero weight both directions, the original never moves with the recast\'s fate', async () => {
  const db = fresh();
  // The recast of MKUltra's off-axis claim (#12), evidence-eligible.
  const recast = createClaim(db, {
    topic_id: 1,
    text: 'R1: the campaigns described as spiritual warfare were documented psychological operations.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 'Stated faithfully; no strong sources attached yet. Path inward: operational documents.',
    recast_of: 12,
    sources: []
  });
  assert.equal(recast.recast_of, 12);
  assert.equal(recast.recast_of_claim.id, 12, 'the recast names its original');
  const original = getClaim(db, 12);
  assert.ok(original.recasts.some((r) => r.id === recast.id), 'the original lists its recasts');
  // Validation: recast_of must name an OFF-AXIS claim; a recast must be on-axis.
  assert.throws(() => createClaim(db, { topic_id: 1, text: 'R1 bad target.', kind: 'empirical', layer: 'factual', radial_tier: 'outer', placement_reason: 'x', recast_of: 1, sources: [] }), /OFF-AXIS claim|kind_mismatch challenge, not a recast/);
  assert.throws(() => createClaim(db, { topic_id: 1, text: 'R1 meta recast.', kind: 'metaphysical', layer: 'framing', placement_reason: 'x', recast_of: 12, sources: [] }), /must itself be empirical or historical/);
  // Zero weight, direction 1: the recast cannot cite the original as
  // support (off-axis claims feed nothing — explicit pin).
  assert.throws(() => addSupport(db, 12, recast.id), /off the radial axis|neither give nor receive/i);
  // Zero weight, direction 2 — the strawman shield: the recast's fate never
  // moves the original. Demote the recast to the debunked shell…
  const beforeOriginal = JSON.stringify({ kind: original.kind, radial_tier: original.radial_tier, status: original.status, placement_reason: original.placement_reason });
  const { demoteClaim } = await import('../server/service.js');
  demoteClaim(db, recast.id, { target_tier: 'outermost', reason: 'R1: checked and failed.', type: 'contradicting_evidence' });
  const afterOriginal = getClaim(db, 12);
  assert.equal(
    JSON.stringify({ kind: afterOriginal.kind, radial_tier: afterOriginal.radial_tier, status: afterOriginal.status, placement_reason: afterOriginal.placement_reason }),
    beforeOriginal,
    'a recast landing Outermost does not refute the original'
  );
  db.close();
});

await test('R2. both pages display the relation; kind proposals render on pages; saves round-trip the new columns', async () => {
  const db = fresh();
  const recast = createClaim(db, {
    topic_id: 1,
    text: 'R2 page probe: a deliberate evidence-eligible rewording.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 'Stated faithfully.',
    recast_of: 12,
    sources: []
  });
  proposeKindChallenge(db, 9, { to_kind: 'historical', reason: 'R2 pending probe.', actor: 'contributor' });
  const server = buildApp(db, { demo: false }).listen(0);
  const base = `http://localhost:${server.address().port}`;
  try {
    const recastPage = await (await fetch(`${base}/claim/${recast.id}`)).text();
    assert.match(recastPage, /Empirical recast of:/);
    assert.match(recastPage, /does not vindicate it.*does not refute it/s, 'the strawman shield is stated');
    const originalPage = await (await fetch(`${base}/claim/12`)).text();
    assert.match(originalPage, /Evidence-eligible rewordings of this off-axis claim/);
    assert.match(originalPage, new RegExp(`#${recast.id}`), 'the original maps its recasts with tier/status');
    const pendingPage = await (await fetch(`${base}/claim/9`)).text();
    assert.match(pendingPage, /Kind challenge pending/);
    assert.match(pendingPage, /zero effect until adjudication/i);
  } finally {
    server.close();
  }
  // Save round-trip: the pending proposal and the recast relation survive
  // export → restore verbatim.
  const record = exportRecord(db);
  const db2 = openDb(':memory:');
  restoreHistory(db2, { format: 'truth-onion-history', version: 1, ...record });
  const back = getClaim(db2, recast.id);
  assert.equal(back.recast_of, 12, 'recast_of rides the save');
  const pendingBack = getClaim(db2, 9);
  assert.equal(pendingBack.kind_proposal.to, 'historical', 'the pending kind challenge rides the save');
  db2.close();
  db.close();
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
