// SPDX-License-Identifier: AGPL-3.0-only
// Stage Two pressure tests: multi-topic + cross-topic constraints + proof
// that the depth dial (a view-only client control) cannot touch the rules.

import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { buildApp } from '../server/index.js';

const db = openDb(':memory:');
seed(db);
const server = buildApp(db).listen(0);
const base = `http://localhost:${server.address().port}`;

const api = async (method, path, body, headers = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
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

const TIERS = ['core', 'inner', 'middle', 'outer', 'outermost'];
const mkultra = (await api('GET', '/api/topics/1')).body;
const cointelpro = (await api('GET', '/api/topics/2')).body;

const mk = (topic_id, over = {}) =>
  api('POST', '/api/claims', {
    topic_id,
    text: over.text || `STAGE2: claim ${Math.random()}`,
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'middle',
    placement_reason: 'stage2-test fixture',
    sources: [{ tier: 'reputable_secondary', citation: 'Outlet piece', relation: 'supports' }],
    ...over
  });

console.log('\nStage Two — multi-topic & dial pressure tests\n');

await test('T1. both topics are seeded, sharing one engine, every ring tier populated', async () => {
  assert.equal(mkultra.name, 'MKUltra');
  assert.equal(cointelpro.name, 'COINTELPRO');
  for (const topic of [mkultra, cointelpro]) {
    for (const tier of TIERS) {
      assert.ok(
        topic.claims.some((c) => c.radial_tier === tier),
        `${topic.name} has no ${tier} claim`
      );
    }
    assert.ok(
      topic.claims.some((c) => c.radial_tier === null),
      `${topic.name} has no off-axis metaphysical claim`
    );
  }
});

await test('T2. the seeded cross-topic support link exists and is legal (core → core)', async () => {
  const mkExposed = mkultra.claims.find((c) => c.text.includes('publicly exposed MKUltra'));
  const coExisted = cointelpro.claims.find((c) => c.text.includes('COINTELPRO existed'));
  assert.ok(mkExposed.supports_claims.includes(coExisted.id), 'cross-topic link missing');
  assert.equal(mkExposed.radial_tier, 'core');
  assert.equal(coExisted.radial_tier, 'core');
});

await test('X1. a Middle claim in Topic B cannot support an Inner claim in Topic A', async () => {
  const middleB = (await mk(cointelpro.id, { text: 'STAGE2: middle claim in COINTELPRO.' })).body;
  const innerA = mkultra.claims.find((c) => c.radial_tier === 'inner');
  const r = await api('POST', `/api/claims/${middleB.id}/supports`, { supported_id: innerA.id });
  assert.equal(r.status, 422, 'cross-topic outer-cannot-feed-inner must refuse');
  assert.match(r.body.error, /outer cannot feed inner/i);
  // The refusal must be as legible across the boundary as within it: it
  // names both topics so the user knows which onion each claim lives in.
  assert.match(r.body.error, /in the COINTELPRO topic/);
  assert.match(r.body.error, /in the MKUltra topic/);
});

await test('X2. cross-topic promotion is blocked by a weaker supporter in the other topic', async () => {
  const supporter = (await mk(cointelpro.id, { text: 'STAGE2: cross supporter (middle).' })).body;
  const supported = (
    await mk(mkultra.id, {
      text: 'STAGE2: cross supported (middle, core-grade sources).',
      sources: [
        { tier: 'primary_doc', citation: 'Primary X1', relation: 'supports' },
        { tier: 'primary_doc', citation: 'Primary X2', relation: 'supports' }
      ]
    })
  ).body;
  assert.equal(
    (await api('POST', `/api/claims/${supporter.id}/supports`, { supported_id: supported.id }))
      .status,
    200,
    'equal-tier cross-topic link must be allowed'
  );
  const r = await api('POST', `/api/claims/${supported.id}/promote`, { target_tier: 'inner' });
  assert.equal(r.status, 422, 'promotion past a cross-topic supporter must refuse');
  assert.match(r.body.error, /weaker tier/i);
  // The dependency's home topic must be named, not left to be inferred.
  assert.match(r.body.error, /in the COINTELPRO topic/);
  globalThis.cross = { supporter, supported };
});

await test('X3. a cross-topic cycle behaves exactly like a within-topic one', async () => {
  const { supporter: A, supported: B } = globalThis.cross;
  // Close the cycle across the topic boundary (equal tier — legal).
  assert.equal(
    (await api('POST', `/api/claims/${B.id}/supports`, { supported_id: A.id })).status,
    200
  );
  // Demoting A severs the now-illegal cross-topic link and reports it.
  const r = await api('POST', `/api/claims/${A.id}/demote`, {
    target_tier: 'outer',
    reason: 'On review, the single outlet piece does not hold up.'
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.severed_supports.map((s) => s.id), [B.id]);
  const freshB = (await api('GET', `/api/claims/${B.id}`)).body;
  assert.ok(!freshB.supported_by.includes(A.id), 'illegal cross-topic link must be severed');
  assert.ok(freshB.supports_claims.includes(A.id), 'legal strong-feeds-weak link stays');
  // With the cycle broken, B promotes on its own evidence.
  assert.equal(
    (await api('POST', `/api/claims/${B.id}/promote`, { target_tier: 'inner' })).status,
    200
  );
});

await test('X4. all Stage One rules apply identically in the new topic', async () => {
  const unsourcedCore = await mk(cointelpro.id, {
    text: 'STAGE2: unsourced core attempt in COINTELPRO.',
    radial_tier: 'core',
    sources: []
  });
  assert.equal(unsourcedCore.status, 422);
  const moralCore = await mk(cointelpro.id, {
    text: 'STAGE2: moral core attempt.',
    layer: 'moral',
    radial_tier: 'core',
    sources: [
      { tier: 'primary_doc', citation: 'P1', relation: 'supports' },
      { tier: 'primary_doc', citation: 'P2', relation: 'supports' }
    ]
  });
  assert.equal(moralCore.status, 422);
  const metaTier = await mk(cointelpro.id, {
    text: 'STAGE2: metaphysical with tier.',
    kind: 'metaphysical',
    radial_tier: 'middle'
  });
  assert.equal(metaTier.status, 422);
});

// ------------------------------------------------------- dial independence
// The dial is a client-side view filter. Prove the server neither accepts a
// depth parameter that changes writes nor filters reads by one: every Stage
// One violation is refused identically whatever depth context is claimed.
await test('D1. every Stage One violation is refused identically at every depth', async () => {
  const violations = [
    () => ({
      method: 'POST',
      path: '/api/claims',
      body: {
        topic_id: 1,
        text: `STAGE2 D: unsourced core ${Math.random()}`,
        kind: 'empirical',
        layer: 'factual',
        radial_tier: 'core',
        placement_reason: 'x',
        sources: []
      }
    }),
    () => ({
      method: 'POST',
      path: '/api/claims',
      body: {
        topic_id: 1,
        text: `STAGE2 D: moral core ${Math.random()}`,
        kind: 'empirical',
        layer: 'moral',
        radial_tier: 'core',
        placement_reason: 'x',
        sources: [
          { tier: 'primary_doc', citation: 'P1', relation: 'supports' },
          { tier: 'primary_doc', citation: 'P2', relation: 'supports' }
        ]
      }
    }),
    () => ({
      method: 'POST',
      path: '/api/claims',
      body: {
        topic_id: 1,
        text: `STAGE2 D: metaphysical tiered ${Math.random()}`,
        kind: 'metaphysical',
        layer: 'framing',
        radial_tier: 'middle',
        placement_reason: 'x',
        sources: []
      }
    })
  ];
  const outer = mkultra.claims.find((c) => c.radial_tier === 'outer');
  const core = mkultra.claims.find((c) => c.radial_tier === 'core');
  violations.push(() => ({
    method: 'POST',
    path: `/api/claims/${outer.id}/supports`,
    body: { supported_id: core.id }
  }));
  violations.push(() => ({
    method: 'POST',
    path: `/api/claims/${outer.id}/promote`,
    body: { target_tier: 'core' }
  }));

  for (const make of violations) {
    const results = [];
    for (const depth of [1, 2, 3, 4, 5]) {
      const v = make();
      const r = await api(v.method, `${v.path}?depth=${depth}`, v.body, {
        'X-Depth': String(depth)
      });
      results.push({ status: r.status, rule: r.body?.rule });
    }
    for (const r of results) {
      assert.equal(r.status, 422, `violation must be refused (got ${r.status})`);
      assert.equal(r.rule, results[0].rule, 'refusal must be identical at every depth');
    }
  }
});

await test('D2. the server never filters reads by depth — full data at any claimed depth', async () => {
  const full = (await api('GET', '/api/topics/1')).body.claims.length;
  for (const depth of [1, 2, 3, 4, 5]) {
    const r = await api('GET', `/api/topics/1?depth=${depth}`, undefined, {
      'X-Depth': String(depth)
    });
    assert.equal(r.body.claims.length, full, 'server must ignore depth entirely');
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
server.close();
process.exit(failed ? 1 : 0);
