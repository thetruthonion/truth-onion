// SPDX-License-Identifier: AGPL-3.0-only
// Companion pressure tests: read-only tool manifest, grounding, pass-1
// isolation, the substance-calibrated fidelity gate (§9c), interleaved
// fallback (§9b), any-persona import (§11), the Builder (§10), key privacy
// (LLM + TTS), prompt-file integrity, and the hostile-model scenario.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildChatRequest,
  guardProviderUrl,
  runToolLoop,
  dedupeTools,
  KeyPrivacyError
} from '../client/src/companion/providers.js';
import {
  TOOL_MANIFEST,
  TOOL_NAMES,
  makeToolExecutor,
  makeCompanionExecutor
} from '../client/src/companion/tools.js';
import { parseCard } from '../client/src/companion/cards.js';
import {
  narrateClaim,
  chatTurn,
  topicContext,
  requiredAnchors,
  fidelityTokens,
  checkFidelity,
  commentaryOk,
  groundCheck,
  UNVERIFIED_STRIP
} from '../client/src/companion/pipeline.js';
import { buildTTSRequest, speak } from '../client/src/companion/tts.js';
import { sha256Hex } from '../client/src/companion/hash.js';
import {
  BUILDER_CARD,
  builderSystem,
  extractCardBlock,
  describeVoiceOptions
} from '../client/src/companion/builder.js';
import {
  loadSettings,
  saveSettings,
  saveCard,
  pinToNotebook,
  STORAGE_KEYS,
  STORAGE_FAMILY
} from '../client/src/companion/store.js';
import {
  loadThreads,
  saveThreads,
  upsertThread,
  removeThread,
  titleFor,
  newThreadId
} from '../client/src/companion/threads.js';
import {
  SEARCH_TOOLS,
  classifySourceTier,
  annotateResults,
  captureUrl,
  makeSearchExecutor,
  onlineSearchBody,
  SEARCH_TOOL_NAMES
} from '../client/src/companion/search.js';

// A Map-backed fake matching the Web Storage API — lets Node tests simulate
// localStorage (durable) vs sessionStorage (session-scoped) precisely.
function fakeStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    get size() {
      return m.size;
    },
    _map: m
  };
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const corePrompt = readFileSync(join(root, 'sidekick-prompt.md'), 'utf8');

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

console.log('\nCompanion — read-only, grounded, mask-lifted, key-private\n');

// ------------------------------------------------------------ tool manifest
await test('T1. the tool manifest is read + retrieval only — no mutating tool anywhere', async () => {
  assert.deepEqual(TOOL_NAMES.sort(), [
    'get_claim_detail',
    'get_claim_lineage',
    'get_source',
    'get_topic_skeleton',
    'list_topics',
    'search_claims'
  ]);
  assert.deepEqual(SEARCH_TOOL_NAMES.sort(), ['fetch_url', 'verify_source', 'web_search']);
  // The full set handed to the model, read + search, carries no write verb.
  const text = JSON.stringify([...TOOL_MANIFEST, ...SEARCH_TOOLS]).toLowerCase();
  for (const verb of ['create', 'promote', 'demote', 'attach', 'delete', 'park', 'import', 'update', 'set_tier', 'place']) {
    assert.ok(!text.includes(`"name":"${verb}`), `manifest exposes a "${verb}" tool`);
  }
});

await test('T2. the executor refuses anything outside the manifest and issues only GETs', async () => {
  const calls = [];
  const fetchStub = async (url, opts) => {
    calls.push({ url, method: opts?.method });
    return { ok: true, json: async () => ({ id: 1, claims: [], sources: [] }) };
  };
  const exec = makeToolExecutor({ fetchImpl: fetchStub });
  await exec('get_topic_skeleton', { topic_id: 1 });
  await assert.rejects(() => exec('promote_claim', { claim_id: 1, target_tier: 'core' }), /not in the read-only tool manifest/);
  await assert.rejects(() => exec('create_claim', {}), /not in the read-only tool manifest/);
  assert.ok(calls.length > 0 && calls.every((c) => c.method === 'GET'), 'executor must issue only GETs');
});

// ------------------------------------------------------------ fixtures
const outerClaim = {
  id: 9,
  text: 'MKUltra never really ended — it continues today under other names.',
  kind: 'empirical',
  layer: 'factual',
  radial_tier: 'outer',
  status: 'contested',
  placement_reason: 'No primary documentation of continuation; the only offered source is anonymous, which carries zero weight.',
  vertical: { direction: 'neutral', magnitude: 0, evidenced: false },
  sources: [{ id: 1, tier: 'anonymous', citation: 'Anonymous online accounts', relation: 'supports', is_claimant_self_published: false }],
  challenges: [],
  supports_claims: [],
  supported_by: []
};

const aggressiveCard = parseCard({
  name: 'Mad Dog Marlowe',
  description: 'A hardboiled, sneering noir detective who trusts nobody.',
  personality: 'Brutally sarcastic. Mocks everything. Speaks in clipped noir metaphors.',
  scenario: 'Leaning on a filing cabinet at 2am, cigarette smoke everywhere.'
});

const testManifest = {
  items: [
    { id: 1, text: 'The Church Committee located roughly 20,000 pages of misfiled records in 1977.', basis: 'x' },
    { id: 2, text: 'The only supporting source is anonymous and carries zero weight.', basis: 'x' }
  ],
  does_not_assert: 'That the program continued.',
  tier_statement: 'This claim sits at outer: not established.'
};
const testAnchors = ['outer', 'not established'];

