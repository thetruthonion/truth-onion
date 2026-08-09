// SPDX-License-Identifier: AGPL-3.0-only
// Definition-of-done checks, run against the real API with the real seed.
// Each test corresponds to one numbered criterion in the Stage One kickoff.

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
  return { status: res.status, body: await res.json() };
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

const topic = (await api('GET', '/api/topics/1')).body;
const byText = (frag) => topic.claims.find((c) => c.text.includes(frag));

console.log('\nDefinition of done — Stage One\n');

await test('1a. blocks an UNSOURCED claim from Core', async () => {
  const r = await api('POST', '/api/claims', {
    topic_id: 1,
    text: 'The CIA ran a secret follow-on program called MKAlpha.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason: 'I am sure of it.',
    sources: []
  });
  assert.equal(r.status, 422, `expected 422, got ${r.status}`);
  assert.match(r.body.error, /Core requires at least two/i);
  assert.equal(r.body.earned_tier, 'outer');
});

await test('1b. blocks an ANONYMOUS-ONLY claim from Core', async () => {
  const r = await api('POST', '/api/claims', {
    topic_id: 1,
    text: 'A whistleblower has confirmed ongoing dosing experiments.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason: 'The whistleblower is credible.',
    sources: [
      { tier: 'anonymous', citation: 'Anonymous forum post', relation: 'supports' },
      { tier: 'anonymous', citation: 'Second anonymous account', relation: 'supports' }
    ]
  });
  assert.equal(r.status, 422, `expected 422, got ${r.status}`);
  assert.match(r.body.error, /zero weight/i);
});

await test('1c. promotion of an under-evidenced claim is refused and recorded', async () => {
  const outer = byText('never really ended');
  const r = await api('POST', `/api/claims/${outer.id}/promote`, { target_tier: 'core' });
  assert.equal(r.status, 422, `expected 422, got ${r.status}`);
  const fresh = (await api('GET', `/api/claims/${outer.id}`)).body;
  assert.equal(fresh.radial_tier, 'outer', 'claim must not move');
  const rec = fresh.challenges.find(
    (ch) => ch.outcome === 'upheld' && ch.description.includes('Promotion review to "core"')
  );
  assert.ok(rec, 'failed promotion must leave a challenge record');
});

await test('2a. blocks a MORAL claim from Core (create)', async () => {
  const r = await api('POST', '/api/claims', {
    topic_id: 1,
    text: 'What the CIA did was evil.',
    kind: 'empirical',
    layer: 'moral',
    radial_tier: 'core',
    placement_reason: 'It plainly was.',
    sources: [
      { tier: 'primary_doc', citation: 'Church Committee Book I', relation: 'supports' },
      { tier: 'primary_doc', citation: '1977 Senate hearing', relation: 'supports' }
    ]
  });
  assert.equal(r.status, 422, `expected 422, got ${r.status}`);
  assert.match(r.body.error, /moral claim/i);
});

await test('2b. blocks a FRAMING claim from Core (promote), even with strong sources', async () => {
  const framing = byText('expendable test subjects');
  await api('POST', `/api/claims/${framing.id}/sources`, {
    tier: 'primary_doc',
    citation: 'Church Committee Book I',
    relation: 'supports'
  });
  await api('POST', `/api/claims/${framing.id}/sources`, {
    tier: 'primary_doc',
    citation: '1977 Senate hearing',
    relation: 'supports'
  });
  const r = await api('POST', `/api/claims/${framing.id}/promote`, { target_tier: 'core' });
  assert.equal(r.status, 422, `expected 422, got ${r.status}`);
  assert.match(r.body.error, /framing claim/i);
});

await test('3a. blocks an outer claim from supporting an inner one', async () => {
  const outer = byText('never really ended');
  const core = byText('Project MKUltra existed');
  const r = await api('POST', `/api/claims/${outer.id}/supports`, { supported_id: core.id });
  assert.equal(r.status, 422, `expected 422, got ${r.status}`);
  assert.match(r.body.error, /outer cannot feed inner/i);
});

await test('3b. blocks promotion of a claim that rests on a weaker claim', async () => {
  // Build: a middle claim supported by another middle claim, then try to
  // promote the supported one inward past its supporter.
  const supporter = (
    await api('POST', '/api/claims', {
      topic_id: 1,
      text: 'TEST: a middle-tier supporting claim.',
      kind: 'empirical',
      layer: 'factual',
      radial_tier: 'middle',
      placement_reason: 'test fixture',
      sources: [{ tier: 'reputable_secondary', citation: 'A reputable outlet', relation: 'supports' }]
    })
  ).body;
  const supported = (
    await api('POST', '/api/claims', {
      topic_id: 1,
      text: 'TEST: a claim that relies on the one above.',
      kind: 'empirical',
      layer: 'factual',
      radial_tier: 'middle',
      placement_reason: 'test fixture',
      sources: [
        { tier: 'primary_doc', citation: 'Primary doc A', relation: 'supports' },
        { tier: 'primary_doc', citation: 'Primary doc B', relation: 'supports' }
      ]
    })
  ).body;
  const link = await api('POST', `/api/claims/${supporter.id}/supports`, {
    supported_id: supported.id
  });
  assert.equal(link.status, 200, 'equal-tier support link must be allowed');
  const r = await api('POST', `/api/claims/${supported.id}/promote`, { target_tier: 'inner' });
  assert.equal(r.status, 422, `expected 422, got ${r.status}`);
  assert.match(r.body.error, /weaker tier/i);
});

