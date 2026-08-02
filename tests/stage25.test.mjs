// Stage 2.5 pressure tests: source-library ripple, the parking lot's
// isolation from the epistemics, is_origin_of zero weight, refusal
// legibility, tier-preview honesty, and export/import through the rules.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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

const mk = (over = {}) =>
  api('POST', '/api/claims', {
    topic_id: 1,
    text: over.text || `S25: claim ${Math.random()}`,
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 's25-test fixture',
    sources: [],
    ...over
  });

console.log('\nStage 2.5 — library, parking lot, origin, preview, export\n');

// ------------------------------------------------------------ source library
await test('S1. shared source is one entity: attach-existing resolves to the same id', async () => {
  const a = (
    await mk({
      text: 'S25: first claim on the shared source.',
      radial_tier: 'middle',
      sources: [
        { tier: 'reputable_secondary', citation: 'SHARED-SOURCE-Alpha, Journal (2020)', relation: 'supports' }
      ]
    })
  ).body;
  const sharedId = a.sources[0].id;
  const b = (
    await mk({
      text: 'S25: second claim leaning on the same source.',
      radial_tier: 'middle',
      sources: [{ source_id: sharedId, relation: 'supports' }]
    })
  ).body;
  assert.equal(b.sources[0].id, sharedId, 'attach-existing must reuse the entity');
  assert.equal(b.sources[0].citation, 'SHARED-SOURCE-Alpha, Journal (2020)');
  globalThis.shared = { a, b, sharedId };
});

