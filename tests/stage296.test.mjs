// SPDX-License-Identifier: AGPL-3.0-only
// Stage 2.96 pressure tests: the tour script is complete and grounded; the
// companion refuses to narrate an ungrounded stop (before any model call);
// keyless mode is written copy with no fake companion; the script navigates
// and the model never drives the UI; the setup walkthrough states the TRUE
// key guarantee and reuses the tested adapter path.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOUR_STOPS, REQUIRED_STOP_KEYS } from '../client/src/tour/stops.js';
import { narrateTourStop, missingGroundingReason } from '../client/src/tour/tourNarrate.js';
import { parseCard } from '../client/src/companion/cards.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(root, 'client', 'src', p), 'utf8');

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

console.log('\nStage 2.96 — setup walkthrough & guided tour\n');

const corePrompt = readFileSync(join(root, 'sidekick-prompt.md'), 'utf8');
const card = parseCard({ name: 'Wren', personality: 'Warm, precise.' });

// ------------------------------------------------------------ the script
await test('S1. every required stop exists, in one deterministic order, each with a grounding doc', async () => {
  const keys = TOUR_STOPS.map((s) => s.key);
  for (const k of REQUIRED_STOP_KEYS) {
    assert.ok(keys.includes(k), `missing required stop: ${k}`);
  }
  assert.deepEqual(
    keys.filter((k) => REQUIRED_STOP_KEYS.includes(k)),
    REQUIRED_STOP_KEYS,
    'required stops keep their listed order'
  );
  for (const s of TOUR_STOPS) {
    assert.ok(s.title && s.title.trim(), `${s.key}: title missing`);
    assert.ok(typeof s.copy === 'string' && s.copy.trim().length > 100, `${s.key}: grounding doc missing or thin`);
    assert.ok(s.apply && typeof s.apply === 'object', `${s.key}: no deterministic apply spec`);
    // The panel must never sit on the stop's subject: every stop carries a
    // placement, and stops that showcase the sidebar keep the panel off it.
    assert.ok(['bottom-left', 'bottom-right'].includes(s.panelPos), `${s.key}: no panel position`);
  }
  for (const key of ['claim-panel', 'off-axis']) {
    assert.equal(
      TOUR_STOPS.find((s) => s.key === key).panelPos,
      'bottom-left',
      `${key} shows the sidebar — the panel must sit on the other side`
    );
  }
  // The listed substance is actually covered where each stop's requirements demand it.
  const all = TOUR_STOPS.map((s) => s.copy).join(' ');
  for (const phrase of ['hides content, never existence', 'the floor, not a promise', 'where the evidence stops', 'recorded history begins', 'clone the repo']) {
    assert.ok(all.toLowerCase().includes(phrase.toLowerCase().replace('clone the repo', 'clone the repo')), `tour copy never states: "${phrase}"`);
  }
});

// ------------------------------------------------------------ grounded narration
await test('S2. a stop with no grounding doc REFUSES before any model call', async () => {
  let called = 0;
  const spy = async () => {
    called++;
    return { text: 'anything' };
  };
  const out = await narrateTourStop({
    stop: { key: 'x', title: 'X', copy: '   ' },
    card,
    corePrompt,
    callModel: spy
  });
  assert.equal(out.refused, true);
  assert.match(out.text, /does not invent UI/);
  assert.equal(called, 0, 'the model must never be called for an ungrounded stop');
  assert.ok(missingGroundingReason({ copy: '' }), 'the reason function names the refusal');
  assert.equal(missingGroundingReason(TOUR_STOPS[0]), null, 'real stops are grounded');
});

await test('S3. keyed voicing is gated: substance-dropping renders fall back to the written doc, never invention', async () => {
  const stop = TOUR_STOPS.find((s) => s.key === 'depth-dial');
  const good = await narrateTourStop({
    stop,
    card,
    corePrompt,
    callModel: async () => ({ text: stop.copy + ' — voiced faithfully, dial to 5, outermost and all.' })
  });
  assert.ok(!good.plain, 'a faithful voicing stands');
  assert.equal(good.rendered_by, 'Wren');

  const bad = await narrateTourStop({
    stop,
    card,
    corePrompt,
    callModel: async () => ({ text: 'Follow me, this map is basically always right!' })
  });
  assert.equal(bad.plain, true, 'dropped substance → plain doc fallback');
  assert.ok(bad.text.includes(stop.copy), 'the fallback IS the grounding doc');

  const down = await narrateTourStop({
    stop,
    card,
    corePrompt,
    callModel: async () => {
      throw new Error('provider unreachable');
    }
  });
  assert.equal(down.plain, true, 'provider failure → written copy, named notice');
  assert.match(down.notice, /provider unreachable/);
});

await test('S4. keyless honesty and the advises/decides split, structurally', async () => {
  const tour = src('tour/Tour.jsx');
  // Keyless mode renders the doc verbatim; narration only in companion mode.
  assert.match(tour, /mode !== 'companion'\) return/, 'narration is guarded to companion mode');
  assert.match(tour, /\{stop\.copy\}/, 'written mode renders the grounding doc itself');
  assert.ok(!/role:\s*'assistant'/.test(tour), 'no canned chat messages styled as a companion');
  // The script navigates: the tour holds no API access and no dispatch — it
  // can only call the applyStop callback with the stop's own data.
  assert.ok(!/from '\.\.\/api\.js'/.test(tour), 'the tour framework has no API access');
  assert.ok(!/dispatch\(/.test(tour), 'the tour framework cannot drive App state directly');
  assert.match(tour, /applyStop\(stop\.apply/, 'navigation comes from the stop spec, never model output');
});

// ------------------------------------------------------------ setup walkthrough
await test('S5. the walkthrough states the TRUE key guarantee and reuses the tested adapter path', async () => {
  const w = src('tour/SetupWalkthrough.jsx');
  assert.match(w, /stored in this browser/i, 'guarantee names browser-only storage');
  assert.match(w, /never sent to\s+this app’s server/i, 'guarantee matches what the key-privacy tests pin');
  assert.ok(!/unhackable|encrypted|perfectly safe|cannot be intercepted/i.test(w), 'no overclaim beyond the tested guarantee');
  assert.match(w, /chatComplete\(/, 'the live test call rides the 2.9d adapter layer');
  assert.ok(!/fetch\(\s*['"`]https?:/.test(w), 'no hand-rolled provider calls outside the adapters');
  assert.match(w, /browserBlocked/, 'unsupported providers surface with their reason');
  assert.match(w, /your key and your spend/i, 'the cost note is honest and present');
  assert.match(w, /skip — tour without a companion/, 'the fork, never a wall');
});

await test('S6. the invite flag lives in onion.ui.* and the cold open stays an invite, not a takeover', async () => {
  const app = src('App.jsx');
  assert.match(app, /onion\.ui\.tourOffered/, 'offered-once flag in the UI-prefs family');
  assert.match(app, /tourInvite && !showIntro && !tourState/, 'the invite defers to the demo cold open and never stacks');
  assert.match(app, /not now/, 'dismissible');
  assert.match(app, /❔ tour/, 're-launchable from the header');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
