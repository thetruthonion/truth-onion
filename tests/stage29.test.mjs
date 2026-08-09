// SPDX-License-Identifier: AGPL-3.0-only
// Stage 2.9 pressure tests: the kernel link (zero weight, gap statement,
// direction, schema backstops), the debunker auto-create, link and hop
// challenges, routed lineages and fans (the routing rule), the whole-vs-
// broken grammar at the data-to-render boundary, lineage-aware narration
// with pin-to-notebook, and the event-log completeness audit (F).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { buildApp } from '../server/index.js';
import {
  lineageSpecs,
  breakFraction,
  lineageMembers,
  tileMaterial
} from '../client/src/lineageRender.js';
import { narrateClaim, serializeRecord } from '../client/src/companion/pipeline.js';
import {
  loadNotebook,
  pinToNotebook,
  removeFromNotebook,
  STORAGE_KEYS
} from '../client/src/companion/store.js';

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
const corePrompt = readFileSync(join(root, 'sidekick-prompt.md'), 'utf8');

const PRIMARY = (n) => ({
  tier: 'primary_doc',
  citation: `S29 primary document ${n}`,
  relation: 'supports'
});

const mk = (over = {}) =>
  api('POST', '/api/claims', {
    topic_id: 1,
    text: over.text || `S29: claim ${Math.random()}`,
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 's29-test fixture',
    sources: [],
    ...over
  });

console.log('\nStage 2.9 — kernel links, lineages, grammar, events\n');

// Fixtures: an established kernel at core, a middle extension it supports,
// and an outer overreach.
const kernel = (
  await mk({
    text: 'S29K: the documented program ran 1953–1973 (the kernel).',
    radial_tier: 'core',
    sources: [PRIMARY('K1'), PRIMARY('K2')]
  })
).body;
const middle = (
  await mk({
    text: 'S29M: a partial extension with one reputable source.',
    radial_tier: 'middle',
    sources: [{ tier: 'reputable_secondary', citation: 'S29 reputable outlet', relation: 'supports' }]
  })
).body;
const outer = (
  await mk({ text: 'S29O: the program secretly continues today (the overreach).' })
).body;
await api('POST', `/api/claims/${kernel.id}/supports`, { supported_id: middle.id });
await api('POST', `/api/claims/${middle.id}/supports`, { supported_id: outer.id });

const GAP = {
  establishes: 'documented through 1973',
  asserts_beyond: 'continuation after the documented record ends',
  path_inward: 'any post-1973 primary record'
};

// ------------------------------------------------------------ creation rules
await test('K1. a kernel link without a gap statement is refused, and the refusal NAMES the missing pieces', async () => {
  const r = await api('POST', `/api/claims/${outer.id}/kernels`, { kernel_id: kernel.id });
  assert.equal(r.status, 422);
  assert.equal(r.body.rule, 'gap_statement_required');
  assert.match(r.body.error, /what the kernel establishes/);
  assert.match(r.body.error, /asserts beyond/);
  assert.match(r.body.error, /path inward/);
  const partial = await api('POST', `/api/claims/${outer.id}/kernels`, {
    kernel_id: kernel.id,
    establishes: GAP.establishes,
    asserts_beyond: GAP.asserts_beyond
  });
  assert.equal(partial.status, 422);
  assert.match(partial.body.error, /path inward/);
  assert.ok(!/establishes/.test(partial.body.error.split(';')[0].split('missing:')[1] || ''), 'only the missing piece is named');
});

await test('K2. direction rule: the kernel must sit STRICTLY inward, refusal names both tiers', async () => {
  const r = await api('POST', `/api/claims/${kernel.id}/kernels`, { kernel_id: outer.id, ...GAP });
  assert.equal(r.status, 422);
  assert.equal(r.body.rule, 'kernel_must_be_inward');
  assert.match(r.body.error, /outer/);
  assert.match(r.body.error, /core/);
  // Equal tier is refused too — strictly inward, not merely not-outward.
  const peer = (await mk({ text: 'S29: another outer claim.' })).body;
  const eq = await api('POST', `/api/claims/${outer.id}/kernels`, { kernel_id: peer.id, ...GAP });
  assert.equal(eq.status, 422);
});

