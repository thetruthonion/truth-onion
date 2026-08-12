// SPDX-License-Identifier: AGPL-3.0-only
// The two-pass mask-lift. Pass 1 is bare-core analysis — the character card
// is STRUCTURALLY absent from context. Pass 2 renders a fixed substance
// manifest in persona, validated by a mechanical fidelity gate.
//
// Gate calibration: the gate verifies SUBSTANCE survival, not wording.
// Substance = what a legitimate paraphrase cannot change: tier anchors,
// numerals, proper nouns, and the tool's terms of art ("zero weight",
// "not established", …). Ordinary vocabulary belongs to the voice and is
// free — a render fails only when it drops or contradicts substance.
//
// Fallback: a failed persona-full render falls back to INTERLEAVED
// delivery — gated record blocks with in-character commentary between them.
// The character is never absent from a response; the old "showing bare
// analysis instead" path is gone. Interleaved is also a first-class
// user-selectable rendering style.

import { cardPersonaText } from './cards.js';

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

export const UNVERIFIED_STRIP = 'unverified — not in the record';

// Terms of art: domain substance a render must not paraphrase away.
const DOMAIN_TERMS = [
  'zero weight',
  'not established',
  'debunked',
  'refuted',
  'contested',
  'self-published',
  'no primary'
];

// Capitalized words that are grammar, not names.
const CAP_STOP = new Set(
  'The This That These Those There They Their When Where What Which While With From After Before During However Because Nothing Everything Someone Anyone Does Not And But For Its'.split(' ')
);

// Client-generated anchors: the tier must be audible in ANY voice.
export function requiredAnchors(claim) {
  const anchors = [];
  if (claim.radial_tier) anchors.push(claim.radial_tier);
  if (claim.radial_tier === 'outer') anchors.push('not established');
  if (claim.radial_tier === 'outermost') anchors.push('debunked');
  if (!claim.radial_tier) anchors.push('metaphysical');
  return anchors;
}

