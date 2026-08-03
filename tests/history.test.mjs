// History fixture pins (fix session 2026-08-01, pre-2.99a). The demo's
// pristine database is a RESTORE of the exported curated record: original
// timestamps, reasons, and actors verbatim — nothing stamped at build or
// boot time. These tests state that guarantee and the honesty markers that
// ride on it: derived/actor-unknown pre-epoch entries, the epoch boundary
// on every topic (including Replication Crisis's pre-creation window), and
// an identity-clean fixture.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDb } from '../server/db.js';
import { restoreHistory } from '../server/history.js';
import { logEpoch, topicTimeline, topicAtTime, claimHistory } from '../server/timemachine.js';
import { getClaim } from '../server/db.js';

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

console.log('\nHistory fixture — restored record, preserved time, honest boundaries\n');

const restore = () => {
  const db = openDb(':memory:');
  restoreHistory(db, fixture);
  return db;
};
const db = restore();

await test('H1. rebuild twice: the event timeline is identical and IS the fixture', () => {
  const db2 = restore();
  // node:sqlite rows are null-prototype objects; strict deepEqual checks
  // prototypes, so compare plain JSON values — the data, which is the claim.
  const rows = (d) => JSON.parse(JSON.stringify(d.prepare('SELECT * FROM events ORDER BY id').all()));
  assert.deepEqual(rows(db), rows(db2), 'two restores must be byte-identical');
  assert.deepEqual(
    rows(db),
    JSON.parse(JSON.stringify(fixture.events)),
    'the restored event log is the fixture event log — same ids, timestamps, actors, reasons'
  );
  db2.close();
});

await test('H2. nothing is stamped at build time: every timestamp comes from the fixture', () => {
  const fixtureTimes = new Set([
    ...fixture.claims.map((c) => c.created_at),
    ...fixture.kernels.map((k) => k.created_at),
    ...fixture.challenges.map((c) => c.created_at),
    ...fixture.events.map((e) => e.created_at)
  ]);
  const dbTimes = [
    ...db.prepare('SELECT created_at t FROM claims').all(),
    ...db.prepare('SELECT created_at t FROM claim_kernels').all(),
    ...db.prepare('SELECT created_at t FROM challenges').all(),
    ...db.prepare('SELECT created_at t FROM events').all()
  ].map((r) => r.t);
  for (const t of dbTimes) {
    assert.ok(fixtureTimes.has(t), `timestamp ${t} in the restored DB is not in the fixture — something re-stamped`);
  }
  // And none of them is restore-day time unless the fixture itself says so.
  const exportDay = fixture.exported_at.slice(0, 10);
  const fixtureOnExportDay = [...fixtureTimes].filter((t) => String(t).startsWith(exportDay));
  for (const t of dbTimes.filter((t) => String(t) >= fixture.exported_at.replace('T', ' '))) {
    assert.ok(fixtureOnExportDay.includes(t), `timestamp ${t} postdates the export — build-day stamping`);
  }
});

await test('H3. the epoch is the recorded one and pre-epoch history renders derived, actor unknown', () => {
  assert.equal(logEpoch(db), '2026-07-27 22:19:01', 'epoch = the first recorded event, as on the live DB');
  // Claim 1 was created 2026-07-11, before the log epoch: its creation entry
  // is derived-from-record with NO actor — never guessed, never defaulted.
  const h = claimHistory(db, 1);
  const created = h.entries.find((e) => e.kind === 'created');
  assert.equal(created.at, '2026-07-11 22:41:52', 'real creation time, not build time');
  assert.equal(created.origin, 'derived');
  assert.equal(created.actor, null);
  // Post-epoch events keep their recorded actors.
  const timeline = topicTimeline(db, 1);
  const logged = timeline.events.filter((e) => e.origin === 'log');
  assert.ok(logged.length >= 6, 'the logged MKUltra events survive');
  assert.ok(logged.every((e) => e.actor != null), 'logged events keep recorded actors');
  const derived = timeline.events.filter((e) => e.origin === 'derived');
  assert.ok(derived.length > 0, 'pre-epoch record backfills as derived');
  assert.ok(derived.every((e) => e.actor === null), 'derived rows never carry a guessed actor');
});

