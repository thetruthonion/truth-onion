// Stage 2.9d Amendment B pressure tests: the stage indicator is wired to
// REAL pipeline events (no timed fakery), mid-stage errors name the stage,
// drafts never render pre-gate, provider reasoning is surfaced only when
// genuinely present (never fabricated) and can never leak into narration
// output — plus the claim-picker's lexical-only pin.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { narrateClaim, chatTurn, STAGES } from '../client/src/companion/pipeline.js';
import { normalizeResponse } from '../client/src/companion/providers.js';
import { parseCard } from '../client/src/companion/cards.js';

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

console.log('\nStage 2.9e — honest progress, ungated working view, picker pin\n');

const claim = {
  id: 9,
  text: 'E29: the program continues in secret.',
  kind: 'empirical',
  layer: 'factual',
  radial_tier: 'outer',
  status: 'contested',
  placement_reason: 'No primary documentation; the only source is anonymous and carries zero weight.',
  vertical: { direction: 'neutral', magnitude: 0, evidenced: false },
  sources: [],
  challenges: [],
  supports_claims: [],
  supported_by: []
};
const card = parseCard({ name: 'Vesper', personality: 'Laconic.' });

const MANIFEST = JSON.stringify({
  items: [{ id: 1, text: 'The only sourcing carries zero weight.', basis: 'carries zero weight' }],
  does_not_assert: 'Nothing beyond the record.',
  tier_statement: 'Outer: not established.'
});
const GOOD_RENDER = 'Outer, friend — not established. Zero weight on the scales. 9. Nothing beyond the record.';

// ------------------------------------------------------------ stages
await test('B1. stage sequences mirror REAL transitions per mode; skipped stages never fire', async () => {
  const run = async (mode, script) => {
    const stages = [];
    let call = 0;
    const stub = async () => ({ text: script[Math.min(call++, script.length - 1)] });
    await narrateClaim({ claim, corePrompt, card, mode, callModel: stub, onStage: (k) => stages.push(k) });
    return stages;
  };
  assert.deepEqual(await run('bare', [MANIFEST]), ['manifest'], 'bare: only pass 1');
  assert.deepEqual(
    await run('interleaved', [MANIFEST, JSON.stringify({ comments: [{ id: 1, comment: 'Hm.' }] })]),
    ['manifest', 'interleave']
  );
  assert.deepEqual(
    await run('full', [MANIFEST, GOOD_RENDER]),
    ['manifest', 'render', 'gate'],
    'a passing gate never enters the degrade stage'
  );
  assert.deepEqual(
    await run('full', [MANIFEST, 'Trust me, this one has legs.', JSON.stringify({ comments: [] })]),
    ['manifest', 'render', 'gate', 'interleave_degrade'],
    'a failing gate visibly enters the degrade stage — after the gate, never before'
  );
});

await test('B2. a mid-stage failure names the stage that failed', async () => {
  let call = 0;
  const stub = async () => {
    call++;
    if (call === 1) return { text: MANIFEST };
    throw new Error('provider exploded');
  };
  await assert.rejects(
    () => narrateClaim({ claim, corePrompt, card, mode: 'full', callModel: stub, onStage: () => {} }),
    (e) => {
      assert.match(e.message, /drafting in voice/, `stage missing from: ${e.message}`);
      assert.match(e.message, /provider exploded/);
      return true;
    }
  );
});

await test('B3. chatTurn stages: analysis → render → gate, degrade only after the gate', async () => {
  const stages = [];
  let call = 0;
  const callModel = async () => {
    call++;
    return { text: call === 1 ? 'The claim sits at outer. zero weight applies.' : 'It sits at outer — zero weight, nothing more.' };
  };
  const runBareLoop = async () => ({ text: 'The claim sits at outer. zero weight applies.' });
  await chatTurn({
    history: [],
    userText: 'status?',
    corePrompt,
    card,
    mode: 'full',
    runBareLoop,
    callModel,
    onStage: (k) => stages.push(k)
  });
  assert.deepEqual(stages.slice(0, 2), ['analysis', 'render']);
  assert.ok(stages.includes('gate'));
  assert.ok(
    !stages.includes('interleave_degrade') || stages.indexOf('interleave_degrade') > stages.indexOf('gate'),
    'degrade can only follow the gate'
  );
});

