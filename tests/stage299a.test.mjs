// Stage 2.99a pins: sandbox core & personas. Per-visitor copies created at
// FIRST WRITE (reads create nothing), absolute isolation, wipe on expiry,
// honest caps; the SAME rules layer answering in-copy (not a fork —
// structural + behavioral pins); three simulated personas with standing
// gates in the rules layer, proposer-never-upholds first enforced in code;
// versioned record-shaped saves that round-trip; the one-surface entry
// card; and no guarantee-shaped sentence on any first-run surface.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDb } from '../server/db.js';
import { restoreHistory } from '../server/history.js';
import { buildApp } from '../server/index.js';
import {
  makeSandboxManager,
  makeSave,
  validateSave,
  SaveFormatError,
  SANDBOX_LIMITS,
  SANDBOX_ENTRY_NOTE,
  SANDBOX_FULL_MESSAGE,
  SAVE_FORMAT,
  SAVE_VERSION,
  SAVE_STANDING_NOTE
} from '../server/sandbox.js';
import { PERSONAS, PERSONA_HONESTY_LABEL, personaGateFailures } from '../server/rules.js';
import {
  indicatorText,
  apiBase,
  needsCopy,
  autosaveLabel,
  divergenceEvents,
  SAVE_PROMPT_MESSAGE,
  PERSONA_SWITCH_LABEL
} from '../client/src/sandboxState.js';
import { makeAutosaver, readBrowserAutosave, AUTOSAVE_KEY } from '../client/src/autosave.js';

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

// One canonical demo host for most tests: restored fixture + manager.
const canonDb = openDb(':memory:');
restoreHistory(canonDb, fixture);
const manager = makeSandboxManager({ fixture, buildApp });
const server = buildApp(canonDb, { demo: true, sandboxManager: manager }).listen(0);
const base = `http://localhost:${server.address().port}`;

