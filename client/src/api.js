// Thin fetch wrapper. A 422 from the server is the rules layer saying "no" —
// it carries a plain-language reason and, when known, the tier the evidence
// actually earns.

export class RuleRejection extends Error {
  constructor(body) {
    super(body.error || 'Rejected by the rules layer.');
    this.rule = body.rule;
    this.earned_tier = body.earned_tier;
  }
}

// 2.99a: one switch for which record this client reads and writes — '' is
// the canonical (read-only) record; '/sandbox/<sid>' is the visitor's
// private copy. Writes also carry the acting persona; the server clamps it
// to the known set and the rules layer holds the gates.
let sandboxBase = '';
let sandboxActor = 'curator';
export function setSandboxBase(base) {
  sandboxBase = base || '';
}
export function getSandboxBase() {
  return sandboxBase;
}
export function setSandboxActor(actor) {
  sandboxActor = actor || 'curator';
}
export function getSandboxActor() {
  return sandboxActor;
}

async function call(method, path, body) {
  const routed = sandboxBase && path.startsWith('/api') ? `${sandboxBase}${path}` : path;
  const res = await fetch(routed, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(sandboxBase ? { 'x-onion-actor': sandboxActor } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await res.json();
  if (res.status === 422) throw new RuleRejection(json);
  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`);
    err.rule = json.rule;
    err.status = res.status;
    throw err;
  }
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
  // The copy's save file (path is outside /api, so no base prefixing).
  fetchSandboxSave: () => call('GET', `${sandboxBase}/save`),
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