// Substance extraction: numerals, proper nouns, terms of art. Nothing else —
// everything else is voice, and voice is free.
export function extractSubstance(text) {
  const s = String(text || '');
  const tokens = new Set();
  for (const num of s.match(/\d[\d,.]*/g) || []) tokens.add(num.replace(/[.,]$/, ''));
  const words = s.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/[^A-Za-z'-]/g, '');
    if (!/^[A-Z][a-z]{2,}/.test(w) || CAP_STOP.has(w)) continue;
    const prev = words[i - 1] || '';
    const sentenceStart = i === 0 || /[.!?:;"]$/.test(prev);
    if (!sentenceStart) tokens.add(norm(w));
  }
  const flat = norm(s);
  for (const term of DOMAIN_TERMS) if (flat.includes(term)) tokens.add(term);
  return [...tokens];
}

export function fidelityTokens(manifest, anchors) {
  const tokens = new Set(anchors.map(norm));
  for (const item of manifest.items || []) {
    for (const t of extractSubstance(item.text)) tokens.add(t);
  }
  return [...tokens];
}

export function checkFidelity(output, tokens) {
  const rendered = norm(output);
  return tokens.filter((t) => !rendered.includes(norm(t)));
}

export function serializeRecord(claim) {
  return JSON.stringify(
    {
      text: claim.text,
      kind: claim.kind,
      layer: claim.layer,
      tier: claim.radial_tier ?? 'off-axis (metaphysical)',
      status: claim.status,
      placement_reason: claim.placement_reason,
      vertical: claim.vertical,
      sources: claim.sources,
      challenges: claim.challenges,
      supports_claims: claim.supports_claims,
      supported_by: claim.supported_by,
      // Stage 2.9: the descent from bedrock is part of the record the
      // companion narrates — kernels, gap statements, routed lineages, all
      // zero-weight annotations. The gap text is groundable like everything
      // else: pass 1 can only cite what appears here verbatim.
      kernel_links: (claim.kernel_links || []).map((l) => ({
        kernel_id: l.kernel_id,
        kernel_text: l.kernel_text,
        kernel_tier: l.kernel_tier,
        establishes: l.gap_establishes,
        asserts_beyond: l.gap_asserts_beyond,
        path_inward: l.gap_path_inward,
        contested: l.contested,
        note: 'zero weight — shows where the evidence stops; does not support this claim'
      })),
      overreached_by: (claim.overreached_by || []).map((l) => ({
        claim_id: l.claim_id,
        claim_text: l.claim_text,
        claim_tier: l.claim_tier
      })),
      lineage: claim.lineage ?? undefined
    },
    null,
    1
  );
}

// Grounding: an item's basis must appear verbatim (whitespace/case-normal-
// ized) in the record. Anything else is flagged, never silently trusted.
export function groundCheck(manifest, recordString) {
  const record = norm(recordString);
  const items = (manifest.items || []).map((item) => {
    const basis = norm(item.basis);
    const unverified = !basis || !record.includes(basis);
    return { ...item, unverified };
  });
  return { ...manifest, items };
}

function recordLine(item) {
  return `${item.unverified ? `[${UNVERIFIED_STRIP}] ` : ''}${item.text}`;
}

export function renderManifestPlain(manifest, anchors) {
  const lines = [];
  if (manifest.tier_statement) lines.push(manifest.tier_statement);
  for (const item of manifest.items || []) lines.push(`• ${recordLine(item)}`);
  if (manifest.does_not_assert) lines.push(`Does not assert: ${manifest.does_not_assert}`);
  const missing = checkFidelity(lines.join('\n'), anchors);
  if (missing.length) lines.push(`(Standing: ${anchors.join(' — ')}.)`);
  return lines.join('\n');
}

function parseJsonBlock(text) {
  const stripped = String(text).replace(/```json|```/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object in output');
  return JSON.parse(stripped.slice(start, end + 1));
}

function parseManifest(text) {
  const manifest = parseJsonBlock(text);
  if (!Array.isArray(manifest.items)) throw new Error('manifest has no items array');
  return manifest;
}

// ---- Light no-contradiction check on the commentary channel --------------
// Deliberately light: commentary may react, characterize, emphasize. It is
// replaced only when it (a) asserts establishment-language against a weak
// tier, or (b) introduces numerals that exist nowhere in the record.
const CONTRA_PATTERNS = [
  /\b(is|are|was|were)\s+(now\s+)?(established|proven|confirmed|settled|verified)\b/i,
  /\bbeyond\s+(question|doubt|dispute)\b/i,
  /\b(definitely|certainly)\s+(true|real|happened)\b/i
];

const NEGATORS = /\b(nothing|not|never|no|none|nobody|hardly|isn't|aren't|wasn't|weren't|ain't|far from)\b/i;

function contradicts(comment) {
  for (const p of CONTRA_PATTERNS) {
    const m = String(comment).match(p);
    if (!m) continue;
    // A negated echo ("nothing here is settled") is not a contradiction —
    // look at the few words before the match for a negator.
    const before = String(comment)
      .slice(0, m.index)
      .split(/\s+/)
      .slice(-4)
      .join(' ');
    if (!NEGATORS.test(before)) return true;
  }
  return false;
}

export function commentaryOk(comment, { tier, allowedNumerals }) {
  if (!comment || !String(comment).trim()) return false;
  if ((tier === 'outer' || tier === 'outermost') && contradicts(comment)) {
    return false;
  }
  for (const num of String(comment).match(/\d[\d,.]*/g) || []) {
    if (!allowedNumerals.has(num.replace(/[.,]$/, ''))) return false;
  }
  return true;
}

function plainIntro(card) {
  return `${card.name} is keeping this one plain.`;
}

function flattenSegments(segments) {
  return segments
    .map((s) => (s.type === 'record' ? `— ${s.text}` : s.text))
    .join('\n');
}

// ---- Interleaved rendering: gated record blocks + free-voice
// commentary. Substance-locked by construction — the record blocks ARE the
// manifest, delivered plain; the persona speaks between them.
async function renderInterleaved({ manifest, anchors, claim, card, corePrompt, callModel, recordString }) {
  const allowedNumerals = new Set([
    ...(String(recordString).match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[.,]$/, '')),
    ...(JSON.stringify(manifest).match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[.,]$/, ''))
  ]);
  const tier = claim?.radial_tier;

  let comments = {};
  try {
    const sys = `${corePrompt}\n\n${cardPersonaText(card)}\n\nCommentary task: the record blocks below will be shown to the operator verbatim. For each item, write ONE short in-character remark to follow it — react, characterize, emphasize, in your voice. Stay inside the record: no new facts, no numbers that are not already present, and never contradict, soften, or round up the item you are commenting on. Respond with ONLY JSON: {"comments": [{"id": <item id>, "comment": "..."}]}`;
    const user = `Manifest:\n${JSON.stringify({ tier_statement: manifest.tier_statement, items: manifest.items.map((i) => ({ id: i.id, text: recordLine(i) })), does_not_assert: manifest.does_not_assert }, null, 1)}`;
    const out = await callModel({ system: sys, messages: [{ role: 'user', content: user }] });
    const parsed = parseJsonBlock(out.text);
    for (const c of parsed.comments || []) comments[c.id] = c.comment;
  } catch {
    comments = {}; // every block gets the plain intro — the character is still present
  }

  const segments = [];
  if (manifest.tier_statement) segments.push({ type: 'record', text: manifest.tier_statement });
  for (const item of manifest.items || []) {
    segments.push({ type: 'record', text: recordLine(item) });
    const c = comments[item.id];
    if (c && commentaryOk(c, { tier, allowedNumerals })) {
      segments.push({ type: 'commentary', text: c, by: card.name });
    } else {
      segments.push({ type: 'commentary', text: plainIntro(card), by: card.name, plain: true });
    }
  }
  if (manifest.does_not_assert) {
    segments.push({ type: 'record', text: `Does not assert: ${manifest.does_not_assert}` });
  }
  return { segments, text: flattenSegments(segments) };
}

// ---- Stages (Amendment B) ------------------------------------------------
// The progress indicator is wired to REAL pipeline transitions and nothing
// else: onStage fires exactly when the pipeline enters a stage — never on a
// timer, never synthetically. Skipped stages never fire. A mid-stage error
// carries the stage that failed in its message. The mapping (recorded in
// PROJECT-STATE):
//   manifest           → pass 1: bare-core substance manifest + groundCheck
//   analysis           → chat pass 1: bare tool loop over the record
//   render             → pass 2: persona render of the fixed manifest
//   gate               → mechanical fidelity check of the completed draft
//   interleave         → interleaved mode's commentary pass
//   interleave_degrade → post-gate-failure re-render as record blocks
// The draft is NEVER shown pre-gate: nothing in this module streams partial
// output (there is no token callback), so the gate always sees — and the
// operator only ever sees — completed, checked text.
export const STAGES = {
  manifest: 'reading the record…',
  analysis: 'consulting the record…',
  render: 'drafting in voice…',
  gate: 'checking the draft against the record…',
  interleave: 'writing commentary between record blocks…',
  interleave_degrade: 'the gate caught a drift — re-rendering as record blocks…'
};

function stageTracker(onStage) {
  let current = null;
  const enter = (key) => {
    current = key;
    if (onStage) onStage(key, STAGES[key]);
  };
  const nameErrors = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      if (!e.stageNamed && current) {
        e.stageNamed = true;
        e.message = `failed while ${STAGES[current] || current} — ${e.message}`;
      }
      throw e;
    }
  };
  return { enter, nameErrors };
}

