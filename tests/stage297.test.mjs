// SPDX-License-Identifier: AGPL-3.0-only
// Stage 2.97 pressure tests: the portable parking lot. The demo store is
// device-only by structure (the server can never see a visitor's notes);
// export is versioned, readable, and round-trips losslessly; import is
// validated whole with named blockers, merges by default with content
// dedup, and can write to parking storage and nothing else.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeParkingStore,
  serializeParking,
  validateParkingText,
  mergeParking,
  flattenStructuredItem,
  hasStructure,
  resolveParkedRef,
  ParkingImportError,
  PARKING_FORMAT,
  PARKING_VERSION,
  PARKING_KEY
} from '../client/src/parking.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m
  };
};

// An api object that throws if ANYTHING on it is touched — the demo store
// must be constructed and operated without ever reaching for the server.
const poisonApi = new Proxy(
  {},
  {
    get() {
      throw new Error('the demo parking store touched the server API');
    }
  }
);

console.log('\nStage 2.97 — portable parking lot\n');

// ------------------------------------------------------------ adapter
await test('A1. the demo store NEVER touches the server — park/list/remove/bulk work with a poisoned api object', async () => {
  const storage = fakeStorage();
  const store = makeParkingStore({ demo: true, api: poisonApi, storage });
  assert.equal(store.mode, 'local');
  const note = await store.park(1, 'a visitor hunch');
  assert.ok(note.id && note.created_at);
  await store.park(2, 'note in another topic');
  assert.equal((await store.list(1)).length, 1, 'topic-scoped');
  await store.bulkAdd(1, [{ text: 'imported one' }, { text: 'imported two', topic: 'Proposed' }]);
  assert.equal((await store.list(1)).length, 3);
  await store.remove(note.id);
  assert.equal((await store.list(1)).length, 2);
  for (const k of storage._map.keys()) {
    assert.match(k, /^onion\.parking\./, `demo notes live only under onion.parking.* (found ${k})`);
  }
});

await test('A2. notes survive restarts and redeploys: a fresh store over the same device storage sees them', async () => {
  const storage = fakeStorage();
  const s1 = makeParkingStore({ demo: true, api: poisonApi, storage });
  await s1.park(1, 'written before the restart');
  // "Server restart / redeploy" = a brand-new store instance; the device
  // storage is untouched by anything server-side.
  const s2 = makeParkingStore({ demo: true, api: poisonApi, storage });
  const after = await s2.list(1);
  assert.equal(after.length, 1);
  assert.equal(after[0].text, 'written before the restart');
});

// ------------------------------------------------------------ export
await test('B1. export is versioned, pretty-printed, recognizable — and round-trips losslessly', async () => {
  const items = [
    { text: 'plain hunch', created_at: '2026-07-28T01:00:00.000Z' },
    {
      text: 'structured lead',
      created_at: '2026-07-28T01:05:00.000Z',
      topic: 'Operation Gladwell',
      claim: 'The program continued past its stated shutdown.',
      sources: [{ url: 'https://example.org/doc', title: 'Shutdown memo', why: 'names the date' }],
      reasoning: 'The memo and the budget line disagree by two years.'
    }
  ];
  const text = serializeParking(items);
  const doc = JSON.parse(text);
  assert.equal(doc.format, PARKING_FORMAT);
  assert.equal(doc.version, PARKING_VERSION);
  assert.ok(doc.exported_at);
  assert.ok(text.includes('\n  '), 'pretty-printed — a person can read their own work');
  const back = validateParkingText(text);
  assert.deepEqual(
    back.items,
    items.map((i) => ({ kind: 'note', ...i })),
    'export → import is lossless, structured fields included'
  );
});

// ------------------------------------------------------------ import validation
await test('C1. invalid files are refused whole, with the blocker NAMED', async () => {
  const cases = [
    ['{nope', /Not valid JSON/],
    ['[1,2]', /object, not an array/],
    ['{"format":"other-thing","version":1,"items":[]}', /Wrong or missing "format".*other-thing/],
    [`{"format":"${PARKING_FORMAT}","items":[]}`, /Missing "version"/],
    [`{"format":"${PARKING_FORMAT}","version":${PARKING_VERSION + 1},"items":[]}`, /version \d+.*reads up to version/],
    [`{"format":"${PARKING_FORMAT}","version":1}`, /Missing "items"/],
    [`{"format":"${PARKING_FORMAT}","version":1,"items":[{"topic":"x"}]}`, /Item 1 is missing "text"/],
    [`{"format":"${PARKING_FORMAT}","version":1,"items":[{"text":"ok","sources":"nope"}]}`, /"sources" must be an array/]
  ];
  for (const [text, re] of cases) {
    assert.throws(() => validateParkingText(text), (e) => e instanceof ParkingImportError && re.test(e.message), `expected ${re} for ${text.slice(0, 40)}`);
  }
});

