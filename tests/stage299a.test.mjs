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
import { makeSaveEngine, readBrowserAutosave, AUTOSAVE_KEY } from '../client/src/autosave.js';
import {
  decorateSave,
  saveFingerprint,
  resumePlan,
  CONTRIBUTION_ASK,
  RECONNECT_WHY,
  PICK_WHERE_WHY
} from '../client/src/sandboxState.js';
import { recordRefusal, refusalLedger, seedRefusals, resetRefusals } from '../client/src/refusalLog.js';

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
    assert.ok(
      [...PERSONAS, 'local', 'claude (2.9b seeding)', 'claude (2.99b seeding)', 'claude (2.99b-2 seeding)'].includes(e.actor),
      `unexpected actor "${e.actor}"`
    );
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
  // Punch 8: equal-dignity labels — modes stated as modes, staleness
  // first-class, failure never silent, no deficiency framing anywhere.
  assert.match(autosaveLabel({ fileMode: 'file', filename: 'a.json' }), /autosaving to a\.json/);
  assert.match(autosaveLabel({ fileMode: 'download' }), /autosaving to Downloads/);
  assert.match(autosaveLabel({ fileMode: 'download', behind: 3 }), /3 changes pending/);
  assert.match(autosaveLabel({ fileMode: 'manual', behind: 2 }), /protected in-browser — file 2 changes behind/);
  assert.match(autosaveLabel({ fileMode: 'manual', behind: 0 }), /protected in-browser — file current/);
  assert.match(autosaveLabel({}), /protected in-browser — save your copy/);
  assert.match(autosaveLabel({ fileMode: 'file', fileError: 'handle revoked' }), /file update FAILED — handle revoked; every change is still protected in-browser/);
  assert.match(autosaveLabel({ mirrorError: 'storage full' }), /in-browser protection FAILED — storage full/);
  const appSrc = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.ok(!/does not support persistent file handles/.test(appSrc), 'no deficiency framing (punch 8)');
  assert.match(SAVE_PROMPT_MESSAGE, /ephemeral/);
  assert.match(SAVE_PROMPT_MESSAGE, /Save your copy to a file now/);
  assert.match(SAVE_PROMPT_MESSAGE, /mirror protects every change/);
  const evs = [{ id: 12 }, { id: 13 }, { id: 14 }, { id: 20 }];
  assert.deepEqual(divergenceEvents(evs, 13).map((e) => e.id), [14, 20], 'divergence = events past the canonical baseline');
});