await test('K3. manual creation through the rules layer works; duplicates are refused', async () => {
  const r = await api('POST', `/api/claims/${outer.id}/kernels`, { kernel_id: kernel.id, ...GAP });
  assert.equal(r.status, 201);
  assert.equal(r.body.kernel_link.gap_establishes, GAP.establishes);
  assert.equal(r.body.kernel_link.origin, 'manual');
  const dup = await api('POST', `/api/claims/${outer.id}/kernels`, { kernel_id: kernel.id, ...GAP });
  assert.equal(dup.status, 422);
  assert.match(dup.body.error, /already exists/);
});

await test('K4. schema backstop: raw inserts violating gap or direction are refused BY THE DATABASE', async () => {
  const bare = (await mk({ text: 'S29K4: an unlinked outer claim.' })).body;
  // Empty gap → CHECK constraint.
  assert.throws(
    () =>
      db
        .prepare(
          'INSERT INTO claim_kernels (claim_id, kernel_id, gap_establishes, gap_asserts_beyond, gap_path_inward) VALUES (?,?,?,?,?)'
        )
        .run(bare.id, kernel.id, '  ', 'x', 'y'),
    /CHECK/
  );
  // Outward "kernel" → direction trigger.
  assert.throws(
    () =>
      db
        .prepare(
          'INSERT INTO claim_kernels (claim_id, kernel_id, gap_establishes, gap_asserts_beyond, gap_path_inward) VALUES (?,?,?,?,?)'
        )
        .run(kernel.id, bare.id, 'a', 'b', 'c'),
    /strictly inward/
  );
});

await test('K5. kernel_of as a SOURCE relation is refused by name', async () => {
  const r = await api('POST', `/api/claims/${outer.id}/sources`, {
    tier: 'primary_doc',
    citation: 'S29 smuggle attempt',
    relation: 'kernel_of'
  });
  assert.equal(r.status, 422);
  assert.match(r.body.error, /kernel_of is a claim-to-claim relation/);
  assert.match(r.body.error, /zero evidentiary weight/);
});

// ------------------------------------------------------------ zero weight
await test('Z1. kernel links carry ZERO weight: they never satisfy a placement requirement or move a tier', async () => {
  // outer has a kernel link to a core claim with two primary docs. If kernel
  // links leaked weight, promotion would pass. It must fail on evidence.
  const pv = (await api('GET', `/api/claims/${outer.id}/tier-preview`)).body;
  const middleTier = pv.tiers.find((t) => t.tier === 'middle');
  assert.equal(middleTier.floor_met, false, 'kernel link must not meet any floor');
  const r = await api('POST', `/api/claims/${outer.id}/promote`, { target_tier: 'middle' });
  assert.equal(r.status, 422);
  assert.equal(r.body.rule, 'insufficient_evidence');
  const fresh = (await api('GET', `/api/claims/${outer.id}`)).body;
  assert.equal(fresh.radial_tier, 'outer', 'tier unmoved by kernel linkage');
});