await test('4. refuses to place a metaphysical claim on the rings', async () => {
  const r = await api('POST', '/api/claims', {
    topic_id: 1,
    text: 'The program was divine punishment.',
    kind: 'metaphysical',
    layer: 'framing',
    radial_tier: 'middle',
    placement_reason: 'It fits.',
    sources: []
  });
  assert.equal(r.status, 422, `expected 422, got ${r.status}`);
  assert.match(r.body.error, /metaphysical/i);
  // And the seeded metaphysical claim has no tier.
  const meta = byText('spiritual war');
  assert.equal(meta.radial_tier, null);
});

await test('5. ignores a self-published-only source as zero weight', async () => {
  const c = (
    await api('POST', '/api/claims', {
      topic_id: 1,
      text: 'TEST: I have proven ongoing experiments on my own website.',
      kind: 'empirical',
      layer: 'factual',
      radial_tier: 'outer',
      placement_reason: 'Only source is the claimant\'s own site.',
      sources: [
        {
          tier: 'primary_doc',
          citation: 'My own website, where I published my proof',
          relation: 'supports',
          is_claimant_self_published: true
        }
      ]
    })
  ).body;
  // Even labeled "primary_doc", a claimant-self-published source moves nothing.
  for (const target of ['middle', 'inner', 'core']) {
    const r = await api('POST', `/api/claims/${c.id}/promote`, { target_tier: target });
    assert.equal(r.status, 422, `self-published source justified a move to ${target}`);
  }
});

await test('6a. demoting is one step: outward move + stated reason, applied immediately', async () => {
  const mid = byText('Kaczynski');
  const r = await api('POST', `/api/claims/${mid.id}/demote`, {
    target_tier: 'outer',
    reason: 'On review, the single secondary source infers the MKUltra tie; no primary record connects them.'
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.claim.radial_tier, 'outer');
  assert.match(r.body.claim.placement_reason, /no primary record/);
  const ch = r.body.claim.challenges.at(-1);
  assert.equal(ch.outcome, 'upheld');
  assert.equal(ch.resulting_tier_change, 'middle → outer');
});

await test('6b. demotion without a reason is refused', async () => {
  const inner = byText('psychic driving');
  const r = await api('POST', `/api/claims/${inner.id}/demote`, { target_tier: 'outer' });
  assert.equal(r.status, 422);
  assert.match(r.body.error, /reason/i);
});

await test('6c. promoting requires earning it: evidence + surviving the review', async () => {
  // The demoted Kaczynski claim can come back to middle — its secondary
  // source earns that much — but no further.
  const mid = byText('Kaczynski');
  const back = await api('POST', `/api/claims/${mid.id}/promote`, { target_tier: 'middle' });
  assert.equal(back.status, 200, JSON.stringify(back.body));
  assert.equal(back.body.radial_tier, 'middle');
  const ch = back.body.challenges.at(-1);
  assert.equal(ch.outcome, 'rejected', 'surviving promotion review is recorded');
  const tooFar = await api('POST', `/api/claims/${mid.id}/promote`, { target_tier: 'core' });
  assert.equal(tooFar.status, 422);
});

await test('7. vertical placement requires evidenced outcomes', async () => {
  const r = await api('POST', '/api/claims', {
    topic_id: 1,
    text: 'TEST: the program helped medicine advance.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 'test fixture',
    vertical: { direction: 'help', magnitude: 2, evidenced: false },
    sources: []
  });
  assert.equal(r.status, 422);
  assert.match(r.body.error, /documented outcomes/i);
});

await test('8. removing load-bearing evidence auto-demotes to the earned tier', async () => {
  const c = (
    await api('POST', '/api/claims', {
      topic_id: 1,
      text: 'TEST: a middle claim held up by one reputable source.',
      kind: 'empirical',
      layer: 'factual',
      radial_tier: 'middle',
      placement_reason: 'test fixture',
      sources: [{ tier: 'reputable_secondary', citation: 'Reputable outlet piece', relation: 'supports' }]
    })
  ).body;
  // 2.98b Amendment A: removal is two-phase — filing has no effect; the
  // ripple fires at adjudication.
  const p = await api('POST', `/api/claims/${c.id}/sources/${c.sources[0].id}/withdraw`, {
    reason: 'test: load-bearing evidence withdrawn'
  });
  assert.equal(p.status, 200);
  assert.equal(p.body.claim.radial_tier, 'middle', 'filing alone must not move the claim');
  const r = await api('POST', `/api/claims/${c.id}/sources/${c.sources[0].id}/withdraw/adjudicate`, {
    outcome: 'upheld'
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.demoted, true);
  assert.equal(r.body.claim.radial_tier, 'outer');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
server.close();
process.exit(failed ? 1 : 0);