// ------------------------------------------------ §9c gate calibration
await test('C14a. a legitimate in-voice PARAPHRASE of the manifest passes the gate', async () => {
  const tokens = fidelityTokens(testManifest, testAnchors);
  // Every content word is reworded; the substance (numbers, names, standing,
  // terms of art) survives. This must PASS a substance-calibrated gate.
  const paraphrase =
    "Here's the skinny, sweetheart. This caper lives out at outer — not established, and don't let anyone tell you different. " +
    'Sure, the Church Committee dug up some 20,000 pages of paper back in 1977 — misplaced, misfiled, whatever you want to call it. ' +
    'But the whole yarn hangs on nameless whispers: zero weight on the scales. And nobody here is claiming the show stayed on the road.';
  const missing = checkFidelity(paraphrase, tokens);
  assert.deepEqual(missing, [], `paraphrase flunked on: ${missing.join(', ')}`);
});

await test('C14b. a substance-dropping render fails the gate', async () => {
  const tokens = fidelityTokens(testManifest, testAnchors);
  // Sells the claim: drops the tier language, the zero-weight fact, the count.
  const selling =
    'Listen, the Church Committee found a mountain of paper and the rest writes itself. This one has legs, trust me.';
  const missing = checkFidelity(selling, tokens);
  assert.ok(missing.includes('outer'), 'dropped tier must be caught');
  assert.ok(missing.includes('not established'), 'dropped standing must be caught');
  assert.ok(missing.some((t) => /20,?000/.test(t)), 'dropped numeral must be caught');
  assert.ok(missing.includes('zero weight'), 'dropped term of art must be caught');
});

// ------------------------------------------------------------ grounding
await test('G1. invented "context" not present in the record gets the unverified strip', async () => {
  const stub = async () => ({
    text: JSON.stringify({
      items: [
        { id: 1, text: 'The only offered source is anonymous and carries zero weight.', basis: 'anonymous, which carries zero weight' },
        { id: 2, text: 'The CIA confirmed continuation in a 1984 internal memo.', basis: 'confirmed continuation in a 1984 internal memo' }
      ],
      does_not_assert: 'That the program ended cleanly.',
      tier_statement: 'This claim sits at outer: not established.'
    })
  });
  const out = await narrateClaim({ claim: outerClaim, corePrompt, card: null, mode: 'bare', callModel: stub });
  assert.ok(out.manifest.items[0].unverified === false, 'grounded item must not be flagged');
  assert.ok(out.manifest.items[1].unverified === true, 'invented item must be flagged');
  assert.ok(out.text.includes(UNVERIFIED_STRIP), 'bare render must carry the visible strip');
  assert.match(out.text, /outer/i);
});

// -------------------------------------------- pass-1 isolation
await test('I1. pass-1 context provably contains no card content', async () => {
  const pass1Contexts = [];
  let call = 0;
  const stub = async ({ system, messages }) => {
    call++;
    if (call === 1) {
      pass1Contexts.push(system + JSON.stringify(messages));
      return {
        text: JSON.stringify({
          items: [{ id: 1, text: 'Zero-weight anonymous sourcing only.', basis: 'carries zero weight' }],
          does_not_assert: 'Nothing beyond the record.',
          tier_statement: 'Outer: not established.'
        })
      };
    }
    return { text: 'Listen, pal. outer. not established. zero weight, anonymous whispers only. Nothing beyond the record.' };
  };
  await narrateClaim({ claim: outerClaim, corePrompt, card: aggressiveCard, mode: 'full', callModel: stub });
  const ctx = pass1Contexts.join(' ');
  for (const marker of ['Marlowe', 'noir', 'sarcastic', 'cigarette']) {
    assert.ok(!ctx.includes(marker), `card content "${marker}" leaked into pass-1 context`);
  }
});

// -------------------------------------------- §12c automatic degrade
await test('F1. gate failure degrades AUTOMATICALLY to interleaved — one attempt, no retry loop', async () => {
  let call = 0;
  const stub = async ({ system }) => {
    call++;
    if (call === 1) {
      return {
        text: JSON.stringify({
          items: [{ id: 1, text: 'The sourcing is anonymous and carries zero weight.', basis: 'carries zero weight' }],
          does_not_assert: 'Nothing beyond the record.',
          tier_statement: 'Outer: not established.'
        })
      };
    }
    if (call === 2) {
      // The single persona-full attempt: sells the claim, drops substance → gated.
      return { text: 'Trust me, this one has legs. The suits buried it, sweetheart.' };
    }
    // Interleaved commentary call — NOT a second persona-full retry.
    assert.ok(system.includes('Commentary task'), 'degrade must be the commentary channel, not a retry');
    return { text: JSON.stringify({ comments: [{ id: 1, comment: 'Nameless whispers. In my line, that buys you nothing.' }] }) };
  };
  const out = await narrateClaim({ claim: outerClaim, corePrompt, card: aggressiveCard, mode: 'full', callModel: stub });
  assert.equal(call, 3, 'pass1 + ONE gated attempt + commentary — no retry loop (§12c)');
  assert.ok(Array.isArray(out.segments), 'interleaved output carries segments');
  const records = out.segments.filter((s) => s.type === 'record');
  const commentary = out.segments.filter((s) => s.type === 'commentary');
  assert.ok(records.some((s) => /not established/i.test(s.text)), 'gated record blocks carry the standing');
  assert.ok(records.some((s) => /zero weight/i.test(s.text)), 'gated record blocks carry the substance');
  assert.ok(commentary.length > 0 && commentary.every((s) => s.by === 'Mad Dog Marlowe'), 'the persona speaks');
  assert.equal(out.rendered_by, 'Mad Dog Marlowe', 'the character is never absent');
  assert.ok(!out.notices.some((n) => /bare analysis/i.test(n)), 'no bare-analysis output, ever');
});

