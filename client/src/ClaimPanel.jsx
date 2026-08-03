import { useEffect, useState } from 'react';
import { api } from './api.js';
import { visibleAtDepth, depthNeededFor } from './depth.js';
import TabBar from './Tabs.jsx';
import ClaimPicker from './ClaimPicker.jsx';
import SourcePicker from './SourcePicker.jsx';
import { CURATOR_VERIFIED_LABEL, DEMO_UNVERIFIED_LABEL } from './verifyStatus.js';
import { PAGE_IMPERMANENCE_HINT } from './sandboxState.js';

const RELATIONS = ['supports', 'contradicts', 'is_origin_of'];
const REL_GLYPH = { supports: '＋', contradicts: '−', is_origin_of: '⊙' };

const TIERS = ['core', 'inner', 'middle', 'outer', 'outermost'];
const SOURCE_TIERS = [
  'primary_doc',
  'court_record',
  'reputable_secondary',
  'single_outlet',
  'self_published',
  'anonymous'
];
const CHALLENGE_TYPES = [
  'bad_source',
  'contradicting_evidence',
  'equivocation',
  'mis_tiered',
  'layer_mismatch'
];

const rank = (t) => TIERS.indexOf(t);
const zeroWeight = (s) =>
  s.relation === 'supports' &&
  (s.is_claimant_self_published || s.tier === 'anonymous' || s.tier === 'self_published');

function Badges({ claim }) {
  return (
    <div>
      <span className={`badge layer-${claim.layer}`}>{claim.layer}</span>
      <span className="badge">{claim.kind}</span>
      <span className={`badge tier tier-${claim.radial_tier ?? 'offaxis'}`}>
        {claim.radial_tier ?? 'off-axis'}
      </span>
      <span className={`badge status-${claim.status}`}>{claim.status}</span>
      {claim.vertical.direction !== 'neutral' && (
        <span className="badge">
          {claim.vertical.direction === 'help' ? '▲ helped' : '▼ harmed'} ·{' '}
          {claim.vertical.magnitude} · documented
        </span>
      )}
    </div>
  );
}

