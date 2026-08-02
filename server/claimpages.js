// Stage 2.98: claim pages. Every claim gets a stable, server-rendered,
// READ-ONLY permalink — a fact-check-article-shaped page generated entirely
// from the record. Shared like a fact-checker link, checkable unlike one.
//
// Binding rules (from the design capture, all pinned):
// 1. STATUS TRAVELS INSEPARABLY, including share previews: the <title> and
//    OpenGraph card carry status and tier — a refuted claim unfurls as
//    refuted, never as a neutral headline.
// 2. Generated from the record only. If it isn't in the record, it isn't on
//    the page — no page-side prose, no summaries the record didn't write.
// 3. Off-axis claims render their off-axis explanation and are never
//    presented as ranked proven/unproven.
// 4. Read-only; every demo protection applies to page routes.
// 5. URL scheme: /claim/<id>. Seeded ids are deterministic (the seed
//    inserts in fixed order), so seeded permalinks survive seed rebuilds —
//    tested. Recorded in PROJECT-STATE.
//
// THE CLAIM PAGE IS A DOCUMENT (2.98 correction). An article-shaped
// write-up in the layout family of thetruthonion.org — parchment ground,
// editorial typography, PASTEL tier set. The engine is dark/neon; the page
// is light/pastel — instantly distinguishable, BY DESIGN, so dark/neon
// appears nowhere here (this supersedes the earlier dark-mode request, per
// the operator's correction). No script tags, no engine bundle assets:
// view-source shows the claim, and the page renders with JavaScript off.
// The masthead logo and hero band below are the site's own light design
// system (thetruthonion.org): indigo is the palette's ink, the ring art is
// the pastel tier set — the engine's neon set still appears nowhere here.
//
// ON-PAGE TIME MACHINE (operator request, post-2.98). Scrubbing happens on
// the page itself, not by bouncing to the engine: every recorded moment of
// the claim is a plain <a href="?at=<timestamp>"> stop, and ?at renders the
// document as it stood then — reconstructed server-side from claimAtTime,
// so the scrubber needs no script. Historical views are labeled
// reconstructions, read-only, and inherit the log-epoch honesty (pre-epoch
// views say they are incomplete; nothing is guessed).

import { getClaim } from './db.js';
import { claimHistory, claimAtTime, normTs } from './timemachine.js';
import { RuleError, truncate } from './rules.js';
import { CURATOR_VERIFIED_LABEL } from './sourcelinks.js';

// 2.99a Amendment B/C: the feedback address and the impermanence line —
// the page promises nothing the disposable demo host can't keep.
export const FEEDBACK_ADDRESS = 'truth.onionwright@gmail.com';
export const IMPERMANENCE_LINE =
  'This page is served by the demo host, temporary by design — permanent claim addresses arrive with multiplayer.';

// The reserved review event type (kickoff C). Append-only like every event;
// NO path writes one yet — contest-the-key (2.99) and multiplayer review
// (Stage 3) plug in here.
export const REVIEW_EVENT_ACTION = 'review';