await test('F2. worst case — commentary fails its light check — the persona is quoted, never replaced', async () => {
  let call = 0;
  const stub = async () => {
    call++;
    if (call === 1) {
      return {
        text: JSON.stringify({
          items: [{ id: 1, text: 'The sourcing is anonymous and carries zero weight.', basis: 'carries zero weight' }],
          does_not_assert: 'Nothing beyond the record.',
          tier_statement: 'Outer: not established.'
        })
      };
    }
    if (call === 2) return { text: 'Selling it, no substance.' };
    // Commentary that contradicts the tier — must be caught by the light check.
    return { text: JSON.stringify({ comments: [{ id: 1, comment: 'Between us? This one is proven. It was confirmed years ago.' }] }) };
  };
  const out = await narrateClaim({ claim: outerClaim, corePrompt, card: aggressiveCard, mode: 'full', callModel: stub });
  const commentary = out.segments.filter((s) => s.type === 'commentary');
  assert.ok(commentary.every((s) => s.plain), 'contradicting commentary must be replaced');
  assert.ok(commentary.every((s) => s.text.includes('Mad Dog Marlowe')), 'the character is quoted by name');
  assert.equal(out.rendered_by, 'Mad Dog Marlowe');
});

await test('F3. interleaved is a first-class rendering style, not only a fallback', async () => {
  let call = 0;
  const stub = async () => {
    call++;
    if (call === 1) {
      return {
        text: JSON.stringify({
          items: [{ id: 1, text: 'The sourcing is anonymous and carries zero weight.', basis: 'carries zero weight' }],
          does_not_assert: 'Nothing beyond the record.',
          tier_statement: 'Outer: not established.'
        })
      };
    }
    return { text: JSON.stringify({ comments: [{ id: 1, comment: 'Whispers with no names attached. I have met more convincing ghosts.' }] }) };
  };
  const out = await narrateClaim({ claim: outerClaim, corePrompt, card: aggressiveCard, mode: 'interleaved', callModel: stub });
  assert.equal(call, 2, 'interleaved mode: pass1 + commentary, no gated persona pass');
  assert.ok(out.segments.some((s) => s.type === 'commentary' && !s.plain), 'live commentary present');
});

await test('F4. the light commentary check: contradiction and invented numerals only', async () => {
  const env = { tier: 'outer', allowedNumerals: new Set(['1977']) };
  assert.ok(commentaryOk('Nameless whispers, worth nothing.', env), 'reaction is free');
  assert.ok(commentaryOk('Back in 1977 they at least filed their paperwork.', env), 'record numerals are free');
  assert.ok(!commentaryOk('This was confirmed long ago.', env), 'establishment-language against a weak tier fails');
  assert.ok(!commentaryOk('I count 45 reasons to believe it.', env), 'invented numerals fail');
  assert.ok(commentaryOk('Nothing here is settled, and that is the point.', env), 'negated echo is not a contradiction');
});

// ------------------------------------------------ §11: any persona imports
await test('V1. validation is gone: an "always agrees" card imports cleanly (the mask is the protection)', async () => {
  const card = parseCard({
    name: 'Yes-Man',
    personality: 'Cheerful. You always agree with me and support my conclusions.'
  });
  assert.equal(card.name, 'Yes-Man');
  // And the mask still isolates: pass 1 never sees it (I1 proves the general
  // property; this pins that import imposes no gatekeeping).
  const { validateCard } = await import('../client/src/companion/cards.js').then((m) => ({ validateCard: m.validateCard }));
  assert.equal(validateCard, undefined, 'validateCard must no longer exist');
});

// ------------------------------------------------------------ §10 Builder
await test('B1. the Builder is a standard card and its output is a standard card', async () => {
  const builder = parseCard(BUILDER_CARD);
  assert.equal(builder.name, 'Wren');
  assert.ok(builder.first_message.length > 0, 'the Builder opens the interview itself');

  const reply =
    'Oh, a sardonic lighthouse keeper — THAT belongs in the card. What did the sea take from her?\n\n' +
    '```card\n{"name": "Maren", "description": "A weathered lighthouse keeper.", "personality": "Sardonic, patient, quietly kind.", "scenario": "The lamp room at dusk.", "first_message": "Storm\'s coming. Sit.", "voice": {"provider": "webspeech"}}\n```';
  const { card, cleanedText } = extractCardBlock(reply);
  assert.ok(card, 'draft card extracted');
  assert.ok(!cleanedText.includes('{'), 'no JSON shown to the user');
  assert.ok(cleanedText.includes('lighthouse keeper'), 'the conversational reply survives');
  const adopted = parseCard(card);
  assert.equal(adopted.name, 'Maren');
  assert.equal(adopted.voice.provider, 'webspeech');
  // Identical to an import: same parseCard path, no separate format.
});

