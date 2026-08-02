// Stage 2.95 pressure tests: the time machine. State reconstruction from
// the log; error-vs-supersession legibility; failed promotions in history;
// strict read-only from historical views; the log epoch rendered honestly
// (backfill distinct, no pre-epoch completeness); stats as topic aggregates
// only; and the scope-event deferral held (record types not invented).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { buildApp } from '../server/index.js';
import { writeBlockedReason } from '../client/src/timeState.js';

const db = openDb(':memory:');
seed(db);
const server = buildApp(db).listen(0);
const base = `http://localhost:${server.address().port}`;

const api = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, body: json };
};

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

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowTs = () => db.prepare(`SELECT datetime('now') AS t`).get().t;
const PRIMARY = (n) => ({ tier: 'primary_doc', citation: `S295 primary ${n}`, relation: 'supports' });

console.log('\nStage 2.95 — the time machine\n');

// ------------------------------------------------------------ reconstruction
let tCreated, tAttached, tDemoted, probe;
await test('R1. the map at a past moment replays the record: presence, sources, tier, weathering', async () => {
  probe = (
    await api('POST', '/api/claims', {
      topic_id: 1,
      text: 'S295: probe claim for replay.',
      kind: 'empirical',
      layer: 'factual',
      radial_tier: 'middle',
      placement_reason: 'S295: one reputable source.',
      sources: [{ tier: 'reputable_secondary', citation: 'S295 reputable A', relation: 'supports' }]
    })
  ).body;
  tCreated = nowTs();
  await sleep(1200);
  await api('POST', `/api/claims/${probe.id}/sources`, {
    tier: 'primary_doc',
    citation: 'S295 contradicting record',
    relation: 'contradicts'
  });
  tAttached = nowTs();
  await sleep(1200);
  await api('POST', `/api/claims/${probe.id}/challenges`, {
    type: 'contradicting_evidence',
    description: 'S295: the primary record contradicts the claim.',
    outcome: 'upheld',
    resulting_tier: 'outer'
  });
  tDemoted = nowTs();

  const before = (await api('GET', `/api/topics/1/at?ts=${encodeURIComponent('2020-01-01 00:00:00')}`)).body;
  assert.ok(!before.claims.some((c) => c.id === probe.id), 'not yet in the record in 2020');

  const mid = (await api('GET', `/api/topics/1/at?ts=${encodeURIComponent(tCreated)}`)).body;
  const atMid = mid.claims.find((c) => c.id === probe.id);
  assert.ok(atMid, 'present at creation moment');
  assert.equal(atMid.radial_tier, 'middle', 'tier as placed');
  assert.equal(atMid.sources.length, 1, 'only the original source');
  assert.equal(atMid.challenges.length, 1, 'placement review only');

  const afterAttach = (await api('GET', `/api/topics/1/at?ts=${encodeURIComponent(tAttached)}`)).body;
  const atB = afterAttach.claims.find((c) => c.id === probe.id);
  assert.equal(atB.sources.length, 2, 'contradicting source visible once attached');
  assert.equal(atB.radial_tier, 'middle', 'still middle before the demotion');

  const now = (await api('GET', `/api/topics/1/at?ts=${encodeURIComponent(tDemoted)}`)).body;
  const atC = now.claims.find((c) => c.id === probe.id);
  assert.equal(atC.radial_tier, 'outer', 'demoted at the demotion moment');
  assert.ok(atC.challenges.length >= 2, 'weathering accumulates in replay');
  assert.equal(now.complete, true);
  assert.equal(now.pre_epoch, false);
});

await test('R2. detached sources are restored in past views (reconstructed, flagged)', async () => {
  const c = (
    await api('POST', '/api/claims', {
      topic_id: 1,
      text: 'S295: claim that later loses a source.',
      kind: 'empirical',
      layer: 'factual',
      radial_tier: 'outer',
      placement_reason: 'S295 fixture.',
      sources: [PRIMARY('detach-me')]
    })
  ).body;
  const tHeld = nowTs();
  await sleep(1200);
  // 2.98b: the detach is a recorded withdrawal — the row survives, so the
  // past view restores it VERBATIM (relation intact), still flagged.
  // Amendment A: file + adjudicate; effect at adjudication.
  await api('POST', `/api/claims/${c.id}/sources/${c.sources[0].id}/withdraw`, {
    reason: 'S295: withdrawn to test replay'
  });
  await api('POST', `/api/claims/${c.id}/sources/${c.sources[0].id}/withdraw/adjudicate`, {
    outcome: 'upheld'
  });
  const past = (await api('GET', `/api/claims/${c.id}/at?ts=${encodeURIComponent(tHeld)}`)).body;
  const restored = past.claim.sources.find((s) => /detach-me/.test(s.citation));
  assert.ok(restored, 'the source it held then is shown');
  assert.equal(restored.reconstructed, true, 'flagged as reconstructed');
  const nowView = (await api('GET', `/api/claims/${c.id}/at?ts=${encodeURIComponent(nowTs())}`)).body;
  assert.equal(nowView.claim.sources.length, 0, 'and gone at now');
  assert.equal(nowView.claim.withdrawn_sources.length, 1, 'present at now as a withdrawal, not an absence');
});