const req = async (method, path, body, headers = {}) => {
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
const newCopy = async (save) => {
  const r = await req('POST', '/api/sandbox/copy', save ? { save } : {});
  assert.equal(r.status, 201, `copy creation answered ${r.status}: ${r.body?.error}`);
  return r.body;
};
const sb = (sid) => ({
  get: (p) => req('GET', `/sandbox/${sid}${p}`),
  post: (p, body, persona) =>
    req('POST', `/sandbox/${sid}${p}`, body, persona ? { 'x-onion-actor': persona } : {})
});

const PROBE_CLAIM = {
  topic_id: 1,
  text: 'S299a probe: a brand-new sandbox claim.',
  kind: 'empirical',
  layer: 'factual',
  radial_tier: 'outer',
  placement_reason: 'Stated faithfully; no strong sources yet.',
  sources: []
};

console.log('\nStage 2.99a — sandbox core & personas\n');

await test('A1. isolation is absolute: two copies never see each other; the shared record never moves', async () => {
  const before = (await req('GET', '/api/topics/1')).body;
  const c1 = await newCopy();
  const c2 = await newCopy();
  const w = await sb(c1.session_id).post('/api/claims', PROBE_CLAIM);
  assert.equal(w.status, 201, w.body?.error);
  const in1 = (await sb(c1.session_id).get('/api/topics/1')).body;
  const in2 = (await sb(c2.session_id).get('/api/topics/1')).body;
  assert.ok(in1.claims.some((c) => c.text === PROBE_CLAIM.text), 'the write landed in copy 1');
  assert.ok(!in2.claims.some((c) => c.text === PROBE_CLAIM.text), 'copy 2 never sees it');
  const after = (await req('GET', '/api/topics/1')).body;
  assert.deepEqual(after, before, 'the shared exhibit is byte-identical after sandbox writes');
  // And the shared record still refuses writes flatly.
  assert.equal((await req('POST', '/api/claims', PROBE_CLAIM)).status, 403);
  manager.destroy(c1.session_id);
  manager.destroy(c2.session_id);
});

await test('A2. reads create nothing: a read-only crawl of every route leaves zero sessions', async () => {
  assert.equal(manager.count(), 0, 'clean start');
  const reads = [
    '/api/meta', '/api/topics', '/api/topics/1', '/api/topics/1/export', '/api/topics/1/timeline',
    '/api/topics/1/stats', '/api/topics/1/parking', '/api/claims/1', '/api/claims/1/tier-preview',
    '/api/claims/1/lineage', '/api/claims/1/history', '/api/claims/1/review-status',
    '/api/search?q=church', '/api/events', '/api/epoch', '/claim/1', '/claim/11'
  ];
  for (const p of reads) {
    const r = await fetch(base + p);
    assert.ok(r.status < 500, `${p} answered ${r.status}`);
    await r.text();
  }
  assert.equal(manager.count(), 0, 'reading never consumes a session');
});

await test('A3. the cap gates first-write only, with the honest full-message; reading stays available', async () => {
  const small = makeSandboxManager({ fixture, buildApp, limits: { ...SANDBOX_LIMITS, cap: 2 } });
  const capDb = openDb(':memory:');
  restoreHistory(capDb, fixture);
  const capSrv = buildApp(capDb, { demo: true, sandboxManager: small }).listen(0);
  const capBase = `http://localhost:${capSrv.address().port}`;
  const mk = () =>
    fetch(`${capBase}/api/sandbox/copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal((await mk()).status, 201);
  assert.equal((await mk()).status, 201);
  const full = await mk();
  assert.equal(full.status, 503);
  const body = await full.json();
  assert.equal(body.error, SANDBOX_FULL_MESSAGE);
  assert.match(body.error, /Reading the record stays fully available/);
  assert.equal((await fetch(`${capBase}/api/topics/1`)).status, 200, 'reading is untouched by a full sandbox');
  small.stop();
  capSrv.close();
  capDb.close();
});

await test('A4. wipe on expiry: the copy ceases to exist, and the API says so honestly; entry labeling present', async () => {
  let t = Date.now();
  const clockMgr = makeSandboxManager({ fixture, buildApp, now: () => t });
  const clkDb = openDb(':memory:');
  restoreHistory(clkDb, fixture);
  const clkSrv = buildApp(clkDb, { demo: true, sandboxManager: clockMgr }).listen(0);
  const clkBase = `http://localhost:${clkSrv.address().port}`;
  const made = await (
    await fetch(`${clkBase}/api/sandbox/copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  ).json();
  // The entry labeling, exactly the required facts: yours alone, nothing
  // shared or saved server-side, export a save to keep work.
  assert.equal(made.entry_note, SANDBOX_ENTRY_NOTE);
  assert.match(made.entry_note, /yours alone/);
  assert.match(made.entry_note, /Nothing here is shared or saved on the server/);
  assert.match(made.entry_note, /export a save file/);
  assert.equal(clockMgr.count(), 1);
  t += SANDBOX_LIMITS.ttlMs + 1;
  clockMgr.sweep();
  assert.equal(clockMgr.count(), 0, 'expired copies are wiped');
  const gone = await fetch(`${clkBase}/sandbox/${made.session_id}/api/topics/1`);
  assert.equal(gone.status, 410);
  assert.match((await gone.json()).error, /expired|never existed/i);
  clockMgr.stop();
  clkSrv.close();
  clkDb.close();
});

await test('A5. the per-copy size cap refuses growth honestly, never a silent hang', async () => {
  const tiny = makeSandboxManager({ fixture, buildApp, limits: { ...SANDBOX_LIMITS, sizeCapBytes: 1024 } });
  const tDb = openDb(':memory:');
  restoreHistory(tDb, fixture);
  const tSrv = buildApp(tDb, { demo: true, sandboxManager: tiny }).listen(0);
  const tBase = `http://localhost:${tSrv.address().port}`;
  const made = await (
    await fetch(`${tBase}/api/sandbox/copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  ).json();
  const w = await fetch(`${tBase}/sandbox/${made.session_id}/api/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(PROBE_CLAIM)
  });
  assert.equal(w.status, 413, 'past the cap, a write is refused');
  assert.match((await w.json()).error, /size cap.*export a save/i);
  const r = await fetch(`${tBase}/sandbox/${made.session_id}/api/topics/1`);
  assert.equal(r.status, 200, 'reading the full copy continues');
  tiny.stop();
  tSrv.close();
  tDb.close();
});

await test('B1. same code path, pinned by structure and behavior: known refusals fire identically in-copy and in-engine', async () => {
  // Structure: the sandbox module holds no rules and no routes — it can
  // only serve what buildApp builds, so drift has nowhere to live.
  const sbxSrc = readFileSync(join(root, 'server', 'sandbox.js'), 'utf8');
  assert.ok(!/rules\.js|service\.js|express/.test(sbxSrc), 'sandbox.js imports neither rules nor routes — it only manages copies');
  // Behavior: a sampler of refusals, engine vs sandbox, byte-identical.
  const engDb = openDb(':memory:');
  restoreHistory(engDb, fixture);
  const engSrv = buildApp(engDb, { demo: false }).listen(0);
  const engBase = `http://localhost:${engSrv.address().port}`;
  const copy = await newCopy();
  const probes = [
    ['POST', '/api/claims', { topic_id: 1, text: 'S299a core grab.', kind: 'empirical', layer: 'factual', radial_tier: 'core', placement_reason: 'x', sources: [{ tier: 'anonymous', citation: 'anon post', relation: 'supports' }] }],
    ['POST', '/api/claims/9/promote', { target_tier: 'core' }],
    ['POST', '/api/claims/1/sources/1/withdraw', {}],
    ['POST', '/api/topics', { name: 'Christ is God', description: '' }]
  ];
  for (const [method, path, body] of probes) {
    const eng = await (async () => {
      const r = await fetch(engBase + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json() };
    })();
    const inCopy = await sb(copy.session_id)[method === 'POST' ? 'post' : 'get'](path, body);
    assert.equal(inCopy.status, eng.status, `${path}: status ${inCopy.status} vs engine ${eng.status}`);
    assert.equal(inCopy.body.error, eng.body.error, `${path}: refusal text must be identical`);
    assert.equal(inCopy.body.rule, eng.body.rule, `${path}: rule id must be identical`);
    assert.equal(eng.status, 422, `${path} is a refusal probe`);
  }
  // And the fetch proxy stays absent in a copy (demo posture unchanged).
  assert.equal((await sb(copy.session_id).get('/api/fetch?url=https://example.com')).status, 404);
  manager.destroy(copy.session_id);
  engSrv.close();
  engDb.close();
});

await test('C1. persona gates: Contributor adds and proposes but adjudicates nothing; Curator-seat ops are refused with the label', async () => {
  const copy = await newCopy();
  const s = sb(copy.session_id);
  // Contributor may add a claim and a source through the rules.
  const add = await s.post('/api/claims', PROBE_CLAIM, 'contributor');
  assert.equal(add.status, 201, add.body?.error);
  const claimId = add.body.id;
  const att = await s.post(`/api/claims/${claimId}/sources`, { tier: 'reputable_secondary', citation: 'S299a probe citation', relation: 'supports' }, 'contributor');
  assert.equal(att.status, 201, att.body?.error);
  // Contributor may file a withdrawal proposal…
  const src = att.body.sources.find((x) => x.citation === 'S299a probe citation');
  const prop = await s.post(`/api/claims/${claimId}/sources/${src.id}/withdraw`, { reason: 'S299a: probing the two-phase machinery.' }, 'contributor');
  assert.equal(prop.status, 200, prop.body?.error);
  // …but adjudicates nothing, with the blocker named and the honesty label carried.
  const adj = await s.post(`/api/claims/${claimId}/sources/${src.id}/withdraw/adjudicate`, { outcome: 'upheld' }, 'contributor');
  assert.equal(adj.status, 422);
  assert.equal(adj.body.rule, 'persona_standing');
  assert.match(adj.body.error, /adjudicates nothing/);
  assert.match(adj.body.error, /standing preset for demonstration, not earned/);
  // Curator-seat machinery is refused for a contributor, blocker named.
  const promo = await s.post(`/api/claims/9/promote`, { target_tier: 'middle' }, 'contributor');
  assert.equal(promo.status, 422);
  assert.equal(promo.body.rule, 'persona_standing');
  assert.match(promo.body.error, /Curator-seat machinery/);
  assert.match(promo.body.error, /provisional table \(illustrative of Stage 3/);
  manager.destroy(copy.session_id);
});

await test('C2. proposer-never-upholds, first in-code: a Reviewer never upholds their own; retraction stays permitted', async () => {
  const copy = await newCopy();
  const s = sb(copy.session_id);
  // Reviewer files a proposal of their own…
  const prop = await s.post('/api/claims/1/sources/1/withdraw', { reason: 'S299a: reviewer self-proposal.' }, 'reviewer');
  assert.equal(prop.status, 200, prop.body?.error);
  // …may NOT uphold it (named blocker)…
  const selfUphold = await s.post('/api/claims/1/sources/1/withdraw/adjudicate', { outcome: 'upheld' }, 'reviewer');
  assert.equal(selfUphold.status, 422);
  assert.equal(selfUphold.body.rule, 'persona_standing');
  assert.match(selfUphold.body.error, /proposer never upholds/i);
  assert.match(selfUphold.body.error, /filed by the same Reviewer/);
  // …but may retract (reject) their own — permitted, recorded.
  const retract = await s.post('/api/claims/1/sources/1/withdraw/adjudicate', { outcome: 'rejected' }, 'reviewer');
  assert.equal(retract.status, 200, retract.body?.error);
  // A Reviewer adjudicating a DIFFERENT actor's proposal: allowed.
  const cProp = await s.post('/api/claims/1/sources/2/withdraw', { reason: 'S299a: contributor files, reviewer rules.' }, 'contributor');
  assert.equal(cProp.status, 200, cProp.body?.error);
  const rAdj = await s.post('/api/claims/1/sources/2/withdraw/adjudicate', { outcome: 'rejected' }, 'reviewer');
  assert.equal(rAdj.status, 200, rAdj.body?.error);
  manager.destroy(copy.session_id);
});

await test('C3. the copy\'s event log is genuinely multi-actor and replay renders persona actors; unknown actors clamp', async () => {
  const copy = await newCopy();
  const s = sb(copy.session_id);
  await s.post('/api/claims', PROBE_CLAIM, 'contributor');
  await s.post('/api/claims', { ...PROBE_CLAIM, text: 'S299a second probe, reviewer-authored.' }, 'reviewer');
  await s.post('/api/claims', { ...PROBE_CLAIM, text: 'S299a third probe, curator-authored.' }, 'curator');
  // A freeform actor header clamps to curator — the log records personas,
  // never arbitrary names.
  await s.post('/api/claims', { ...PROBE_CLAIM, text: 'S299a fourth probe, freeform actor.' }, 'banksy');
  const evs = (await s.get('/api/events')).body;
  const actors = new Set(evs.map((e) => e.actor));
  assert.ok(actors.has('contributor') && actors.has('reviewer') && actors.has('curator'), 'three personas on one log');
  for (const e of evs) {
    assert.ok([...PERSONAS, 'local', 'claude (2.9b seeding)'].includes(e.actor), `unexpected actor "${e.actor}"`);
  }
  // Replay (the timeline) carries the persona actors into rendering data.
  const tl = (await s.get('/api/topics/1/timeline')).body;
  const logged = tl.events.filter((e) => e.origin === 'log');
  assert.ok(logged.some((e) => e.actor === 'contributor') && logged.some((e) => e.actor === 'reviewer'), 'sandbox replay renders genuine multi-actor history');
  manager.destroy(copy.session_id);
});

await test('C4. honesty labels ride every surface personas touch: gates, switcher, save file', async () => {
  assert.match(PERSONA_HONESTY_LABEL, /standing preset for demonstration, not earned/);
  assert.match(PERSONA_HONESTY_LABEL, /real standing rules arrive with multiplayer/);
  assert.equal(PERSONA_SWITCH_LABEL, PERSONA_HONESTY_LABEL, 'client switcher label = the rules-layer label, one copy of the truth');
  // The gate refusals carry it (verified in C1); the pure function does too.
  const [f] = personaGateFailures({ actor: 'contributor', operation: 'adjudicate' });
  assert.match(f.reason, /standing preset for demonstration/);
  assert.match(SAVE_STANDING_NOTE, /simulation data/);
  assert.match(SAVE_STANDING_NOTE, /pass the real rules layer entry by entry/);
  assert.match(SAVE_STANDING_NOTE, /nothing carries standing in from a file/);
});

await test('D1. saves round-trip: export a worked copy, import it into a fresh session, identical record', async () => {
  const copy = await newCopy();
  const s = sb(copy.session_id);
  await s.post('/api/claims', PROBE_CLAIM, 'contributor');
  await s.post('/api/claims/1/sources/1/withdraw', { reason: 'S299a round-trip proposal.' }, 'reviewer');
  const save = (await s.get('/save')).body;
  assert.equal(save.format, SAVE_FORMAT);
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.standing_note, SAVE_STANDING_NOTE, 'the settled Stage-3 contract rides in the file');
  assert.ok(save.record.claims.some((c) => c.text === PROBE_CLAIM.text), 'the visitor recognizes their own work');
  const imported = await newCopy(save);
  const s2 = sb(imported.session_id);
  const evs1 = (await s.get('/api/events')).body;
  const evs2 = (await s2.get('/api/events')).body;
  assert.deepEqual(evs2, evs1, 'the imported copy IS the save — event log identical, persona attribution intact');
  const t1 = (await s.get('/api/topics/1')).body;
  const t2 = (await s2.get('/api/topics/1')).body;
  assert.deepEqual(t2, t1, 'record identical, withdrawal proposal state included');
  // A tampered save is refused whole with the blocker named.
  const bad = await req('POST', '/api/sandbox/copy', { save: { format: 'wrong', version: 1 } });
  assert.equal(bad.status, 422);
  assert.match(bad.body.error, /format/);
  assert.throws(() => validateSave({ format: SAVE_FORMAT, version: 99, record: {} }), SaveFormatError);
  manager.destroy(copy.session_id);
  manager.destroy(imported.session_id);
});

await test('E1. client honesty organs (pure logic): indicator, first-write interception, autosave labels, divergence', () => {
  assert.equal(indicatorText({}), 'canonical record');
  assert.equal(indicatorText({ sid: 'x' }), 'your copy — diverged from the record');
  assert.match(indicatorText({ sid: 'x', viewCanonical: true }), /canonical record — your copy is safe/);
  assert.equal(apiBase({}), '');
  assert.equal(apiBase({ sid: 'abc' }), '/sandbox/abc');
  assert.equal(apiBase({ sid: 'abc', viewCanonical: true }), '', 'canonical viewing reads the shared record');
  assert.equal(needsCopy({ demo: true, sid: null }), true, 'first write in demo needs the copy');
  assert.equal(needsCopy({ demo: true, sid: 'x' }), false);
  assert.equal(needsCopy({ demo: false, sid: null }), false, 'the full engine never copies');
  // Two labeled modes, never one unlabeled checkmark; failure never silent.
  assert.match(autosaveLabel({ mode: 'file', filename: 'a.json' }), /autosaving to a\.json/);
  assert.match(autosaveLabel({ mode: 'browser' }), /autosaving in this browser — download to keep/);
  assert.match(autosaveLabel({}), /no save set up/);
  assert.match(autosaveLabel({ mode: 'file', error: 'handle revoked' }), /FAILED — handle revoked/);
  assert.match(SAVE_PROMPT_MESSAGE, /ephemeral/);
  assert.match(SAVE_PROMPT_MESSAGE, /stays current automatically/);
  const evs = [{ id: 12 }, { id: 13 }, { id: 14 }, { id: 20 }];
  assert.deepEqual(divergenceEvents(evs, 13).map((e) => e.id), [14, 20], 'divergence = events past the canonical baseline');
});

await test('E2. autosave writes surface failure immediately; browser mode round-trips through the standard format', async () => {
  // Browser mode: storage-backed, readable back as the SAME save format.
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const statuses = [];
  const write = makeAutosaver({ mode: 'browser', storage, onStatus: (s) => statuses.push(s) });
  const save = makeSave(canonDb);
  assert.equal(await write(JSON.stringify(save)), true);
  assert.equal(statuses[0].ok, true);
  const back = readBrowserAutosave(storage);
  assert.equal(back.format, SAVE_FORMAT, 'the autosaved artifact IS the standard save');
  assert.equal(validateSave(back).claims.length, save.record.claims.length, 'and it passes the standard import validation');
  // A full store (or revoked handle): surfaced, never silent.
  const failing = { setItem: () => { throw new Error('QuotaExceededError: storage full'); }, getItem: () => null };
  const failStatuses = [];
  const failWrite = makeAutosaver({ mode: 'browser', storage: failing, onStatus: (s) => failStatuses.push(s) });
  assert.equal(await failWrite('{}'), false);
  assert.equal(failStatuses[0].ok, false);
  assert.match(failStatuses[0].error, /storage full/);
  assert.equal(AUTOSAVE_KEY, 'onion.sandbox.autosave');
});

await test('F1. the entry card is doors, not teaching — and no first-run surface carries a guarantee-shaped sentence', () => {
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  // The minimal copy, verbatim facts: curated record; read-only; the
  // sandbox's private copy; the two doors (Amendment C reduced them).
  assert.match(app, /The curated record of three documented topics/);
  assert.match(app, /This shared record is\s+read-only; the\s+sandbox gives you a private copy where the rules answer to you/);
  assert.match(app, /Explore the record/);
  assert.match(app, /Take the tour/);
  assert.ok(!app.includes('Try the sandbox'), 'Amendment C: no sandbox door — copy-on-first-write superseded it');
  // Copy-review pass: guarantee-shaped copy is refused product-wide on
  // first-run surfaces (card, tour stops, sandbox entry/full/gone notes).
  const stops = readFileSync(join(root, 'client', 'src', 'tour', 'stops.js'), 'utf8');
  const sandboxSrc = readFileSync(join(root, 'server', 'sandbox.js'), 'utf8');
  // Banned: copy that PROMISES beyond what a test pins. ("never guarantees
  // promotion" is the opposite — an anti-promise — and stays legal.)
  for (const [name, src] of [['App.jsx', app], ['stops.js', stops], ['sandbox.js', sandboxSrc]]) {
    assert.ok(
      !/refuses cheating|cannot cheat|can't cheat|cannot be (fooled|tricked|gamed)|impossible to|tamper-?proof|unhackable|guaranteed to/i.test(src),
      `${name} carries no guarantee-shaped sentence`
    );
  }
});

await test('F2. the tour\'s first-write stop exists with its grounding doc, in the always-required stop set', async () => {
  const { TOUR_STOPS, REQUIRED_STOP_KEYS } = await import('../client/src/tour/stops.js');
  const stop = TOUR_STOPS.find((s) => s.key === 'boundary');
  assert.ok(stop, 'the boundary stop is the first-write stop');
  assert.ok(REQUIRED_STOP_KEYS.includes('boundary'), 'required in both modes (2.96 machinery renders the doc keyless, voices it keyed)');
  for (const phrase of ['private copy', 'your copy', 'refusal', 'persona', 'save']) {
    assert.ok(stop.copy.toLowerCase().includes(phrase), `the grounding doc teaches: ${phrase}`);
  }
  assert.match(stop.tryIt, /add claim|add a claim/i, 'the guide has the visitor attempt the write themselves');
});

await test('G1. claim pages render the canonical record only, and say what the host cannot promise', async () => {
  // A claim that exists only in a copy has no public page.
  const copy = await newCopy();
  const made = await sb(copy.session_id).post('/api/claims', PROBE_CLAIM, 'curator');
  assert.equal(made.status, 201);
  assert.equal((await req('GET', `/claim/${made.body.id}`)).status, 404, 'copy-only claims have no public page — links go live at multiplayer');
  // The copy's own app never serves pages through the parent.
  const pageViaSandbox = await fetch(`${base}/sandbox/${copy.session_id}/claim/1`);
  assert.equal(pageViaSandbox.status, 404, 'no page route is reachable through a sandbox path');
  // The canonical page carries the impermanence line.
  const page = await (await fetch(`${base}/claim/1`)).text();
  assert.match(page, /temporary by design/);
  assert.match(page, /permanent claim addresses arrive with multiplayer/);
  manager.destroy(copy.session_id);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
manager.stop();
server.close();
canonDb.close();
process.exit(failed ? 1 : 0);
