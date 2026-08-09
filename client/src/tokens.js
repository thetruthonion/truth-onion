// SPDX-License-Identifier: AGPL-3.0-only
// The tier color tokens — SINGLE SOURCE OF TRUTH, implementing
// truth-onion-design-brief.md as scoped by the 2.9c kickoff.
//
// Hue encodes tier and nothing else. These sets are reserved for
// evidence-tier encoding; a tier color used ornamentally breaks the system's
// honesty and is a bug. Claim-kind (factual/moral/framing) is carried by
// outline treatment, never by these hues, so kind can never be misread as
// tier. Outward falloff is luminance/saturation stepping baked into the hue
// choices — never opacity; tiles rest opaque (transparency is an event).
//
// Everything that colors a tier — 3D tiles, 2D rings, tier chips, the
// tier-floor panel — reads from here: JS consumers import the maps; CSS
// consumers use the variables injected by applyTokens(). Raw tier hexes
// anywhere else in the client are a bug, pinned by test.

// Dark surfaces (the 3D map, dark UI): the neon set on Void Indigo.
export const TIER_COLORS_DARK = {
  core: '#3680E0',
  inner: '#FF5E3A',
  middle: '#8A4DFF',
  outer: '#1FA8FF',
  outermost: '#2BE08A'
};

// Light surfaces (parchment / reading / exports): the pastel set, same
// order. No light surface exists in the app yet — the set is defined and
// reserved so exports and reading views adopt it without redefining it.
export const TIER_COLORS_LIGHT = {
  core: '#C97F1F',
  inner: '#F3BFA8',
  middle: '#C9BEE0',
  outer: '#AFCBE3',
  outermost: '#BFD8CB'
};

// Grounds and type, from the brief.
export const GROUNDS = {
  voidIndigo: '#131A2A', // ground for the world and dark UI
  parchment: '#F7F2E7', // ground for documents and light UI
  vellum: '#F2E8D5' // type on dark
};

export const TIERS_IN_ORDER = ['core', 'inner', 'middle', 'outer', 'outermost'];

// Inject the tokens as CSS variables so stylesheets stay downstream of this
// file rather than restating hex values.
export function applyTokens(root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return;
  for (const tier of TIERS_IN_ORDER) {
    root.style.setProperty(`--tier-${tier}`, TIER_COLORS_DARK[tier]);
    root.style.setProperty(`--tier-${tier}-light`, TIER_COLORS_LIGHT[tier]);
  }
  root.style.setProperty('--ground-dark', GROUNDS.voidIndigo);
  root.style.setProperty('--ground-light', GROUNDS.parchment);
  root.style.setProperty('--vellum', GROUNDS.vellum);
}