// ------------------------------------------------------------ B: error vs supersession
await test('B1. superseded vs corrected is legible and mechanical; unlabeled when the record cannot say', async () => {
  const hist = (await api('GET', `/api/claims/${probe.id}/history`)).body;
  const demo1 = hist.entries.find((e) => e.kind === 'demotion');
  assert.equal(demo1.classification, 'superseded', 'evidence arrived after placement → superseded');

  const mis = (
    await api('POST', '/api/claims', {
      topic_id: 1,
      text: 'S295: claim placed too far in on the same evidence.',
      kind: 'empirical',
      layer: 'factual',
      radial_tier: 'middle',
      placement_reason: 'S295 fixture.',
      sources: [{ tier: 'reputable_secondary', citation: 'S295 reputable B', relation: 'supports' }]
    })
  ).body;
  await api('POST', `/api/claims/${mis.id}/challenges`, {
    type: 'mis_tiered',
    description: 'S295: overweighted from day one — nothing new arrived.',
    outcome: 'upheld',
    resulting_tier: 'outer'
  });
  const h2 = (await api('GET', `/api/claims/${mis.id}/history`)).body;
  const demo2 = h2.entries.find((e) => e.kind === 'demotion');
  assert.equal(demo2.classification, 'corrected', 'no evidence change + mis_tiered → corrected');
});

await test('B2. failed promotion attempts render in history — tried and refused stays on the record', async () => {
  await api('POST', `/api/claims/${probe.id}/promote`, { target_tier: 'core' });
  const hist = (await api('GET', `/api/claims/${probe.id}/history`)).body;
  const refusal = hist.entries.find((e) => e.kind === 'promotion_failed');
  assert.ok(refusal, 'the refused attempt appears');
  assert.equal(refusal.outcome, 'upheld');
});

