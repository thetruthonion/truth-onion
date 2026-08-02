// Demo-mode pressure test: with the read-only flag set, EVERY mutating
// operation used anywhere in the suites returns 403 from the middleware,
// every read path still serves, and the data is untouched afterward.

import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { buildApp } from '../server/index.js';

const db = openDb(':memory:');
seed(db);
const server = buildApp(db, { demo: true }).listen(0);
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

console.log('\nDemo mode — read-only enforcement\n');

const before = (await api('GET', '/api/topics/1')).body;
const claim = before.claims[0];
const outer = before.claims.find((c) => c.radial_tier === 'outer');
const source = before.sources[0];

// Every mutating operation exercised anywhere in the existing suites.
const MUTATIONS = [
  ['POST', '/api/topics', { name: 'Demo intrusion', description: '' }],
  ['POST', '/api/topics/import', { format: 'truth-onion-topic', name: 'X', claims: [] }],
  ['POST', '/api/claims', {
    topic_id: 1, text: 'demo intrusion claim', kind: 'empirical', layer: 'factual',
    radial_tier: 'outer', placement_reason: 'x', sources: []
  }],
  ['POST', `/api/claims/${outer.id}/promote`, { target_tier: 'core' }],
  ['POST', `/api/claims/${claim.id}/demote`, { target_tier: 'outermost', reason: 'x' }],
  ['POST', `/api/claims/${claim.id}/challenges`, { type: 'bad_source', description: 'x', outcome: 'rejected' }],
  ['POST', `/api/claims/${claim.id}/sources`, { tier: 'primary_doc', citation: 'x', relation: 'supports' }],
  ['DELETE', `/api/claims/${claim.id}/sources/${source.id}`],
  ['DELETE', `/api/sources/${source.id}`],
  ['POST', `/api/claims/${claim.id}/supports`, { supported_id: outer.id }],
  ['DELETE', `/api/claims/${claim.id}/supports/${outer.id}`],
  ['PATCH', `/api/claims/${claim.id}/vertical`, { direction: 'neutral' }],
  ['PATCH', `/api/claims/${claim.id}`, { text: 'edited' }],
  ['PUT', `/api/claims/${claim.id}`, { text: 'edited' }],
  ['POST', '/api/topics/1/parking', { text: 'demo intrusion note' }],
  ['DELETE', '/api/parking/1']
];

await test(`D1. all ${MUTATIONS.length} mutating operations return 403 with the showcase message`, async () => {
  for (const [method, path, body] of MUTATIONS) {
    const r = await api(method, path, body);
    assert.equal(r.status, 403, `${method} ${path} returned ${r.status}, expected 403`);
    assert.equal(r.body.rule, 'demo_read_only');
    assert.match(r.body.error, /read-only showcase/i);
  }
});

await test('D2. every read path still serves fully', async () => {
  const reads = [
    '/api/meta',
    '/api/topics',
    '/api/topics/1',
    '/api/topics/2',
    `/api/claims/${claim.id}`,
    `/api/claims/${outer.id}/tier-preview`,
    '/api/topics/1/parking',
    '/api/topics/1/export'
  ];
  for (const path of reads) {
    const r = await api('GET', path);
    assert.equal(r.status, 200, `GET ${path} returned ${r.status}`);
  }
  const meta = (await api('GET', '/api/meta')).body;
  assert.equal(meta.demo_mode, true);
});

await test('D3. the data is byte-identical after the mutation barrage', async () => {
  const after = (await api('GET', '/api/topics/1')).body;
  assert.deepEqual(after, before, 'demo mutations must leave zero residue');
});

await test('D4. the fetch proxy is ABSENT in demo mode — a public showcase is never an open fetcher', async () => {
  // It is a GET, so the read-only middleware would have waved it through.
  // A hosted demo must not hand anonymous callers a fetcher that can spawn a
  // headless browser per request.
  const r = await api('GET', '/api/fetch?url=https://example.com');
  assert.equal(r.status, 404, `/api/fetch answered ${r.status} in demo mode — it must not be registered`);
});

await test('D5. the local engine DOES serve the fetch proxy (the demo gate is the only difference)', async () => {
  const localDb = openDb(':memory:');
  seed(localDb);
  const local = buildApp(localDb, { demo: false }).listen(0);
  try {
    const res = await fetch(`http://localhost:${local.address().port}/api/fetch`);
    // Registered, and answering on its own terms (400 = "url required"),
    // which proves the route exists off-demo.
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /url query param required/);
  } finally {
    local.close();
    localDb.close();
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
server.close();
process.exit(failed ? 1 : 0);
