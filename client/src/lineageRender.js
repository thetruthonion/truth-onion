// SPDX-License-Identifier: AGPL-3.0-only
// The data-to-render boundary for lineage drawing. Every line the 3D view
// draws for a selected claim is specified HERE, as plain data, before any
// three.js object exists — so the visual grammar is a testable property, not
// a styling habit:
//
//   support link  → kind 'support', style 'solid'   (evidence connects)
//   kernel link   → kind 'kernel',  style 'broken'  (evidence stops)
//   no kernel     → no kernel spec at all           (unmoored claims float)
//
// Style is DERIVED from kind — there is no code path that can emit a whole
// kernel line, because style is not an input. That absence is the invariant
// the stage29 boundary test pins: a kernel link rendered whole is the reverse
// halo, drawn.

// Break width: evidentiary distance as a fraction of the segment, clamped so
// even a one-tier gap visibly snaps and even a maximal gap keeps its stub.
export function breakFraction(distance, maxDistance) {
  const d = Math.max(1, Number(distance) || 1);
  const m = Math.max(1, Number(maxDistance) || 1);
  return Math.min(0.85, Math.max(0.25, d / m));
}

function styleFor(kind) {
  return kind === 'kernel' ? 'broken' : 'solid';
}

// specs({ claim, descentLinks, lineages }) → array of line specs.
//   claim:        the selected (hydrated) claim
//   descentLinks: [{supporter_id, supported_id}] — the claim's own support
//                 descent (solid, as before 2.9)
//   lineages:     the /api/claims/:id/lineage payload's `lineages` array
export function lineageSpecs({ claim, descentLinks = [], lineages = [] }) {
  const specs = [];
  const seen = new Set();
  const addSupport = (from, to, extra = {}) => {
    const key = `${from}->${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    specs.push({
      kind: 'support',
      style: styleFor('support'),
      from,
      to,
      contested: !!extra.contested,
      lineageIndex: extra.lineageIndex ?? null
    });
  };

  for (const l of descentLinks) addSupport(l.supporter_id, l.supported_id);

  lineages.forEach((lin, i) => {
    for (const hop of lin.hops || []) {
      addSupport(hop.supporter_id, hop.supported_id, {
        contested: hop.contested,
        lineageIndex: i
      });
    }
    // The kernel link itself: always broken, snapping at the boundary where
    // sourcing runs out. When the support chain genuinely reaches the claim,
    // the break rides an elevated arc over the final hop — the evidence flows
    // (solid, on the surface) AND the placement gap is real (broken, above).
    specs.push({
      kind: 'kernel',
      style: styleFor('kernel'),
      from: lin.break.after_claim_id,
      to: claim.id,
      breakFraction: breakFraction(lin.break.distance, lin.break.max_distance),
      gap: lin.break.gap,
      contested: !!lin.contested,
      elevated: !!lin.reaches_claim,
      kernelId: lin.kernel.id,
      lineageIndex: i
    });
  });

  return specs;
}

// The membership set for the hover whisper: every claim that would light up.
// No lines are drawn at hover — this is only WHO, never HOW.
export function lineageMembers(claim, byId) {
  const members = new Set();
  if (!claim) return members;
  const queue = [claim.id];
  while (queue.length) {
    const c = byId.get(queue.shift());
    if (!c) continue;
    for (const sup of c.supported_by || []) {
      if (!members.has(sup)) {
        members.add(sup);
        queue.push(sup);
      }
    }
  }
  for (const l of claim.kernel_links || []) members.add(l.kernel_id);
  for (const l of claim.overreached_by || []) members.add(l.claim_id);
  members.delete(claim.id);
  return members;
}

// Rest-state tile material channels, all derived from the record — no new
// stored fields for appearance, ever.
export function tileMaterial(claim, now = Date.now()) {
  const weighted = (claim.sources || []).filter(
    (s) =>
      s.relation === 'supports' &&
      !s.is_claimant_self_published &&
      s.tier !== 'anonymous' &&
      s.tier !== 'self_published'
  ).length;
  const survived = (claim.challenges || []).filter((c) => c.outcome === 'rejected').length;
  const recentMs = 30 * 24 * 3600 * 1000;
  const contention = (claim.challenges || []).some((c) => {
    const t = Date.parse(String(c.created_at).replace(' ', 'T') + 'Z');
    return Number.isFinite(t) && now - t < recentMs;
  });
  return {
    // 0..1: matte/papery → dense/polished
    mass: Math.min(1, weighted / 3),
    // count of survived challenges, capped for drawing
    weathering: Math.min(6, survived),
    // live contention breathes; settled claims go still
    pulse: contention
  };
}