// ------------------------------------------------------------ C: strict read-only
await test('C1. no historical view reaches a write path: endpoints are GET-only; the client guard refuses with a plain reason', async () => {
  const idx = readFileSync(join(root, 'server', 'index.js'), 'utf8');
  // Every time-machine route is registered with app.get and nothing else,
  // and no write route takes a timestamp to act against.
  const nonGet = idx.match(/app\.(post|put|patch|delete)\([^\n]*/g) || [];
  for (const r of nonGet) {
    assert.ok(!/timeline|\/at\b|\/history|\/stats|\/epoch/.test(r), `a write route touches the time machine: ${r}`);
    assert.ok(!/\bts=/.test(r), `a write route accepts a timestamp: ${r}`);
  }
  const tm = readFileSync(join(root, 'server', 'timemachine.js'), 'utf8');
  assert.ok(!/\.run\(/.test(tm), 'timemachine.js issues no mutating statements — reconstruction never writes');

  assert.equal(writeBlockedReason(null), null, 'at Now, writes flow');
  const blocked = writeBlockedReason('2026-07-27 10:00:00');
  assert.match(blocked, /read-only/i);
  assert.match(blocked, /Return to Now/i);
  const appSrc = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(appSrc, /const blocked = writeBlockedReason\(scrubTs\)/, 'run() consults the guard');
});

// ------------------------------------------------------------ Amendment A: the epoch
await test('E1. pre-epoch: derived events are distinct, actor stays unknown, and no pre-epoch view claims completeness', async () => {
  // Simulate a pre-log-era record: rows carrying their own timestamps,
  // inserted without events (exactly what pre-epoch history looks like).
  db.prepare(
    `INSERT INTO claims (topic_id, text, kind, layer, radial_tier, status, placement_reason, created_at)
     VALUES (1, 'S295: an old claim from before the log.', 'historical', 'factual', 'middle', 'contested', 'old placement', '2026-01-10 00:00:00')`
  ).run();
  const oldId = db.prepare('SELECT id FROM claims WHERE text LIKE ?').get('S295: an old claim%').id;
  db.prepare('DELETE FROM search_index WHERE claim_id = ?').run(oldId); // keep FTS consistent with backdate story
  db.prepare(
    `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change, created_at)
     VALUES (?, 'mis_tiered', 'S295: old correction.', 'upheld', 'inner → middle', '2026-02-01 00:00:00')`
  ).run(oldId);

  const tl = (await api('GET', '/api/topics/1/timeline')).body;
  assert.ok(tl.epoch, 'the epoch is exposed');
  const derived = tl.events.filter((e) => e.origin === 'derived');
  const logged = tl.events.filter((e) => e.origin === 'log');
  assert.ok(derived.length >= 2, 'backfilled events exist for the old claim');
  assert.ok(derived.every((e) => e.actor === null), 'unknown actor stays unknown — never defaulted');
  assert.ok(derived.every((e) => e.at < tl.epoch), 'derived rows exist only before the epoch');
  assert.ok(logged.every((e) => e.actor != null), 'logged rows carry their actor');

  // History actors are LOG-sourced or null — never defaulted to a name.
  const oldHist = (await api('GET', `/api/claims/${oldId}/history`)).body;
  assert.ok(oldHist.entries.length >= 2);
  assert.ok(oldHist.entries.every((e) => e.actor === null), 'pre-log actors stay unknown');
  const probeHist = (await api('GET', `/api/claims/${probe.id}/history`)).body;
  const probeDemo = probeHist.entries.find((e) => e.kind === 'demotion');
  assert.equal(probeDemo.actor, 'local', 'post-epoch actors come from the logged event itself');

  const preView = (await api('GET', `/api/topics/1/at?ts=${encodeURIComponent('2026-01-15 00:00:00')}`)).body;
  assert.equal(preView.pre_epoch, true);
  assert.equal(preView.complete, false, 'no pre-epoch view presents itself as complete');
  assert.ok(preView.reconstruction_notes.some((n) => /predates recorded history/.test(n)));
  const old = preView.claims.find((c) => c.id === oldId);
  assert.ok(old, 'the old claim renders at its era');
  assert.equal(old.radial_tier, 'inner', 'tier before its recorded move — from the move row itself');
});

// ------------------------------------------------------------ F: statistics
await test('F1. statistics are topic aggregates only — readouts, never leaderboards, no path to reputation', async () => {
  const stats = (await api('GET', '/api/topics/1/stats')).body;
  for (const key of [
    'migrations',
    'churn_moves_per_claim',
    'survival_days_by_tier',
    'challenge_outcomes',
    'demotion_character',
    'supersession_rate'
  ]) {
    assert.ok(key in stats, `missing readout: ${key}`);
  }
  const keys = [];
  (function walk(o) {
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) {
        keys.push(k.toLowerCase());
        walk(v);
      }
    }
  })(stats);
  const bannedExact = ['actor', 'actors', 'user', 'users', 'name', 'names', 'leaderboard', 'ranking', 'rankings', 'participant', 'participants', 'most_active'];
  for (const k of keys) {
    assert.ok(!bannedExact.includes(k), `stats payload keys "${k}" — that is a leaderboard door`);
    assert.ok(!/^top[_\d]/.test(k), `stats payload keys a top-N list ("${k}")`);
  }
  assert.ok(stats.migrations.failed_promotions >= 1, 'refusals are counted, honestly');
  assert.ok(stats.demotion_character.superseded_by_later_evidence >= 1);
  assert.ok(stats.demotion_character.corrected_placements >= 1);
});

// ------------------------------------------------------------ D: scope deferral
await test('D1. scope-event record types were NOT invented: the deferral is real', async () => {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','view')`)
    .all()
    .map((r) => r.name.toLowerCase());
  for (const t of tables) {
    assert.ok(
      !/scope|tombstone|redact|supersession/.test(t),
      `schema contains "${t}" — scope records must not be invented this stage`
    );
  }
});

// ------------------------------------------------------------ composition
await test('X1. dial and scrubber compose in one place; scrub state lives in App (survives the 2D/3D toggle)', async () => {
  const appSrc = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(appSrc, /activeClaims\.filter\(\(c\) => visibleAtDepth\(c, depth\)\)/, 'the dial filters the scrubbed view');
  assert.match(appSrc, /const \[scrubTs, setScrubTs\] = useState\(null\)/, 'scrub state is App state, not view state');
  const scrub = readFileSync(join(root, 'client', 'src', 'TimeScrubber.jsx'), 'utf8');
  assert.match(scrub, /recorded history begins/i, 'the epoch boundary names itself');
  assert.match(scrub, /'Now'/, 'the Now position is explicit');
});

console.log(`\n${passed} passed, ${failed} failed`);
server.close();
process.exit(failed ? 1 : 0);