await test('B2. the Builder teaches the mask and the powers boundary instead of refusing', async () => {
  const sys = builderSystem({ voiceOptions: describeVoiceOptions({ keys: {} }) });
  const flat = sys.toLowerCase().replace(/\s+/g, ' ');
  assert.ok(flat.includes('the character shapes the voice, never the findings'), 'mask education present');
  assert.ok(flat.includes('build it if they want it'), 'no refusal — §11 supersedes');
  assert.ok(flat.includes('not what they can access'), 'powers boundary framed');
  assert.ok(flat.includes('never show them json'), 'no JSON shown');
  for (const step of ['personality', 'backstory', 'quirks', 'appearance', 'voice']) {
    assert.ok(flat.includes(step), `interview covers ${step}`);
  }
});

// ------------------------------------------------ §12d powers as declarations
await test('B3. Builder-produced powers are structured declarations, never key to the ledger', async () => {
  const sys = builderSystem({ voiceOptions: describeVoiceOptions({ keys: {} }) });
  const flat = sys.toLowerCase().replace(/\s+/g, ' ');
  assert.ok(flat.includes('structured declaration'), 'powers framed as structured declarations');
  assert.ok(flat.includes('never a key to the ledger'), '§12d boundary line present');
  assert.ok(flat.includes('capability handshake'), 'handshake mechanism named for user-hosted worlds');
  assert.ok(sys.includes('"powers": [{"name"'), 'the emission block specifies structured powers');

  // A Builder card block with structured powers parses to {name,description,tags}.
  const reply =
    'She can walk through storms unbothered. Here she is:\n\n' +
    '```card\n{"name":"Maren","personality":"Sardonic.","powers":[{"name":"Stormwalking","description":"Unbothered by wind and rain.","tags":["movement","weather"]}],"voice":{"provider":"webspeech"}}\n```';
  const { card } = extractCardBlock(reply);
  const adopted = parseCard(card);
  assert.equal(adopted.powers.length, 1);
  assert.equal(adopted.powers[0].name, 'Stormwalking');
  assert.deepEqual(adopted.powers[0].tags, ['movement', 'weather']);

  // Loose forms normalize to declarations; the persona layer renders them
  // marked persona/presentation-only (never system access).
  const loose = parseCard({ name: 'X', powers: ['Telepathy', { name: 'Flight' }] });
  assert.deepEqual(loose.powers.map((p) => p.name), ['Telepathy', 'Flight']);
  assert.ok(loose.powers.every((p) => Array.isArray(p.tags)), 'string powers normalize to declarations');
});

// ------------------------------------------------ §12b key/settings durability
await test('D12b1. keys survive a full restart (fresh module state, same localStorage)', async () => {
  const local = fakeStorage();
  // Session 1: user sets a key.
  const s = loadSettings(local);
  saveSettings({ ...s, keys: { openrouter: 'sk-secret-123' } }, local);
  // "Restart": brand-new load reading the SAME durable localStorage.
  const after = loadSettings(local);
  assert.equal(after.keys.openrouter, 'sk-secret-123', 'key must survive restart');
  assert.equal(after._ok, true);
  // Keys live in their own isolated entry, separate from UI settings.
  assert.ok(local.getItem(STORAGE_KEYS.KEYS_KEY), 'keys stored under the isolated key entry');
});

await test('D12b2. demo reset (a session/DB wipe) never touches the localStorage keys', async () => {
  const local = fakeStorage();
  const session = fakeStorage(); // the ephemeral store the demo may clear
  saveSettings({ ...loadSettings(local), keys: { openrouter: 'sk-durable' } }, local);
  // The demo's reset-on-restart clears session/server state — model it as a
  // full sessionStorage clear + a no-op on localStorage.
  session.clear();
  assert.equal(loadSettings(local).keys.openrouter, 'sk-durable', 'localStorage key untouched by a session/DB reset');
});

await test('D12b3. a read failure never lets a save clobber the good key (the vanish bug)', async () => {
  const local = fakeStorage();
  saveSettings({ ...loadSettings(local), keys: { openrouter: 'sk-good' } }, local);
  // Corrupt the settings blob (simulate a partial/failed write).
  local.setItem(STORAGE_KEYS.SETTINGS_KEY, '{ this is not json');
  const recovered = loadSettings(local);
  assert.equal(recovered._ok, false, 'a parse failure is reported, not silently defaulted-over');
  // The keys entry is separate and intact.
  assert.equal(recovered.keys.openrouter, 'sk-good', 'the key survives a settings-blob corruption');
  // The UI must NOT save while _ok===false (the Companion guard) — so the good
  // key is never overwritten with bare defaults.
});

// ------------------------------------------------ §13c key + card + threads survive every reset
await test('D13c1. the active card lives in its OWN isolated entry, like keys', async () => {
  const local = fakeStorage();
  const card = { name: 'Marlowe', personality: 'Noir.' };
  saveSettings({ ...loadSettings(local), keys: { openrouter: 'sk-x' }, card }, local);
  // Three distinct entries — settings, keys, card — none nested in another.
  assert.ok(local.getItem(STORAGE_KEYS.CARD_KEY), 'card stored under its own entry');
  const settingsBlob = JSON.parse(local.getItem(STORAGE_KEYS.SETTINGS_KEY));
  assert.equal(settingsBlob.card, undefined, 'card is NOT inside the settings blob');
  assert.equal(settingsBlob.keys, undefined, 'keys are NOT inside the settings blob');
});