export function reviewStatus(db, claimId, { upTo = null } = {}) {
  let rows = db
    .prepare('SELECT actor, created_at, reason FROM events WHERE claim_id = ? AND action = ?')
    .all(claimId, REVIEW_EVENT_ACTION);
  if (upTo) rows = rows.filter((r) => r.created_at <= upTo);
  if (rows.length === 0) {
    return {
      reviews: 0,
      line: 'Independent review: none yet — single-curator record.'
    };
  }
  return {
    reviews: rows.length,
    line: `Independent review: ${rows.length} review event${rows.length === 1 ? '' : 's'} on record.`,
    events: rows
  };
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// The pastel tier set — the reading surface's ONLY tier colors. The neon
// set belongs to the engine and must not appear on a page (pinned).
const TIER_LIGHT = { core: '#C97F1F', inner: '#F3BFA8', middle: '#C9BEE0', outer: '#AFCBE3', outermost: '#BFD8CB' };

// The site's logo mark (thetruthonion.org), light variant: indigo T-glyph,
// pastel rings. Inline SVG — no asset fetch, no script.
function logoMark() {
  const rings = Object.values(TIER_LIGHT)
    .map((c, i) => `<circle cx="1036" cy="444" r="${188 + i * 53}" stroke="${c}" stroke-opacity="${(1 - i * 0.09).toFixed(2)}"/>`)
    .join('');
  return `<svg viewBox="0 0 1480 888" aria-hidden="true" focusable="false"><rect x="44" y="148" width="470" height="90" fill="#131A2A"/><rect x="234" y="148" width="90" height="592" fill="#131A2A"/><g fill="none" stroke-width="38">${rings}</g></svg>`;
}

// The hero's ring art — the site's concentric-tier figure, pastel set.
function heroRings() {
  const rings = Object.values(TIER_LIGHT)
    .map((c, i) => `<circle cx="400" cy="400" r="${88 + i * 68}" stroke="${c}" stroke-opacity="${(0.5 - i * 0.08).toFixed(2)}"/>`)
    .join('');
  return `<svg viewBox="0 0 800 800" aria-hidden="true"><g fill="none" stroke-width="30">${rings}</g></svg>`;
}

function pageCss() {
  const tiersLight = Object.entries(TIER_LIGHT).map(([t, c]) => `--tier-${t}:${c};`).join('');
  return `
:root{--ground:#F7F2E7;--vellum:#F2E8D5;--indigo:#131A2A;--ink:#131A2A;--muted:#5C6270;--card:#FFFFFF;--border:rgba(19,26,42,.15);--accent:#C97F1F;${tiersLight}
--sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
--serif:Georgia,"Iowan Old Style",Palatino,"Times New Roman",serif;
--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);line-height:1.55;font-size:16px}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
.masthead{position:sticky;top:0;z-index:10;background:var(--ground);border-bottom:1px solid var(--border)}
.masthead .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:66px}
.mark{display:flex;align-items:center;gap:10px;text-decoration:none}
.mark svg{width:58px;height:35px;display:block}
.mark .word{font-weight:700;letter-spacing:-.018em;font-size:16px;color:var(--ink)}
.masthead nav{display:flex;gap:18px}
.masthead nav a{text-decoration:none;font-size:14px;font-weight:500;color:var(--muted);padding:4px 0;border-bottom:2px solid transparent}
.masthead nav a:hover{border-bottom-color:var(--accent);color:var(--ink)}
.hero{position:relative;background:var(--indigo);color:var(--vellum);overflow:hidden}
.hero-art{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
.hero-art svg{width:min(110vw,46rem);aspect-ratio:1}
.hero .wrap{position:relative;padding-top:42px;padding-bottom:46px}
.hero .eyebrow{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0 0 12px}
.hero h1.claim{font-family:var(--serif);font-size:clamp(24px,4.5vw,32px);line-height:1.3;margin:14px 0 18px;color:#fff}
.chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.chip{border:1px solid transparent;border-radius:999px;padding:2px 12px;font-size:12.5px;background:var(--vellum);color:var(--ink)}
.chip.tier{background:var(--tc);font-weight:600}
.chip.status-refuted{color:#a32020;font-weight:600}
.chip.status-confirmed{color:#0a6b0a}
.chip.status-contested{color:#8a5410}
.cta{display:inline-block;background:var(--accent);color:var(--indigo);border-radius:999px;padding:9px 20px;text-decoration:none;font-weight:600;margin-top:4px}
.cta:hover{background:#dd8f26}
main.wrap{padding-top:22px;padding-bottom:60px}
.hist{background:var(--vellum);border:1px solid var(--accent);border-radius:10px;padding:10px 14px;margin:0 0 14px;font-size:14px}
.hist strong{font-family:var(--mono);font-size:13px}
.note-incomplete{border-style:dashed;color:var(--muted)}
.review{font-size:13px;color:var(--muted);border:1px dashed var(--border);border-radius:8px;padding:6px 12px;margin:10px 0}
section{margin:26px 0}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin:8px 0}
.reason{font-family:var(--serif);border-left:3px solid var(--accent);padding-left:14px}
.src-tier{font-family:var(--mono);font-size:12px;border:1px solid var(--border);border-radius:5px;padding:1px 7px}
.zero{color:#d03b3b;font-size:12px;border:1px solid #d03b3b;border-radius:5px;padding:1px 7px}
.recon{color:var(--muted);font-size:12px;border:1px dashed var(--muted);border-radius:5px;padding:1px 7px}
.card.withdrawn{opacity:.72;border-style:dashed}
.wd-flag{color:var(--muted);font-size:12px;border:1px dashed var(--muted);border-radius:5px;padding:1px 7px}
.muted{color:var(--muted)}.small{font-size:13px}
.kernel{border-left:3px solid var(--tier-inner)}
.break-line{font-family:var(--mono);letter-spacing:1px;color:var(--tier-inner)}
.gap{font-size:13.5px;margin-top:6px}
.event{font-size:13.5px;padding:6px 0;border-bottom:1px dashed var(--border)}
.event:last-child{border-bottom:none}
.ts{font-family:var(--mono);font-size:12px;color:var(--muted)}
a.ts{text-decoration:underline dotted}
a{color:var(--accent)}
.tm-track{display:flex;gap:8px;overflow-x:auto;padding:10px 2px 12px;align-items:stretch}
.stop{flex:none;text-decoration:none;border:1px solid var(--border);border-radius:10px;background:var(--card);padding:7px 11px;min-width:96px}
.stop .d{font-family:var(--mono);font-size:11.5px;color:var(--muted);display:block}
.stop .k{font-size:12.5px;color:var(--ink);display:block;margin-top:2px}
.stop:hover{border-color:var(--accent)}
.stop.active{border-color:var(--accent);background:var(--vellum);box-shadow:inset 0 0 0 1px var(--accent)}
.stop.now .k{font-weight:700}
footer{margin-top:44px;border-top:1px solid var(--border);padding-top:14px;font-size:13px;color:var(--muted)}
.fb{margin-top:14px}
.fb textarea{width:100%;min-height:70px;background:var(--card);color:var(--ink);border:1px solid var(--border);border-radius:8px;padding:8px;font-family:var(--sans)}
.fb select,.fb button{background:var(--card);color:var(--ink);border:1px solid var(--border);border-radius:6px;padding:5px 12px}
.fb .note{font-size:12px;color:var(--muted)}
`;
}

// The status phrase that must survive into every share preview.
function statusPhrase(claim) {
  if (claim.radial_tier == null) return 'Off-axis — not empirically decidable';
  const s = claim.status.toUpperCase();
  return `${s} · ${claim.radial_tier} tier`;
}

// The scrubber: every recorded moment of the claim as a link. Timestamps are
// deduped (several record rows can share one moment); each stop's ?at view
// INCLUDES that moment's effect (claimAtTime keeps records at <= ts).
function scrubberHtml(history, claimId, activeTs) {
  const seen = new Map(); // ts -> label of the first entry at that moment
  for (const e of history.entries) {
    if (!seen.has(e.at)) seen.set(e.at, e.kind.replace(/_/g, ' '));
  }
  const stops = [...seen.entries()]
    .map(
      ([at, kind]) =>
        `<a class="stop${at === activeTs ? ' active' : ''}" href="/claim/${claimId}?at=${encodeURIComponent(at)}"><span class="d">${esc(at)}</span><span class="k">${esc(kind)}</span></a>`
    )
    .join('');
  return `<section class="tm">
    <h2>Time machine</h2>
    <p class="small muted" style="margin:0">Every recorded moment of this claim. Open one to read this page as it stood then — reconstructed from the record, read-only.</p>
    <div class="tm-track">${stops}<a class="stop now${activeTs ? '' : ' active'}" href="/claim/${claimId}"><span class="d">present</span><span class="k">now</span></a></div>
  </section>`;
}

export function renderClaimPage(db, claimId, { origin = '', at = null } = {}) {
  const liveClaim = getClaim(db, claimId);
  if (!liveClaim) throw new RuleError('No such claim.', { rule: 'invalid_input' });
  const ts = at ? normTs(at) : null;
  const snap = ts ? claimAtTime(db, claimId, ts) : null;
  const historical = !!ts;
  const existed = historical ? snap.existed : true;
  // The rendered claim: the reconstruction when scrubbed, the live record
  // otherwise. The record keeps only the current wording of the placement
  // reason — historical views say so instead of pretending.
  const claim = historical && snap.claim ? snap.claim : liveClaim;
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(liveClaim.topic_id);
  const history = claimHistory(db, claimId);
  const review = reviewStatus(db, claimId, historical ? { upTo: ts } : {});
  const offAxis = claim.radial_tier == null;
  const phrase = statusPhrase(claim);
  const pageUrl = `${origin}/claim/${liveClaim.id}`;
  const engineUrl = `${origin}/`;

  const relatedLink = (id) => {
    const c = getClaim(db, id);
    return c
      ? `<a href="/claim/${c.id}">#${c.id} ${esc(truncate(c.text, 80))}</a> <span class="muted small">[${esc(c.radial_tier ?? 'off-axis')}]</span>`
      : `<span class="muted">#${id} (not in this record)</span>`;
  };

  // 2.98b: withdrawn evidence renders diminished-but-visible — what left,
  // why, and when — with its independent-review state (the honest line;
  // display only, no submission machinery).
  const withdrawnHtml = (claim.withdrawn_sources || []).length
    ? `<h2 style="margin-top:18px">Withdrawn — no longer part of the case</h2>` +
      claim.withdrawn_sources
        .map(
          (s) =>
            `<div class="card withdrawn"><span class="src-tier">${esc(s.tier)}</span> <span class="src-tier">${esc(s.relation)}</span> <span class="wd-flag">withdrawn from ${s.withdrawn_scope === 'library' ? 'the library' : 'this claim'}</span><br><s>${s.url ? `<a href="${esc(s.url)}" rel="nofollow noreferrer">${esc(s.citation)}</a>` : esc(s.citation)}</s><br><span class="small muted">${esc(s.withdrawn_at || '')} — ${esc(s.withdrawn_reason || '')}</span><br><span class="small muted">Adjudicated by curator · ${esc(review.line)}</span></div>`
        )
        .join('')
    : '';

  const sourcesHtml = claim.sources.length
    ? claim.sources
        .map((s) => {
          const zero =
            s.relation === 'supports' &&
            (s.is_claimant_self_published || s.tier === 'anonymous' || s.tier === 'self_published');
          return `<div class="card"><span class="src-tier">${esc(s.tier)}</span> <span class="src-tier">${esc(s.relation)}</span> ${zero ? '<span class="zero">zero weight</span> ' : ''}${s.relation === 'is_origin_of' ? '<span class="zero" style="border-color:var(--muted);color:var(--muted)">origin — provenance, zero weight</span> ' : ''}${s.reconstructed ? '<span class="recon">reconstructed — later detached</span> ' : ''}${s.verification === 'curator' ? `<span class="src-tier" title="Resolved live and checked in the 2.98b source audit">${esc(CURATOR_VERIFIED_LABEL)}</span> ` : ''}<br>${s.url ? `<a href="${esc(s.url)}" rel="nofollow noreferrer">${esc(s.citation)}</a>` : esc(s.citation)}${
            s.withdrawal_proposed
              ? `<br><span class="wd-flag">withdrawal proposed — ${esc(s.withdrawal_proposed.reason)}</span> <span class="small muted">Filed ${esc(s.withdrawal_proposed.at)}; this source keeps its full standing until adjudication. Adjudicated by curator · ${esc(review.line)}</span>`
              : ''
          }</div>`;
        })
        .join('')
    : '<p class="muted">No sources attached.</p>';

  const challengesHtml = claim.challenges.length
    ? claim.challenges
        .map(
          (ch) =>
            `<div class="event"><span class="ts">${esc(ch.created_at)}</span> · <strong>${esc(ch.outcome)}</strong> · ${esc(ch.type)} <span class="muted">(${esc(ch.resulting_tier_change)})</span><br>${esc(ch.description)}</div>`
        )
        .join('')
    : '<p class="muted">Never challenged.</p>';

  const kernelsHtml = claim.kernel_links.length
    ? claim.kernel_links
        .map(
          (l) =>
            `<div class="card kernel"><div class="break-line">▮▮▮▮▮▮▮▮ ⌇&nbsp;&nbsp;&nbsp;⌁</div>
<div>Nearest established ground: ${l.kernel_id != null ? relatedLink(l.kernel_id) : '<span class="muted">unrecoverable</span>'}</div>
<div class="gap"><strong>Establishes:</strong> ${esc(l.gap_establishes)}<br><strong>Asserted beyond it:</strong> ${esc(l.gap_asserts_beyond)}<br><strong>Path inward:</strong> ${esc(l.gap_path_inward)}</div>
<div class="muted small">This connection shows where the evidence stops — it does not support this claim. Zero weight in every direction.${l.contested ? ' Questioned and survived challenge.' : ''}${l.reconstructed ? ' Reconstructed — this link was later removed.' : ''}</div></div>`
        )
        .join('')
    : '';

  const supportsHtml =
    claim.supports_claims.length || claim.supported_by.length
      ? [
          ...claim.supported_by.map((id) => `<div class="event">← supported by ${relatedLink(id)}</div>`),
          ...claim.supports_claims.map((id) => `<div class="event">→ supports ${relatedLink(id)}</div>`)
        ].join('')
      : '<p class="muted">No support links.</p>';

  // Each history entry's timestamp is itself a scrubber stop.
  const historyHtml = history.entries
    .map(
      (e) =>
        `<div class="event"><a class="ts" href="/claim/${liveClaim.id}?at=${encodeURIComponent(e.at)}">${esc(e.at)}</a> · ${esc(e.kind.replace(/_/g, ' '))}${e.from ? ` · ${esc(e.from)} → ${esc(e.to)}` : ''}${e.classification === 'superseded' ? ' · <strong>superseded by later evidence</strong>' : ''}${e.classification === 'corrected' ? ' · <strong>corrected placement</strong>' : ''}${e.origin === 'derived' ? ' · <span class="muted">derived from record, actor unknown</span>' : ''}<br><span class="small">${esc(truncate(e.text || '', 220))}</span></div>`
    )
    .join('');

  // Share preview: status and tier IN the card itself (binding rule 1).
  // Historical views carry the moment in the phrase and stay out of indexes;
  // the canonical URL is always the present document.
  const phraseFull = historical ? `${existed ? phrase : 'NOT YET IN THE RECORD'} — as of ${ts}` : phrase;
  const ogTitle = `[${phraseFull}] ${truncate(liveClaim.text, 120)}`;
  const ogDesc = `${phraseFull}. ${truncate(liveClaim.placement_reason, 200)}`;

  const histBanner = !historical
    ? ''
    : `<div class="hist">${
        existed
          ? `Viewing this claim as it stood on <strong>${esc(ts)}</strong> — a reconstruction from the record, read-only. <a href="/claim/${liveClaim.id}">Return to the present</a>.`
          : `On <strong>${esc(ts)}</strong> this claim had not yet entered the record. <a href="/claim/${liveClaim.id}">Return to the present</a>.`
      }</div>${
        snap && snap.pre_epoch
          ? `<div class="hist note-incomplete">This moment predates recorded history (the log begins ${esc(snap.epoch)}). What is shown is derived from records that carry their own timestamps; this view is incomplete and says so rather than guessing.</div>`
          : ''
      }${(snap?.reconstruction_notes || [])
        .filter((n) => !n.startsWith('This moment predates'))
        .map((n) => `<div class="hist note-incomplete">${esc(n)}</div>`)
        .join('')}`;

  const bodySections = !existed
    ? `<section><p class="muted">Nothing to show at this moment — the claim entered the record later. Use the time machine below, or return to the present.</p></section>
       ${scrubberHtml(history, liveClaim.id, ts)}`
    : `
  <section>
    <h2>Why it sits here</h2>
    <p class="reason">${esc(claim.placement_reason)}</p>
    ${historical ? '<p class="small muted">The record keeps only the current wording of the placement reason — the reasons that held at this moment live in the history below.</p>' : ''}
  </section>

  ${scrubberHtml(history, liveClaim.id, ts)}

  <section>
    <h2>Evidence — the case as recorded${historical ? ' at this moment' : ''}</h2>
    ${sourcesHtml}
    ${withdrawnHtml}
    <h2 style="margin-top:18px">Challenges — outcomes and survivals${historical ? ' up to this moment' : ''}</h2>
    ${challengesHtml}
  </section>

  ${kernelsHtml ? `<section><h2>Where the evidence stops</h2>${kernelsHtml}</section>` : ''}

  <section>
    <h2>Related claims</h2>
    ${supportsHtml}
  </section>

  <section>
    <h2>History</h2>
    ${historyHtml}
  </section>`;

  // 2.99a Amendment B + punch 3: feedback is a COPY BOX, not an app launch.
  // Claim pages are pinned script-free, so the anchored popover is a pure
  // <details> element: the address shown as selectable text (select-all on
  // click via CSS user-select), the mailto kept as a secondary option
  // inside it — nothing auto-launches a mail app.
  const feedbackMailto = `mailto:${FEEDBACK_ADDRESS}?subject=${encodeURIComponent(`[dispute] claim #${liveClaim.id} — ${truncate(liveClaim.text, 60)}`)}`;
  const feedbackHtml = `<details class="note fb-pop" id="feedback">
    <summary>Dispute this placement, or report a problem — feedback goes by email</summary>
    <p style="margin:6px 0 0"><code style="user-select:all">${esc(FEEDBACK_ADDRESS)}</code> <span class="muted small">(click to select, then copy)</span></p>
    <p class="small" style="margin:4px 0 0"><a href="${esc(feedbackMailto)}">or open your mail app</a>${process.env.DEMO_REPO_URL ? ` · <a href="${esc(process.env.DEMO_REPO_URL)}">or open an issue on the public repo</a>` : ''}</p>
  </details>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ogTitle)} — Truth Onion</title>
<link rel="canonical" href="${esc(pageUrl)}">
${historical ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(ogDesc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${esc(pageUrl)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(ogTitle)}">
<meta name="twitter:description" content="${esc(ogDesc)}">
<style>${pageCss()}</style>
</head>
<body>
<header class="masthead"><div class="wrap">
  <a class="mark" href="https://thetruthonion.org/">${logoMark()}<span class="word">Truth Onion</span></a>
  <nav><a href="${esc(engineUrl)}?claim=${liveClaim.id}">open the engine</a>${historical ? `<a href="/claim/${liveClaim.id}">back to now</a>` : '<a href="#feedback">feedback</a>'}</nav>
</div></header>

<div class="hero">
  <div class="hero-art">${heroRings()}</div>
  <div class="wrap">
    <p class="eyebrow">topic: ${esc(topic?.name || '')} · claim #${liveClaim.id}${historical ? ` · as of ${esc(ts)}` : ''}</p>
    <div class="chips">
      ${
        !existed
          ? '<span class="chip">not yet in the record</span>'
          : offAxis
            ? '<span class="chip">off-axis — not empirically decidable</span>'
            : `<span class="chip status-${esc(claim.status)}">${esc(claim.status)}</span> <span class="chip tier" style="--tc:var(--tier-${esc(claim.radial_tier)})">${esc(claim.radial_tier)} tier</span>`
      }
      <span class="chip">${esc(liveClaim.kind)}</span>
      <span class="chip">${esc(liveClaim.layer)}</span>
    </div>
    <h1 class="claim">${esc(liveClaim.text)}</h1>
    <a class="cta engine-door" href="${esc(engineUrl)}?claim=${liveClaim.id}">Open in the engine — this claim, on the map</a>
  </div>
</div>

<main class="wrap">
  ${histBanner}
  ${existed && offAxis ? '<p class="muted">This claim cannot be resolved by documents or observation in either direction. It is never ranked proven or unproven — it sits off the evidence rings entirely.</p>' : ''}
  ${existed ? `<div class="review">${esc(review.line)}</div>` : ''}
  ${bodySections}

  <footer>
    <p>Every element above is generated from the claim's record — nothing editorial, nothing the record didn't write. <a href="${esc(engineUrl)}">Inspect it in the engine</a>, or verify this yourself: clone the repository and run the same rules locally${process.env.DEMO_REPO_URL ? ` — <a href="${esc(process.env.DEMO_REPO_URL)}">${esc(process.env.DEMO_REPO_URL)}</a>` : ''}.</p>
    <p class="note">${IMPERMANENCE_LINE}</p>
    ${feedbackHtml}
  </footer>
</main>
</body>
</html>`;
}
