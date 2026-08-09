// SPDX-License-Identifier: AGPL-3.0-only
// Stage 2.9d pressure tests: per-adapter key privacy (multi-provider BYOK),
// card import validation + round-trip, UI-prefs isolation, the topic-shape
// gate (rules layer, deterministic), and global record search (FTS5 —
// payload context, parking exclusion, cross-topic honesty).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { buildApp } from '../server/index.js';
import {
  PROVIDERS,
  buildChatRequest,
  guardProviderUrl,
  normalizeResponse
} from '../client/src/companion/providers.js';
import {
  parseCard,
  validateCardText,
  serializeCard,
  CardValidationError
} from '../client/src/companion/cards.js';
import { loadPanelWidth, savePanelWidth, UI_PREFS_KEYS } from '../client/src/uiPrefs.js';

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
const APP_ORIGIN = 'http://localhost:5173';

console.log('\nStage 2.9d — providers, cards, prefs, topic gate, global search\n');

// ------------------------------------------------------------ A. providers
await test('P1. every callable adapter: the key never appears in the URL and never targets the app origin', async () => {
  const callable = Object.keys(PROVIDERS).filter((k) => !PROVIDERS[k].browserBlocked);
  assert.ok(callable.includes('anthropic') && callable.includes('google') && callable.includes('openrouter'));
  for (const provider of callable) {
    const req = buildChatRequest({
      provider,
      baseUrl: provider === 'openai-compatible' ? 'https://my-gateway.example/v1' : undefined,
      apiKey: 'sk-SECRET-KEY-123',
      model: 'test-model',
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }]
    });
    assert.ok(!req.url.includes('SECRET'), `${provider}: key leaked into the URL`);
    const parsed = guardProviderUrl(req.url, APP_ORIGIN); // throws if app origin
    assert.notEqual(parsed.origin, APP_ORIGIN);
    const headerBlob = JSON.stringify(req.headers);
    assert.ok(headerBlob.includes('sk-SECRET-KEY-123'), `${provider}: key must ride in a header`);
  }
});

await test('P2. adapter wire shapes: anthropic x-api-key + opt-in header; google x-goog-api-key header, key NOT in query', async () => {
  const a = buildChatRequest({ provider: 'anthropic', apiKey: 'K', model: 'm', system: 's', messages: [] });
  assert.equal(a.headers['x-api-key'], 'K');
  assert.equal(a.headers['anthropic-dangerous-direct-browser-access'], 'true');
  const g = buildChatRequest({ provider: 'google', apiKey: 'K', model: 'gemini-3-flash', system: 's', messages: [{ role: 'assistant', content: 'prev' }, { role: 'user', content: 'q' }] });
  assert.equal(g.headers['x-goog-api-key'], 'K');
  assert.ok(!g.url.includes('key='), 'google key must never ride the query string');
  assert.equal(g.body.contents[0].role, 'model', 'assistant maps to model');
  assert.equal(g.body.system_instruction.parts[0].text, 's');
});

await test('P3. google responses normalize: text and functionCall parts both surface', async () => {
  const out = normalizeResponse('google', {
    candidates: [{ content: { parts: [{ text: 'hello ' }, { functionCall: { name: 'get_claim_detail', args: { claim_id: 3 } } }] } }]
  });
  assert.equal(out.text, 'hello ');
  assert.deepEqual(out.toolCalls.map((c) => c.name), ['get_claim_detail']);
  assert.deepEqual(out.toolCalls[0].args, { claim_id: 3 });
});

await test('P4. a browser-blocked provider fails PLAINLY, names the reason, and never falls back', async () => {
  assert.ok(PROVIDERS.openai.browserBlocked, 'openai must be listed as blocked with a reason');
  assert.match(PROVIDERS.openai.browserBlocked, /CORS/i);
  assert.match(PROVIDERS.openai.browserBlocked, /OpenRouter/);
  assert.match(PROVIDERS.openai.browserBlocked, /never touch/i);
  assert.throws(
    () => buildChatRequest({ provider: 'openai', apiKey: 'K', model: 'm', system: 's', messages: [] }),
    /CORS|browser/i
  );
});

// ------------------------------------------------------------ B. cards
await test('C1. card export/import round-trips losslessly', async () => {
  const card = parseCard({
    name: 'Wren',
    description: 'A careful archivist.',
    personality: 'Precise, dry.',
    scenario: 'A records room.',
    example_messages: 'Q: hm? A: check the record.',
    powers: [{ name: 'Cold reading', description: 'notices details', tags: ['persona'] }],
    voice: { provider: 'webspeech', voice: 'en-GB' }
  });
  const reimported = validateCardText(serializeCard(card));
  assert.deepEqual(reimported, card, 'export → import must be lossless');
});