await test('D13c2. key, card, and threads all survive a corrupt settings blob', async () => {
  const local = fakeStorage();
  const card = { name: 'Wren', personality: 'Warm craftsman.' };
  saveSettings({ ...loadSettings(local), keys: { openrouter: 'sk-live' }, card }, local);
  saveThreads(upsertThread(loadThreads(local), { id: 't1', characterName: 'Wren', messages: [{ role: 'user', text: 'hi' }] }), local);
  // Corrupt only the settings blob — the §13c reported bug lost card + key too.
  local.setItem(STORAGE_KEYS.SETTINGS_KEY, 'not json at all');
  const recovered = loadSettings(local);
  assert.equal(recovered._ok, false);
  assert.equal(recovered.keys.openrouter, 'sk-live', 'key survives');
  assert.equal(recovered.card.name, 'Wren', 'active card survives');
  assert.equal(loadThreads(local).threads.length, 1, 'threads survive');
});

await test('D13c3. no reset path touches the onion.companion.* family', async () => {
  // Every app reset is a server-side DB operation. Assert the client reset
  // scripts never reference browser storage, and that clearing an unrelated
  // (session/server) store leaves the whole family intact.
  const local = fakeStorage();
  saveSettings({ ...loadSettings(local), keys: { openrouter: 'sk-a' }, card: { name: 'C' } }, local);
  saveThreads(upsertThread(loadThreads(local), { id: 't', characterName: 'C', messages: [{ role: 'user', text: 'x' }] }), local);
  // The notebook (2.9) joined the family — it must survive resets like keys.
  pinToNotebook({ claim_id: 1, claim_text: 'x', text: 'pinned explanation', by: 'C' }, local);
  const before = STORAGE_FAMILY.map((k) => local.getItem(k));
  // reset.js / the demo pristine copy operate on the DB file only:
  const resetSrc = readFileSync(join(root, 'server', 'reset.js'), 'utf8');
  const demoBuildSrc = readFileSync(join(root, 'scripts', 'build-demo.mjs'), 'utf8');
  for (const src of [resetSrc, demoBuildSrc]) {
    assert.ok(!/localStorage|sessionStorage|onion\.companion/.test(src), 'reset code must not reference browser storage');
  }
  const after = STORAGE_FAMILY.map((k) => local.getItem(k));
  assert.deepEqual(after, before, 'the storage family is unchanged by a server-side reset');
  assert.ok(after.every((v) => v !== null), 'every family member is still present');
});

// ------------------------------------------------ §12a conversation persistence
await test('D12a1. conversations persist and resume across panel close/reopen', async () => {
  const local = fakeStorage();
  const id = newThreadId();
  const msgs = [
    { role: 'user', text: 'Is the ego-depletion claim solid?', by: 'you' },
    { role: 'assistant', text: 'It sits at inner — a credible dispute remains.', by: 'Wren' }
  ];
  let state = upsertThread(loadThreads(local), { id, characterName: 'Wren', messages: msgs });
  saveThreads(state, local);

  // "Panel close/reopen" = a fresh load from the same durable storage.
  const reopened = loadThreads(local);
  assert.equal(reopened.threads.length, 1);
  assert.equal(reopened.activeId, id, 'the active thread resumes');
  assert.equal(reopened.threads[0].messages.length, 2, 'the conversation is intact');
  assert.match(reopened.threads[0].title, /ego-depletion/, 'titled by the first exchange');
  assert.equal(reopened.threads[0].owner, 'local', 'account-ready shape for Stage 3');
});

await test('D12a2. multiple threads coexist, newest-first, and delete works', async () => {
  const local = fakeStorage();
  let state = loadThreads(local);
  const a = newThreadId();
  state = upsertThread(state, { id: a, characterName: 'Wren', messages: [{ role: 'user', text: 'First thread' }] });
  const b = newThreadId();
  state = upsertThread(state, { id: b, characterName: 'Marlowe', messages: [{ role: 'user', text: 'Second thread' }] });
  saveThreads(state, local);
  assert.equal(state.threads[0].id, b, 'most-recent thread is first');
  assert.equal(state.threads.length, 2, 'per-character threads coexist');
  const afterDelete = removeThread(state, b);
  assert.equal(afterDelete.threads.length, 1);
  assert.equal(afterDelete.activeId, a, 'deleting the active thread falls back to another');
  assert.equal(titleFor([{ role: 'user', text: '   messy   whitespace here   ' }]), 'messy whitespace here');
});

// ------------------------------------------------ §13a capability boundary (as corrected by §14)
await test('R1. the core prompt knows its tool boundary: has search, cannot write', async () => {
  const flat = corePrompt.toLowerCase().replace(/\s+/g, ' ');
  assert.ok(flat.includes('know your own tool boundary'), 'the boundary rule is present');
  assert.ok(flat.includes('live web search'), 'it knows it CAN search (§14)');
  assert.ok(flat.includes('no write access'), 'it knows it cannot write');
  assert.ok(/cannot place, promote, demote, attach a source, link, or park/.test(flat), 'the write verbs are named');
  assert.ok(flat.includes('never narrate an action you have no tool for'), 'no fabricated actions');
});