// The floor, never the promise: per-tier requirement checklist, computed by
// the same function the promotion battery runs.
function TierPreviewBlock({ preview }) {
  if (!preview || preview.tiers.length === 0) return null;
  return (
    <div className="card preview">
      <strong>What each tier requires — the floor, not a promise</strong>
      {preview.tiers.map((t) => (
        <div key={t.tier} className="preview-tier">
          <span className={`badge tier tier-${t.tier}`}>{t.tier}</span>
          <span className={t.floor_met ? 'floor-met' : 'floor-unmet'}>
            {t.floor_met ? 'meets the floor' : 'floor not met'}
          </span>
          <ul>
            {t.checks.map((c, i) => (
              <li key={i} className={c.met ? 'check-met' : 'check-unmet'}>
                {c.met ? '✓' : '✗'} {c.label}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="preview-note">{preview.note}</p>
    </div>
  );
}

export default function ClaimPanel({
  claim,
  claimIndex,
  visibleClaims,
  librarySources = [],
  topicId,
  depth,
  setDepth,
  run,
  demo = false,
  frozen = false,
  onDeselect,
  onScrubTo,
  onCompare,
  onPark, // 2.97A: (entry) => void — freeze a draft or pointer into the lot
  resume = null, // 2.97A: {form: 'challenge'|'source-attach', fields, nonce}
  pageHref = (id) => `/claim/${id}` // punch 9: App routes canonical vs session pages
}) {
  // 2.97 Amendment A: resuming a parked draft rehydrates the form exactly
  // as left — the DRAFT is frozen; the claim around it is today's record
  // (this component always renders the live `claim` prop).
  useEffect(() => {
    if (!resume) return;
    if (resume.form === 'challenge') {
      const f = resume.fields || {};
      if (f.type) setChType(f.type);
      if (f.outcome) setChOutcome(f.outcome);
      if (f.description != null) setChDesc(f.description);
      if (f.resulting_tier != null) setChTier(f.resulting_tier);
      setTab('move');
    } else if (resume.form === 'source-attach') {
      const f = resume.fields || {};
      setSrc((prev) => ({ ...prev, ...f }));
      setTab('sources');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume?.nonce]);

  // 2.97A: the claim-pointer park — a research flag with a note.
  const [pinNote, setPinNote] = useState('');

  // 2.98 C: the review-status socket — derived from reserved 'review'
  // events; with none it reads the honest single-curator line.
  const [reviewLine, setReviewLine] = useState(null);
  useEffect(() => {
    let live = true;
    api
      .reviewStatus(claim.id)
      .then((r) => live && setReviewLine(r.line))
      .catch(() => live && setReviewLine(null));
    return () => {
      live = false;
    };
  }, [claim.id]);
  const [linkCopied, setLinkCopied] = useState(false);

  // 2.95: the claim's full interleaved history (placements, moves with the
  // superseded/corrected distinction, FAILED promotions, attachments) —
  // fetched from the record, never flattened.
  const [history, setHistory] = useState(null);
  useEffect(() => {
    let live = true;
    api
      .claimHistory(claim.id)
      .then((h) => live && setHistory(h))
      .catch(() => live && setHistory(null));
    return () => {
      live = false;
    };
    // Punch 5: depend on the claim OBJECT — every reload is a fresh one, so
    // an adjudication on the same claim re-fetches history immediately.
    // The old [claim.id, challenges.length] deps missed withdrawal
    // rejections, which change no challenge row — a stale tab displayed
    // nothing while the log remembered.
  }, [claim]);
  // 2.9c tabs — presentation only. Every form's state lives HERE, not in
  // the tab panes, so switching tabs never loses half-typed input, and no
  // tab ever gates or reorders data.
  const [tab, setTab] = useState('claim');
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    let live = true;
    if (claim.radial_tier && claim.radial_tier !== 'core') {
      api.tierPreview(claim.id).then((p) => live && setPreview(p)).catch(() => {});
    } else {
      setPreview(null);
    }
    return () => {
      live = false;
    };
  }, [claim]);
  const [attachId, setAttachId] = useState('');
  const [attachRel, setAttachRel] = useState('supports');
  // 2.98b: withdrawn library entries are not attachable (the server refuses
  // too — the picker just doesn't offer what the rules would refuse).
  const attachable = librarySources.filter(
    (s) => !s.withdrawn && !claim.sources.some((cs) => cs.id === s.id)
  );
  // 2.98b Amendment A: two-phase withdrawal. One "Withdrawal" dropdown per
  // source opens the scope menu; the reason form FILES A PROPOSAL (zero
  // rule effect until adjudication), refused server-side without a reason
  // (the UI renders refusals, it does not pre-decide them).
  const [withdrawMenu, setWithdrawMenu] = useState(null); // source id with the menu open
  const [withdrawing, setWithdrawing] = useState(null); // {scope, id, citation}
  const [withdrawReason, setWithdrawReason] = useState('');
  const [promoteTo, setPromoteTo] = useState('');
  const [demoteTo, setDemoteTo] = useState('');
  const [demoteReason, setDemoteReason] = useState('');
  const [establishedFacts, setEstablishedFacts] = useState('');
  const [demoteKernelId, setDemoteKernelId] = useState('');
  const [kernelTarget, setKernelTarget] = useState('');
  const [kernelGap, setKernelGap] = useState({ establishes: '', asserts_beyond: '', path_inward: '' });
  // One shared mini-form for challenging a link (kernel link or support hop).
  const [linkChallenge, setLinkChallenge] = useState(null); // {kind, ...ref}
  const [linkChDesc, setLinkChDesc] = useState('');
  const [linkChOutcome, setLinkChOutcome] = useState('rejected');
  const [linkChType, setLinkChType] = useState('equivocation');
  const [chType, setChType] = useState('bad_source');
  const [chDesc, setChDesc] = useState('');
  const [chOutcome, setChOutcome] = useState('upheld');
  const [chTier, setChTier] = useState('');
  // 2.99b: the kind challenge — two-phase, the only mover of kind.
  const [kindTo, setKindTo] = useState('');
  const [kindReason, setKindReason] = useState('');
  const [src, setSrc] = useState({
    tier: 'primary_doc',
    citation: '',
    url: '',
    relation: 'supports',
    is_claimant_self_published: false
  });
  const [supportTarget, setSupportTarget] = useState('');

  const onRings = claim.radial_tier != null;

  // 2.99b: contest the CATEGORY — two-phase, adjudicated by the
  // resolvability test, the only mover of kind. Rendered on the Move tab
  // for on-axis claims and on the Claim tab for off-axis ones (which have
  // no Move tab). The challenge never rewords; a deliberate rewording is a
  // recast (a new claim naming recast_of).
  const kindCard = !demo && (
    <div className="card">
      <strong>Contest the category (kind)</strong>
      <p className="small muted" style={{ margin: '4px 0' }}>
        This claim is <b>{claim.kind}</b>. A kind challenge argues it is miscategorized AS
        WRITTEN — the test: could documents, court records, reporting, or data bear on this
        exact sentence, in either direction? Not whether such evidence exists — whether it
        could. Filing has zero effect until adjudication; rejected attempts stay on the
        record. The challenge never rewords; to reword, add a new claim as a recast.
      </p>
      {claim.kind_proposal ? (
        <>
          <div className="small">
            <span className="badge contested">kind challenge pending</span>{' '}
            {claim.kind} → {claim.kind_proposal.to} — {claim.kind_proposal.reason}
          </div>
          <div className="small muted">
            Filed {claim.kind_proposal.at}; zero effect until adjudication. Adjudicated by
            curator · {reviewLine || 'Independent review: none yet — single-curator record.'}
          </div>
          <div className="row">
            <button
              className="small danger-soft"
              onClick={() =>
                run(
                  () => api.adjudicateKindChallenge(claim.id, 'upheld'),
                  'Kind challenge upheld — the routing effect fires now, on the record.',
                  { confirm: `Uphold ${claim.kind} → ${claim.kind_proposal.to}? ${claim.kind_proposal.to === 'metaphysical' ? 'Tier and vertical clear, every link severs with logged events, and dependents re-evaluate — at this moment.' : claim.kind === 'metaphysical' ? 'The claim enters the rings at exactly what its attached evidence earns — no free inward movement.' : 'Kind corrects in place; tier is untouched.'}` }
                )
              }
            >
              uphold
            </button>
            <button
              className="small"
              onClick={() =>
                run(
                  () => api.adjudicateKindChallenge(claim.id, 'rejected'),
                  'Kind challenge rejected — the attempt stays permanently on the record.',
                  { confirm: 'Reject this kind challenge? The kind stands and the rejected attempt remains visible in history.' }
                )
              }
            >
              reject
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="row">
            <select value={kindTo} onChange={(e) => setKindTo(e.target.value)}>
              <option value="">contest to…</option>
              {['empirical', 'historical', 'metaphysical'].filter((k) => k !== claim.kind).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <textarea
            value={kindReason}
            onChange={(e) => setKindReason(e.target.value)}
            placeholder="The resolvability argument: which evidence type could bear on this exact sentence, and how?"
          />
          <button
            className="small"
            disabled={!kindTo || !kindReason.trim()}
            onClick={() =>
              run(
                () => api.proposeKindChallenge(claim.id, kindTo, kindReason.trim()).then((r) => { setKindTo(''); setKindReason(''); return r; }),
                'Kind challenge filed — zero effect until adjudication.',
                { confirm: `File a kind challenge (${claim.kind} → ${kindTo})? Filing proposes; the kind moves only if adjudication upholds it.` }
              )
            }
          >
            file kind challenge
          </button>
        </>
      )}
    </div>
  );
  const inwardTiers = onRings ? TIERS.filter((t) => rank(t) < rank(claim.radial_tier)) : [];
  const outwardTiers = onRings ? TIERS.filter((t) => rank(t) > rank(claim.radial_tier)) : [];
  // Link targets: any visible claim in any topic (the dial hides content,
  // so hidden claims never appear in a dropdown either).
  const others = visibleClaims.filter((c) => c.id !== claim.id && c.radial_tier != null);

  // Resolve link ids across all topics; split into dial-visible and
  // dial-hidden so hidden dependencies are counted, never silently orphaned.
  const resolveLinks = (ids) => {
    const shown = [];
    const hidden = [];
    for (const id of ids) {
      const entry = claimIndex.get(id);
      if (!entry) continue;
      if (visibleAtDepth(entry.claim, depth)) shown.push(entry);
      else hidden.push(entry);
    }
    return { shown, hidden };
  };
  const supportsLinks = resolveLinks(claim.supports_claims);
  const supportedByLinks = resolveLinks(claim.supported_by);
  const hiddenLinked = [...supportsLinks.hidden, ...supportedByLinks.hidden];
  const neededDepth = hiddenLinked.length
    ? Math.max(...hiddenLinked.map((e) => depthNeededFor(e.claim)))
    : null;
  const topicTag = (entry) =>
    entry.claim.topic_id !== topicId ? ` [${entry.topicName}]` : '';

  return (
    <div>
      <h2>
        Claim #{claim.id}
        <button className="small" style={{ float: 'right' }} onClick={onDeselect}>close</button>
      </h2>
      <TabBar
        label="Claim panel sections"
        tab={tab}
        setTab={setTab}
        tabs={[
          {
            key: 'claim',
            label: 'Claim',
            pending: !!linkChallenge || !!kernelTarget
          },
          { key: 'sources', label: `Sources (${claim.sources.length})` },
          ...(onRings ? [{ key: 'move', label: 'Move', pending: !!(chDesc.trim() || demoteReason.trim() || promoteTo) }] : []),
          // Punch 5: the count includes rejected withdrawal attempts — the
          // record counts them, so the label does too.
          { key: 'history', label: `History (${claim.challenges.length + claim.sources.reduce((n, s) => n + (s.rejected_withdrawals?.length || 0), 0)})` }
        ]}
      />

      {tab === 'claim' && (
      <div className="tabpane" role="tabpanel">
      <Badges claim={claim} />
      <p className="claim-text">{claim.text}</p>
      {reviewLine && <p className="review-line">{reviewLine}</p>}
      <div className="row" style={{ marginBottom: 6 }}>
        {/* Punch 9: the affordance works for EVERY claim — canonical,
            undiverged claims open the public page (impermanence line);
            copy-only and diverged claims open the SESSION page, which
            carries the not-shareable banner. Never a dead link. */}
        {(() => {
          const href = pageHref(claim.id);
          const session = href.startsWith('/sandbox/');
          const hint = session
            ? 'Session page — renders your private copy, this browser session only, not shareable; a public address arrives when this claim is imported at multiplayer.'
            : `This claim's shareable page — generated entirely from the record. ${PAGE_IMPERMANENCE_HINT}`;
          return (
            <>
              <a className="small page-link" href={href} target="_blank" rel="noreferrer" title={hint}>
                {session ? 'session page ↗' : 'page ↗'}
              </a>
              <button
                className="small"
                title={session ? 'Copies the session URL — it works in this browser while the copy lives; it is not shareable.' : PAGE_IMPERMANENCE_HINT}
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}${href}`).then(() => {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2500);
                  });
                }}
              >
                {linkCopied ? '✓ copied' : 'copy link'}
              </button>
            </>
          );
        })()}
      </div>
      {/* 2.99b: kind adjudication + recast provenance on the claim's face. */}
      {claim.kind_proposal && (
        <p className="small" style={{ margin: '2px 0' }}>
          <span className="badge contested">kind challenge pending</span>{' '}
          {claim.kind} → {claim.kind_proposal.to} — zero effect until adjudication (Move tab).
        </p>
      )}
      {claim.recast_of_claim && (
        <p className="small muted" style={{ margin: '2px 0' }}>
          Empirical recast of off-axis #{claim.recast_of_claim.id} “{claim.recast_of_claim.text.slice(0, 70)}…” —
          zero weight both ways: the original never moves with this claim's fate.
        </p>
      )}
      <div className="reason">
        <strong>Why it sits here:</strong> {claim.placement_reason}
      </div>
      {/* Off-axis claims have no Move tab — the kind machinery lives here. */}
      {!onRings && kindCard}
      {claim.vertical.direction === 'neutral' && claim.radial_tier && (
        <p className="axis-hint">
          No documented-outcome evidence attached — the vertical axis stays empty rather than
          guessed.
        </p>
      )}
      {onPark && (
        <div className="park-inline">
          <textarea
            className="composer"
            rows={1}
            placeholder="note for your parking lot (optional)"
            aria-label="Note for your parking lot (optional)"
            value={pinNote}
            onChange={(e) => {
              setPinNote(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
            }}
          />
          <button
            className="small"
            title="Freeze a pointer to this claim (with your note) into the parking lot"
            onClick={() => {
              onPark({
                kind: 'claim-pointer',
                context: { claim_id: claim.id, claim_text: claim.text.slice(0, 80) },
                note: pinNote.trim()
              });
              setPinNote('');
            }}
          >
            ⏸ park claim
          </button>
        </div>
      )}
      </div>
      )}

      {tab === 'sources' && (
      <div className="tabpane" role="tabpanel">
      <h3>Sources ({claim.sources.length})</h3>
      {claim.sources.length === 0 && <div className="empty">No sources attached.</div>}
      {claim.sources.map((s) => (
        <div className="src" key={s.id}>
          <span className={`rel-${s.relation}`}>{REL_GLYPH[s.relation]}</span>
          <span className="cite">
            <span className="badge">{s.tier}</span>
            {s.relation === 'is_origin_of' && (
              <span className="badge origin">origin — provenance, zero weight</span>
            )}
            {zeroWeight(s) && <span className="badge zero">zero weight</span>}
            {s.is_claimant_self_published && <span className="badge zero">claimant’s own</span>}
            {s.verification === 'curator' && (
              <span className="badge" title="Resolved live and checked in the 2.98b source audit">
                {CURATOR_VERIFIED_LABEL}
              </span>
            )}
            <br />
            {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.citation}</a> : s.citation}
            {s.verification === 'pending' && (
              <>
                <br />
                <span className="small muted">{DEMO_UNVERIFIED_LABEL}</span>
              </>
            )}
            {/* Punch 5 (2.98b DoD-8): rejected attempts stay ON the source —
                compact, expandable, permanent. */}
            {s.rejected_withdrawals?.length > 0 && (
              <details className="small" style={{ marginTop: 3 }}>
                <summary className="muted" style={{ cursor: 'pointer' }}>
                  withdrawal rejected — attempt on record
                  {s.rejected_withdrawals.length > 1 ? ` ×${s.rejected_withdrawals.length}` : ''}
                </summary>
                {s.rejected_withdrawals.map((r, i) => (
                  <div className="muted" key={i} style={{ margin: '3px 0 0 10px' }}>
                    {r.at} · proposed by {r.proposer ?? 'unknown'} · rejected by {r.adjudicator}
                    {r.scope === 'library' ? ' (library-wide proposal)' : ''}
                    <br />
                    {r.reason}
                  </div>
                ))}
              </details>
            )}
          </span>
          {!demo && !s.withdrawal_proposed && (
            <span style={{ position: 'relative' }}>
              <button
                className="small danger-soft"
                title="File a withdrawal proposal — reason required; the source keeps its full standing until the proposal is adjudicated"
                onClick={() => setWithdrawMenu(withdrawMenu === s.id ? null : s.id)}
              >
                Withdrawal ▾
              </button>
              {withdrawMenu === s.id && (
                <span className="withdraw-menu" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 30, display: 'flex', flexDirection: 'column', background: 'var(--panel, #1a1f2e)', border: '1px solid var(--border, #333)', borderRadius: 6, minWidth: 170 }}>
                  <button
                    className="small"
                    style={{ textAlign: 'left' }}
                    onClick={() => {
                      setWithdrawing({ scope: 'claim', id: s.id, citation: s.citation });
                      setWithdrawReason('');
                      setWithdrawMenu(null);
                    }}
                  >
                    from this claim…
                  </button>
                  <button
                    className="small"
                    style={{ textAlign: 'left' }}
                    onClick={() => {
                      setWithdrawing({ scope: 'library', id: s.id, citation: s.citation });
                      setWithdrawReason('');
                      setWithdrawMenu(null);
                    }}
                  >
                    from the library…
                  </button>
                </span>
              )}
            </span>
          )}
        </div>
      ))}

      {/* Amendment A: pending proposals — visible immediately, zero rule
          effect, adjudicated by the curator with plain-stated honesty. */}
      {claim.sources.filter((s) => s.withdrawal_proposed).map((s) => (
        <div className="card" key={`p${s.id}`} style={{ borderStyle: 'dashed' }}>
          <span className="badge contested">withdrawal proposed{s.withdrawal_proposed.scope === 'library' ? ' (library-wide)' : ''}</span>
          <div className="small">
            <s>{s.citation}</s>
          </div>
          <div className="small muted">
            {s.withdrawal_proposed.at} — {s.withdrawal_proposed.reason}
          </div>
          <div className="small muted">
            This source keeps its full standing until adjudication — a proposal has zero rule effect.
          </div>
          <div className="small muted">
            Adjudicated by curator · {reviewLine || 'Independent review: none yet — single-curator record.'}
          </div>
          {!demo && (
            <div className="row">
              <button
                className="small danger-soft"
                onClick={() =>
                  run(
                    () =>
                      s.withdrawal_proposed.scope === 'library'
                        ? api.adjudicateLibraryWithdrawal(s.id, 'upheld')
                        : api.adjudicateWithdrawal(claim.id, s.id, 'upheld'),
                    'Withdrawal upheld — effect and ripples fire now.',
                    { confirm: `Uphold this withdrawal${s.withdrawal_proposed.scope === 'library' ? ' from the LIBRARY (every leaning claim re-evaluates)' : ''}? The source becomes withdrawn and tier floors re-evaluate — at this moment, on the record.` }
                  )
                }
              >
                uphold
              </button>
              <button
                className="small"
                onClick={() =>
                  run(
                    () =>
                      s.withdrawal_proposed.scope === 'library'
                        ? api.adjudicateLibraryWithdrawal(s.id, 'rejected')
                        : api.adjudicateWithdrawal(claim.id, s.id, 'rejected'),
                    'Withdrawal rejected — the source stands; the attempt stays on the record.',
                    { confirm: 'Reject this withdrawal proposal? The source stands, and the rejected attempt remains permanently visible in history.' }
                  )
                }
              >
                reject
              </button>
            </div>
          )}
        </div>
      ))}

      {withdrawing && !demo && (
        <div className="card" style={{ marginTop: 6 }}>
          <strong>
            Propose withdrawal {withdrawing.scope === 'library' ? 'from the topic LIBRARY' : 'from this claim'}
          </strong>
          <p className="small muted" style={{ margin: '4px 0' }}>
            Filing proposes — it does not remove. The source keeps its full standing until the
            proposal is adjudicated{withdrawing.scope === 'library' ? '; upheld, every claim leaning on it re-evaluates at once' : ''}.
            Rejected proposals stay permanently visible in history.
          </p>
          <textarea
            rows={2}
            placeholder="why should this evidence be withdrawn? (required — permanent on the record)"
            aria-label="Withdrawal reason (required)"
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
          />
          <div className="row">
            <button
              className="small danger-soft"
              onClick={() => {
                const w = withdrawing;
                run(
                  () =>
                    w.scope === 'library'
                      ? api.proposeLibraryWithdrawal(w.id, withdrawReason)
                      : api.proposeWithdrawal(claim.id, w.id, withdrawReason),
                  'Withdrawal proposed — no effect until adjudication.',
                  { confirm: w.scope === 'library' ? 'File this LIBRARY withdrawal proposal, with this reason? No effect until it is adjudicated.' : 'File this withdrawal proposal, with this reason? No effect until it is adjudicated.' }
                );
                setWithdrawing(null);
              }}
            >
              file proposal
            </button>
            <button className="small" onClick={() => setWithdrawing(null)}>
              cancel
            </button>
          </div>
        </div>
      )}

      {(claim.withdrawn_sources || []).length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>Withdrawn — no longer part of the case</h3>
          {claim.withdrawn_sources.map((s) => (
            <div className="src withdrawn-src" key={`w${s.id}`} style={{ opacity: 0.65 }}>
              <span className={`rel-${s.relation}`}>{REL_GLYPH[s.relation]}</span>
              <span className="cite">
                <span className="badge">{s.tier}</span>
                <span className="badge zero">
                  withdrawn from {s.withdrawn_scope === 'library' ? 'the library' : 'this claim'}
                </span>
                <br />
                <s>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.citation}</a> : s.citation}</s>
                <br />
                <span className="small muted">
                  {s.withdrawn_at} — {s.withdrawn_reason}
                </span>
                <br />
                <span className="small muted">{reviewLine || 'Independent review: none yet — single-curator record.'}</span>
              </span>
            </div>
          ))}
        </>
      )}

      {!demo && (
      <details>
        <summary>Attach a source</summary>
        {attachable.length > 0 && (
          <div className="attach-existing">
            <label>From the topic library (create once, attach everywhere)</label>
            <div className="row">
              <SourcePicker
                sources={attachable}
                value={attachId}
                onChange={(id) => setAttachId(id === '' ? '' : String(id))}
                placeholder="search the library by citation…"
              />
              <select
                value={attachRel}
                onChange={(e) => setAttachRel(e.target.value)}
                style={{ maxWidth: 130 }}
              >
                {RELATIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              <button
                className="small"
                disabled={!attachId}
                onClick={() =>
                  run(
                    () => api.addSource(claim.id, { source_id: Number(attachId), relation: attachRel }),
                    'Source attached from the library.',
                    { confirm: `Attach this library source as "${attachRel}"?` }
                  )
                }
              >
                Attach
              </button>
            </div>
            <label style={{ marginTop: 10 }}>…or add a new source</label>
          </div>
        )}
        <div className="row">
          <div>
            <label>Tier</label>
            <select value={src.tier} onChange={(e) => setSrc({ ...src, tier: e.target.value })}>
              {SOURCE_TIERS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>Relation</label>
            <select value={src.relation} onChange={(e) => setSrc({ ...src, relation: e.target.value })}>
              {RELATIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <label>Citation</label>
        <input value={src.citation} onChange={(e) => setSrc({ ...src, citation: e.target.value })} />
        <label>URL (optional)</label>
        <input value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} />
        <div className="checkline">
          <input
            type="checkbox"
            id="selfpub"
            checked={src.is_claimant_self_published}
            onChange={(e) => setSrc({ ...src, is_claimant_self_published: e.target.checked })}
          />
          <label htmlFor="selfpub" style={{ margin: 0 }}>
            Published by the claimant themselves (contributes zero weight)
          </label>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Attaching evidence never moves a claim by itself — promotion still has to survive review.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="primary"
            onClick={() =>
              run(async () => {
                await api.addSource(claim.id, src);
                setSrc({ ...src, citation: '', url: '' });
              }, 'Source attached.', { confirm: `Attach this new source as "${src.relation}"?` })
            }
          >
            Attach
          </button>
          {onPark && (
            <button
              className="small"
              title="Freeze this source draft into the parking lot — nothing is attached"
              onClick={() =>
                onPark({
                  kind: 'source-attach',
                  context: { claim_id: claim.id, claim_text: claim.text.slice(0, 80), form: 'source-attach' },
                  draft: { ...src }
                })
              }
            >
              ⏸ park draft
            </button>
          )}
        </div>
      </details>
      )}
      </div>
      )}

      {onRings && tab === 'move' && (
        <div className="tabpane" role="tabpanel">
          {(!demo || (preview && preview.tiers.length > 0)) && (
            <h3>{demo ? 'Tier requirements' : 'Move this claim'}</h3>
          )}
          <TierPreviewBlock preview={preview} />
          {!demo && inwardTiers.length > 0 && (
            <div className="card">
              <strong>Promote inward</strong> — must survive the automatic review.
              <div className="row" style={{ marginTop: 6 }}>
                <select value={promoteTo} onChange={(e) => setPromoteTo(e.target.value)}>
                  <option value="">target tier…</option>
                  {inwardTiers.map((t) => <option key={t}>{t}</option>)}
                </select>
                <button
                  className="primary"
                  disabled={!promoteTo}
                  onClick={() =>
                    run(() => api.promote(claim.id, promoteTo), `Survived review — promoted to ${promoteTo}.`)
                  }
                >
                  Propose promotion
                </button>
              </div>
            </div>
          )}
          {!demo && outwardTiers.length > 0 && (
            <div className="card">
              <strong>Demote / correct outward</strong> — one step, stated reason, applied immediately.
              <label>Established facts (optional — the debunker restatement)</label>
              <textarea
                placeholder="Restate what IS established, plainly…"
                value={establishedFacts}
                onChange={(e) => setEstablishedFacts(e.target.value)}
              />
              <label>Why the remainder moves out (becomes the placement reason)</label>
              <textarea
                placeholder="What’s missing or wrong…"
                value={demoteReason}
                onChange={(e) => setDemoteReason(e.target.value)}
              />
              <label>
                Kernel of the correction (optional — links the remainder to its established
                ground; the gap statement is derived from the fields above)
              </label>
              <ClaimPicker
                claims={others.filter((c) => demoteTo && rank(c.radial_tier) < rank(demoteTo))}
                currentTopicId={topicId}
                value={demoteKernelId}
                onChange={(id) => setDemoteKernelId(id === '' ? '' : String(id))}
                placeholder={demoteTo ? 'kernel of the correction… (optional)' : 'pick a target tier first…'}
              />
              <div className="row" style={{ marginTop: 6 }}>
                <select value={demoteTo} onChange={(e) => { setDemoteTo(e.target.value); setDemoteKernelId(''); }}>
                  <option value="">target tier…</option>
                  {outwardTiers.map((t) => <option key={t}>{t}</option>)}
                </select>
                <button
                  disabled={!demoteTo}
                  onClick={() =>
                    run(
                      () =>
                        api.demote(claim.id, {
                          target_tier: demoteTo,
                          reason: demoteReason,
                          established_facts: establishedFacts || undefined,
                          kernel: demoteKernelId ? { kernel_id: Number(demoteKernelId) } : undefined
                        }),
                      `Pushed outward to ${demoteTo}.`
                    )
                  }
                >
                  Demote
                </button>
              </div>
            </div>
          )}

          {kindCard}

          {!demo && (
          <>
          <h3>Raise a challenge</h3>
          <div className="card">
            <div className="row">
              <div>
                <label>Type</label>
                <select value={chType} onChange={(e) => setChType(e.target.value)}>
                  {CHALLENGE_TYPES.filter((t) => t !== 'kind_mismatch').map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>Outcome</label>
                <select value={chOutcome} onChange={(e) => setChOutcome(e.target.value)}>
                  <option value="upheld">upheld (claim moves outward)</option>
                  <option value="rejected">rejected (claim survives)</option>
                </select>
              </div>
            </div>
            <label>What’s wrong (or what was checked)</label>
            <textarea value={chDesc} onChange={(e) => setChDesc(e.target.value)} />
            {chOutcome === 'upheld' && (
              <>
                <label>Resulting tier (outward only — challenges never promote)</label>
                <select value={chTier} onChange={(e) => setChTier(e.target.value)}>
                  <option value="">no tier change</option>
                  {outwardTiers.map((t) => <option key={t}>{t}</option>)}
                </select>
              </>
            )}
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button
                className="primary"
                onClick={() =>
                  run(
                    () =>
                      api.challenge(claim.id, {
                        type: chType,
                        description: chDesc,
                        outcome: chOutcome,
                        resulting_tier: chOutcome === 'upheld' && chTier ? chTier : undefined
                      }),
                    'Challenge recorded.'
                  )
                }
              >
                Record challenge
              </button>
              {onPark && (
                <button
                  className="small"
                  title="Freeze this challenge draft into the parking lot — nothing is recorded"
                  onClick={() =>
                    onPark({
                      kind: 'challenge',
                      context: { claim_id: claim.id, claim_text: claim.text.slice(0, 80), form: 'challenge' },
                      draft: { type: chType, outcome: chOutcome, description: chDesc, resulting_tier: chTier }
                    })
                  }
                >
                  ⏸ park draft
                </button>
              )}
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {onRings && tab === 'claim' && (
        <div className="tabpane" role="tabpanel">
          <h3>Support links</h3>
          {claim.supports_claims.length === 0 && claim.supported_by.length === 0 && (
            <div className="empty">No support links.</div>
          )}
          {supportsLinks.shown.map((e) => (
            <div className="linkline" key={`s${e.claim.id}`}>
              <span>→ supports</span>{' '}
              <span>#{e.claim.id}{topicTag(e)} {e.claim.text.slice(0, 44)}…</span>
              {!demo && (
                <>
                  {/* 2.98b: no direct link removal — a support link ends only
                      through a recorded hop challenge (reason, outcome, and
                      the row itself stay on the record forever). */}
                  <button
                    className="small"
                    title="Challenge this hop — the recorded way a link ends. Upheld severs it; either way the challenge stays on the record."
                    onClick={() => {
                      setLinkChallenge({
                        kind: 'hop',
                        hop: { supporter_id: claim.id, supported_id: e.claim.id },
                        label: `the hop to #${e.claim.id}`
                      });
                      setLinkChDesc('');
                    }}
                  >
                    ⚑ contest
                  </button>
                </>
              )}
            </div>
          ))}
          {supportedByLinks.shown.map((e) => (
            <div className="linkline" key={`b${e.claim.id}`}>
              <span>← supported by</span>{' '}
              <span>#{e.claim.id}{topicTag(e)} {e.claim.text.slice(0, 44)}…</span>
              {!demo && (
                <button
                  className="small"
                  title="Challenge this hop — the link, not either claim's standing"
                  onClick={() => {
                    setLinkChallenge({
                      kind: 'hop',
                      hop: { supporter_id: e.claim.id, supported_id: claim.id },
                      label: `the hop from #${e.claim.id}`
                    });
                    setLinkChDesc('');
                  }}
                >
                  ⚑
                </button>
              )}
            </div>
          ))}
          {hiddenLinked.length > 0 && (
            <div className="linkline hidden-dep">
              <span>
                ⊕ linked to {hiddenLinked.length} claim{hiddenLinked.length === 1 ? '' : 's'} at
                deeper levels
              </span>
              <button className="small" onClick={() => setDepth(neededDepth)}>
                extend dial to {neededDepth}
              </button>
            </div>
          )}
          {!demo && (
          <div className="row" style={{ marginTop: 6 }}>
            <ClaimPicker
              claims={others}
              currentTopicId={topicId}
              value={supportTarget}
              onChange={(id) => setSupportTarget(id === '' ? '' : String(id))}
              placeholder="this claim supports… (search this onion, type for others)"
            />
            <button
              className="small"
              style={{ flex: '0 0 auto' }}
              disabled={!supportTarget}
              onClick={() => run(() => api.addSupport(claim.id, Number(supportTarget)), 'Support link added.', { confirm: `Add a support link — record this claim as supporting #${supportTarget}?` })}
            >
              Link
            </button>
          </div>
          )}

          <h3>Nearest established ground</h3>
          {(claim.kernel_links || []).length === 0 && (
            <div className="empty">
              No kernel link — this claim floats free of any established kernel. That absence is
              its own signal.
            </div>
          )}
          {(claim.kernel_links || []).map((l) => (
            <div className="card kernel-link" key={l.id}>
              <div>
                <span className="badge kernel">kernel — zero weight</span>
                {l.origin === 'debunker' && <span className="badge">from a correction</span>}
                {l.contested && <span className="badge contested">questioned — survived</span>}
              </div>
              <div className="linkline" style={{ marginTop: 4 }}>
                <span>
                  ⌁ #{l.kernel_id} [{l.kernel_tier}] {l.kernel_text.slice(0, 60)}
                </span>
              </div>
              <div className="gap-statement">
                <div><strong>Establishes:</strong> {l.gap_establishes}</div>
                <div><strong>Asserted beyond it:</strong> {l.gap_asserts_beyond}</div>
                <div><strong>Path inward:</strong> {l.gap_path_inward}</div>
              </div>
              <p className="kernel-warning">
                This connection shows where the evidence stops — it does not support this claim.
              </p>
              {!demo && (
                <div className="row">
                  {/* 2.98b: no direct link removal — a kernel link ends only
                      through a recorded challenge; the gap statement travels
                      into the removal event, never lost. */}
                  <button
                    className="small"
                    title="Challenge this link — the recorded way a kernel link ends. Upheld removes it (gap statement preserved in the event); rejected marks it questioned-and-survived."
                    onClick={() => {
                      setLinkChallenge({ kind: 'kernel', kernel_link_id: l.id, label: `kernel link to #${l.kernel_id}` });
                      setLinkChDesc('');
                    }}
                  >
                    challenge this link
                  </button>
                </div>
              )}
            </div>
          ))}

          {(claim.overreached_by || []).length > 0 && (
            <>
              <h3>Claims that overreach from this</h3>
              <p className="kernel-warning" style={{ marginTop: 0 }}>
                A warning, not a family tree — established claims attracting overreach are the
                ones to watch.
              </p>
              {(claim.overreached_by || []).map((l) => (
                <div className="linkline" key={l.id}>
                  <span>
                    ⇢ #{l.claim_id} [{l.claim_tier}] {l.claim_text.slice(0, 52)}
                  </span>
                  {l.contested && <span className="badge contested">questioned</span>}
                </div>
              ))}
            </>
          )}

          {!demo && (
            <details>
              <summary>Add a kernel link (requires the gap statement)</summary>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                Annotation, not support: zero evidentiary weight, in either direction. The gap
                statement is the payload — creation without one is refused.
              </p>
              <label>Kernel (must sit strictly inward)</label>
              <ClaimPicker
                claims={others.filter((c) => rank(c.radial_tier) < rank(claim.radial_tier))}
                currentTopicId={topicId}
                value={kernelTarget}
                onChange={(id) => setKernelTarget(id === '' ? '' : String(id))}
                placeholder="pick the established kernel… (search this onion, type for others)"
              />
              <label>What the kernel establishes</label>
              <input
                value={kernelGap.establishes}
                onChange={(e) => setKernelGap({ ...kernelGap, establishes: e.target.value })}
                placeholder="documented through 1973…"
              />
              <label>What this claim asserts beyond it</label>
              <input
                value={kernelGap.asserts_beyond}
                onChange={(e) => setKernelGap({ ...kernelGap, asserts_beyond: e.target.value })}
                placeholder="continuation after the documented record ends…"
              />
              <label>The path inward (what evidence would close the gap)</label>
              <input
                value={kernelGap.path_inward}
                onChange={(e) => setKernelGap({ ...kernelGap, path_inward: e.target.value })}
                placeholder="any post-1973 primary record…"
              />
              <div style={{ marginTop: 8 }}>
                <button
                  className="primary"
                  disabled={!kernelTarget}
                  onClick={() =>
                    run(async () => {
                      await api.addKernel(claim.id, {
                        kernel_id: Number(kernelTarget),
                        ...kernelGap
                      });
                      setKernelTarget('');
                      setKernelGap({ establishes: '', asserts_beyond: '', path_inward: '' });
                    }, 'Kernel link recorded — where the evidence stops is now on the record.', { confirm: `Record a kernel link to #${kernelTarget}? Zero weight — it marks where the evidence stops.` })
                  }
                >
                  Link to kernel
                </button>
              </div>
            </details>
          )}

          {linkChallenge && !demo && (
            <div className="card">
              <strong>Challenge {linkChallenge.label}</strong>
              <div className="row">
                <div>
                  <label>Type</label>
                  <select value={linkChType} onChange={(e) => setLinkChType(e.target.value)}>
                    {CHALLENGE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label>Outcome</label>
                  <select value={linkChOutcome} onChange={(e) => setLinkChOutcome(e.target.value)}>
                    <option value="rejected">rejected (link survives, marked questioned)</option>
                    <option value="upheld">upheld (link is removed)</option>
                  </select>
                </div>
              </div>
              <label>What’s wrong with this link</label>
              <textarea value={linkChDesc} onChange={(e) => setLinkChDesc(e.target.value)} />
              <div className="row" style={{ marginTop: 6 }}>
                <button
                  className="primary"
                  disabled={!linkChDesc.trim()}
                  onClick={() =>
                    run(async () => {
                      await api.challenge(claim.id, {
                        type: linkChType,
                        description: linkChDesc,
                        outcome: linkChOutcome,
                        ...(linkChallenge.kind === 'kernel'
                          ? { kernel_link_id: linkChallenge.kernel_link_id }
                          : { hop: linkChallenge.hop })
                      });
                      setLinkChallenge(null);
                    }, 'Link challenge recorded.', { confirm: `Record this ${linkChOutcome} challenge against ${linkChallenge.label}?${linkChOutcome === 'upheld' ? ' Upheld severs the link — permanently, on the record.' : ''}` })
                  }
                >
                  Record link challenge
                </button>
                <button className="small" onClick={() => setLinkChallenge(null)}>cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
      <div className="tabpane" role="tabpanel">
      <h3>History</h3>
      {!history && <div className="empty">reading the record…</div>}
      {history && history.entries.length === 0 && <div className="empty">No recorded events.</div>}
      {history &&
        [...history.entries].reverse().map((e, i) => (
          <div className="challenge-item" key={i}>
            <span className="meta">{e.at}</span>{' '}
            <span className="badge">{e.kind.replace(/_/g, ' ')}</span>
            {e.from && e.to && (
              <>
                {' '}
                <span className={`badge tier tier-${e.from}`}>{e.from}</span>→
                <span className={`badge tier tier-${e.to}`}>{e.to}</span>
              </>
            )}
            {/* Error vs. supersession — the distinction the rendering must
                not flatten. Unlabeled when the record cannot say. */}
            {e.classification === 'superseded' && (
              <span className="badge superseded" title="Sound on then-available evidence; later evidence displaced it. The demotion is the system working.">
                superseded by later evidence
              </span>
            )}
            {e.classification === 'corrected' && (
              <span className="badge corrected" title="The placement itself was judged wrong on the then-known record.">
                corrected placement
              </span>
            )}
            {e.kind === 'promotion_failed' && (
              <span className="badge contested" title="An honest record includes what was tried and refused.">
                refused
              </span>
            )}
            {e.origin === 'derived' && (
              <span className="badge derived" title="Backfilled from a record that carries its own timestamp — predates the event log. Actor unknown, never guessed.">
                derived from record
              </span>
            )}
            <div>{e.text}</div>
            {/* 2.98b B: attach/withdraw entries carry their independent-
                review state — currently the honest single-curator line.
                Display only; no submission machinery exists. */}
            {['source_attached', 'source_detached', 'withdrawal_proposed', 'withdrawal_rejected'].includes(e.kind) && (
              <div className="muted" style={{ fontSize: 12 }}>
                {e.kind.startsWith('withdrawal') ? 'Adjudicated by curator · ' : ''}
                {reviewLine || 'Independent review: none yet — single-curator record.'}
              </div>
            )}
            <div className="history-actions">
              <span className="muted">actor: {e.actor == null ? 'unknown' : e.actor}</span>
              {onScrubTo && (
                <button className="small" onClick={() => onScrubTo(e.at)} title="Render the whole map as it stood at this moment">
                  map at this moment
                </button>
              )}
              {onCompare && (
                <button className="small" onClick={() => onCompare(claim.id, e.at)} title="This claim then vs. now, side by side">
                  compare with now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