await test('E2. the save engine (punch 6+8): mirror on every change everywhere, staleness counts, failures surface, nothing lost', async () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const statuses = [];
  const save = makeSave(canonDb);
  const text = JSON.stringify(save);

  // JOB 1 — the mirror writes on every change, in EVERY browser class
  // (here: no file configured at all, the skip case).
  const bare = makeSaveEngine({ storage, onStatus: (s) => statuses.push(s) });
  bare.recordChange(text);
  assert.equal(mem.get(AUTOSAVE_KEY), text, 'mirror written with no file configured');
  const back = readBrowserAutosave(storage);
  assert.equal(back.format, SAVE_FORMAT, 'the mirrored artifact IS the standard save');
  assert.equal(validateSave(back).claims.length, save.record.claims.length, 'and passes the standard import validation');
  assert.equal(bare.behind, 1, 'the staleness counter counts from change one');

  // Chromium class: file mode ALSO mirrors (revoked-handle protection),
  // and a revoked handle falls back to the mirror WITHOUT loss.
  const mem2 = new Map();
  const st2 = [];
  const goodHandle = { createWritable: async () => ({ written: '', async write(t) { this.written = t; goodHandle.last = t; }, async close() {} }) };
  const eng = makeSaveEngine({
    storage: { getItem: (k) => mem2.get(k) ?? null, setItem: (k, v) => mem2.set(k, v) },
    onStatus: (s) => st2.push(s)
  });
  eng.configureFile({ mode: 'file', handle: goodHandle, filename: 'save.json' });
  eng.recordChange(text);
  assert.equal(mem2.get(AUTOSAVE_KEY), text, 'the mirror writes even in file mode — Chromium included');
  await eng.writeFile(text);
  assert.equal(goodHandle.last, text, 'the picked file receives the save');
  assert.equal(eng.behind, 0, 'file current — staleness resets');
  // Revoke the handle: the file write fails VISIBLY, the mirror still holds
  // the newer state — nothing lost.
  const newer = text.replace('"version": 1', '"version": 1 ');
  eng.recordChange(newer);
  goodHandle.createWritable = async () => { throw new Error('NotAllowedError: handle revoked'); };
  const failed = await eng.writeFile(newer);
  assert.match(failed.fileError, /handle revoked/);
  assert.equal(mem2.get(AUTOSAVE_KEY), newer, 'the mirror kept the newer state through the revocation');
  assert.equal(st2[st2.length - 1].fileError && true, true, 'failure surfaced through status — never silent');

  // Non-FSA class: download mode — the batched writer resets staleness on
  // each (batched) download; manual mode counts until the one-click update.
  let downloads = 0;
  const dl = makeSaveEngine({ storage, download: () => downloads++, onStatus: () => {} });
  dl.configureFile({ mode: 'download' });
  dl.recordChange(text);
  dl.recordChange(text);
  dl.recordChange(text);
  assert.equal(downloads, 0, 'changes alone never download — batching is the caller\'s debounce');
  await dl.writeFile(text);
  assert.equal(downloads, 1, 'a burst of edits yields ONE download');
  assert.equal(dl.behind, 0);
  dl.configureFile({ mode: 'manual' });
  dl.recordChange(text);
  dl.recordChange(text);
  assert.equal(dl.behind, 2, 'manual mode: the staleness badge counts accurately');
  await dl.writeFile(text); // the one-click update
  assert.equal(dl.behind, 0);
  assert.equal(downloads, 2);

  // A full store: surfaced immediately and plainly.
  const failing = makeSaveEngine({
    storage: { setItem: () => { throw new Error('QuotaExceededError: storage full'); }, getItem: () => null },
    onStatus: (s) => statuses.push(s)
  });
  const r = failing.recordChange('{}');
  assert.match(r.mirrorError, /storage full/);
  assert.equal(AUTOSAVE_KEY, 'onion.sandbox.autosave');

  // Punch 6a regression: the engine's writers are METHODS used as methods —
  // the old bug called .write on a bare function and died at first change.
  const appJsx = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.ok(!/autosaverRef/.test(appJsx), 'the old single-function autosaver wiring is gone');
  assert.match(appJsx, /saveEngineRef\.current/, 'the engine is the one save path');
});

await test('E3 (punch 1). the api funnel: add-claim AND add-topic from canonical view succeed end-to-end, uninterrupted', async () => {
  // Drive the REAL client api module against the real demo server — the
  // exact calls AddClaim.jsx and the topic form make, no run() wrapper.
  const apiMod = await import('../client/src/api.js');
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => realFetch(typeof url === 'string' && url.startsWith('/') ? base + url : url, opts);
  const events = [];
  const off = apiMod.onSandboxEvent((e) => events.push(e.type));
  try {
    apiMod.configureSandbox({ demo: true, sid: null, viewCanonical: false, actor: 'curator' });
    const claim = await apiMod.api.createClaim(PROBE_CLAIM); // first write: no halt, no refusal banner
    assert.ok(claim.id, 'the claim landed — one uninterrupted flow');
    assert.ok(events.includes('copy-created'), 'the copy was created transparently at that instant');
    const topic = await apiMod.api.createTopic({ name: 'Funnel Probe Topic', description: '' });
    assert.ok(topic.id, 'add-topic flows end-to-end too');
    assert.ok(events.filter((t) => t === 'copy-created').length === 1, 'exactly one copy — later writes reuse it');
    assert.ok(events.includes('wrote'), 'every successful write emits the autosave hook');
    // The shared record never moved.
    const canon = await (await realFetch(`${base}/api/topics`)).json();
    assert.ok(!canon.some((t) => t.name === 'Funnel Probe Topic'), 'the canonical record is untouched');
  } finally {
    off();
    apiMod.configureSandbox({ demo: false, sid: null, viewCanonical: false });
    globalThis.fetch = realFetch;
  }
});