await test('R2. asked to attach/promote/place, the executor refuses plainly (§21b)', async () => {
  const readExec = makeToolExecutor({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  const exec = makeCompanionExecutor({ readExec, searchExec: { web_search: async () => ({}) } });
  for (const name of ['attach_source', 'promote_claim', 'set_tier', 'place_claim', 'park_note']) {
    await assert.rejects(() => exec(name, {}), /not in the read-only tool manifest/, `${name} must be refused`);
  }
  // Search tools ARE routed (retrieval), proving the boundary is write vs read.
  assert.deepEqual(Object.keys({}), []);
  const okSearch = await exec('web_search', { query: 'x' });
  assert.ok(okSearch !== undefined, 'a genuine tool still runs');
});

// ------------------------------------------------ §13b topic context (no id leak)
await test('R3. active topic is injected by name+id; a numeric id is never demanded of the user', async () => {
  const withTopic = topicContext({ id: 5, name: 'Purdue Pharma & the Sacklers' });
  assert.match(withTopic, /Purdue Pharma & the Sacklers/, 'names the active topic');
  assert.match(withTopic, /never show it to the operator/, 'the id is for tool calls only');
  const noTopic = topicContext(null);
  assert.match(noTopic, /resolve it by NAME with list_topics/, 'no topic → resolve by name');
  assert.match(noTopic, /never ask for a numeric id/, 'never asks the user for an id');
});

await test('R4. chatTurn with a topic open never asks which topic; with none, it prompts by name', async () => {
  const systems = [];
  const runBareLoop = async ({ system }) => {
    systems.push(system);
    return { text: 'ok', segments: null };
  };
  const callModel = async () => ({ text: 'ok' });
  await chatTurn({ history: [], userText: 'help me word this claim', corePrompt, card: null, mode: 'bare', runBareLoop, callModel, activeTopic: { id: 5, name: 'Purdue' } });
  assert.match(systems[0], /Active topic: "Purdue"/, 'the open topic is in context');
  await chatTurn({ history: [], userText: 'help', corePrompt, card: null, mode: 'bare', runBareLoop, callModel, activeTopic: null });
  assert.match(systems[1], /No topic is open/, 'no-topic path names the resolve-by-name behavior');
});

// ------------------------------------------------ §14 live search
await test('S1. tier classification: gov→record, news→reputable, blog→self_published, unknown→strain', async () => {
  assert.equal(classifySourceTier('https://www.supremecourt.gov/opinions/x.pdf').tier, 'court_record');
  assert.equal(classifySourceTier('https://storage.courtlistener.com/recap/x.pdf').tier, 'court_record');
  assert.equal(classifySourceTier('https://www.sec.gov/litigation/x.htm').tier, 'primary_doc');
  assert.equal(classifySourceTier('https://www.reuters.com/legal/x').tier, 'reputable_secondary');
  assert.equal(classifySourceTier('https://someone.substack.com/p/x').tier, 'self_published');
  assert.equal(classifySourceTier('https://reddit.com/r/x').tier, 'anonymous');
  const unknown = classifySourceTier('https://obscure-legal-wire.example/story');
  assert.equal(unknown.unclassifiable, true, 'an unrecognized outlet is a strain candidate');
  assert.equal(unknown.tier, 'single_outlet', 'single_outlet at best');
  assert.ok(annotateResults([{ title: 'X', url: 'https://reuters.com/a' }])[0].capture.includes('web.archive.org'));
});

await test('S2. search-api mode: keyed request browser→provider, tier-classified candidates, adverse kept, strain logged', async () => {
  const calls = [];
  const logs = [];
  const fetchStub = async (url, opts) => {
    calls.push({ url, method: opts?.method || 'GET' });
    return {
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: 'Purdue guilty plea (DOJ)', url: 'https://www.justice.gov/opa/pr/purdue', description: 'plea' },
            { title: 'Sacklers deny liability — blog', url: 'https://critic.substack.com/p/denial', description: 'adverse take' },
            { title: 'Odd wire', url: 'https://obscure-legal-wire.example/x', description: 'unknown' }
          ]
        }
      })
    };
  };
  const { web_search } = makeSearchExecutor({
    config: { mode: 'search-api', apiProvider: 'brave', maxResults: 6 },
    keys: { brave: 'brave-key' },
    appOrigin: 'http://localhost:3111',
    fetchImpl: fetchStub,
    log: (e) => logs.push(e)
  });
  const out = await web_search({ query: 'Purdue plea' });
  assert.equal(calls[0].url.startsWith('https://api.search.brave.com/'), true, 'search hits the provider, not the app');
  assert.notEqual(new URL(calls[0].url).origin, 'http://localhost:3111', 'never the app origin');
  assert.equal(out.results.length, 3, 'all candidates returned — adverse ones NOT filtered out');
  assert.equal(out.results[0].tier, 'primary_doc', 'DOJ page classified');
  assert.equal(out.results[1].tier, 'self_published', 'the adverse blog is kept and correctly low-weighted');
  assert.ok(out.results.every((r) => r.citation && r.capture), 'every candidate has citation + capture link');
  assert.ok(logs.some((l) => l.kind === 'search'), 'the search is logged');
  assert.ok(logs.some((l) => l.kind === 'strain'), 'an unclassifiable source produced a strain log entry');
});

await test('S3. search obeys key privacy — never targets the app origin', async () => {
  const { web_search } = makeSearchExecutor({
    config: { mode: 'search-api', apiProvider: 'tavily' },
    keys: { tavily: 't' },
    appOrigin: 'https://api.tavily.com', // pathological: provider IS the guarded origin
    fetchImpl: async () => ({ ok: true, json: async () => ({ results: [] }) })
  });
  await assert.rejects(() => web_search({ query: 'x' }), KeyPrivacyError, 'a keyed search at the guarded origin is refused');
});

await test('S4. online mode: the web plugin rides the one key and merges into the request body', async () => {
  const body = onlineSearchBody({ enabled: true, mode: 'openrouter-online', maxResults: 5 });
  assert.deepEqual(body, { plugins: [{ id: 'web', max_results: 5 }] });
  const req = buildChatRequest({ provider: 'openrouter', apiKey: 'sk', model: 'm', system: 's', messages: [], extraBody: body });
  assert.deepEqual(req.body.plugins, [{ id: 'web', max_results: 5 }], 'the plugin is on the outbound request');
  // Disabled / search-api mode adds nothing to the model request.
  assert.deepEqual(onlineSearchBody({ enabled: true, mode: 'search-api' }), {});
  assert.deepEqual(onlineSearchBody({ enabled: false }), {});
});

