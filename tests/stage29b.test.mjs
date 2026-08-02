// Stage 2.9b pressure tests: the interaction supersession (single-click
// selects ONLY; double-click owns the chain view; the dial never resets),
// discrete-tile sizing (ring diameter + crowding only — never evidence
// weight), and the outcome-latitude vertical axis (only the record earns
// distance from the equator).

import assert from 'node:assert/strict';
import { initialInteraction, interactionReducer } from '../client/src/interaction.js';
import {
  siteFor,
  maxMagnitudeIn,
  tileAngularRadius,
  EQUATOR_BAND,
  DIRECTED_MIN,
  DIRECTED_MAX,
  TILE_DEG
} from '../client/src/placement.js';

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

console.log('\nStage 2.9b — interaction supersession, tile legibility, outcome latitude\n');

const claim = (vertical, extra = {}) => ({
  id: extra.id ?? 1,
  radial_tier: 'middle',
  vertical,
  sources: extra.sources ?? [],
  challenges: [],
  ...extra
});

// ------------------------------------------------------------ interaction
await test('I1. single-click is select + panel ONLY — no chain, from any resting state (supersession)', async () => {
  let s = initialInteraction(3);
  s = interactionReducer(s, { type: 'select', id: 9 });
  assert.equal(s.mode, 'selected');
  assert.equal(s.selectedId, 9);
  assert.equal(s.chainId, null, 'a single click never draws a lineage');
  // Selecting another tile stays a plain selection.
  s = interactionReducer(s, { type: 'select', id: 4 });
  assert.equal(s.chainId, null);
});

await test('I2. double-click WITH a lineage enters the chain view; WITHOUT one it never clears', async () => {
  let s = interactionReducer(initialInteraction(4), { type: 'chain', id: 9 });
  assert.equal(s.mode, 'chain');
  assert.equal(s.chainId, 9);
  const t = interactionReducer(initialInteraction(4), { type: 'narrate_only', id: 7 });
  assert.equal(t.mode, 'selected', 'no lineage → no clearing; narration only');
  assert.equal(t.chainId, null);
});

await test('I3. empty click restores the sphere AT THE CURRENT DIAL DEPTH — the dial never resets', async () => {
  let s = initialInteraction(1);
  s = interactionReducer(s, { type: 'dial', depth: 5 });
  s = interactionReducer(s, { type: 'chain', id: 11 });
  assert.equal(s.depth, 5);
  s = interactionReducer(s, { type: 'empty' });
  assert.equal(s.mode, 'rest');
  assert.equal(s.chainId, null);
  assert.equal(s.depth, 5, 'restore happens at the depth the dial was set to');
  assert.equal(s.goHome, false, 'an empty click restores state; it does not move the camera');
  // Exhaustive: NO transition except the dial touches depth.
  for (const action of [
    { type: 'select', id: 1 },
    { type: 'chain', id: 1 },
    { type: 'narrate_only', id: 1 },
    { type: 'empty' },
    { type: 'escape' },
    { type: 'deselect' },
    { type: 'home_done' }
  ]) {
    const out = interactionReducer({ ...initialInteraction(4), mode: 'chain', chainId: 2 }, action);
    assert.equal(out.depth, 4, `${action.type} must not touch depth`);
  }
});

await test('I4. Escape retains its go-home meaning; inside the chain a select keeps the chain', async () => {
  let s = interactionReducer(initialInteraction(2), { type: 'chain', id: 9 });
  // Clicking a chain tile inspects it in the panel without dropping the view.
  s = interactionReducer(s, { type: 'select', id: 3 });
  assert.equal(s.mode, 'chain');
  assert.equal(s.chainId, 9);
  assert.equal(s.selectedId, 3);
  s = interactionReducer(s, { type: 'escape' });
  assert.equal(s.mode, 'rest');
  assert.equal(s.goHome, true, 'Escape goes home');
  assert.equal(s.depth, 2);
});

// ------------------------------------------------------------ tile sizing
await test('T1. tile size is a function of ring diameter and crowding ONLY — evidence weight has no path in', async () => {
  // Structural pin: the function's signature admits ring radius and count,
  // nothing else — a claim (and therefore its evidence) cannot reach it.
  assert.equal(tileAngularRadius.length, 2, 'signature is (ringRadius, count) — no claim parameter exists');
  assert.equal(tileAngularRadius(2.1, 8), tileAngularRadius(2.1, 8), 'deterministic');
  // Behavioral restatement: a nine-primary-doc claim and a sourceless claim
  // on the same ring at the same crowding necessarily share a size, because
  // size has no input they differ in.
  const sizeForRing = tileAngularRadius(2.1, 2);
  assert.equal(sizeForRing, tileAngularRadius(2.1, 2));
});

