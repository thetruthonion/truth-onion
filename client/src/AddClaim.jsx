// SPDX-License-Identifier: AGPL-3.0-only
import { useState } from 'react';
import { api, RuleRejection } from './api.js';

const TIERS = ['core', 'inner', 'middle', 'outer', 'outermost'];
const SOURCE_TIERS = [
  'primary_doc',
  'court_record',
  'reputable_secondary',
  'single_outlet',
  'self_published',
  'anonymous'
];

const RELATIONS = ['supports', 'contradicts', 'is_origin_of'];

const blankSource = () => ({
  source_id: null,
  tier: 'primary_doc',
  citation: '',
  url: '',
  relation: 'supports',
  is_claimant_self_published: false
});

export default function AddClaim({
  topicId,
  librarySources = [],
  offAxisClaims = [], // 2.99b: recast candidates — the topic's off-axis claims
  initialText = '',
  initialDraft = null, // 2.97 Amendment A: a parked draft, rehydrated as left
  onDone,
  onCancel,
  onPark, // (draftFields) => void — freezes the form into the parking lot
  askConfirm, // (message, proceed) — the app-wide confirm bar
  setRejection
}) {
  const d = initialDraft || {};
  const [text, setText] = useState(d.text ?? initialText);
  const [kind, setKind] = useState(d.kind ?? 'empirical');
  const [recastOf, setRecastOf] = useState(d.recastOf ?? '');
  const [layer, setLayer] = useState(d.layer ?? 'factual');
  const [tier, setTier] = useState(d.tier ?? 'outer');
  const [reason, setReason] = useState(d.reason ?? '');
  const [direction, setDirection] = useState(d.direction ?? 'neutral');
  const [magnitude, setMagnitude] = useState(d.magnitude ?? 1);
  const [evidenced, setEvidenced] = useState(d.evidenced ?? false);
  const [sources, setSources] = useState(d.sources ?? []);
  const [suggested, setSuggested] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Everything the park freezes — the DRAFT, byte-for-byte. Nothing here is
  // submitted; parking never touches the record.
  const draftFields = () => ({
    text,
    kind,
    layer,
    tier,
    reason,
    direction,
    magnitude,
    evidenced,
    sources,
    recastOf
  });

  const metaphysical = kind === 'metaphysical';

  const submit = async (tierOverride) => {
    setRejection(null);
    setSuggested(null);
    setSubmitting(true);
    try {
      const claim = await api.createClaim({
        topic_id: topicId,
        text,
        kind,
        layer,
        radial_tier: metaphysical ? undefined : (tierOverride ?? tier),
        // Punch 13: when the floors refused the author's tier and this is
        // the earned-tier resubmit, the ORIGINAL proposal rides along so
        // the creation event records proposed-vs-landed honestly.
        proposed_tier: metaphysical ? undefined : tier,
        // 2.99b: the recast relation — a deliberate evidence-eligible
        // rewording of an off-axis claim. Zero weight in both directions.
        recast_of: !metaphysical && recastOf ? Number(recastOf) : undefined,
        placement_reason: reason,
        vertical: { direction, magnitude, evidenced },
        sources: sources
          .filter((s) => s.source_id != null || s.citation.trim())
          .map((s) =>
            s.source_id != null
              ? { source_id: s.source_id, relation: s.relation }
              : s
          )
      });
      onDone(claim);
    } catch (e) {
      if (e instanceof RuleRejection) {
        setRejection(e);
        if (e.earned_tier) setSuggested(e.earned_tier);
      } else {
        setRejection({ message: e.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const setSrc = (i, patch) =>
    setSources(sources.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <div>
      <h2>
        Add a claim
        <button className="small" style={{ float: 'right' }} onClick={onCancel}>cancel</button>
      </h2>

      <label>Claim text — stated faithfully, as its proponents state it</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />

      {/* 2.99b: the recast relation — this claim is a DELIBERATE
          evidence-eligible rewording of an off-axis claim. Distinct from a
          kind challenge: the challenge says a sentence was miscategorized
          as written; the recast is a different sentence. Zero weight both
          ways — the original never moves with this claim's fate. */}
      {!metaphysical && offAxisClaims.length > 0 && (
        <>
          <label>Recast of (optional — an off-axis claim this one deliberately rewords)</label>
          <select value={recastOf} onChange={(e) => setRecastOf(e.target.value)}>
            <option value="">not a recast</option>
            {offAxisClaims.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} — {c.text.slice(0, 80)}
              </option>
            ))}
          </select>
          {recastOf && (
            <p className="muted" style={{ fontSize: 11.5 }}>
              Provenance displayed on both pages, weight carried by neither: this claim answers to
              the evidence axis alone, and the original's standing never moves with it.
            </p>
          )}
        </>
      )}

      <div className="row">
        <div>
          <label>Kind</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="empirical">empirical</option>
            <option value="historical">historical</option>
            <option value="metaphysical">metaphysical</option>
          </select>
        </div>
        <div>
          <label>Layer</label>
          <select value={layer} onChange={(e) => setLayer(e.target.value)}>
            <option value="factual">factual</option>
            <option value="moral">moral</option>
            <option value="framing">framing</option>
          </select>
        </div>
        <div>
          <label>Proposed tier</label>
          <select value={tier} onChange={(e) => setTier(e.target.value)} disabled={metaphysical}>
            {TIERS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {metaphysical && (
        <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          Metaphysical claims take no tier — they go to the “not empirically decidable” list.
        </p>
      )}

      <label>Placement reason — why does it sit at this tier? What’s missing?</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} />

      <div className="row">
        <div>
          <label>Vertical (documented outcome)</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="neutral">neutral / contested</option>
            <option value="help">help (people helped)</option>
            <option value="harm">harm (people harmed)</option>
          </select>
        </div>
        {/* Rider C: the field DISABLES (visibly, with its why) while
            direction is neutral — it used to hide, and a stale typed value
            could ride a neutral submission into a silent zero. */}
        <div>
          <label>Magnitude (1–3)</label>
          <input
            type="number" min="1" max="3"
            value={magnitude}
            disabled={direction === 'neutral'}
            title={direction === 'neutral' ? 'Not recorded while direction is neutral — the axis stays empty rather than guessed.' : undefined}
            onChange={(e) => setMagnitude(Number(e.target.value))}
          />
          {direction === 'neutral' && (
            <span className="muted" style={{ fontSize: 11.5 }}>
              Not recorded while direction is neutral — the axis stays empty rather than guessed.
            </span>
          )}
        </div>
      </div>
      {direction !== 'neutral' && (
        <div className="checkline">
          <input type="checkbox" id="evd" checked={evidenced} onChange={(e) => setEvidenced(e.target.checked)} />
          <label htmlFor="evd" style={{ margin: 0 }}>
            Evidenced — documented outcomes, not conviction (required for up/down placement)
          </label>
        </div>
      )}

      <h3>Sources</h3>
      {sources.map((s, i) => (
        <div className="card" key={i}>
          {librarySources.length > 0 && (
            <>
              <label>From the library (create once, attach everywhere)</label>
              <select
                value={s.source_id ?? ''}
                onChange={(e) =>
                  setSrc(i, { source_id: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">new source…</option>
                {librarySources.map((ls) => (
                  <option key={ls.id} value={ls.id}>
                    [{ls.tier}] {ls.citation.slice(0, 70)}
                  </option>
                ))}
              </select>
            </>
          )}
          <div className="row">
            {s.source_id == null && (
              <div>
                <label>Tier</label>
                <select value={s.tier} onChange={(e) => setSrc(i, { tier: e.target.value })}>
                  {SOURCE_TIERS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            )}
            <div>
              <label>Relation</label>
              <select value={s.relation} onChange={(e) => setSrc(i, { relation: e.target.value })}>
                {RELATIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <button className="small danger-soft" onClick={() => setSources(sources.filter((_, j) => j !== i))}>✕</button>
          </div>
          {s.source_id == null && (
            <>
              <label>Citation</label>
              <input value={s.citation} onChange={(e) => setSrc(i, { citation: e.target.value })} />
              <label>URL (optional)</label>
              <input value={s.url} onChange={(e) => setSrc(i, { url: e.target.value })} />
              <div className="checkline">
                <input
                  type="checkbox"
                  id={`sp${i}`}
                  checked={s.is_claimant_self_published}
                  onChange={(e) => setSrc(i, { is_claimant_self_published: e.target.checked })}
                />
                <label htmlFor={`sp${i}`} style={{ margin: 0 }}>Published by the claimant (zero weight)</label>
              </div>
            </>
          )}
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <button onClick={() => setSources((prev) => [...prev, blankSource()])}>+ source</button>
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button
          className="primary"
          disabled={submitting}
          onClick={() =>
            askConfirm
              ? askConfirm(
                  `Submit this claim at "${metaphysical ? 'off-axis' : tier}" for review? The rules decide where it may sit.`,
                  () => submit()
                )
              : submit()
          }
        >
          {submitting ? 'Reviewing…' : 'Submit — the rules decide'}
        </button>
        {suggested && (
          <button
            disabled={submitting}
            onClick={() =>
              askConfirm
                ? askConfirm(`Place this claim at the tier its evidence earns (${suggested})?`, () => submit(suggested))
                : submit(suggested)
            }
          >
            Place at what it earns: {suggested}
          </button>
        )}
        {onPark && (
          <button
            className="small"
            disabled={submitting}
            title="Freeze this draft into the parking lot — nothing is submitted; resume it later exactly as left"
            onClick={() => onPark(draftFields())}
          >
            ⏸ park this draft
          </button>
        )}
      </div>
    </div>
  );
}