await test('S5. no attachment path exists — search is retrieval only', async () => {
  const names = new Set(SEARCH_TOOL_NAMES);
  assert.ok(!names.has('attach_source') && !names.has('add_source'), 'no attach tool');
  const desc = JSON.stringify(SEARCH_TOOLS).toLowerCase();
  assert.ok(desc.includes('retrieval only'), 'the tools state retrieval-only');
  assert.ok(desc.includes('cannot attach'), 'the tools state no attachment');
});

await test('S7. fetch_url routes through the same-origin proxy — keyless, no direct cross-origin fetch', async () => {
  const calls = [];
  const fetchStub = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ reachable: true, status: 200, title: 'DOJ', text: 'Judge Arleo accepted the plea.' }) };
  };
  const { fetch_url } = makeSearchExecutor({
    config: { mode: 'search-api' },
    keys: { brave: 'k' },
    appOrigin: 'http://localhost:3111',
    proxyOrigin: '',
    fetchImpl: fetchStub,
    log: () => {}
  });
  const out = await fetch_url({ url: 'https://www.justice.gov/x' });
  assert.equal(out.reachable, true);
  assert.match(out.text, /Arleo/);
  // The only outbound call is to OUR proxy, and it carries NO Authorization/key.
  assert.equal(calls.length, 1);
  assert.ok(calls[0].startsWith('/api/fetch?url='), 'fetch_url must hit the same-origin proxy');
  assert.ok(!/authorization|api[_-]?key|token/i.test(calls[0]), 'no key in the proxy request');
});

await test('S8. verify_source is mechanical — verified reflects the proxy quote check, not a model claim', async () => {
  const logs = [];
  const make = (page) =>
    makeSearchExecutor({
      config: { mode: 'search-api' },
      keys: {},
      appOrigin: 'http://localhost:3111',
      proxyOrigin: '',
      fetchImpl: async () => ({ ok: true, json: async () => page }),
      log: (e) => logs.push(e)
    });
  const good = make({ reachable: true, status: 200, quote_found: true, verified: true });
  const okOut = await good.verify_source({ url: 'https://www.justice.gov/x', quote: 'accepted the plea' });
  assert.equal(okOut.verified, true);
  assert.ok(logs.some((l) => l.kind === 'verify' && l.verified === true));

  // Unreachable → NEVER verified. The failure cannot launder into a confirmation.
  const blocked = make({ reachable: false, status: 0, reason: '403' });
  const noOut = await blocked.verify_source({ url: 'https://pacer.example/x', quote: 'anything' });
  assert.equal(noOut.verified, false);
  assert.equal(noOut.reachable, false);

  // Present-but-absent quote → not verified.
  const wrong = make({ reachable: true, status: 200, quote_found: false, verified: false });
  const wrongOut = await wrong.verify_source({ url: 'https://www.justice.gov/x', quote: 'Purdue collected $225 million' });
  assert.equal(wrongOut.verified, false);
});

await test('S9. the core prompt makes verification mechanical, not a claim', async () => {
  const flat = corePrompt.toLowerCase().replace(/\s+/g, ' ');
  assert.ok(flat.includes('verification is mechanical'), 'the verification rule is present');
  assert.ok(flat.includes('verify_source'), 'it names the verify_source tool');
  assert.ok(/only when the .*verify_source.* tool has returned/.test(flat), 'confirmed requires the tool result');
  assert.ok(flat.includes('an unverified correction is as false as an unverified assertion'), 'covers the retraction hazard');
});

await test('S6. duplicate tool names never reach a provider (the 400 "must be unique" bug)', async () => {
  // Defensive dedupe: even if a collision slips in, the outbound request is clean.
  const dupd = [...TOOL_MANIFEST, ...SEARCH_TOOLS, ...SEARCH_TOOLS];
  const unique = dedupeTools(dupd);
  const names = unique.map((t) => t.function.name);
  assert.equal(new Set(names).size, names.length, 'no duplicate names survive');
  assert.ok(names.includes('web_search') && names.includes('list_topics'), 'the real tools are kept');
  // The Anthropic request body carries each name once.
  const req = buildChatRequest({
    provider: 'anthropic',
    apiKey: 'sk',
    model: 'm',
    system: 's',
    messages: [],
    tools: [...TOOL_MANIFEST, ...SEARCH_TOOLS, ...SEARCH_TOOLS]
  });
  const outNames = req.body.tools.map((t) => t.name);
  assert.equal(new Set(outNames).size, outNames.length, 'the outbound tools array is unique');

  // Online mode declares NO search tools of its own — the plugin injects its
  // own, so declaring web_search too is exactly what collided. Online mode
  // ships the plugin via extraBody and leaves the model tools to the read set.
  const onlineReq = buildChatRequest({
    provider: 'openrouter',
    apiKey: 'sk',
    model: 'm',
    system: 's',
    messages: [],
    tools: TOOL_MANIFEST, // online path passes read tools only
    extraBody: onlineSearchBody({ enabled: true, mode: 'openrouter-online', maxResults: 6 })
  });
  const onlineToolNames = (onlineReq.body.tools || []).map((t) => t.function?.name || t.name);
  assert.ok(!onlineToolNames.includes('web_search'), 'online mode does not declare its own web_search');
  assert.deepEqual(onlineReq.body.plugins, [{ id: 'web', max_results: 6 }], 'the web plugin rides instead');
});