await test('S2. withdrawing a shared source ripples: both claims demote in one operation (2.98b: recorded withdrawal)', async () => {
  const { a, b, sharedId } = globalThis.shared;
  // Amendment A: file, then adjudicate — effect at adjudication.
  const p = await api('POST', `/api/sources/${sharedId}/withdraw`, {
    reason: 'S25 test: the shared entity is withdrawn'
  });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  const r = await api('POST', `/api/sources/${sharedId}/withdraw/adjudicate`, { outcome: 'upheld' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.affected.length, 2, 'both claims re-evaluate');
  for (const eff of r.body.affected) {
    assert.equal(eff.demoted, true, `claim ${eff.claim_id} must demote`);
    assert.equal(eff.from, 'middle');
    assert.equal(eff.to, 'outer');
    assert.match(eff.claim.placement_reason, /withdrawn from the library/i);
    assert.equal(eff.claim.radial_tier, 'outer');
  }
  const freshA = (await api('GET', `/api/claims/${a.id}`)).body;
  const freshB = (await api('GET', `/api/claims/${b.id}`)).body;
  assert.equal(freshA.radial_tier, 'outer');
  assert.equal(freshB.radial_tier, 'outer');
  // The entity did not vanish: it stays in the library, diminished.
  assert.equal(freshA.withdrawn_sources.length, 1, 'withdrawn evidence stays visible on the claim');
  assert.equal(freshA.withdrawn_sources[0].withdrawn_scope, 'library');
});

await test('S3. inline duplicate citations within a topic resolve to one library entity', async () => {
  const c1 = (
    await mk({
      sources: [{ tier: 'single_outlet', citation: 'DUP-CITE Beta Weekly (2021)', relation: 'supports' }]
    })
  ).body;
  const c2 = (
    await mk({
      sources: [{ tier: 'single_outlet', citation: 'DUP-CITE Beta Weekly (2021)', relation: 'supports' }]
    })
  ).body;
  assert.equal(c1.sources[0].id, c2.sources[0].id, 'textually identical citations merge');
});

// ------------------------------------------------------------- parking lot
await test('P1. parked notes exist outside the claims namespace and cannot be linked', async () => {
  // Insert with an id that exists in NO other table, to prove the claim
  // APIs cannot address parked items at all.
  db.prepare(
    `INSERT INTO parked_notes (id, topic_id, text) VALUES (99999, 1, 'PARKED: half-formed idea, no sources yet')`
  ).run();
  const someClaim = (await api('GET', '/api/topics/1')).body.claims[0];
  const asSupporter = await api('POST', `/api/claims/99999/supports`, {
    supported_id: someClaim.id
  });
  assert.equal(asSupporter.status, 422, 'parked item must not act as supporter');
  assert.match(asSupporter.body.error, /no such claim/i);
  const asSupported = await api('POST', `/api/claims/${someClaim.id}/supports`, {
    supported_id: 99999
  });
  assert.equal(asSupported.status, 422, 'parked item must not receive support');
  assert.match(asSupported.body.error, /no such claim/i);
  // Nor can it be promoted, demoted, challenged, or sourced.
  for (const [method, path, body] of [
    ['POST', '/api/claims/99999/promote', { target_tier: 'core' }],
    ['POST', '/api/claims/99999/demote', { target_tier: 'outermost', reason: 'x' }],
    ['POST', '/api/claims/99999/challenges', { type: 'bad_source', description: 'x', outcome: 'rejected' }],
    ['POST', '/api/claims/99999/sources', { tier: 'primary_doc', citation: 'x', relation: 'supports' }]
  ]) {
    const r = await api(method, path, body);
    assert.equal(r.status, 422, `${path} must refuse a parked id`);
  }
});

await test('P2. parked items appear in no onion view and no counts', async () => {
  const before = (await api('GET', '/api/topics/1')).body;
  await api('POST', '/api/topics/1/parking', {
    text: 'PARKED-MARKER-XYZZY: check MKNAOMI records overlap'
  });
  const after = (await api('GET', '/api/topics/1')).body;
  assert.equal(after.claims.length, before.claims.length, 'claim count unchanged by parking');
  assert.ok(
    !JSON.stringify(after).includes('PARKED-MARKER-XYZZY'),
    'the onion view endpoint must not carry parked text'
  );
  // The parking lot has its own endpoint, and the note is there.
  const parked = (await api('GET', '/api/topics/1/parking')).body;
  assert.ok(parked.some((n) => n.text.includes('PARKED-MARKER-XYZZY')));
  // Author-owned in the schema (Stage Three readiness).
  const note = parked.find((n) => n.text.includes('PARKED-MARKER-XYZZY'));
  assert.equal(note.author, 'local');
  assert.equal(note.private, 1);
});

// ------------------------------------------------------------- is_origin_of
await test('O1. a claim whose only attachment is its origin source earns Outer', async () => {
  const c = (
    await mk({
      text: 'S25: a sweeping claim, attached only to the paper that coined it.',
      radial_tier: 'outer',
      sources: [
        {
          tier: 'primary_doc',
          citation: 'ORIGIN-PAPER (2005), the model that coined this claim',
          relation: 'is_origin_of'
        }
      ]
    })
  ).body;
  assert.equal(c.sources[0].relation, 'is_origin_of');
  for (const target of ['middle', 'inner', 'core']) {
    const r = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: target });
    assert.equal(r.status, 422, `origin-only claim promoted to ${target}`);
    assert.equal(r.body.earned_tier, 'outer', 'earned tier must stay outer');
  }
});

// -------------------------------------------------- refusal names the blocker
await test('R1. a contradiction refusal names the blocking source', async () => {
  const c = (
    await mk({
      text: 'S25: strong claim with an honest objection attached.',
      radial_tier: 'inner',
      sources: [
        { tier: 'primary_doc', citation: 'Primary record one (R1)', relation: 'supports' },
        { tier: 'primary_doc', citation: 'Primary record two (R1)', relation: 'supports' },
        {
          tier: 'reputable_secondary',
          citation: 'BLOCKER-CITATION: Objection & Reply (2016), the published dispute',
          relation: 'contradicts'
        }
      ]
    })
  ).body;
  const r = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: 'core' });
  assert.equal(r.status, 422);
  assert.match(r.body.error, /BLOCKER-CITATION/, 'refusal must name the contradicting source');
});