await test('Z2. a kernel link never blocks an EARNED move either — promotion severs it, recorded', async () => {
  const climber = (
    await mk({ text: 'S29Z2: an outer claim that later earns middle.' })
  ).body;
  const inner = (
    await mk({
      text: 'S29Z2-kernel: a middle claim acting as kernel.',
      radial_tier: 'middle',
      sources: [{ tier: 'reputable_secondary', citation: 'S29 Z2 reputable', relation: 'supports' }]
    })
  ).body;
  await api('POST', `/api/claims/${climber.id}/kernels`, { kernel_id: inner.id, ...GAP });
  await api('POST', `/api/claims/${climber.id}/sources`, {
    tier: 'reputable_secondary',
    citation: 'S29 Z2 new evidence',
    relation: 'supports'
  });
  const r = await api('POST', `/api/claims/${climber.id}/promote`, { target_tier: 'middle' });
  assert.equal(r.status, 200, `promotion refused: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.radial_tier, 'middle');
  assert.equal(r.body.kernel_links.length, 0, 'the closed-gap link is severed, not kept as a lie');
  assert.ok(
    Array.isArray(r.body.severed_kernel_links) && r.body.severed_kernel_links.length === 1,
    'the severing is reported'
  );
  const ev = (await api('GET', `/api/events?claim_id=${climber.id}`)).body;
  assert.ok(
    ev.some((e) => e.action === 'kernel_link_removed' && /promotion/.test(e.reason)),
    'the severing is on the event log with its reason'
  );
});

// ------------------------------------------------------------ whole-vs-broken (data layer)
await test('W1. a kernel link and a support link can never coexist on the same pair — both layers refuse', async () => {
  // Rules layer, named reason:
  const r = await api('POST', `/api/claims/${kernel.id}/supports`, { supported_id: outer.id });
  assert.equal(r.status, 422);
  assert.equal(r.body.rule, 'kernel_contradicts_support');
  // Schema layer, raw insert:
  assert.throws(
    () =>
      db
        .prepare('INSERT INTO claim_supports (supporter_id, supported_id) VALUES (?,?)')
        .run(kernel.id, outer.id),
    /kernel link marks where evidence stops/
  );
  // And the reverse order: support first, then kernel refused.
  const a = (await mk({ text: 'S29W: supported outer claim.' })).body;
  const b = (
    await mk({
      text: 'S29W: its middle supporter.',
      radial_tier: 'middle',
      sources: [{ tier: 'reputable_secondary', citation: 'S29 W reputable', relation: 'supports' }]
    })
  ).body;
  await api('POST', `/api/claims/${b.id}/supports`, { supported_id: a.id });
  const k = await api('POST', `/api/claims/${a.id}/kernels`, { kernel_id: b.id, ...GAP });
  assert.equal(k.status, 422);
  assert.equal(k.body.rule, 'kernel_contradicts_support');
});

// ------------------------------------------------------------ debunker flow
await test('D1. the debunker correct/demote pair auto-creates the kernel link with the gap filled from the correction', async () => {
  const inflated = (
    await mk({
      text: 'S29D: the documented program proves ongoing operations.',
      radial_tier: 'middle',
      sources: [{ tier: 'reputable_secondary', citation: 'S29 D reputable', relation: 'supports' }]
    })
  ).body;
  const r = await api('POST', `/api/claims/${inflated.id}/demote`, {
    target_tier: 'outer',
    reason: 'No post-1973 documentation exists.',
    established_facts: 'The program is documented through 1973.',
    kernel: { kernel_id: kernel.id }
  });
  assert.equal(r.status, 200);
  assert.ok(r.body.kernel_link, 'demote must report the created kernel link');
  assert.equal(r.body.kernel_link.origin, 'debunker');
  assert.equal(r.body.kernel_link.gap_establishes, 'The program is documented through 1973.');
  assert.equal(r.body.kernel_link.gap_asserts_beyond, inflated.text);
  // The path inward reuses the tier-preview mechanic: it names the nearest
  // inward tier, whether the floor is unmet ("to reach middle: …") or met
  // ("meets the middle floor — promotion review is the path inward").
  assert.match(r.body.kernel_link.gap_path_inward, /middle/);
  assert.ok(r.body.kernel_link.gap_path_inward.trim().length > 0);
});

// ------------------------------------------------------------ challengeability
await test('C1. a kernel link is challengeable through the existing machinery — rejected marks it questioned', async () => {
  const link = (await api('GET', `/api/claims/${outer.id}`)).body.kernel_links[0];
  const r = await api('POST', `/api/claims/${outer.id}/challenges`, {
    type: 'equivocation',
    description: 'The chosen kernel flatters the overreach (reverse halo).',
    outcome: 'rejected',
    kernel_link_id: link.id
  });
  assert.equal(r.status, 200);
  const fresh = (await api('GET', `/api/claims/${outer.id}`)).body;
  assert.equal(fresh.kernel_links.length, 1, 'rejected challenge leaves the link standing');
  assert.equal(fresh.kernel_links[0].contested, true, 'but marked questioned');
  assert.ok(
    fresh.challenges.some((c) => c.kernel_link_id === link.id && c.outcome === 'rejected'),
    'recorded like any challenge'
  );
});

await test('C2. an upheld kernel-link challenge removes the link; a resulting_tier combo is refused', async () => {
  const victim = (await mk({ text: 'S29C2: outer claim with a doomed link.' })).body;
  const created = await api('POST', `/api/claims/${victim.id}/kernels`, {
    kernel_id: kernel.id,
    ...GAP
  });
  const linkId = created.body.kernel_link.id;
  const combo = await api('POST', `/api/claims/${victim.id}/challenges`, {
    type: 'equivocation',
    description: 'x',
    outcome: 'upheld',
    resulting_tier: 'outermost',
    kernel_link_id: linkId
  });
  assert.equal(combo.status, 422, 'a link challenge cannot also move the claim');
  const r = await api('POST', `/api/claims/${victim.id}/challenges`, {
    type: 'equivocation',
    description: 'Fabricated genealogy: no genuine relation to this kernel.',
    outcome: 'upheld',
    kernel_link_id: linkId
  });
  assert.equal(r.status, 200);
  const fresh = (await api('GET', `/api/claims/${victim.id}`)).body;
  assert.equal(fresh.kernel_links.length, 0, 'upheld challenge removes the link');
  assert.equal(fresh.radial_tier, 'outer', 'the claim itself never moves on a link challenge');
  assert.ok(fresh.challenges.some((c) => /Fabricated genealogy/.test(c.description)));
});

await test('C3. a support-link hop is challengeable per hop; rejected marks the hop questioned in the lineage', async () => {
  const r = await api('POST', `/api/claims/${middle.id}/challenges`, {
    type: 'equivocation',
    description: 'The middle claim equivocates on what the kernel established.',
    outcome: 'rejected',
    hop: { supporter_id: kernel.id, supported_id: middle.id }
  });
  assert.equal(r.status, 200);
  const lin = (await api('GET', `/api/claims/${outer.id}/lineage`)).body;
  const hop = lin.lineages[0].hops.find(
    (h) => h.supporter_id === kernel.id && h.supported_id === middle.id
  );
  assert.equal(hop.contested, true, 'the questioned hop is marked in the routed lineage');
});

// ------------------------------------------------------------ routed lineages
await test('L1. the routing rule: paths run only through genuine support links, never nearest-looking neighbors', async () => {
  const bystander = (
    await mk({
      text: 'S29L: an unrelated middle claim, evidentially adjacent to nothing.',
      radial_tier: 'middle',
      sources: [{ tier: 'reputable_secondary', citation: 'S29 L bystander src', relation: 'supports' }]
    })
  ).body;
  const lin = (await api('GET', `/api/claims/${outer.id}/lineage`)).body;
  assert.equal(lin.lineages.length, 1);
  const l = lin.lineages[0];
  assert.equal(l.kernel.id, kernel.id);
  assert.deepEqual(
    l.path.map((p) => p.id),
    [kernel.id, middle.id],
    'route = kernel → its genuine middle extension; the outer claim is the render root'
  );
  assert.ok(!l.path.some((p) => p.id === bystander.id), 'the bystander never appears on a route');
  assert.equal(l.reaches_claim, true);
  assert.deepEqual(
    l.hops.map((h) => [h.supporter_id, h.supported_id]),
    [
      [kernel.id, middle.id],
      [middle.id, outer.id]
    ]
  );
});

await test('L2. no support chain → the honest bare break: kernel only, wide evidentiary distance', async () => {
  const unmoored = (await mk({ text: 'S29L2: an unmoored overreach.' })).body;
  await api('POST', `/api/claims/${unmoored.id}/kernels`, { kernel_id: kernel.id, ...GAP });
  const lin = (await api('GET', `/api/claims/${unmoored.id}/lineage`)).body;
  const l = lin.lineages[0];
  assert.equal(l.reaches_claim, false);
  assert.deepEqual(l.path.map((p) => p.id), [kernel.id]);
  assert.equal(l.break.after_claim_id, kernel.id);
  assert.equal(l.break.distance, 3, 'core → outer is three tiers of unearned ground');
  assert.equal(l.break.gap.establishes, GAP.establishes);
});

await test('L3. fans: a multi-kernel claim draws ALL lineages, each with its own break point', async () => {
  const kernel2 = (
    await mk({
      text: 'S29L3: a second documented kernel at inner.',
      radial_tier: 'inner',
      sources: [PRIMARY('L3')]
    })
  ).body;
  const fusion = (await mk({ text: 'S29L3: a fusion overreach welding two kernels.' })).body;
  await api('POST', `/api/claims/${fusion.id}/kernels`, { kernel_id: kernel.id, ...GAP });
  await api('POST', `/api/claims/${fusion.id}/kernels`, {
    kernel_id: kernel2.id,
    establishes: 'a separately documented seed',
    asserts_beyond: 'a welded leap',
    path_inward: 'independent sourcing for the weld'
  });
  const lin = (await api('GET', `/api/claims/${fusion.id}/lineage`)).body;
  assert.equal(lin.lineages.length, 2, 'every kernel draws its own lineage');
  const distances = lin.lineages.map((l) => l.break.distance);
  assert.deepEqual(distances.sort(), [2, 3], 'independent break points: core→outer 3, inner→outer 2');
});

// ------------------------------------------------------------ the boundary (grammar C)
await test('G1. data-to-render boundary: a kernel link can NEVER be a whole line — style derives from kind', async () => {
  const lin = (await api('GET', `/api/claims/${outer.id}/lineage`)).body;
  const claim = (await api('GET', `/api/claims/${outer.id}`)).body;
  const specs = lineageSpecs({
    claim,
    descentLinks: [{ supporter_id: middle.id, supported_id: outer.id }],
    lineages: lin.lineages
  });
  assert.ok(specs.length > 0);
  for (const s of specs) {
    if (s.kind === 'kernel') {
      assert.equal(s.style, 'broken', 'kernel link rendered whole = the reverse halo, drawn');
      assert.ok(s.breakFraction >= 0.25 && s.breakFraction <= 0.85, 'break width is bounded');
      assert.ok(s.gap && s.gap.establishes, 'the gap statement labels the break');
    } else {
      assert.equal(s.kind, 'support');
      assert.equal(s.style, 'solid', 'support links render whole');
    }
  }
  // Adversarial: a hand-built lineage claiming to be solid is still broken —
  // style is not an input.
  const forged = lineageSpecs({
    claim,
    lineages: [
      {
        ...lin.lineages[0],
        style: 'solid',
        break: { ...lin.lineages[0].break, style: 'solid' }
      }
    ]
  });
  const forgedKernel = forged.find((s) => s.kind === 'kernel');
  assert.equal(forgedKernel.style, 'broken');
});

await test('G2. no kernel = no line: a claim without kernel links yields zero kernel specs', async () => {
  const floater = (await mk({ text: 'S29G2: floats free.' })).body;
  const claim = (await api('GET', `/api/claims/${floater.id}`)).body;
  const specs = lineageSpecs({ claim, descentLinks: [], lineages: [] });
  assert.equal(specs.filter((s) => s.kind === 'kernel').length, 0);
  assert.equal(specs.length, 0);
});

await test('G3. break position is proportional to evidentiary distance and clamped', async () => {
  assert.ok(breakFraction(1, 4) < breakFraction(3, 4), 'wider gap for farther-fetched claims');
  assert.equal(breakFraction(0, 4), 0.25, 'floor: even a near miss visibly snaps');
  assert.equal(breakFraction(99, 4), 0.85, 'ceiling: even a void keeps its stub');
});

// ------------------------------------------------------------ rest-state materials
await test('M1. tile material channels derive from the record alone — no stored appearance fields', async () => {
  const cols = db.prepare(`SELECT name FROM pragma_table_info('claims')`).all().map((r) => r.name);
  for (const c of cols) {
    assert.ok(
      !/mass|finish|weather|pulse|material|appearance/i.test(c),
      `claims table must not store appearance (found "${c}")`
    );
  }
  const rich = (await api('GET', `/api/claims/${kernel.id}`)).body;
  const thin = (await api('GET', `/api/claims/${outer.id}`)).body;
  const mRich = tileMaterial(rich);
  const mThin = tileMaterial(thin);
  assert.ok(mRich.mass > mThin.mass, 'evidence weight reads as mass');
  assert.ok(mRich.weathering >= 1, 'survived review shows as weathering');
  assert.equal(typeof mThin.pulse, 'boolean');
});

// ------------------------------------------------------------ hover membership
await test('M2. hover membership: kernels and overreachers illuminate; strangers never do', async () => {
  const claim = (await api('GET', `/api/claims/${outer.id}`)).body;
  const kernelClaim = (await api('GET', `/api/claims/${kernel.id}`)).body;
  const byId = new Map([
    [claim.id, claim],
    [kernelClaim.id, kernelClaim],
    [middle.id, (await api('GET', `/api/claims/${middle.id}`)).body]
  ]);
  const members = lineageMembers(claim, byId);
  assert.ok(members.has(kernel.id), 'the kernel is a lineage member');
  assert.ok(members.has(middle.id), 'the supporting descent is included');
  const reverse = lineageMembers(kernelClaim, byId);
  assert.ok(reverse.has(claim.id), 'the kernel senses its overreachers (the warning direction)');
});

// ------------------------------------------------------------ narration (E)
await test('N1. narration is lineage-aware and grounded: gap text from the record passes, invented lineage is flagged', async () => {
  const claim = (await api('GET', `/api/claims/${outer.id}`)).body;
  const lin = (await api('GET', `/api/claims/${outer.id}/lineage`)).body;
  const withLineage = { ...claim, lineage: lin.lineages };
  const record = serializeRecord(withLineage);
  assert.ok(record.includes(GAP.establishes), 'gap statement is part of the narratable record');
  assert.ok(record.includes('zero weight'), 'the zero-weight note travels with the link');

  const stub = async () => ({
    text: JSON.stringify({
      items: [
        {
          id: 1,
          text: 'Its kernel establishes: documented through 1973 — this claim asserts continuation beyond it.',
          basis: 'documented through 1973'
        },
        {
          id: 2,
          text: 'The lineage was verified by a 1998 congressional audit.',
          basis: 'verified by a 1998 congressional audit'
        }
      ],
      does_not_assert: 'That the kernel supports the claim.',
      tier_statement: 'This claim sits at outer: not established.'
    })
  });
  const out = await narrateClaim({ claim: withLineage, corePrompt, card: null, mode: 'bare', callModel: stub });
  assert.equal(out.manifest.items[0].unverified, false, 'the real gap statement grounds');
  assert.equal(out.manifest.items[1].unverified, true, 'an invented lineage claim is flagged');
});

await test('N2. pin-to-notebook writes ONLY the isolated notebook entry — never the claim record', async () => {
  const store = (() => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      _map: m
    };
  })();
  const before = JSON.stringify((await api('GET', `/api/claims/${outer.id}`)).body);
  const nb = pinToNotebook(
    { claim_id: outer.id, claim_text: outer.text, text: 'The descent, narrated.', by: 'Marlowe' },
    store
  );
  assert.equal(nb.length, 1);
  assert.deepEqual([...store._map.keys()], [STORAGE_KEYS.NOTEBOOK_KEY], 'one isolated entry, nothing else');
  const after = JSON.stringify((await api('GET', `/api/claims/${outer.id}`)).body);
  assert.equal(before, after, 'the claim record is untouched by a pin');
  assert.equal(loadNotebook(store).length, 1);
  removeFromNotebook(0, store);
  assert.equal(loadNotebook(store).length, 0);
});

// ------------------------------------------------------------ event log (F)
await test('F1. every state-changing operation lands in the event log with actor, timestamp, and reason', async () => {
  const probe = (
    await mk({
      text: 'S29F: full-lifecycle probe.',
      radial_tier: 'middle',
      sources: [{ tier: 'reputable_secondary', citation: 'S29 F src', relation: 'supports' }]
    })
  ).body;
  await api('POST', `/api/claims/${probe.id}/sources`, PRIMARY('F2'));
  await api('POST', `/api/claims/${probe.id}/promote`, { target_tier: 'core' }); // fails (1 primary)
  await api('POST', `/api/claims/${probe.id}/sources`, PRIMARY('F3'));
  await api('POST', `/api/claims/${probe.id}/promote`, { target_tier: 'inner' }); // succeeds
  await api('POST', `/api/claims/${probe.id}/challenges`, {
    type: 'bad_source',
    description: 'S29F: checked and rejected.',
    outcome: 'rejected'
  });
  await api('POST', `/api/claims/${probe.id}/demote`, {
    target_tier: 'middle',
    reason: 'S29F: demote probe.'
  });
  const ev = (await api('GET', `/api/events?claim_id=${probe.id}`)).body;
  const actions = ev.map((e) => e.action);
  for (const a of [
    'claim_created',
    'source_attached',
    'promotion_failed',
    'promotion',
    'challenge_recorded',
    'demotion'
  ]) {
    assert.ok(actions.includes(a), `missing event: ${a} (have: ${actions.join(', ')})`);
  }
  for (const e of ev) {
    assert.ok(e.actor && e.actor.length > 0, 'every event carries an actor');
    assert.ok(e.created_at && e.created_at.length > 0, 'every event carries a timestamp');
    assert.ok(e.reason && e.reason.trim().length > 0, 'every event carries a reason');
  }
});

await test('F2. FAILED promotion attempts are first-class events, not silence', async () => {
  const ev = (await api('GET', '/api/events')).body;
  const fail = ev.find((e) => e.action === 'promotion_failed');
  assert.ok(fail, 'a failed promotion must be recorded');
  assert.match(fail.reason, /requires|contradict/i, 'with the refusal as its reason');
});

await test('F3. ripple demotes from a library delete are recorded per claim', async () => {
  const claimF3 = (
    await mk({
      text: 'S29F3: claim leaning on a doomed source.',
      radial_tier: 'middle',
      sources: [{ tier: 'reputable_secondary', citation: 'S29 F3 doomed source', relation: 'supports' }]
    })
  ).body;
  const srcId = claimF3.sources[0].id;
  await api('POST', `/api/sources/${srcId}/withdraw`, { reason: 'S29 F3: doomed on purpose' });
  await api('POST', `/api/sources/${srcId}/withdraw/adjudicate`, { outcome: 'upheld' });
  const ev = (await api('GET', `/api/events?claim_id=${claimF3.id}`)).body;
  assert.ok(
    ev.some((e) => e.action === 'demotion' && /withdrawn from the library/.test(e.reason)),
    'the ripple demotion is recorded with the withdrawal as its reason'
  );
  const all = (await api('GET', '/api/events')).body;
  assert.ok(all.some((e) => e.action === 'library_source_deleted'));
});

await test('F4. the event log is append-only at the schema layer — UPDATE and DELETE are refused', async () => {
  assert.throws(() => db.prepare('UPDATE events SET reason = ? WHERE id = 1').run('rewritten'), /append-only/);
  assert.throws(() => db.prepare('DELETE FROM events WHERE id = 1').run(), /append-only/);
});

await test('F5. link lifecycles are complete events: kernel create/remove, support add/remove, detach, vertical', async () => {
  // Exercise the two paths not yet covered above.
  const a = (
    await mk({
      text: 'S29F5: claim with a detachable source.',
      radial_tier: 'outer',
      sources: [
        { tier: 'reputable_secondary', citation: 'S29 F5 src', relation: 'supports' },
        { tier: 'primary_doc', citation: 'S29 F5 outcome doc', relation: 'supports' }
      ]
    })
  ).body;
  await api('PATCH', `/api/claims/${a.id}/vertical`, { direction: 'harm', magnitude: 1, evidenced: true });
  // 2.98b: detach is recorded withdrawal; a support link ends through a
  // recorded hop challenge — the only remaining path, by design.
  await api('POST', `/api/claims/${a.id}/sources/${a.sources[0].id}/withdraw`, {
    reason: 'S29 F5: withdrawn for the lifecycle record'
  });
  await api('POST', `/api/claims/${a.id}/sources/${a.sources[0].id}/withdraw/adjudicate`, {
    outcome: 'upheld'
  });
  await api('POST', `/api/claims/${middle.id}/challenges`, {
    type: 'equivocation',
    description: 'S29 F5: hop severed for the lifecycle record',
    outcome: 'upheld',
    hop: { supporter_id: middle.id, supported_id: outer.id }
  });
  const all = (await api('GET', '/api/events')).body;
  const actions = new Set(all.map((e) => e.action));
  for (const act of [
    'kernel_link_created',
    'kernel_link_removed',
    'support_link_added',
    'support_link_removed',
    'source_detached',
    'vertical_set'
  ]) {
    assert.ok(actions.has(act), `missing event action: ${act}`);
  }
});

// ------------------------------------------------------------ export/import
await test('X1. kernel links survive export → import through the rules layer', async () => {
  const exp = (await api('GET', '/api/topics/1/export')).body;
  assert.ok(exp.kernels.length >= 1, 'export carries kernel links');
  const k = exp.kernels.find((l) => exp.claims[l.claim].text === outer.text);
  assert.ok(k, 'the outer claim’s link is in the export');
  assert.equal(exp.claims[k.kernel].text, kernel.text);
  exp.name = 'S29 reimport';
  const imp = await api('POST', '/api/topics/import', exp);
  assert.equal(imp.status, 201, JSON.stringify(imp.body));
  const t = (await api('GET', `/api/topics/${imp.body.topic.id}`)).body;
  const reOuter = t.claims.find((c) => c.text === outer.text);
  assert.equal(reOuter.kernel_links.length, 1, 'the kernel link re-imported');
  assert.equal(reOuter.kernel_links[0].gap_establishes, GAP.establishes);
});

console.log(`\n${passed} passed, ${failed} failed`);
server.close();
process.exit(failed ? 1 : 0);