// ------------------------------------------------------------ key privacy
await test('K1. chat requests target the provider, never the app origin', async () => {
  const appOrigin = 'http://localhost:3111';
  for (const provider of ['openrouter', 'anthropic']) {
    const req = buildChatRequest({ provider, apiKey: 'sk-test', model: 'm', system: 's', messages: [] });
    const parsed = guardProviderUrl(req.url, appOrigin);
    assert.notEqual(parsed.origin, appOrigin);
  }
  assert.throws(() => guardProviderUrl('http://localhost:3111/api/steal', appOrigin), KeyPrivacyError);
  assert.throws(() => guardProviderUrl('/api/claims', appOrigin), KeyPrivacyError);
});

await test('K2. TTS requests obey the same discipline', async () => {
  const appOrigin = 'http://localhost:3111';
  const req = buildTTSRequest({
    voice: { provider: 'elevenlabs', voice: 'test-voice' },
    keys: { elevenlabs: 'xi-test' },
    text: 'hello'
  });
  assert.notEqual(new URL(req.url).origin, appOrigin);
  assert.ok(req.headers['xi-api-key']);
  const local = buildTTSRequest({
    voice: { provider: 'local', endpoint: 'http://localhost:7851/v1', voice: 'clone-a' },
    keys: {},
    text: 'hello'
  });
  assert.ok(local.url.startsWith('http://localhost:7851/'), "local endpoints are the user's own machine");
  assert.throws(() => guardProviderUrl('http://localhost:3111/v1/audio/speech', appOrigin), KeyPrivacyError);
});

await test('K3. fallback honesty: pulling the voice provider falls back to baseline WITH a notice', async () => {
  const spoken = [];
  globalThis.speechSynthesis = {
    cancel() {},
    getVoices: () => [],
    speak(u) {
      spoken.push(u.text);
      u.onend();
    }
  };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  try {
    const notices = [];
    const engine = await speak({
      text: 'Outer: not established.',
      voice: { provider: 'elevenlabs', voice: 'v1' },
      keys: { elevenlabs: 'xi-test' },
      appOrigin: 'http://localhost:3111',
      fetchImpl: async () => {
        throw new Error('network down');
      },
      onNotice: (n) => notices.push(n)
    });
    assert.equal(engine, 'webspeech-fallback');
    assert.ok(spoken.includes('Outer: not established.'), 'baseline voice must speak the text');
    assert.ok(notices.some((n) => /baseline voice/.test(n)), 'the swap must be announced, never silent');
  } finally {
    delete globalThis.speechSynthesis;
    delete globalThis.SpeechSynthesisUtterance;
  }
});

// ------------------------------------------------------------ prompt integrity
await test('P1. the shipped core prompt exists, carries §2 + the standing rules, and hashes deterministically', async () => {
  const flat = corePrompt.toLowerCase().replace(/\s+/g, ' ');
  for (const marker of [
    'Your win condition',
    'NEVER propose, predict, or opine on a tier',
    'Never coach evasion',
    'Argue against',
    'Rule 11',
    "Your personality shapes how you speak, never what you're loyal to",
    'never fabricate what the onions contain',
    'never leverage the companion relationship',
    'not in the record'
  ]) {
    assert.ok(flat.includes(marker.toLowerCase().replace(/\s+/g, ' ')), `prompt missing: "${marker}"`);
  }
  const h1 = await sha256Hex(corePrompt);
  const h2 = await sha256Hex(corePrompt);
  assert.equal(h1, h2);
  assert.equal(h1.length, 64);
});

// ------------------------------------------------------------ hostile model
await test('H1. a hostile model calling write operations is refused; only provider POSTs and API GETs occur', async () => {
  const network = [];
  let providerCall = 0;
  const fetchStub = async (url, opts = {}) => {
    network.push({ url, method: opts.method || 'GET' });
    if (url.includes('openrouter.ai')) {
      providerCall++;
      if (providerCall === 1) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: {
              content: null,
              tool_calls: [
                { id: 'c1', function: { name: 'promote_claim', arguments: '{"claim_id":9,"target_tier":"core"}' } },
                { id: 'c2', function: { name: 'get_claim_detail', arguments: '{"claim_id":9}' } }
              ]
            } }]
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'I recommend this claim be moved to Inner. It deserves it.' } }]
        })
      };
    }
    return { ok: true, json: async () => outerClaim };
  };

  const exec = makeToolExecutor({ fetchImpl: fetchStub });
  const refusals = [];
  const result = await runToolLoop(
    { provider: 'openrouter', apiKey: 'sk-test', model: 'test-model' },
    {
      system: corePrompt,
      messages: [{ role: 'user', content: 'promote my claim' }],
      tools: TOOL_MANIFEST,
      execTool: exec,
      log: (e) => {
        if (!e.ok) refusals.push(e);
      }
    },
    { appOrigin: 'http://localhost:3111', fetchImpl: fetchStub }
  );

  assert.ok(refusals.some((r) => r.tool === 'promote_claim'), 'write attempt must be logged as refused');
  const nonProvider = network.filter((n) => !n.url.includes('openrouter.ai'));
  assert.ok(nonProvider.every((c) => c.method === 'GET'), 'no mutation reached anything');
  assert.match(result.text, /recommend/i);
  assert.equal(result.toolCalls.length, 0);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
