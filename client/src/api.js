// SPDX-License-Identifier: AGPL-3.0-only
// Thin fetch wrapper. A 422 from the server is the rules layer saying "no" —
// it carries a plain-language reason and, when known, the tier the evidence
// actually earns.

import { recordRefusal } from './refusalLog.js';

export class RuleRejection extends Error {
  constructor(body) {
    super(body.error || 'Rejected by the rules layer.');
    this.rule = body.rule;
    this.earned_tier = body.earned_tier;
  }
}

// 2.99a (punch item 1): copy-on-first-write lives HERE, in the one client
// HTTP funnel, so no component can bypass it — the first inspection build
// intercepted in a UI wrapper (`run()`) that the add-topic and add-claim
// forms never passed through, and the operator was halted by the shared
// record's 403 wearing the refusal banner. Structural fix: every mutating
// /api call through this module transparently creates the private copy
// first when demo mode has none, then proceeds — one uninterrupted flow.
//
// State: which record this client reads and writes. '' base = the
// canonical (read-only) record; '/sandbox/<sid>' = the visitor's private
// copy. Writes carry the acting persona; the server clamps it to the known
// set and the rules layer holds the gates.
const sbx = { demo: false, sid: null, viewCanonical: false, actor: 'curator' };
let listeners = [];
let copyInFlight = null;