await test('B4. no pre-gate streaming exists: the pipeline exposes no token/partial callback', async () => {
  const src = readFileSync(join(root, 'client', 'src', 'companion', 'pipeline.js'), 'utf8');
  for (const banned of ['onToken', 'onPartial', 'onDelta', 'ReadableStream', 'text/event-stream']) {
    assert.ok(!src.includes(banned), `pipeline.js contains "${banned}" — drafts must not stream pre-gate`);
  }
  assert.ok(Object.keys(STAGES).includes('gate'), 'the gate is a first-class stage');
});

// ------------------------------------------------------------ working view
await test('W1. reasoning surfaces ONLY when the provider returned it — never fabricated', async () => {
  const anth = normalizeResponse('anthropic', {
    content: [
      { type: 'thinking', thinking: 'private working notes' },
      { type: 'text', text: 'the answer' }
    ]
  });
  assert.equal(anth.reasoning, 'private working notes');
  assert.equal(anth.text, 'the answer');

  const goog = normalizeResponse('google', {
    candidates: [{ content: { parts: [{ thought: true, text: 'gemini scratch' }, { text: 'the answer' }] } }]
  });
  assert.equal(goog.reasoning, 'gemini scratch');
  assert.equal(goog.text, 'the answer', 'thought parts NEVER join the narration text');

  const or = normalizeResponse('openrouter', {
    choices: [{ message: { content: 'the answer', reasoning: 'router scratch' } }]
  });
  assert.equal(or.reasoning, 'router scratch');

  const plain = normalizeResponse('openrouter', { choices: [{ message: { content: 'the answer' } }] });
  assert.ok(!('reasoning' in plain), 'no reasoning channel → no reasoning key. Absent, not guessed.');
});

await test('W2. reasoning can never enter the pipeline output — not the text, not the manifest, not the object', async () => {
  let call = 0;
  const stub = async () => {
    call++;
    return {
      text: call === 1 ? MANIFEST : GOOD_RENDER,
      reasoning: 'SCRATCH-NOTES-DO-NOT-SURFACE'
    };
  };
  const out = await narrateClaim({ claim, corePrompt, card, mode: 'full', callModel: stub });
  assert.ok(!('reasoning' in out), 'pipeline output carries no reasoning field');
  assert.ok(!out.text.includes('SCRATCH-NOTES'), 'reasoning never joins the narration');
  assert.ok(!JSON.stringify(out.manifest).includes('SCRATCH-NOTES'), 'reasoning never enters the manifest');
});

// ------------------------------------------------------------ claim picker
await test('K1. the claim picker ranks with the pinned lexical ranker and adds no reach of its own', async () => {
  const src = readFileSync(join(root, 'client', 'src', 'ClaimPicker.jsx'), 'utf8');
  assert.match(src, /rankMatches.*from '\.\/searchRank\.js'/, 'picker must use the lexical-only ranker');
  assert.ok(!/fetch\(|api\./.test(src), 'the picker filters candidates it is HANDED — it fetches nothing');
});

await test('K2. the source picker follows the same rules: lexical-only ranking, no reach beyond its candidates', async () => {
  const src = readFileSync(join(root, 'client', 'src', 'SourcePicker.jsx'), 'utf8');
  assert.match(src, /rankMatches.*from '\.\/searchRank\.js'/, 'source picker must use the lexical-only ranker');
  assert.ok(!/fetch\(|api\./.test(src), 'the source picker filters the library it is HANDED — it fetches nothing');
  // And ClaimPanel actually hands it the attachable library, not raw input.
  const panel = readFileSync(join(root, 'client', 'src', 'ClaimPanel.jsx'), 'utf8');
  assert.match(panel, /<SourcePicker\s[\s\S]*?sources=\{attachable\}/, 'candidates are the pre-filtered attachable library');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
