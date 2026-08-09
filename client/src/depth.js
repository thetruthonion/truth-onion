// SPDX-License-Identifier: AGPL-3.0-only
// The depth dial: a VIEW filter only. Nothing here touches writes or rules —
// the server has no concept of depth (proven in tests/stage2.test.mjs).

export const TIER_DEPTH = { core: 1, inner: 2, middle: 3, outer: 4, outermost: 5 };

export const DEPTH_LABELS = {
  1: 'Core only — established claims',
  2: 'Core + Inner',
  3: 'Core through Middle',
  4: 'Core through Outer',
  5: 'Everything — incl. debunked & off-axis'
};

// Metaphysical claims (no radial tier) surface only at full depth.
export function depthNeededFor(claim) {
  return claim.radial_tier ? TIER_DEPTH[claim.radial_tier] : 5;
}

export function visibleAtDepth(claim, depth) {
  return depth >= depthNeededFor(claim);
}