await test('C2. merge is the default and dedups on CONTENT; nothing is silently coerced', async () => {
  const existing = [{ text: 'The  Memo   disagrees' }, { text: 'unique old note' }];
  const incoming = [
    { text: 'the memo disagrees' }, // same content, different spacing/case
    { text: 'a brand new lead' }
  ];
  const { fresh, duplicates } = mergeParking(existing, incoming);
  assert.equal(duplicates, 1);
  assert.deepEqual(fresh.map((f) => f.text), ['a brand new lead']);
});

await test('C3. structured items flatten to labeled text ONLY in server mode, and the module can name which', async () => {
  const item = {
    text: 'lead',
    topic: 'T',
    claim: 'C',
    sources: [{ url: 'u', title: 't', why: 'w' }],
    reasoning: 'R'
  };
  assert.equal(hasStructure(item), true);
  assert.equal(hasStructure({ text: 'plain' }), false);
  const flat = flattenStructuredItem(item);
  for (const label of ['[proposed topic]', '[claim text]', '[source]', '[reasoning]']) {
    assert.ok(flat.includes(label), `flattened text carries ${label}`);
  }
});

// ------------------------------------------------------------ only parking
await test('D1. the importer can write to parking storage and NOTHING else — by construction', async () => {
  const parking = readFileSync(join(root, 'client', 'src', 'parking.js'), 'utf8');
  // The module holds no path to any record entity: it does not even import
  // the api client, let alone creation calls.
  assert.ok(!/from '\.\/api\.js'/.test(parking), 'parking.js never imports the api client');
  // 'challenge'/'claim' appear as PARK KIND names — the pin is on record
  // CALLS: no creation or mutation function is referenced anywhere.
  for (const banned of ['createClaim', 'createTopic', 'addSource(', 'importTopic', 'addSupport', 'addKernel', '.promote(', '.demote(', '.challenge(']) {
    assert.ok(!parking.includes(banned), `parking.js references ${banned} — imports must not reach the record`);
  }
  const apiCalls = parking.match(/api\.\w+\(/g) || [];
  assert.ok(
    apiCalls.every((c) => ['api.parking(', 'api.parkNote(', 'api.deleteParkedNote('].includes(c)),
    `parking.js touches non-parking endpoints: ${apiCalls.join(', ')}`
  );
  // And the App-side import handler drives only the parking store.
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  const handler = app.slice(app.indexOf('const runImport'), app.indexOf('const exportParking'));
  assert.ok(handler.length > 100, 'import handler found');
  assert.ok(!/api\./.test(handler), 'the import handler calls no api method directly — parkingStore only');
  assert.match(handler, /parkingStore\.bulkAdd/, 'imports land through the parking adapter');
});

await test('D2. the demo store key family is device-local and reset paths cannot reach it', async () => {
  assert.match(PARKING_KEY, /^onion\.parking\./);
  for (const f of ['server/reset.js', 'scripts/build-demo.mjs']) {
    const body = readFileSync(join(root, f), 'utf8');
    assert.ok(!/onion\.parking|localStorage/.test(body), `${f} must not touch device storage`);
  }
});

// ------------------------------------------------------------ Amendment A
await test('E1. v2 parked-work entries round-trip byte-for-byte: every kind, context, draft, note', async () => {
  const entries = [
    { kind: 'note', text: 'a plain hunch', created_at: '2026-07-29T01:00:00.000Z' },
    {
      kind: 'claim-draft',
      context: { topic_id: 1, topic_name: 'MKUltra' },
      draft: {
        text: 'Draft claim — exactly  these   bytes',
        kind: 'empirical',
        layer: 'factual',
        tier: 'outer',
        reason: 'half-written reason',
        direction: 'neutral',
        magnitude: 1,
        evidenced: false,
        sources: [{ source_id: null, tier: 'primary_doc', citation: 'wip', url: '', relation: 'supports', is_claimant_self_published: false }]
      },
      note: '',
      created_at: '2026-07-29T01:01:00.000Z'
    },
    {
      kind: 'challenge',
      context: { claim_id: 9, claim_text: 'MKUltra never really ended…', form: 'challenge' },
      draft: { type: 'bad_source', outcome: 'upheld', description: 'mid-thought…', resulting_tier: '' },
      created_at: '2026-07-29T01:02:00.000Z'
    },
    {
      kind: 'source-attach',
      context: { claim_id: 3, claim_text: 'In January 1973…', form: 'source-attach' },
      draft: { tier: 'court_record', citation: 'half a citation', url: '', relation: 'supports', is_claimant_self_published: false },
      created_at: '2026-07-29T01:03:00.000Z'
    },
    {
      kind: 'claim-pointer',
      context: { claim_id: 11, claim_text: 'evolved into…' },
      note: 'come back to the kernel fan here',
      created_at: '2026-07-29T01:04:00.000Z'
    },
    {
      kind: 'topic-pointer',
      context: { topic_id: 3, topic_name: 'The Replication Crisis' },
      note: 'revisit after the preregistration audit lands',
      created_at: '2026-07-29T01:05:00.000Z'
    }
  ];
  const back = validateParkingText(serializeParking(entries));
  assert.deepEqual(back.items, entries, 'every kind survives the trip, drafts byte-for-byte');
});

await test('E2. v1 files remain readable forever: a v1 item imports as a v2 note', async () => {
  const v1 = JSON.stringify({
    format: PARKING_FORMAT,
    version: 1,
    items: [{ text: 'an old export', topic: 'Proposed Topic' }]
  });
  const back = validateParkingText(v1);
  assert.equal(back.version, 1);
  assert.equal(back.items[0].kind, 'note');
  assert.equal(back.items[0].text, 'an old export');
  assert.equal(back.items[0].topic, 'Proposed Topic', 'v1 structured carriers survive');
});

await test('E3. v2 refusals stay named: unknown kind, malformed context/draft', async () => {
  const mk = (items) => JSON.stringify({ format: PARKING_FORMAT, version: 2, items });
  assert.throws(() => validateParkingText(mk([{ kind: 'wormhole', text: 'x' }])), /unrecognized kind "wormhole"/);
  assert.throws(() => validateParkingText(mk([{ kind: 'note' }])), /note with no "text"/);
  assert.throws(() => validateParkingText(mk([{ kind: 'challenge', context: 'claim 9' }])), /"context" must be an object/);
  assert.throws(() => validateParkingText(mk([{ kind: 'challenge', draft: [1] }])), /"draft" must be an object/);
});

await test('E4. the park freezes the draft, never the world: resume resolves LIVE, dangling refs keep every word', async () => {
  const entry = {
    kind: 'challenge',
    context: { claim_id: 9, claim_text: 'the OLD text as noted at park time' },
    draft: { type: 'bad_source', outcome: 'upheld', description: 'my exact  draft   bytes' }
  };
  // The claim changed after parking — resume must surface the NEW record.
  const topics = [
    { id: 1, name: 'MKUltra', claims: [{ id: 9, text: 'the NEW, demoted text', radial_tier: 'outermost' }] }
  ];
  const res = resolveParkedRef(entry, { topics });
  assert.equal(res.resolved, true);
  assert.equal(res.liveClaim.text, 'the NEW, demoted text', 'the stored snapshot is never presented as current');
  assert.equal(res.liveClaim.radial_tier, 'outermost');
  assert.equal(res.draft.description, 'my exact  draft   bytes', 'the draft is untouched, byte-for-byte');

  // A dangling pointer degrades to a readable draft with a plain reason.
  const gone = resolveParkedRef(entry, { topics: [{ id: 1, name: 'MKUltra', claims: [] }] });
  assert.equal(gone.resolved, false);
  assert.match(gone.reason, /#9/);
  assert.match(gone.reason, /preserved in full/);
  assert.equal(gone.draft.description, 'my exact  draft   bytes', 'dangling pointers never cost the user their words');
});

await test('E5. structured entries ride the SERVER text column losslessly (envelope), plain notes stay plain', async () => {
  const rows = [];
  let nextId = 1;
  const mockApi = {
    parking: async () => rows,
    parkNote: async (topicId, text) => {
      const row = { id: nextId++, topic_id: topicId, text, created_at: 'now' };
      rows.push(row);
      return row;
    },
    deleteParkedNote: async () => ({ deleted: true })
  };
  const store = makeParkingStore({ demo: false, api: mockApi, storage: null });
  const entry = {
    kind: 'challenge',
    context: { claim_id: 9, form: 'challenge' },
    draft: { type: 'equivocation', outcome: 'rejected', description: 'server-carried draft' }
  };
  await store.parkEntry(1, entry);
  await store.park(1, 'a plain readable note');
  const listed = await store.list(1);
  const structured = listed.find((n) => n.kind === 'challenge');
  assert.deepEqual(structured.draft, entry.draft, 'envelope round-trips through the text column');
  assert.deepEqual(structured.context, entry.context);
  assert.ok(
    structured.text == null || !structured.text.includes('@parked'),
    'the raw envelope string never surfaces as the entry text'
  );
  const plain = listed.find((n) => n.kind === 'note');
  assert.equal(plain.text, 'a plain readable note');
  assert.ok(!rows.find((r) => r.text === 'a plain readable note').text.includes('@parked'), 'plain notes stay human-readable strings in the table');
});

await test('E6. every listed surface parks; resume rides the live resolver; the notepad auto-grows', async () => {
  const addClaim = readFileSync(join(root, 'client', 'src', 'AddClaim.jsx'), 'utf8');
  assert.match(addClaim, /initialDraft/, 'add-claim rehydrates a parked draft');
  assert.match(addClaim, /park this draft/, 'add-claim parks mid-draft');
  const panel = readFileSync(join(root, 'client', 'src', 'ClaimPanel.jsx'), 'utf8');
  assert.match(panel, /kind: 'challenge'/, 'challenge form parks');
  assert.match(panel, /kind: 'source-attach'/, 'source-attach form parks');
  assert.match(panel, /kind: 'claim-pointer'/, 'any claim parks as a research pointer');
  assert.match(panel, /resume\?\.nonce/, 'resume rehydrates the panel forms');
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(app, /resolveParkedRef\(entry, \{ topics \}\)/, 'resume resolves against the LIVE topics');
  assert.match(app, /noted as/, 'the listing labels the stored snippet as park-time, never current');
  const parkPane = app.slice(app.indexOf("topicTab === 'parking'"), app.indexOf('export notes'));
  assert.match(parkPane, /className="composer"/, 'the notepad input auto-grows (composer pattern)');
  // 2.97 punch list: topic park + compact labeled controls + search creation.
  assert.match(app, /kind: 'topic-pointer'/, 'the topic panel parks a topic pointer');
  const noteLabels = (app + panel).match(/note for your parking lot \(optional\)/g) || [];
  assert.ok(noteLabels.length >= 2, 'park note fields are labeled unambiguously, everywhere');
  assert.match(app, /className="park-inline"/, 'park controls are compact inline actions');
  assert.match(panel, /note for your parking lot \(optional\)/, 'the claim-pointer note is labeled too');
  const searchBox = readFileSync(join(root, 'client', 'src', 'SearchBox.jsx'), 'utf8');
  assert.match(searchBox, /search or add topics & claims/i, 'the search bar says it owns creation');
  assert.match(searchBox, /\+ add claim/, 'add-claim lives in the search dropdown');
  assert.match(searchBox, /Open a topic first/, 'the no-topic case refuses with a plain reason');
});

await test('E7. record add/remove asks first: one confirm layer over every entity mutation, after the frozen guard', async () => {
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(app, /opts\.confirm && !opts\._confirmed/, 'run() carries the confirm layer');
  assert.match(app, /confirm-bar/, 'the confirm bar renders inline');
  // The frozen (time-scrubbed) refusal must run BEFORE the confirm — a
  // confirm must never precede (or soften) the read-only refusal.
  const runBody = app.slice(app.indexOf('const run = async'), app.indexOf('setBusy(true)'));
  assert.ok(
    runBody.indexOf('writeBlockedReason') < runBody.indexOf('opts.confirm'),
    'frozen guard precedes the confirm'
  );
  assert.match(app, /askConfirm\(`Create the topic/, 'topic creation confirms');
  assert.match(app, /Delete this parked/, 'parked-entry deletion confirms');
  // 2.98b: the four direct delete sites became two RECORDED flows — source
  // withdrawal (reason + confirm) and link challenges (reason + confirm) —
  // so the panel carries 6 confirm sites: attach-library, attach-new,
  // add-support, add-kernel, withdraw, link-challenge.
  const panel = readFileSync(join(root, 'client', 'src', 'ClaimPanel.jsx'), 'utf8');
  const confirms = panel.match(/\{ confirm: /g) || [];
  assert.ok(confirms.length >= 6, `all add/remove sites confirm (found ${confirms.length}/6)`);
  assert.ok(!panel.includes('api.deleteSource') && !panel.includes('api.removeSupport') && !panel.includes('api.removeKernel'), 'no direct delete calls remain');
  const addClaim = readFileSync(join(root, 'client', 'src', 'AddClaim.jsx'), 'utf8');
  assert.match(addClaim, /askConfirm\(\s*`Submit this claim/, 'claim submission confirms');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