// ---- Narration -----------------------------------------------------------
// modes: 'full' (persona render + gate; interleaved on gate failure),
//        'interleaved' (record blocks + commentary, first-class style),
//        'light' (brief persona render + gate), 'bare' (core only, no card).
export async function narrateClaim({ claim, corePrompt, card = null, mode = 'full', callModel, onStage }) {
  const { enter, nameErrors } = stageTracker(onStage);
  return nameErrors(async () => {
  const notices = [];
  const record = serializeRecord(claim);
  const anchors = requiredAnchors(claim);

  // ---- Pass 1: bare core. The card is not in this context. ----
  enter('manifest');
  const pass1System = `${corePrompt}\n\nYou are producing a substance manifest for a claim narration. Use ONLY the record below. Respond with only the JSON object.`;
  const pass1User = `The claim's full record:\n${record}\n\nProduce the substance manifest now.`;
  let manifest;
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await callModel({ system: pass1System, messages: [{ role: 'user', content: pass1User }] });
    try {
      manifest = parseManifest(out.text);
      break;
    } catch (e) {
      if (attempt === 1) throw new Error(`pass-1 did not produce a valid manifest: ${e.message}`);
    }
  }
  manifest = groundCheck(manifest, record);
  if (manifest.items.some((i) => i.unverified)) {
    notices.push('Some items were not found in the claim record and are marked unverified.');
  }

  if (mode === 'bare' || !card) {
    return { text: renderManifestPlain(manifest, anchors), manifest, notices, rendered_by: 'core' };
  }

  if (mode === 'interleaved') {
    enter('interleave');
    const out = await renderInterleaved({ manifest, anchors, claim, card, corePrompt, callModel, recordString: record });
    return { ...out, manifest, notices, rendered_by: card.name };
  }

  // ---- Pass 2: persona rendering of the fixed manifest, gated. ----
  // ONE full-persona attempt, by ruling. On gate failure, degrade
  // AUTOMATICALLY to interleaved — no retry loop, no bare-analysis output,
  // ever. The character is present in 100% of responses.
  enter('render');
  const tokens = fidelityTokens(manifest, anchors);
  const brevity = mode === 'light' ? ' Keep it brief — a few sentences.' : '';
  const pass2System = `${corePrompt}\n\n${cardPersonaText(card)}\n\nRender-only task: convey every manifest item in your voice — your wording is yours, the substance is not. No new analysis, no dropped items, no softened warnings.${brevity}`;
  const manifestForRender = {
    ...manifest,
    items: manifest.items.map((i) => (i.unverified ? { ...i, text: `[${UNVERIFIED_STRIP}] ${i.text}` } : i))
  };
  const pass2User = `Substance manifest (fixed content — convey all of it):\n${JSON.stringify(manifestForRender, null, 1)}\n\nSubstance that must survive your rendering (names, numbers, standing): ${tokens.map((t) => `"${t}"`).join(', ')}.`;

  const out = await callModel({ system: pass2System, messages: [{ role: 'user', content: pass2User }] });
  enter('gate');
  const missing = checkFidelity(out.text, tokens);
  const droppedStrip =
    manifest.items.some((i) => i.unverified) && !norm(out.text).includes(norm(UNVERIFIED_STRIP));
  if (missing.length === 0 && !droppedStrip) {
    return { text: out.text, manifest, notices, rendered_by: card.name };
  }

  // Automatic degrade to interleaved — the character stays present.
  enter('interleave_degrade');
  notices.push('Rendered as interleaved — record blocks in the character\'s voice.');
  const inter = await renderInterleaved({ manifest, anchors, claim, card, corePrompt, callModel, recordString: record });
  return { ...inter, manifest, notices, rendered_by: card.name };
  });
}

