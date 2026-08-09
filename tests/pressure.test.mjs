// SPDX-License-Identifier: AGPL-3.0-only
// Adversarial pressure tests — the sneaky paths where an engine like this
// usually leaks: tier laundering, zero-weight aggregation, circular support,
// and edit-after-placement.

import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { buildApp } from '../server/index.js';

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
  } catch {
    // non-JSON body (e.g. an Express default 404 page)
  }
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

const mk = (over = {}) =>
  api('POST', '/api/claims', {
    topic_id: 1,
    text: over.text || `PRESSURE: claim ${Math.random()}`,
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 'pressure-test fixture',
    sources: [],
    ...over
  });

console.log('\nPressure tests — the sneaky paths\n');

// ---------------------------------------------------------------- laundering
await test('L1. one single-outlet source cannot reach Middle', async () => {
  const c = (await mk({ text: 'PRESSURE: laundering candidate.', sources: [
    { tier: 'single_outlet', citation: 'Outlet A', relation: 'supports' }
  ] })).body;
  const r = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: 'middle' });
  assert.equal(r.status, 422, 'one single-outlet source must not earn middle');
  globalThis.launder = c;
});

await test('L2. two single-outlet sources earn Middle (by design) but never Inner', async () => {
  const c = globalThis.launder;
  await api('POST', `/api/claims/${c.id}/sources`, {
    tier: 'single_outlet', citation: 'Outlet B', relation: 'supports'
  });
  const mid = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: 'middle' });
  assert.equal(mid.status, 200, 'two independent single-outlet reports earn middle');
  const inner = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: 'inner' });
  assert.equal(inner.status, 422, 'two weak sources must not ratchet to inner');
});

await test('L3. piling on MORE weak sources still never reaches Inner or Core', async () => {
  const c = globalThis.launder;
  for (const name of ['C', 'D', 'E', 'F', 'G']) {
    await api('POST', `/api/claims/${c.id}/sources`, {
      tier: 'single_outlet', citation: `Outlet ${name}`, relation: 'supports'
    });
  }
  // Seven single-outlet sources now attached. The battery re-evaluates the
  // full evidence profile against each target's absolute bar — no ratchet.
  const inner = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: 'inner' });
  assert.equal(inner.status, 422, 'seven single-outlet sources must not earn inner');
  const core = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: 'core' });
  assert.equal(core.status, 422, 'seven single-outlet sources must not earn core');
  assert.equal(core.body.earned_tier, 'middle', 'earned tier stays middle');
});

// ------------------------------------------------- zero-weight in aggregate
await test('Z1. five self-published sources aggregate to exactly zero', async () => {
  const c = (await mk({
    text: 'PRESSURE: self-assertion in bulk.',
    sources: Array.from({ length: 5 }, (_, i) => ({
      tier: 'self_published',
      citation: `The claimant's own site, post ${i + 1}`,
      relation: 'supports',
      is_claimant_self_published: true
    }))
  })).body;
  for (const target of ['middle', 'inner', 'core']) {
    const r = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: target });
    assert.equal(r.status, 422, `five self-published sources justified ${target}`);
    assert.equal(r.body.earned_tier, 'outer', 'earned tier must remain outer');
  }
});

await test('Z2. mixing zero-weight bulk with one real source earns only what the real one earns', async () => {
  const c = (await mk({
    text: 'PRESSURE: one real source among the noise.',
    sources: [
      { tier: 'reputable_secondary', citation: 'One real outlet piece', relation: 'supports' },
      ...Array.from({ length: 4 }, (_, i) => ({
        tier: 'anonymous', citation: `Anon ${i}`, relation: 'supports'
      }))
    ]
  })).body;
  const mid = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: 'middle' });
  assert.equal(mid.status, 200, 'the one reputable source earns middle');
  const inner = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: 'inner' });
  assert.equal(inner.status, 422, 'the anonymous bulk adds nothing toward inner');
});