await test('C2. invalid card files are refused whole with the blocker NAMED', async () => {
  assert.throws(() => validateCardText('{not json'), /Not valid JSON/);
  assert.throws(() => validateCardText('[1,2,3]'), /object, not an array/);
  assert.throws(() => validateCardText('{"description":"no name"}'), /Missing required field: "name"/);
  assert.throws(() => validateCardText('{"name":"X","personality":42}'), /Wrong type for "personality"/);
  assert.throws(() => validateCardText('{"name":"X","powers":"strong"}'), /Wrong type for "powers"/);
  assert.throws(() => validateCardText('{"name":"X","voice":"loud"}'), /Wrong type for "voice"/);
  // §11 unchanged: any persona CONTENT is legal once the shape is right.
  const agreeable = validateCardText('{"name":"Yes-Man","personality":"Always agrees with everything."}');
  assert.equal(agreeable.name, 'Yes-Man');
});

// ------------------------------------------------------------ D. UI prefs
await test('U1. panel widths persist in onion.ui.* only, clamped to bounds; reset paths cannot touch them', async () => {
  const m = new Map();
  const store = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
  savePanelWidth('sidebar', 5000, store);
  assert.equal(loadPanelWidth('sidebar', store), 560, 'clamped to max');
  savePanelWidth('companion', 10, store);
  assert.equal(loadPanelWidth('companion', store), 280, 'clamped to min');
  for (const k of m.keys()) assert.match(k, /^onion\.ui\./, 'UI prefs live in onion.ui.* only');
  // Server-side reset paths never reference browser storage (same property
  // the companion family is pinned by).
  for (const f of ['server/reset.js', 'scripts/build-demo.mjs']) {
    const body = readFileSync(join(root, f), 'utf8');
    assert.ok(!/onion\.ui|localStorage/.test(body), `${f} must not touch client prefs`);
  }
  assert.deepEqual(Object.values(UI_PREFS_KEYS).map((k) => k.startsWith('onion.ui.')), [true, true]);
});

// ------------------------------------------------------------ E. topic gate
await test('T1. subject-shaped topic names are ACCEPTED (fixtures)', async () => {
  for (const name of ['God', 'Christian God', 'S29D MKUltra II', 'The Replication Crisis (2.9d)', 'The Epstein Case 2: Prosecution, Files, and Release']) {
    const r = await api('POST', '/api/topics', { name, description: 'fixture' });
    assert.equal(r.status, 201, `"${name}" refused: ${JSON.stringify(r.body)}`);
  }
});

await test('T2. claim-shaped topic names are REFUSED by the rules layer with blocker and honest path named', async () => {
  for (const name of ['Christ is God', 'Vaccines cause autism', 'Is God real?', 'The election was stolen']) {
    const r = await api('POST', '/api/topics', { name, description: 'fixture' });
    assert.equal(r.status, 422, `"${name}" must be refused`);
    assert.equal(r.body.rule, 'topic_reads_as_claim');
    assert.match(r.body.error, /reads as a claim, not a subject/);
    assert.match(r.body.error, /add this sentence as a claim/i);
    assert.match(r.body.error, /heuristic/i, 'the gate must present itself as heuristic');
  }
});

// ------------------------------------------------------------ F. global search
const PRIMARY = (n) => ({ tier: 'primary_doc', citation: `S29D primary ${n}`, relation: 'supports' });

await test('G1. every hit carries tier, kind, off-axis flag, topic, and matched field — inseparably', async () => {
  const t1 = (await api('POST', '/api/topics', { name: 'S29D Blackbriar Program', description: '' })).body;
  const t2 = (await api('POST', '/api/topics', { name: 'S29D Northwoods Files', description: '' })).body;
  const c1 = (
    await api('POST', '/api/claims', {
      topic_id: t1.id,
      text: 'S29D: Operation Blackbriar ran between 1971 and 1976.',
      kind: 'historical',
      layer: 'factual',
      radial_tier: 'core',
      placement_reason: 'S29D: two Blackbriar primary documents on file.',
      sources: [PRIMARY('B1'), PRIMARY('B2')]
    })
  ).body;
  const c2 = (
    await api('POST', '/api/claims', {
      topic_id: t2.id,
      text: 'S29D: Blackbriar never ended and continues in secret.',
      kind: 'empirical',
      layer: 'factual',
      radial_tier: 'outermost',
      placement_reason: 'S29D: no evidence of continuation.',
      sources: []
    })
  ).body;
  await api('POST', `/api/claims/${c2.id}/challenges`, {
    type: 'contradicting_evidence',
    description: 'S29D: the Blackbriar shutdown memo contradicts continuation.',
    outcome: 'rejected'
  });
  const out = (await api('GET', `/api/search?q=${encodeURIComponent('Blackbriar')}`)).body;
  assert.ok(out.results.length >= 3, `expected hits across fields, got ${out.results.length}`);
  for (const hit of out.results) {
    for (const key of ['topic', 'claim_id', 'claim_text', 'kind', 'matched_field', 'snippet']) {
      assert.ok(hit[key] !== undefined, `hit missing ${key}`);
    }
    assert.ok('tier' in hit && 'off_axis' in hit, 'tier context is inseparable from the hit');
    assert.ok(hit.topic.id && hit.topic.name, 'topic context present');
  }
  const fields = new Set(out.results.map((h) => h.matched_field));
  assert.ok(fields.has('claim_text') && fields.has('placement_reason') && fields.has('challenge'),
    `fields covered: ${[...fields].join(', ')}`);
  globalThis.s29d = { t1, t2, c1, c2 };
});