// ---- Chat ----------------------------------------------------------------
// The active topic (id + name) is injected here so the model never asks
// the operator for a numeric id, and never surfaces one. When no topic is
// open, the model is told to resolve a topic by NAME via list_topics.
export function topicContext(activeTopic) {
  if (activeTopic && activeTopic.id != null) {
    return `\n\nActive topic: "${activeTopic.name}" (internal id ${activeTopic.id} — use it in tool calls, never show it to the operator; refer to the topic by name).`;
  }
  return `\n\nNo topic is open. If a request needs one, resolve it by NAME with list_topics and ask the operator by name — never ask for a numeric id.`;
}

export async function chatTurn({
  history,
  userText,
  corePrompt,
  card = null,
  mode = 'full',
  runBareLoop,
  callModel,
  currentClaim = null,
  activeTopic = null,
  searchEnabled = false,
  onStage
}) {
  const { enter, nameErrors } = stageTracker(onStage);
  return nameErrors(async () => {
  const notices = [];
  enter('analysis');
  const contextNote = currentClaim
    ? `\n\nThe operator is currently looking at claim #${currentClaim.id} ("${currentClaim.text.slice(0, 80)}…", tier: ${currentClaim.radial_tier ?? 'off-axis'}).`
    : '';
  const searchNote = searchEnabled
    ? '\n\nLive web search is available. When the operator wants sources, search, then present candidates sorted into the tier vocabulary with a one-line basis each, a ready-to-paste citation, and an archive link — adverse findings included. You cannot attach anything; the operator pastes by hand. Flag any source that will not fit the tiers as a taxonomy-strain candidate.'
    : '';
  const pass1System = `${corePrompt}${topicContext(activeTopic)}${contextNote}${searchNote}\n\nAnswer the operator using the read tools when you need the record. Never invent what the onions contain — retrieve, don't invent.`;
  const pass1 = await runBareLoop({
    system: pass1System,
    messages: [...history, { role: 'user', content: userText }]
  });

  if (mode === 'bare' || !card) {
    return { text: pass1.text, notices, rendered_by: 'core' };
  }

  const substance = [
    ...new Set([
      ...(pass1.text.match(/\b(core|inner|middle|outer|outermost|debunked|contested|refuted)\b/gi) || []).map((w) => w.toLowerCase()),
      ...(norm(pass1.text).includes('zero weight') ? ['zero weight'] : []),
      ...(pass1.text.match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[.,]$/, ''))
    ])
  ];

  const interleaveChat = async () => {
    const allowedNumerals = new Set((pass1.text.match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[.,]$/, '')));
    let comment = null;
    try {
      const sys = `${corePrompt}\n\n${cardPersonaText(card)}\n\nThe analysis below will be shown to the operator verbatim. Write ONE short in-character remark to follow it — react and characterize, but no new facts, no new numbers, and never contradict, soften, or round it up. Respond with only the remark.`;
      const out = await callModel({ system: sys, messages: [{ role: 'user', content: pass1.text }] });
      comment = out.text.trim();
    } catch {
      comment = null;
    }
    const segments = [{ type: 'record', text: pass1.text }];
    if (comment && commentaryOk(comment, { tier: currentClaim?.radial_tier, allowedNumerals })) {
      segments.push({ type: 'commentary', text: comment, by: card.name });
    } else {
      segments.push({ type: 'commentary', text: plainIntro(card), by: card.name, plain: true });
    }
    return { segments, text: flattenSegments(segments), notices, rendered_by: card.name };
  };

  if (mode === 'interleaved') {
    enter('interleave');
    return interleaveChat();
  }

  // One full attempt, then automatic degrade to interleaved.
  enter('render');
  const brevity = mode === 'light' ? ' Keep it brief.' : '';
  const pass2System = `${corePrompt}\n\n${cardPersonaText(card)}\n\nRender-only task: restate the analysis below in your voice — same substance, nothing added, nothing dropped, no softened warnings.${brevity}`;
  const pass2User = `The analysis to convey:\n${pass1.text}${substance.length ? `\n\nSubstance that must survive (names, numbers, standing): ${substance.map((t) => `"${t}"`).join(', ')}.` : ''}`;

  const out = await callModel({ system: pass2System, messages: [{ role: 'user', content: pass2User }] });
  enter('gate');
  const missing = checkFidelity(out.text, substance);
  if (missing.length === 0) return { text: out.text, notices, rendered_by: card.name };
  enter('interleave_degrade');
  notices.push('Rendered as interleaved — record blocks in the character\'s voice.');
  return interleaveChat();
  });
}
