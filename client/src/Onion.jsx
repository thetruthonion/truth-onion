// The visual onion: five concentric rings, innermost = strongest. Claims sit
// on the ring of their radial_tier; vertical position encodes documented
// help (up) / harm (down). Metaphysical claims never appear here.

const SIZE = 920;
const C = SIZE / 2;
const TIER_BANDS = {
  core: [0, 80],
  inner: [80, 148],
  middle: [148, 216],
  outer: [216, 284],
  outermost: [284, 352]
};
// 2.9c: hue encodes TIER and nothing else — the same tokens the 3D view
// consumes, so 2D/3D toggling never changes what a color means. Claim kind
// is carried by the node's outline dash pattern, never by fill hue.
const TIER_FILL = {
  core: 'var(--tier-core)',
  inner: 'var(--tier-inner)',
  middle: 'var(--tier-middle)',
  outer: 'var(--tier-outer)',
  outermost: 'var(--tier-outermost)'
};
const KIND_DASH = { factual: undefined, moral: '5 3', framing: '2 3' };
const STATUS_STROKE = {
  confirmed: 'var(--good)',
  refuted: 'var(--critical)',
  contested: 'var(--baseline)'
};

function truncate(text, n = 24) {
  return text.length > n ? text.slice(0, n - 1) + '…' : text;
}

const TIER_INDEX = { core: 0, inner: 1, middle: 2, outer: 3, outermost: 4 };
// Angular offsets so neutral claims in adjacent rings don't share a ray
// (which stacks their outward-running labels), while staying near the
// horizontal band that reads as "neutral".
const NEUTRAL_STAGGER = { core: 0, inner: -0.5, middle: 0.75, outer: -0.25, outermost: 0.5 };

// Labels run outward along the claim's own ray, so they escape the crowded
// center instead of stacking under the dots.
function labelProps(theta) {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  if (cos > 0.25) return { x: 18, y: sin * 10 + 4, textAnchor: 'start' };
  if (cos < -0.25) return { x: -18, y: sin * 10 + 4, textAnchor: 'end' };
  return { x: 0, y: sin > 0 ? 28 : -20, textAnchor: 'middle' };
}

// Angle from vertical placement: help gathers in the upper hemisphere, harm
// in the lower, neutral to the sides. Claims sharing a zone fan out.
function positionClaims(claims) {
  const groups = {};
  for (const c of claims) {
    const key = `${c.radial_tier}:${c.vertical.direction}`;
    (groups[key] ??= []).push(c);
  }
  const pos = {};
  for (const [key, group] of Object.entries(groups)) {
    const [tier, direction] = key.split(':');
    const [r0, r1] = TIER_BANDS[tier];
    const rMid = (r0 + r1) / 2;
    group.forEach((c, i) => {
      const fan =
        (i - (group.length - 1) / 2) * (tier === 'core' ? Math.PI / 2.2 : Math.PI / 7);
      // Stagger neutral claims per ring so different tiers don't line up
      // along one ray and stack their labels.
      const stagger = NEUTRAL_STAGGER[tier];
      let theta;
      if (direction === 'help') theta = -Math.PI / 2 + fan;
      else if (direction === 'harm') theta = Math.PI / 2 + fan;
      else
        theta =
          (i % 2 === 0 ? 0 : Math.PI) +
          (Math.floor(i / 2) - 0.5) * (Math.PI / 5) +
          stagger;
      const r = tier === 'core' ? 40 + i * 22 : rMid;
      pos[c.id] = {
        x: C + r * Math.cos(theta),
        y: C + r * Math.sin(theta),
        theta
      };
    });
  }
  return pos;
}

export default function Onion({ claims, depth = 5, selectedId, onSelect, onNarrate }) {
  const ringClaims = claims.filter((c) => c.radial_tier);
  const pos = positionClaims(ringClaims);
  const visibleBands = Object.entries(TIER_BANDS).filter(
    ([tier]) => TIER_INDEX[tier] + 1 <= depth
  );

  const links = [];
  for (const c of ringClaims) {
    for (const sid of c.supports_claims) {
      if (pos[c.id] && pos[sid]) links.push({ from: c.id, to: sid });
    }
  }
  const hot = (l) => l.from === selectedId || l.to === selectedId;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Evidence onion: claims on concentric rings by tier">
      {visibleBands.map(([tier, [, r1]]) => (
        <g key={tier} className="reveal">
          <circle className="ring" cx={C} cy={C} r={r1} strokeWidth={tier === 'core' ? 1.5 : 1} />
          <text className="ring-label" x={C} y={C - r1 + 14} textAnchor="middle">
            {tier}
          </text>
        </g>
      ))}

      {links.map((l) => {
        const a = pos[l.from];
        const b = pos[l.to];
        return (
          <line
            key={`${l.from}-${l.to}`}
            className={`support-link${hot(l) ? ' hot' : ''}`}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            strokeDasharray="4 3"
          />
        );
      })}

      {ringClaims.map((c) => {
        const p = pos[c.id];
        const selected = c.id === selectedId;
        const dim = selectedId != null && !selected &&
          !c.supports_claims.includes(selectedId) && !c.supported_by.includes(selectedId);
        return (
          <g
            key={c.id}
            className={`node reveal${dim ? ' dim' : ''}`}
            transform={`translate(${p.x},${p.y})`}
            onClick={() => onSelect(c.id)}
            onDoubleClick={() => onNarrate && onNarrate(c.id)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(c.id)}
            role="button"
            tabIndex={0}
            aria-label={`${c.radial_tier} claim: ${c.text}`}
          >
            {/* 2px surface ring so overlapping marks stay separable */}
            <circle r={13} fill="var(--page)" />
            <circle
              r={11}
              fill={TIER_FILL[c.radial_tier]}
              stroke={selected ? 'var(--ink)' : STATUS_STROKE[c.status]}
              strokeWidth={selected ? 2.5 : 2}
              strokeDasharray={selected ? undefined : KIND_DASH[c.layer]}
            />
            {c.status === 'refuted' && (
              <text y={3.5} textAnchor="middle" fontSize="10" fill="var(--page)" fontWeight="700">✕</text>
            )}
            <text {...labelProps(p.theta)}>{truncate(c.text)}</text>
          </g>
        );
      })}
    </svg>
  );
}