await test('T2. sizes stay inside the per-ring range at every crowding extreme', async () => {
  for (const r of [1.0, 1.55, 2.1, 2.65, 3.2]) {
    for (const n of [1, 2, 5, 12, 40, 400]) {
      const deg = tileAngularRadius(r, n);
      assert.ok(deg >= TILE_DEG.min && deg <= TILE_DEG.max, `r=${r} n=${n} → ${deg} out of range`);
    }
  }
  // Crowding shrinks, ring size grows — within the clamp.
  assert.ok(tileAngularRadius(3.2, 40) <= tileAngularRadius(3.2, 4));
  assert.ok(tileAngularRadius(3.2, 12) >= tileAngularRadius(1.0, 12));
});

await test('T3. sparse rings stagger: a lone tile on one shell never stacks radially over a lone tile on the next', async () => {
  const lone = claim({ direction: 'neutral', magnitude: 0, evidenced: false });
  const lons = [0, 1, 2, 3, 4].map((tierIndex) => siteFor(lone, 0, { tierIndex })[0]);
  for (let a = 0; a < lons.length; a++) {
    for (let b = a + 1; b < lons.length; b++) {
      assert.ok(
        Math.abs(lons[a] - lons[b]) > 5,
        `tiers ${a} and ${b} align at lon ${lons[a]} — single tiles must stagger`
      );
    }
  }
});

// ------------------------------------------------------------ outcome latitude
await test('V1. a claim with NO outcome evidence sits in the band just off the equator — never on it, never past it', async () => {
  for (let i = 0; i < 50; i++) {
    const [, lat] = siteFor(claim({ direction: 'neutral', magnitude: 0, evidenced: false }, { id: i + 1 }), i);
    assert.ok(Math.abs(lat) >= EQUATOR_BAND.min, `i=${i}: undecided must not ride the line (lat ${lat})`);
    assert.ok(Math.abs(lat) <= EQUATOR_BAND.max, `i=${i}: undecided never leaves the band (lat ${lat})`);
  }
});

await test('V2. outcome evidence netting to ~zero rides ON the equator line', async () => {
  for (let i = 0; i < 10; i++) {
    const [, lat] = siteFor(claim({ direction: 'neutral', magnitude: 0, evidenced: true }), i);
    assert.equal(lat, 0, 'netted-to-zero is a statement: exactly on the line');
  }
});

await test('V3. documented direction earns displacement, normalized within the topic', async () => {
  const help1 = claim({ direction: 'help', magnitude: 1, evidenced: true });
  const help3 = claim({ direction: 'help', magnitude: 3, evidenced: true });
  const harm2 = claim({ direction: 'harm', magnitude: 2, evidenced: true });
  const maxMag = maxMagnitudeIn([help1, help3, harm2]);
  assert.equal(maxMag, 3);
  const [, l1] = siteFor(help1, 0, { maxMagnitude: maxMag });
  const [, l3] = siteFor(help3, 1, { maxMagnitude: maxMag });
  const [, h2] = siteFor(harm2, 2, { maxMagnitude: maxMag });
  assert.ok(l1 > EQUATOR_BAND.max, 'directed displacement clears the undecided band');
  assert.ok(l3 > l1, 'greater documented magnitude earns more distance');
  assert.equal(l3, DIRECTED_MAX, 'the topic maximum reaches the pole band edge');
  assert.ok(h2 < 0, 'harm displaces toward the south pole');
  assert.ok(l1 >= DIRECTED_MIN && l3 <= DIRECTED_MAX);
  // Normalization is within-topic: the same magnitude-1 claim in a topic
  // whose max IS 1 earns the full displacement.
  const [, alone] = siteFor(help1, 0, { maxMagnitude: 1 });
  assert.equal(alone, DIRECTED_MAX);
});

await test('V4. the undecided band and the directed zone never overlap — position, not material, separates them', async () => {
  assert.ok(DIRECTED_MIN > EQUATOR_BAND.max, 'a claim can never be ambiguous between undecided and directed');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