// -------------------------------------------------- tier preview: floor honesty
await test('V1. preview floor_met matches the battery verdict exactly — both directions', async () => {
  // floor NOT met -> promotion refused
  const weak = (
    await mk({
      text: 'S25: preview claim, one reputable source.',
      radial_tier: 'middle',
      sources: [{ tier: 'reputable_secondary', citation: 'One outlet piece (V1)', relation: 'supports' }]
    })
  ).body;
  const weakPrev = (await api('GET', `/api/claims/${weak.id}/tier-preview`)).body;
  assert.match(weakPrev.note, /does not guarantee promotion/i, 'floor-not-promise line present');
  const weakInner = weakPrev.tiers.find((t) => t.tier === 'inner');
  assert.equal(weakInner.floor_met, false);
  const refused = await api('POST', `/api/claims/${weak.id}/promote`, { target_tier: 'inner' });
  assert.equal(refused.status, 422, 'preview said floor unmet; battery must refuse');

  // floor met -> promotion succeeds
  const strong = (
    await mk({
      text: 'S25: preview claim with core-grade evidence.',
      radial_tier: 'middle',
      sources: [
        { tier: 'primary_doc', citation: 'Primary V1-a', relation: 'supports' },
        { tier: 'primary_doc', citation: 'Primary V1-b', relation: 'supports' }
      ]
    })
  ).body;
  const strongPrev = (await api('GET', `/api/claims/${strong.id}/tier-preview`)).body;
  for (const t of strongPrev.tiers) {
    assert.equal(t.floor_met, true, `floor should be met at ${t.tier}`);
  }
  const promoted = await api('POST', `/api/claims/${strong.id}/promote`, { target_tier: 'core' });
  assert.equal(promoted.status, 200, 'preview said floor met; battery must agree');
});

// ------------------------------------------------------------- export/import
await test('E1. a legal export re-imports cleanly through the rules layer', async () => {
  const exported = (await api('GET', '/api/topics/2/export')).body;
  assert.equal(exported.format, 'truth-onion-topic');
  const dup = await api('POST', '/api/topics/import', exported);
  assert.equal(dup.status, 422, 'same-name import must be refused');
  const renamed = { ...exported, name: 'COINTELPRO (re-imported)' };
  const r = await api('POST', '/api/topics/import', renamed);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const orig = (await api('GET', '/api/topics/2')).body;
  const copy = (await api('GET', `/api/topics/${r.body.topic.id}`)).body;
  assert.equal(copy.claims.length, orig.claims.length, 'claim count round-trips');
  const tiers = (t) => t.claims.map((c) => c.radial_tier).sort();
  assert.deepEqual(tiers(copy), tiers(orig), 'tiers round-trip');
  const links = (t) => t.claims.reduce((n, c) => n + c.supports_claims.length, 0);
  // Within-topic links round-trip; the original's incoming cross-topic link
  // (from MKUltra) is per-topic-export out of scope.
  assert.equal(links(copy), 2, 'within-topic support links round-trip');
});

await test('E2. a tampered export is refused with the normal reasons and rolls back', async () => {
  const exported = (await api('GET', '/api/topics/2/export')).body;
  const tampered = JSON.parse(JSON.stringify(exported));
  tampered.name = 'COINTELPRO (tampered)';
  // Forge: shove the debunked outermost claim into Core.
  const victim = tampered.claims.find((c) => c.radial_tier === 'outermost');
  victim.radial_tier = 'core';
  const r = await api('POST', '/api/topics/import', tampered);
  assert.equal(r.status, 422, 'tampered import must be refused');
  const topics = (await api('GET', '/api/topics')).body;
  assert.ok(
    !topics.some((t) => t.name === 'COINTELPRO (tampered)'),
    'refused import must roll back entirely'
  );
});

// ------------------------------------------------------ client guard (item 6)
await test('G1. the "+ source" rapid-click fix stays in place (functional update)', async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const src = readFileSync(join(root, 'client', 'src', 'AddClaim.jsx'), 'utf8');
  assert.ok(
    src.includes('setSources((prev) => [...prev, blankSource()])'),
    'AddClaim must append source rows with a functional update'
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
server.close();
process.exit(failed ? 1 : 0);