// ----------------------------------------------------------- circular support
await test('C1. a mutual-support cycle cannot lift either claim', async () => {
  const A = (await mk({
    text: 'PRESSURE: cycle claim A.', radial_tier: 'middle',
    sources: [{ tier: 'reputable_secondary', citation: 'Outlet on A', relation: 'supports' }]
  })).body;
  const B = (await mk({
    text: 'PRESSURE: cycle claim B.', radial_tier: 'middle',
    sources: [
      { tier: 'primary_doc', citation: 'Primary on B (1)', relation: 'supports' },
      { tier: 'primary_doc', citation: 'Primary on B (2)', relation: 'supports' }
    ]
  })).body;
  assert.equal((await api('POST', `/api/claims/${A.id}/supports`, { supported_id: B.id })).status, 200);
  assert.equal((await api('POST', `/api/claims/${B.id}/supports`, { supported_id: A.id })).status, 200);
  // B has core-grade sources, but promoting it means resting on A (middle).
  const r = await api('POST', `/api/claims/${B.id}/promote`, { target_tier: 'inner' });
  assert.equal(r.status, 422, 'cycle member must not promote past its supporter');
  assert.match(r.body.error, /weaker tier/i);
  globalThis.cycle = { A, B };
});

await test('C2. demoting a cycle member severs only the now-illegal link', async () => {
  const { A, B } = globalThis.cycle;
  const r = await api('POST', `/api/claims/${A.id}/demote`, {
    target_tier: 'outer',
    reason: 'On review, the single outlet piece does not hold up.'
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  // A (now outer) can no longer feed B (middle): that link must be severed.
  assert.equal(r.body.severed_supports.length, 1);
  assert.equal(r.body.severed_supports[0].id, B.id);
  const freshB = (await api('GET', `/api/claims/${B.id}`)).body;
  assert.ok(!freshB.supported_by.includes(A.id), 'A→B link must be gone');
  // B (middle) supporting A (outer) is strong-feeds-weak — legal, stays.
  assert.ok(freshB.supports_claims.includes(A.id), 'B→A link is legal and stays');
  // B keeps its tier: its placement rests on its sources, not on the link.
  assert.equal(freshB.radial_tier, 'middle');
  // And with the cycle broken, B's own evidence can now earn inner.
  const up = await api('POST', `/api/claims/${B.id}/promote`, { target_tier: 'inner' });
  assert.equal(up.status, 200, 'B promotes on its own evidence once the cycle is broken');
});

// -------------------------------------------------------- edit-after-placement
await test('E1. claim text cannot be edited after placement — at all', async () => {
  const core = (await api('GET', '/api/topics/1')).body.claims.find(
    (c) => c.radial_tier === 'core'
  );
  for (const method of ['PATCH', 'PUT']) {
    const r = await api(method, `/api/claims/${core.id}`, {
      text: 'MKUltra achieved reliable operational mind control.'
    });
    assert.equal(r.status, 422, `${method} must be refused`);
    assert.match(r.body.error, /immutable/i);
  }
  const fresh = (await api('GET', `/api/claims/${core.id}`)).body;
  assert.equal(fresh.text, core.text, 'text unchanged');
});

await test('E2. the vertical endpoint cannot smuggle a text change', async () => {
  const core = (await api('GET', '/api/topics/1')).body.claims.find(
    (c) => c.radial_tier === 'core' && c.vertical.direction === 'harm'
  );
  const r = await api('PATCH', `/api/claims/${core.id}/vertical`, {
    direction: 'harm', magnitude: 1, evidenced: true,
    text: 'smuggled new text'
  });
  assert.equal(r.status, 200);
  const fresh = (await api('GET', `/api/claims/${core.id}`)).body;
  assert.equal(fresh.text, core.text, 'text unchanged through vertical endpoint');
});

// ------------------------------------------------- challenge cannot promote
await test('X1. an upheld challenge cannot be aimed inward', async () => {
  const outer = (await api('GET', '/api/topics/1')).body.claims.find(
    (c) => c.radial_tier === 'outer'
  );
  const r = await api('POST', `/api/claims/${outer.id}/challenges`, {
    type: 'mis_tiered',
    description: 'Actually this deserves core.',
    outcome: 'upheld',
    resulting_tier: 'core'
  });
  assert.equal(r.status, 422);
  assert.match(r.body.error, /outward/i);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
server.close();
process.exit(failed ? 1 : 0);