export function configureSandbox({ demo, sid, viewCanonical, actor } = {}) {
  if (demo !== undefined) sbx.demo = !!demo;
  if (sid !== undefined) sbx.sid = sid;
  if (viewCanonical !== undefined) sbx.viewCanonical = !!viewCanonical;
  if (actor !== undefined) sbx.actor = actor || 'curator';
}
export function onSandboxEvent(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
const emit = (e) => {
  for (const fn of listeners) {
    try {
      fn(e);
    } catch {}
  }
};
// Back-compat setters (tests + call sites).
export function setSandboxActor(actor) {
  configureSandbox({ actor });
}
export function getSandboxBase() {
  return sbx.sid && !sbx.viewCanonical ? `/sandbox/${sbx.sid}` : '';
}

async function call(method, path, body) {
  const mutating = method !== 'GET';
  // Copy-on-first-write: a mutating call in demo mode with no copy makes
  // one, transparently, and the write lands in it (Amendment C). A write
  // while viewing canonical rejoins the copy — writes always belong to it.
  if (mutating && sbx.demo && path.startsWith('/api') && !path.startsWith('/api/sandbox')) {
    if (!sbx.sid) {
      copyInFlight ??= api
        .createSandboxCopy()
        .finally(() => {
          copyInFlight = null;
        });
      const made = await copyInFlight; // a full sandbox (503) surfaces to the caller honestly
      if (!sbx.sid) {
        configureSandbox({ sid: made.session_id, viewCanonical: false });
        emit({ type: 'copy-created', made });
      }
    } else if (sbx.viewCanonical) {
      configureSandbox({ viewCanonical: false });
      emit({ type: 'write-rerouted' });
    }
  }
  const base = getSandboxBase();
  const routed = base && path.startsWith('/api') ? `${base}${path}` : path;
  const res = await fetch(routed, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(base ? { 'x-onion-actor': sbx.actor } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await res.json();
  if (res.status === 422) {
    // Punch 12: every rules refusal the visitor is shown lands in the
    // client-side ledger — recorded here, at the one HTTP funnel, so no
    // component can render a refusal the ledger missed.
    recordRefusal({
      action: method,
      target: path,
      persona: base ? sbx.actor : null,
      source: 'rules',
      blocker_code: json.rule ?? null,
      blocker_text: json.error || 'Rejected by the rules layer.',
      inputs_as_submitted: body ?? null
    });
    throw new RuleRejection(json);
  }
  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`);
    err.rule = json.rule;
    err.status = res.status;
    throw err;
  }
  if (mutating && base) emit({ type: 'wrote' }); // one hook for autosave: every successful change
  return json;
}

export const api = {
  meta: () => call('GET', '/api/meta'),
  topics: () => call('GET', '/api/topics'),
  createTopic: (payload) => call('POST', '/api/topics', payload),
  topic: (id) => call('GET', `/api/topics/${id}`),
  createClaim: (payload) => call('POST', '/api/claims', payload),
  promote: (id, target_tier) => call('POST', `/api/claims/${id}/promote`, { target_tier }),
  demote: (id, payload) => call('POST', `/api/claims/${id}/demote`, payload),
  challenge: (id, payload) => call('POST', `/api/claims/${id}/challenges`, payload),
  // 2.99b: kind adjudication — two-phase, the only mover of kind. The UI
  // renders refusals; it never pre-decides them.
  proposeKindChallenge: (id, to_kind, reason) =>
    call('POST', `/api/claims/${id}/kind-challenge`, { to_kind, reason }),
  adjudicateKindChallenge: (id, outcome) =>
    call('POST', `/api/claims/${id}/kind-challenge/adjudicate`, { outcome }),
  addSource: (id, src) => call('POST', `/api/claims/${id}/sources`, src),
  // 2.98b Amendment A: withdrawal is two-phase — filing proposes (mandatory
  // reason, zero rule effect until adjudication), adjudication upholds or
  // rejects. The UI renders refusals; it does not pre-decide them.
  proposeWithdrawal: (id, sourceId, reason) =>
    call('POST', `/api/claims/${id}/sources/${sourceId}/withdraw`, { reason }),
  adjudicateWithdrawal: (id, sourceId, outcome) =>
    call('POST', `/api/claims/${id}/sources/${sourceId}/withdraw/adjudicate`, { outcome }),
  proposeLibraryWithdrawal: (sourceId, reason) =>
    call('POST', `/api/sources/${sourceId}/withdraw`, { reason }),
  adjudicateLibraryWithdrawal: (sourceId, outcome) =>
    call('POST', `/api/sources/${sourceId}/withdraw/adjudicate`, { outcome }),
  tierPreview: (id) => call('GET', `/api/claims/${id}/tier-preview`),
  parking: (topicId) => call('GET', `/api/topics/${topicId}/parking`),
  parkNote: (topicId, text) => call('POST', `/api/topics/${topicId}/parking`, { text }),
  deleteParkedNote: (noteId) => call('DELETE', `/api/parking/${noteId}`),
  addSupport: (id, supported_id) => call('POST', `/api/claims/${id}/supports`, { supported_id }),
  // 2.98b: links end only by recorded adjudication — the challenge flows
  // below carry hop / kernel_link_id targets; direct removal no longer
  // exists anywhere.
  addKernel: (id, payload) => call('POST', `/api/claims/${id}/kernels`, payload),
  lineage: (id) => call('GET', `/api/claims/${id}/lineage`),
  search: (q) => call('GET', `/api/search?q=${encodeURIComponent(q)}`),
  reviewStatus: (id) => call('GET', `/api/claims/${id}/review-status`),
  // 2.99a copy-on-first-write: create (or restore from a save) a private
  // sandbox copy. Always targets the canonical origin — a copy is made
  // FROM the shared record, never from another copy.
  createSandboxCopy: (save) =>
    fetch('/api/sandbox/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(save ? { save } : {})
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok) {
        const err = new Error(json.error || `Copy not created (${res.status})`);
        err.rule = json.rule;
        err.status = res.status;
        throw err;
      }
      return json;
    }),
  // The copy's save file — addressed by sid directly (outside /api, and
  // valid even while the visitor is viewing the canonical record).
  fetchSandboxSave: () => call('GET', `/sandbox/${sbx.sid}/save`),
  timeline: (topicId) => call('GET', `/api/topics/${topicId}/timeline`),
  topicAt: (topicId, ts) => call('GET', `/api/topics/${topicId}/at?ts=${encodeURIComponent(ts)}`),
  claimAt: (id, ts) => call('GET', `/api/claims/${id}/at?ts=${encodeURIComponent(ts)}`),
  claimHistory: (id) => call('GET', `/api/claims/${id}/history`),
  topicStats: (topicId) => call('GET', `/api/topics/${topicId}/stats`),
  events: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return call('GET', `/api/events${q ? `?${q}` : ''}`);
  },
  setVertical: (id, v) => call('PATCH', `/api/claims/${id}/vertical`, v)
};