await test('G2. a name across topics returns hits in EACH topic with tiers visibly distinct', async () => {
  const out = (await api('GET', '/api/search?q=Blackbriar')).body;
  const byTopic = new Map();
  for (const h of out.results) byTopic.set(h.topic.name, h);
  assert.ok(byTopic.has('S29D Blackbriar Program') && byTopic.has('S29D Northwoods Files'));
  const tiers = new Set(out.results.map((h) => h.tier));
  assert.ok(tiers.has('core') && tiers.has('outermost'), 'the same name spans proven AND debunked — both visible, tiers distinct');
});

await test('G3. gap statements and source citations are searchable; off-axis claims are included and flagged', async () => {
  const { t1, c2 } = globalThis.s29d;
  const kernelClaim = (
    await api('POST', '/api/claims', {
      topic_id: t1.id,
      text: 'S29D: the Blackbriar shutdown order is documented.',
      kind: 'historical',
      layer: 'factual',
      radial_tier: 'core',
      placement_reason: 'S29D: primary shutdown order.',
      sources: [PRIMARY('B3'), PRIMARY('B4')]
    })
  ).body;
  await api('POST', `/api/claims/${c2.id}/kernels`, {
    kernel_id: kernelClaim.id,
    establishes: 'documented through the Gladwell shutdown order',
    asserts_beyond: 'secret continuation',
    path_inward: 'any post-shutdown primary record'
  });
  const gap = (await api('GET', '/api/search?q=Gladwell')).body;
  assert.ok(gap.results.some((h) => h.matched_field === 'gap_statement'), 'gap statement text is searchable');
  const src = (await api('GET', `/api/search?q=${encodeURIComponent('S29D primary B1')}`)).body;
  assert.ok(src.results.some((h) => h.matched_field === 'source'), 'source citations are searchable');
  const meta = (
    await api('POST', '/api/claims', {
      topic_id: t1.id,
      text: 'S29D: Blackbriar was one front in a spiritual war beyond evidence.',
      kind: 'metaphysical',
      layer: 'framing',
      placement_reason: 'S29D: not empirically decidable.',
      sources: []
    })
  ).body;
  const off = (await api('GET', '/api/search?q=spiritual+war+beyond')).body;
  const hit = off.results.find((h) => h.claim_id === meta.id);
  assert.ok(hit, 'off-axis claims are included');
  assert.equal(hit.off_axis, true, 'and flagged as off-axis');
  assert.equal(hit.tier, null);
});

await test('G4. parking-lot notes are PROVABLY absent from the index', async () => {
  const { t1 } = globalThis.s29d;
  await api('POST', `/api/topics/${t1.id}/parking`, { text: 'S29D xylospectral private hunch about Blackbriar' });
  const out = (await api('GET', '/api/search?q=xylospectral')).body;
  assert.equal(out.results.length, 0, 'private scratch must never surface in record search');
  const raw = db.prepare(`SELECT COUNT(*) AS n FROM search_index WHERE content LIKE '%xylospectral%'`).get();
  assert.equal(raw.n, 0, 'and must not even be in the index');
});

await test('G5. the index follows the record: demotion re-indexes the new placement reason; source withdrawal removes its rows', async () => {
  const { c1 } = globalThis.s29d;
  await api('POST', `/api/claims/${c1.id}/demote`, {
    target_tier: 'middle',
    reason: 'S29D: quennselite paperwork gap discovered.'
  });
  const re = (await api('GET', '/api/search?q=quennselite')).body;
  assert.ok(re.results.some((h) => h.claim_id === c1.id && h.matched_field === 'placement_reason'));
  assert.equal(re.results.find((h) => h.claim_id === c1.id).tier, 'middle', 'the hit carries the CURRENT tier');
  const srcId = (await api('GET', `/api/claims/${c1.id}`)).body.sources[0].id;
  await api('POST', `/api/sources/${srcId}/withdraw`, { reason: 'S29D: withdrawn for the index test' });
  await api('POST', `/api/sources/${srcId}/withdraw/adjudicate`, { outcome: 'upheld' });
  const gone = (await api('GET', `/api/search?q=${encodeURIComponent('S29D primary B1')}`)).body;
  assert.ok(!gone.results.some((h) => h.matched_field === 'source' && /B1/.test(h.snippet)), 'withdrawn source rows leave the index (search has no diminished state)');
});

await test('G6. ranking is bm25 — lexical only; the query cannot inject FTS operators', async () => {
  const inj = await api('GET', `/api/search?q=${encodeURIComponent('Blackbriar OR "')}`);
  assert.equal(inj.status, 200, 'operator-looking input must not error');
  const near = await api('GET', `/api/search?q=${encodeURIComponent('NEAR(Blackbriar, 3)')}`);
  assert.equal(near.status, 200);
});

console.log(`\n${passed} passed, ${failed} failed`);
server.close();
process.exit(failed ? 1 : 0);