await test('H3b. every topic scrubber spans its real history — including RC pre-creation epoch treatment', () => {
  const spans = {
    1: ['2026-07-11', '2026-07-28'],
    2: ['2026-07-11', '2026-08-01'],
    3: ['2026-07-12', '2026-07-30'],
    // Topic 7 = UAP (live id preserved; 4–6 are the excluded live topics).
    // Seeded 2026-08-02/03 through the rules layer — its history genuinely
    // begins at its own seeding, all post-epoch, all logged.
    7: ['2026-08-0', '2026-08-0']
  };
  for (const [topicId, [lo, hi]] of Object.entries(spans)) {
    const tl = topicTimeline(db, Number(topicId));
    assert.ok(tl.events.length > 0, `topic ${topicId} timeline is not blank`);
    const first = tl.events[0].at, last = tl.events[tl.events.length - 1].at;
    assert.ok(first.startsWith(lo), `topic ${topicId} history begins ${first}, expected ${lo}`);
    assert.ok(last.startsWith(hi), `topic ${topicId} history ends ${last}, expected ${hi}`);
  }
  // Replication Crisis before its own creation: the epoch treatment, not a
  // blank — pre-epoch flagged, incomplete, with the honesty note.
  const before = topicAtTime(db, 3, '2026-07-01 00:00:00');
  assert.equal(before.pre_epoch, true);
  assert.equal(before.complete, false);
  assert.equal(before.claims.length, 0, 'no RC claim existed yet — absent, never guessed');
  assert.ok(
    before.reconstruction_notes.some((n) => /predates recorded history/i.test(n)),
    'the pre-epoch note renders'
  );
  // And between RC creation and the epoch: claims exist, still honestly incomplete.
  const between = topicAtTime(db, 3, '2026-07-20 00:00:00');
  assert.ok(between.claims.length > 0, 'RC claims exist by 2026-07-20');
  assert.equal(between.complete, false, 'pre-epoch views never present as complete');
});

await test('H4. the fixture is FFFD-free and every encoding repair is disclosed', () => {
  const raw = readFileSync(join(root, 'exports', 'curated-record.history.json'), 'utf8');
  assert.ok(!raw.includes('�'), 'zero replacement characters in the fixture');
  assert.ok(fixture.corrections.length >= 9, 'the curl-era repairs are disclosed, not silent');
  for (const c of fixture.corrections) {
    assert.ok(c.table && c.id && c.field && /disclosed/i.test(c.note), 'each correction names table, id, field');
  }
  // The repaired glyphs are the intended ones.
  const k3 = fixture.kernels.find((k) => k.id === 3);
  assert.ok(k3.gap_establishes.includes('1956–1971'), 'en-dash year range');
  const e5 = fixture.events.find((e) => e.id === 5);
  assert.ok(e5.reason.includes("program's existence"), 'possessive apostrophe');
  assert.ok(e5.reason.includes('1973 — the'), 'clause em-dash');
});

await test('H5. the recorded withdrawal restores withdrawn — rules, render, and search all honest', () => {
  const claim = getClaim(db, 20);
  assert.ok(!claim.sources.some((s) => s.id === 31), 'a withdrawn attachment carries no weight and is not active');
  const wd = (claim.withdrawn_sources || []).find((s) => s.id === 31);
  assert.ok(wd, 'the withdrawn source renders diminished, never vanished');
  assert.equal(wd.withdrawn_at, '2026-08-01 21:00:42', 'the recorded adjudication time, verbatim');
  assert.match(wd.withdrawn_reason, /too broad/, 'the operator\'s recorded reason, verbatim');
  const indexed = db
    .prepare(`SELECT COUNT(*) n FROM search_index WHERE field = 'source' AND claim_id = 20 AND ref_id = 31`)
    .get().n;
  assert.equal(indexed, 0, 'withdrawn evidence is out of the search index (as on the live record)');
  // The withdrawal's event trail restored with it.
  const acts = db.prepare('SELECT action FROM events WHERE claim_id = 20 ORDER BY id').all().map((r) => r.action);
  assert.ok(acts.includes('withdrawal_proposed') && acts.includes('source_detached'), 'propose + adjudicate both on the record');
});

await test('H6. identity bar: no name, no email, no paths; actors are curator-neutral values only', () => {
  const raw = readFileSync(join(root, 'exports', 'curated-record.history.json'), 'utf8');
  assert.ok(!/\bdane\b/i.test(raw), 'no real name');
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(raw), 'no email address');
  assert.ok(!/[A-Za-z]:\\|\/Users\/|OneDrive/i.test(raw), 'no filesystem path');
  const actors = [...new Set(fixture.events.map((e) => e.actor))].sort();
  assert.deepEqual(
    actors,
    ['claude (2.9b seeding)', 'claude (2.99b seeding)', 'local'].sort(),
    'actor values are the recorded, neutral set'
  );
});

await test('H7. curation boundary: the curated FOUR (R1 amendment), no residue, id gaps honest', () => {
  assert.deepEqual(fixture.topics.map((t) => t.name), [
    'MKUltra',
    'COINTELPRO',
    'The Replication Crisis',
    'UAP: Disclosure, Evidence, and Overreach'
  ]);
  // Topic ids verbatim from the live record: 1,2,3,7 — the gap (4–6) IS
  // the curation, honestly visible, never compacted.
  assert.deepEqual(fixture.topics.map((t) => t.id), [1, 2, 3, 7]);
  const raw = readFileSync(join(root, 'exports', 'curated-record.history.json'), 'utf8');
  assert.ok(!/christ is god/i.test(raw), 'the test topic is absent');
  // Event 10 (the excluded topic's creation) leaves its id gap — ids are
  // verbatim, never compacted into a fake continuity. Events 14+ are the
  // UAP seeding, logged through the rules layer with its own actor.
  const ids = fixture.events.map((e) => e.id);
  assert.ok(!ids.includes(10), 'the excluded topic\'s event is not carried');
  assert.deepEqual(
    ids,
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
    'recorded event ids, gap preserved'
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
db.close();
process.exit(failed ? 1 : 0);
