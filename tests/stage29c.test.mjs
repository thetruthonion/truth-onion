// SPDX-License-Identifier: AGPL-3.0-only
// Stage 2.9c pressure tests: the tier color tokens (single source, consumed
// everywhere, never restated), kind-vs-tier separation, and the predictive
// search ranking (lexical match quality ONLY — no popularity channel).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TIER_COLORS_DARK,
  TIER_COLORS_LIGHT,
  TIERS_IN_ORDER
} from '../client/src/tokens.js';
import { matchScore, rankMatches } from '../client/src/searchRank.js';

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

console.log('\nStage 2.9c — tier tokens, kind separation, lexical search\n');

// ------------------------------------------------------------ tokens
await test('K1. the token sets match the kickoff palette exactly, both surfaces, all five tiers', async () => {
  assert.deepEqual(TIER_COLORS_DARK, {
    core: '#3680E0',
    inner: '#FF5E3A',
    middle: '#8A4DFF',
    outer: '#1FA8FF',
    outermost: '#2BE08A'
  });
  assert.deepEqual(TIER_COLORS_LIGHT, {
    core: '#C97F1F',
    inner: '#F3BFA8',
    middle: '#C9BEE0',
    outer: '#AFCBE3',
    outermost: '#BFD8CB'
  });
  assert.deepEqual(TIERS_IN_ORDER, ['core', 'inner', 'middle', 'outer', 'outermost']);
  const all = [...Object.values(TIER_COLORS_DARK), ...Object.values(TIER_COLORS_LIGHT)];
  assert.equal(new Set(all.map((c) => c.toLowerCase())).size, all.length, 'every token is distinct');
});

await test('K2. tokens are stated ONCE: no raw tier hex appears in any client source but tokens.js', async () => {
  const files = [
    'App.jsx',
    'ClaimPanel.jsx',
    'Onion.jsx',
    'Onion3D.jsx',
    'SearchBox.jsx',
    'Tabs.jsx',
    'AddClaim.jsx',
    'Companion.jsx',
    'DepthDial.jsx',
    'styles.css',
    'lineageRender.js',
    'placement.js',
    'searchRank.js'
  ];
  const hexes = [...Object.values(TIER_COLORS_DARK), ...Object.values(TIER_COLORS_LIGHT)];
  for (const f of files) {
    const body = src(f).toLowerCase();
    for (const hex of hexes) {
      assert.ok(
        !body.includes(hex.toLowerCase()),
        `${f} restates tier hex ${hex} — tokens.js is the single source`
      );
    }
  }
});

await test('K3. consumers read the tokens: 3D imports the map, 2D and chips use the CSS variables', async () => {
  assert.match(src('Onion3D.jsx'), /import \{ TIER_COLORS_DARK \} from '\.\/tokens\.js'/);
  assert.match(src('Onion.jsx'), /var\(--tier-core\)/);
  assert.match(src('styles.css'), /\.badge\.tier-core \{ border-color: var\(--tier-core\)/);
  assert.match(src('main.jsx'), /applyTokens\(\)/);
});

await test('K4. kind can never be misread as tier: kind chips are outline treatment off the tier hues', async () => {
  const css = src('styles.css');
  const kindRules = css.match(/\.badge\.layer-[a-z]+ \{[^}]+\}/g) || [];
  assert.equal(kindRules.length, 3, 'three kind chip rules exist');
  for (const rule of kindRules) {
    assert.ok(!/var\(--tier-/.test(rule), `kind chip uses a tier token: ${rule}`);
    assert.match(rule, /background: transparent/, 'kind chips are outlined, not filled');
  }
  // And the 2D view keys node FILL by tier, kind only by dash pattern.
  const onion = src('Onion.jsx');
  assert.match(onion, /TIER_FILL\[c\.radial_tier\]/);
  assert.ok(!/fill=\{[^}]*layer/i.test(onion), '2D node fill never reads the claim kind');
});

// ------------------------------------------------------------ search ranking
const mk = (text, extra = {}) => ({ text, ...extra });

await test('S1. ranking reads ONLY lexical features: decoy popularity fields cannot move an item', async () => {
  const plain = [mk('replication crisis basics'), mk('the replication crisis proves nothing'), mk('crisis of replication studies')];
  const decoyed = [
    mk('replication crisis basics', { challenges: 0, updated_at: '2020-01-01', views: 1 }),
    mk('the replication crisis proves nothing', { challenges: 999, updated_at: '2026-07-27', views: 99999, active: true }),
    mk('crisis of replication studies', { tier: 'core', pinned: true })
  ];
  const a = rankMatches('replication crisis', plain).map((r) => r.text);
  const b = rankMatches('replication crisis', decoyed).map((r) => r.text);
  assert.deepEqual(b, a, 'activity/recency/tier decoys must not change the order');
});

await test('S2. match quality orders: exact > prefix > word-start > substring; earlier beats later', async () => {
  assert.ok(matchScore('onion', 'onion') > matchScore('onion', 'onion layers'), 'exact beats prefix');
  assert.ok(matchScore('onion', 'onion layers') > matchScore('onion', 'truth onion'), 'prefix beats word-start');
  assert.ok(matchScore('onion', 'truth onion') > matchScore('ion', 'truth onion'), 'word-start beats mid-word substring');
  assert.ok(
    matchScore('records', 'records were destroyed') > matchScore('records', 'most of the surviving records'),
    'earlier match reads as a better match'
  );
});

await test('S3. every query word must match; no match is null, never a low score', async () => {
  assert.equal(matchScore('kernel destroyed', 'the records were destroyed'), null);
  assert.equal(matchScore('zzz', 'anything at all'), null);
  assert.equal(matchScore('', 'text'), null);
  assert.ok(matchScore('records destroyed', 'the records were destroyed') > 0);
});

await test('S4. tier-neutral and deterministic: equal matches break ties on text alone', async () => {
  const items = [
    mk('bbb claim about onions', { tier: 'outermost' }),
    mk('aaa claim about onions', { tier: 'core' })
  ];
  const ranked = rankMatches('claim about onions', items).map((r) => r.text);
  assert.deepEqual(ranked, ['aaa claim about onions', 'bbb claim about onions'], 'lexical tiebreak, not tier');
  const again = rankMatches('claim about onions', [...items].reverse()).map((r) => r.text);
  assert.deepEqual(again, ranked, 'input order never leaks into equal-match ranking');
});

await test('S5. the ranking function signature admits no non-text inputs (the pin on the pin)', async () => {
  const body = src('searchRank.js');
  for (const banned of ['challenge', 'recency', 'updated', 'views', 'activity', 'popular', 'tier', 'created_at']) {
    // The words may appear in comments explaining the refusal; strip comments first.
    const code = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(
      !code.toLowerCase().includes(banned),
      `searchRank.js code references "${banned}" — ranking must stay lexical-only`
    );
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