await test('E4 (punch 5). rejected withdrawals render permanently: payload, history, and library scope', async () => {
  const copy = await newCopy();
  const s = sb(copy.session_id);
  // Attachment-scope: contributor files, reviewer rejects.
  await s.post('/api/claims/1/sources/1/withdraw', { reason: 'Punch-5 probe: attachment-scope attempt.' }, 'contributor');
  await s.post('/api/claims/1/sources/1/withdraw/adjudicate', { outcome: 'rejected' }, 'reviewer');
  const claim = (await s.get('/api/claims/1')).body;
  const src = claim.sources.find((x) => x.id === 1);
  assert.ok(src.rejected_withdrawals?.length === 1, 'the source row carries the attempt');
  assert.equal(src.rejected_withdrawals[0].proposer, 'contributor', 'with the proposer');
  assert.equal(src.rejected_withdrawals[0].adjudicator, 'reviewer', 'and the adjudicator');
  assert.match(src.rejected_withdrawals[0].reason, /Punch-5 probe/, 'and the reasons');
  assert.ok(src.rejected_withdrawals[0].at, 'and the timestamp');
  const hist = (await s.get('/api/claims/1/history')).body;
  assert.ok(hist.entries.some((e) => e.kind === 'withdrawal_proposed' && e.actor === 'contributor'), 'history lists the proposal');
  assert.ok(hist.entries.some((e) => e.kind === 'withdrawal_rejected' && e.actor === 'reviewer'), 'history lists the rejection');
  // Library-scope: the event carries no claim_id — every HOLDING claim
  // still lists it (the display never forgets what the record remembers).
  await s.post('/api/sources/2/withdraw', { reason: 'Punch-5 probe: library-scope attempt.' }, 'contributor');
  await s.post('/api/sources/2/withdraw/adjudicate', { outcome: 'rejected' }, 'reviewer');
  const holder = (await s.get('/api/claims/1')).body;
  const lib = holder.sources.find((x) => x.id === 2);
  assert.ok(lib.rejected_withdrawals?.some((r) => r.scope === 'library'), 'library-scope attempt on the source row');
  const hist2 = (await s.get('/api/claims/1/history')).body;
  assert.ok(
    hist2.entries.some((e) => e.kind === 'withdrawal_rejected' && /library source #2/.test(e.detail || '')),
    'library-scope rejection in every holding claim\'s history'
  );
  manager.destroy(copy.session_id);
});

await test('F1. the entry card is doors, not teaching — and no first-run surface carries a guarantee-shaped sentence', () => {
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  // The minimal copy, verbatim facts: curated record; read-only; the
  // sandbox's private copy; the two doors (Amendment C reduced them).
  assert.match(app, /The curated record of five documented topics/);
  // Punch 2: concrete verbs, no fog — everywhere the copy is described.
  assert.match(app, /add claims, attach sources, file\s+challenges; the rules accept or refuse them, with reasons/);
  assert.ok(!/rules answer to you/.test(app), 'the fog sentence is gone from the app');
  const idxSrc = readFileSync(join(root, 'server', 'index.js'), 'utf8');
  assert.match(idxSrc, /add claims, attach sources, file challenges; the rules accept or refuse them, with reasons/);
  assert.ok(!/rules answer to you/.test(idxSrc), 'the fog sentence is gone from the refusal message');
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

await test('G1. public claim pages stay canon: no copy content, impermanence line, styled blocker-naming 404', async () => {
  const copy = await newCopy();
  const made = await sb(copy.session_id).post('/api/claims', PROBE_CLAIM, 'curator');
  assert.equal(made.status, 201);
  // A copy-only claim has no PUBLIC page — and the 404 is a styled page
  // that names the blocker, never the bare "No such claim." string.
  const missing = await fetch(`${base}/claim/${made.body.id}`);
  assert.equal(missing.status, 404);
  const missingHtml = await missing.text();
  assert.notEqual(missingHtml.trim(), 'No such claim.', 'never the bare string');
  assert.match(missingHtml, /<html/i, 'styled page');
  assert.match(missingHtml, /no public address until.*multiplayer|imported at multiplayer/i, 'the blocker is named');
  assert.match(missingHtml, /Open the record/, 'a way back');
  // The canonical page carries the impermanence line and none of the copy.
  const page = await (await fetch(`${base}/claim/1`)).text();
  assert.match(page, /temporary by design/);
  assert.match(page, /permanent claim addresses arrive with multiplayer/);
  manager.destroy(copy.session_id);
});

await test('G2 (punch 9). session claim pages: copy-only and diverged canonical claims render, honestly unshareable', async () => {
  const copy = await newCopy();
  const s = sb(copy.session_id);
  const sid = copy.session_id;
  // Diverge canonical claim 1: a rejected withdrawal (the punch's example).
  await s.post('/api/claims/1/sources/1/withdraw', { reason: 'Punch-9 probe: divergence.' }, 'contributor');
  await s.post('/api/claims/1/sources/1/withdraw/adjudicate', { outcome: 'rejected' }, 'reviewer');
  // And a copy-only claim.
  const made = await s.post('/api/claims', PROBE_CLAIM, 'curator');
  const newId = made.body.id;

  // The copy-only claim gets a session page — the standard article.
  const copyPageRes = await fetch(`${base}/sandbox/${sid}/claim/${newId}`);
  assert.equal(copyPageRes.status, 200);
  assert.equal(copyPageRes.headers.get('cache-control'), 'no-store', 'session pages are never cached');
  const copyPage = await copyPageRes.text();
  assert.ok(copyPage.includes(PROBE_CLAIM.text), 'the copy claim renders as an article');
  assert.match(copyPage, /This page renders your private copy — visible in this browser session only, not shareable/, 'the honest banner');
  assert.match(copyPage, /public address arrives when this claim is imported at multiplayer/);
  assert.ok(!/<script/i.test(copyPage), 'still a script-free document');
  // Share/OG affordances suppressed — nothing implies a usable public link.
  assert.ok(!copyPage.includes('og:title') && !copyPage.includes('twitter:card') && !copyPage.includes('rel="canonical"'), 'no share metadata on copy pages');
  assert.match(copyPage, /name="robots" content="noindex"/);
  // Internal links stay inside the session.
  assert.ok(copyPage.includes(`/sandbox/${sid}/claim/`), 'internal links are session-scoped');

  // The diverged canonical claim's SESSION page shows the copy's version…
  const diverged = await (await fetch(`${base}/sandbox/${sid}/claim/1`)).text();
  assert.match(diverged, /Punch-9 probe: divergence/, 'the visitor\'s rejected withdrawal renders on the session page');
  // …while the PUBLIC page stays canon.
  const canon = await (await fetch(`${base}/claim/1`)).text();
  assert.ok(!canon.includes('Punch-9 probe'), 'public /claim/1 stays canon');

  // Unknown id on a live session: styled, explanatory.
  const unknown = await fetch(`${base}/sandbox/${sid}/claim/999999`);
  assert.equal(unknown.status, 404);
  assert.match(await unknown.text(), /No claim #999999 in your copy/);

  // After expiry, the session page 404s (410) with the explanation and a
  // way back — copies are wiped per TTL, which is why it was never
  // shareable.
  manager.destroy(sid);
  const gone = await fetch(`${base}/sandbox/${sid}/claim/${newId}`);
  assert.equal(gone.status, 410);
  const goneHtml = await gone.text();
  assert.match(goneHtml, /private copy that no longer exists/);
  assert.match(goneHtml, /wiped after 30 idle minutes/);
  assert.match(goneHtml, /Open the record/, 'a way back');
});

await test('G3 (punch 9). the in-engine affordance routes every claim to a live page — canonical vs session', async () => {
  // The pure client routing (App passes pageHref to the panel): canonical
  // undiverged → public; copy-only or diverged → session. No dead links.
  const panel = readFileSync(join(root, 'client', 'src', 'ClaimPanel.jsx'), 'utf8');
  assert.match(panel, /pageHref\(claim\.id\)/, 'the panel asks the router, never hardcodes /claim');
  assert.match(panel, /session page ↗/, 'session pages are labeled as such');
  assert.match(panel, /not shareable/, 'the affordance says what a session link is');
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(app, /divergedIds\.has\(claimId\)/, 'diverged canonical claims route to the session page');
  assert.match(app, /claimId > canonicalMaxClaim\.current/, 'copy-only claims route to the session page');
});

await test('H10 (punch 10). preferences ride the save; resume re-prompts nothing the browser doesn\'t mandate', async () => {
  // Decoration carries the preferences block; the import validator reads
  // the record only, so a decorated save round-trips through a real import.
  const copy = await newCopy();
  const save = (await sb(copy.session_id).get('/save')).body;
  const dec = decorateSave(save, { autosaveMode: 'file', refusals: [], session: { started_at: 't', resumed_from: null } });
  assert.deepEqual(dec.preferences, { autosave_mode: 'file', setup_complete: true });
  assert.equal(validateSave(dec).claims.length, save.record.claims.length, 'decorated saves still validate');
  const imported = await req('POST', '/api/sandbox/copy', { save: dec });
  assert.equal(imported.status, 201, 'the server imports a preference-carrying save unchanged');
  // The resume plan, per browser class — the ONLY prompts are the two the
  // browser itself mandates, each with its one-line why.
  const prefs = (m) => ({ autosave_mode: m, setup_complete: true });
  assert.deepEqual(resumePlan({ preferences: prefs('download'), fsaSupported: false }), { fileMode: 'download', prompt: null, why: null }, 'non-FSA: silent restore');
  assert.deepEqual(resumePlan({ preferences: prefs('manual'), fsaSupported: false }), { fileMode: 'manual', prompt: null, why: null });
  assert.deepEqual(resumePlan({ preferences: prefs('file'), fsaSupported: true, handleStored: true, handlePermission: 'granted' }), { fileMode: 'file', prompt: null, why: null }, 'stored granted handle: silent reconnect');
  const reconnect = resumePlan({ preferences: prefs('file'), fsaSupported: true, handleStored: true, handlePermission: 'prompt' });
  assert.equal(reconnect.prompt, 'reconnect');
  assert.equal(reconnect.why, RECONNECT_WHY, 'the browser confirm carries its one-line why');
  const pickWhere = resumePlan({ preferences: prefs('file'), fsaSupported: true, handleStored: false });
  assert.equal(pickWhere.prompt, 'pick-where');
  assert.equal(pickWhere.why, PICK_WHERE_WHY, 'browsers cannot carry handles in files — said plainly');
  assert.equal(resumePlan({ preferences: prefs('file'), fsaSupported: false }).fileMode, 'manual', 'a file-mode save on a non-FSA browser degrades to manual, no dead mode');
  // v1 saves without preferences: import clean, plan = the normal setup.
  assert.equal(validateSave(save).claims.length, save.record.claims.length, 'no-preferences saves validate unchanged');
  assert.equal(resumePlan({ preferences: null }).prompt, 'full-setup');
  manager.destroy(copy.session_id);
  manager.destroy(imported.body.session_id);
});

await test('H11 (punch 11, drop-box update). the ask: drop box primary, email if-you\'d-like-a-reply, nothing automatic', () => {
  assert.match(CONTRIBUTION_ASK, /^Voluntary: contribute your save file through the anonymous drop box/);
  assert.match(CONTRIBUTION_ASK, /don't ask who you are and don't retain anything that says/);
  assert.match(CONTRIBUTION_ASK, /Prefer email, if you'd like a reply: contact@thetruthonion\.org/);
  assert.match(CONTRIBUTION_ASK, /read the file first — it's yours\.$/);
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.ok(app.includes('CONTRIBUTION_ASK'), 'shown at the save-setup prompt');
  assert.ok(app.includes('onion.ui.contribAskSeen'), 'dismissible, never repeated in-session');
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  assert.ok(readme.includes('contribute your save file through the anonymous drop box'), 'the README leads with the drop box');
  assert.match(readme, /no response is\s+guaranteed/, 'no promise beyond what is true');
  // The APP DB accepts saves ONLY as sandbox imports — the drop box lives
  // on the site origin, never here.
  const idx = readFileSync(join(root, 'server', 'index.js'), 'utf8');
  assert.ok(!/contribut|dropbox/i.test(idx), 'no contribution endpoint in the app server');
});

await test('I1 (drop box). the client: honest success/refusal/unreachable states, email fallback, anonymity copy exactly as true', async () => {
  const { sendFeedback, sendSave, DROPBOX_URL, DROPBOX_ANONYMITY_LINE, DROPBOX_UNREACHABLE_MESSAGE } = await import('../client/src/dropbox.js');
  assert.equal(DROPBOX_URL, 'https://thetruthonion.org/api/dropbox', 'the box lives on the SITE origin');
  // Success returns the receipt; the payload is exactly the kind+fields.
  let sent;
  const okFetch = async (url, opts) => {
    sent = { url, body: JSON.parse(opts.body) };
    return { ok: true, json: async () => ({ stored: true, receipt: 'a'.repeat(64) }) };
  };
  const ok = await sendFeedback({ category: 'idea', message: 'probe' }, okFetch);
  assert.equal(ok.ok, true);
  assert.equal(ok.receipt.length, 64);
  assert.deepEqual(sent.body, { kind: 'feedback', category: 'idea', message: 'probe' }, 'exactly this is sent — nothing else');
  await sendSave({ format: 'truth-onion-sandbox-save', version: 1, record: {} }, okFetch);
  assert.equal(sent.body.kind, 'save');
  // A refusal surfaces the named blocker.
  const refusedFetch = async () => ({ ok: false, status: 422, json: async () => ({ error: 'Unknown category — nope.' }) });
  const refused = await sendFeedback({ category: 'x', message: 'y' }, refusedFetch);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /Unknown category/);
  // Unreachable: said plainly, email fallback, never a fake success.
  const downFetch = async () => {
    throw new Error('network down');
  };
  const down = await sendSave({}, downFetch);
  assert.equal(down.ok, false);
  assert.equal(down.unreachable, true);
  assert.equal(down.message, DROPBOX_UNREACHABLE_MESSAGE);
  assert.match(down.message, /Nothing was sent/);
  assert.match(down.message, /contact@thetruthonion\.org/, 'email fallback named');
  // Copy review: the anonymity claim never exceeds "not asked, not retained".
  assert.equal(DROPBOX_ANONYMITY_LINE, "we don't ask who you are and don't retain anything that says");
  for (const f of ['client/src/App.jsx', 'client/src/dropbox.js', 'server/claimpages.js']) {
    const src = readFileSync(join(root, f), 'utf8');
    assert.ok(!/untraceable|invisible|cannot be traced|no one can (see|know)/i.test(src), `${f}: no anonymity claim beyond what is true`);
  }
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(app, /contribute save/, 'the contribution affordance at the save surfaces');
  assert.match(app, /download to review first/, 'read-the-file-first is an action, not just a line');
});

await test('I3 (UI fix, 2026-08-09). the main-page upload panel: a dropped/picked file becomes EXACTLY the payload — no filename, no metadata', async () => {
  const { parseSaveFileText, sendSave } = await import('../client/src/dropbox.js');
  // Parse failures name the blocker and say nothing was sent.
  const bad = parseSaveFileText('not json {');
  assert.equal(bad.ok, false);
  assert.match(bad.message, /Nothing was sent/);
  const notObj = parseSaveFileText('"a bare string"');
  assert.equal(notObj.ok, false);
  assert.match(notObj.message, /Nothing was sent/);
  // A good file: the parsed contents are the WHOLE payload — kind + save,
  // no other key, even though the UI knows the file's name and size.
  const fileText = JSON.stringify({ format: 'truth-onion-sandbox-save', version: 1, record: {} });
  const parsed = parseSaveFileText(fileText);
  assert.equal(parsed.ok, true);
  let sent;
  const capture = async (url, opts) => {
    sent = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ stored: true, receipt: 'b'.repeat(64) }) };
  };
  const out = await sendSave(parsed.save, capture);
  assert.equal(out.ok, true);
  assert.deepEqual(Object.keys(sent).sort(), ['kind', 'save'], 'payload-only: nothing rides along');
  assert.deepEqual(sent.save, JSON.parse(fileText), 'the file contents, verbatim');
  // Structurally: the parse funnel takes the file's TEXT alone — name and
  // size have no path in.
  const dropboxSrc = readFileSync(join(root, 'client', 'src', 'dropbox.js'), 'utf8');
  assert.match(dropboxSrc, /export function parseSaveFileText\(text\)/, 'text in, payload out — no file-metadata parameter');
  // The panel lives on the MAIN page, one surface with feedback (operator
  // ruling 2026-08-09), and parses through the funnel.
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(app, /contribute \/ feedback/, 'one surface: contribute your save / leave feedback');
  assert.ok(app.includes('parseSaveFileText'), 'the panel parses through the payload-only funnel');
  assert.match(app, /drop a save file here, or click to pick one/, 'drop or pick, on the main page');
});

await test('I4 (UI fix, 2026-08-09). unreachable endpoint at the panel: said plainly with the monitored email fallback — never silent, never fake', async () => {
  const { sendSave, DROPBOX_UNREACHABLE_MESSAGE, FEEDBACK_EMAIL } = await import('../client/src/dropbox.js');
  assert.equal(FEEDBACK_EMAIL, 'contact@thetruthonion.org', 'the monitored company address, everywhere it renders');
  const down = await sendSave({ format: 'truth-onion-sandbox-save', version: 1 }, async () => {
    throw new Error('network down');
  });
  assert.equal(down.ok, false);
  assert.equal(down.unreachable, true);
  assert.equal(down.message, DROPBOX_UNREACHABLE_MESSAGE);
  assert.match(down.message, /Nothing was sent/);
  assert.match(down.message, /contact@thetruthonion\.org/, 'the fallback names the address');
  // The panel renders the failure state — the message flows to the visitor,
  // never a silent failure, never a fake success.
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(app, /upState\?\.error/, 'the upload panel renders its failure state');
  assert.match(app, /upState\?\.parseError/, 'an unreadable file is named, not swallowed');
});

await test('I2 (rider C). vertical input the rules will not record is NAMED at submit; the field disables with its why', async () => {
  const copy = await newCopy();
  const s = sb(copy.session_id);
  // Neutral direction + typed magnitude: created fine, axis empty, notice named.
  const made = await s.post('/api/claims', { ...PROBE_CLAIM, text: 'Rider-C probe.', vertical: { direction: 'neutral', magnitude: 10000000, evidenced: false } }, 'curator');
  assert.equal(made.status, 201, made.body?.error);
  assert.equal(made.body.vertical.direction, 'neutral');
  assert.equal(made.body.vertical.magnitude, 0, 'placement behavior unchanged — the axis stays empty');
  assert.match(made.body.vertical_notice, /Outcome direction\/magnitude not recorded — no documented outcome evidence attached; the axis stays empty rather than guessed\./);
  // Same manners on setVertical.
  const sv = await s.post(`/api/claims/${made.body.id}/vertical`, { direction: 'neutral', magnitude: 5 }, 'curator');
  assert.equal(sv.status, 404, 'PATCH route — post helper is POST; use the api shape below');
  const svRes = await fetch(`${base}/sandbox/${copy.session_id}/api/claims/${made.body.id}/vertical`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-onion-actor': 'curator' },
    body: JSON.stringify({ direction: 'neutral', magnitude: 5 })
  });
  const svBody = await svRes.json();
  assert.equal(svRes.status, 200, svBody?.error);
  assert.match(svBody.vertical_notice, /not recorded/);
  // The directional refusals stay loud and unchanged (a weighty source
  // attached so the magnitude check itself is what answers).
  const loud = await s.post('/api/claims', {
    ...PROBE_CLAIM,
    text: 'Rider-C loud probe.',
    vertical: { direction: 'harm', magnitude: 10000000, evidenced: true },
    sources: [{ tier: 'reputable_secondary', citation: 'Rider-C loud source', relation: 'supports' }]
  }, 'curator');
  assert.equal(loud.status, 422);
  assert.match(loud.body.error, /Vertical magnitude must be 1, 2, or 3\./);
  // A clean neutral submission carries NO notice.
  const clean = await s.post('/api/claims', { ...PROBE_CLAIM, text: 'Rider-C clean probe.' }, 'curator');
  assert.equal(clean.status, 201);
  assert.equal(clean.body.vertical_notice, undefined);
  // The field disables (visible, with the why) instead of hiding — the old
  // hide let a stale typed value ride a neutral submission silently.
  const addClaim = readFileSync(join(root, 'client', 'src', 'AddClaim.jsx'), 'utf8');
  assert.match(addClaim, /disabled=\{direction === 'neutral'\}/);
  assert.match(addClaim, /Not recorded while direction is neutral — the axis stays empty rather than guessed\./);
  const appSrc = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(appSrc, /vertical_notice/, 'the notice is surfaced, non-blocking');
  manager.destroy(copy.session_id);
});

await test('H12 (punch 12). the refusals ledger: rules and client refusals land with correct source; rides the save; accumulates', async () => {
  resetRefusals();
  // A RULES refusal, recorded at the one HTTP funnel — drive the real api
  // module: first write creates the copy, then a persona gate refuses.
  const apiMod = await import('../client/src/api.js');
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => realFetch(typeof url === 'string' && url.startsWith('/') ? base + url : url, opts);
  try {
    apiMod.configureSandbox({ demo: true, sid: null, viewCanonical: false, actor: 'contributor' });
    apiMod.setSandboxActor('contributor');
    await assert.rejects(() => apiMod.api.promote(9, 'middle'), /Curator-seat machinery/);
  } finally {
    apiMod.configureSandbox({ demo: false, sid: null, viewCanonical: false, actor: 'curator' });
    globalThis.fetch = realFetch;
  }
  const rules = refusalLedger().find((r) => r.source === 'rules');
  assert.ok(rules, 'the rules refusal landed');
  assert.equal(rules.blocker_code, 'persona_standing');
  assert.equal(rules.persona, 'contributor');
  assert.match(rules.blocker_text, /Curator-seat machinery/);
  assert.deepEqual(rules.inputs_as_submitted, { target_tier: 'middle' }, 'inputs as submitted, verbatim');
  assert.ok(rules.when && rules.action && rules.target, 'when/action/target present');
  // A CLIENT-side block records with source 'client' (the scrubbed-view
  // guard calls this same recorder — pinned by source scan).
  recordRefusal({ action: 'write', target: '(scrubbed historical view)', source: 'client', blocker_code: 'historical_view_read_only', blocker_text: 'read-only view' });
  assert.ok(refusalLedger().some((r) => r.source === 'client' && r.blocker_code === 'historical_view_read_only'));
  const appSrc = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(appSrc, /source: 'client',\s*\n\s*blocker_code: 'historical_view_read_only'/, 'the scrubbed guard records');
  // The ledger rides the save and ACCUMULATES across sessions.
  const before = refusalLedger();
  const dec = decorateSave({ format: SAVE_FORMAT, version: 1, record: { events: [] } }, { refusals: before });
  assert.equal(dec.refusals.length, before.length, 'the save carries the ledger');
  resetRefusals();
  seedRefusals(dec.refusals);
  recordRefusal({ action: 'x', target: 'y', source: 'client', blocker_text: 'z' });
  assert.equal(refusalLedger().length, before.length + 1, 'import restores and accumulates');
  resetRefusals();
});

await test('H13 (punch 13). proposed-vs-landed rides the creation event and renders in history', async () => {
  const copy = await newCopy();
  const s = sb(copy.session_id);
  // The author proposed middle; the floors refuse it; the client resubmits
  // at the earned tier carrying the original proposal.
  const made = await s.post('/api/claims', { ...PROBE_CLAIM, radial_tier: 'outer', proposed_tier: 'middle' }, 'contributor');
  assert.equal(made.status, 201, made.body?.error);
  const ev = (await s.get(`/api/events?claim_id=${made.body.id}`)).body.find((e) => e.action === 'claim_created');
  const delta = JSON.parse(/(\{"proposed_tier".*\})/.exec(ev.detail)[1]);
  assert.equal(delta.proposed_tier, 'middle');
  assert.equal(delta.landed_tier, 'outer');
  assert.ok(delta.floors_failed.length > 0, 'the rules computed WHY at submit');
  assert.match(delta.floors_failed.join(' '), /source|weight|document/i, 'floors named');
  const hist = (await s.get(`/api/claims/${made.body.id}/history`)).body;
  const created = hist.entries.find((e) => e.kind === 'created');
  assert.match(created.text, /Author proposed middle; floors placed outer\./, 'rendered, house pattern of failed promotions');
  // The client sends the original proposal on override resubmits.
  const addClaim = readFileSync(join(root, 'client', 'src', 'AddClaim.jsx'), 'utf8');
  assert.match(addClaim, /proposed_tier/, 'AddClaim carries the author\'s original proposal');
  // No delta proposed → the plain detail, unchanged.
  const plain = await s.post('/api/claims', { ...PROBE_CLAIM, text: 'H13 plain probe.' }, 'contributor');
  const plainEv = (await s.get(`/api/events?claim_id=${plain.body.id}`)).body.find((e) => e.action === 'claim_created');
  assert.equal(plainEv.detail, 'placed at outer');
  manager.destroy(copy.session_id);
});

await test('H14 (punch 14). session lineage: fresh sessions null, resume names the ancestor, round-trip pinned', async () => {
  const copy = await newCopy();
  const save = (await sb(copy.session_id).get('/save')).body;
  // Fresh: the decorated save carries started_at with a null ancestor.
  const fresh = decorateSave(save, { session: { started_at: '2026-08-02T12:00:00Z', resumed_from: null } });
  assert.equal(fresh.session.resumed_from, null);
  // Resume: the ancestor is the prior save's saved_at + fingerprint —
  // stable, cheap, and content-derived.
  const fp = saveFingerprint(save);
  assert.equal(fp, saveFingerprint(save), 'fingerprint is deterministic');
  assert.match(fp, /^[0-9a-f]{8}$/);
  const resumed = decorateSave(save, {
    session: { started_at: '2026-08-02T13:00:00Z', resumed_from: { saved_at: save.saved_at, fingerprint: fp } }
  });
  assert.equal(resumed.session.resumed_from.fingerprint, fp);
  // Round-trip: the block survives validation and a real import.
  assert.ok(validateSave(resumed), 'session-carrying saves validate');
  const imported = await req('POST', '/api/sandbox/copy', { save: resumed });
  assert.equal(imported.status, 201);
  // A different record fingerprints differently.
  await sb(imported.body.session_id).post('/api/claims', { ...PROBE_CLAIM, text: 'H14 divergence.' }, 'curator');
  const save2 = (await sb(imported.body.session_id).get('/save')).body;
  assert.notEqual(saveFingerprint(save2), fp, 'the arc is distinguishable from the snapshot');
  // The App populates lineage at adoption (source pin).
  const appSrc = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(appSrc, /resumed_from: \{ saved_at: save\.saved_at \?\? null, fingerprint: saveFingerprint\(save\) \}/);
  manager.destroy(copy.session_id);
  manager.destroy(imported.body.session_id);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
manager.stop();
server.close();
canonDb.close();
process.exit(failed ? 1 : 0);
