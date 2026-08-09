// SPDX-License-Identifier: AGPL-3.0-only
// Sphere placement: where a claim's tile sits and how big it draws. Pure —
// no three.js, no DOM — so the 2.9b guarantees are testable properties:
//
//   Latitude encodes DOCUMENTED OUTCOME, from the record only:
//     - outcome evidence netting to ~zero  → ON the equator line;
//     - nothing attached (undecided)       → the band just above/below it;
//     - net documented direction           → displaced toward the help/harm
//       pole, magnitude normalized within the topic. Only the record earns
//       distance from the equator.
//   Tile size is driven by the ring's diameter and crowding ONLY. Evidence
//   weight is expressed by which shell a claim sits on and by its material
//   channels — NEVER by size. tileAngularRadius takes no claim at all, so
//   there is no code path where weight could leak into size.

// The undecided band: strictly off the line, strictly inside the directed
// zone. Exported so the pin tests and the renderer agree on the numbers.
export const EQUATOR_BAND = { min: 4, max: 11 };
export const DIRECTED_MIN = 16;
export const DIRECTED_MAX = 70;

// One deterministic site per claim: latitude from the outcome record,
// longitude spread by golden angle so tiles distribute evenly. tierIndex
// seeds the spread per ring, so sparse rings STAGGER — a lone tile on one
// shell never sits radially stacked over a lone tile on the next.
export function siteFor(claim, i, { maxMagnitude = 3, tierIndex = 0 } = {}) {
  const { direction, magnitude, evidenced } = claim.vertical;
  let lat;
  if (direction === 'help' || direction === 'harm') {
    // Documented net direction. Normalize within the topic so distance from
    // the equator is earned relative to the best-documented outcome here.
    const m = Math.max(1, Number(maxMagnitude) || 1);
    const frac = Math.min(1, Math.max(0, (Number(magnitude) || 1) / m));
    lat = DIRECTED_MIN + (DIRECTED_MAX - DIRECTED_MIN) * frac;
    if (direction === 'harm') lat = -lat;
  } else if (evidenced) {
    // Outcome evidence attached, netting to ~zero: rides ON the equator.
    lat = 0;
  } else {
    // Undecided: just above/below the line — near it, never on it. The
    // equator is a statement (checked, netted), not a default.
    const jitter = (i * 37 + tierIndex * 13) % (EQUATOR_BAND.max - EQUATOR_BAND.min + 1);
    lat = ((i + tierIndex) % 2 === 0 ? 1 : -1) * (EQUATOR_BAND.min + jitter);
  }
  const lon = ((i * 137.508 + tierIndex * 67.5) % 360) - 180;
  return [lon, lat];
}

// The topic-wide magnitude ceiling used for normalization: the largest
// documented magnitude among directed claims, floor 1.
export function maxMagnitudeIn(claims) {
  let max = 1;
  for (const c of claims || []) {
    const v = c.vertical || {};
    if ((v.direction === 'help' || v.direction === 'harm') && Number(v.magnitude) > max) {
      max = Number(v.magnitude);
    }
  }
  return max;
}

// Tile size (angular radius, degrees) for a ring: a set range, driven by the
// ring's diameter and its crowding — and by nothing else. Small, crisp,
// discrete; open space on the sphere is correct and expected.
export const TILE_DEG = { min: 4.5, max: 12 };
export function tileAngularRadius(ringRadius, count) {
  const n = Math.max(1, Number(count) || 1);
  const r = Math.max(0.5, Number(ringRadius) || 1);
  // More surface (bigger ring) affords slightly bigger tiles; more claims
  // shrink them. Clamped to the per-ring range in all cases.
  const deg = (26 / Math.sqrt(n)) * (0.55 + (0.45 * r) / 3.2);
  return Math.min(TILE_DEG.max, Math.max(TILE_DEG.min, deg));
}
