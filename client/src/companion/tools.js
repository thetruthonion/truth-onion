// SPDX-License-Identifier: AGPL-3.0-only
// The read-only tool set exposed to the model. This manifest is everything
// the companion can touch — there is no mutating tool, and the executor
// only ever issues GET requests against the existing read API.

import { RefusedToolError } from './providers.js';

export const TOOL_MANIFEST = [
  {
    type: 'function',
    function: {
      name: 'list_topics',
      description:
        'The available topics (id + name). Use this to resolve a topic the operator names in plain words — never ask them for a numeric id.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_topic_skeleton',
      description:
        'The tier structure of a topic: every claim with its tier, layer, kind, and status, plus the source-library citation list.',
      parameters: {
        type: 'object',
        properties: { topic_id: { type: 'integer' } },
        required: ['topic_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_claim_detail',
      description:
        'The full record of one claim: text, sources with weights, placement reason, challenge history, and support links.',
      parameters: {
        type: 'object',
        properties: { claim_id: { type: 'integer' } },
        required: ['claim_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_claims',
      description: 'Text search across the claims of a topic (claim text and placement reasons).',
      parameters: {
        type: 'object',
        properties: {
          topic_id: { type: 'integer' },
          query: { type: 'string' }
        },
        required: ['topic_id', 'query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_claim_lineage',
      description:
        'The routed lineage/fan of a claim: its kernel links (zero weight — where evidence stops), each routed through genuinely-linked intermediate claims, with gap statements and per-hop contest marks.',
      parameters: {
        type: 'object',
        properties: { claim_id: { type: 'integer' } },
        required: ['claim_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_source',
      description: 'A library source and every claim it is attached to, with each attachment relation.',
      parameters: {
        type: 'object',
        properties: {
          topic_id: { type: 'integer' },
          source_id: { type: 'integer' }
        },
        required: ['topic_id', 'source_id']
      }
    }
  }
];

export const TOOL_NAMES = TOOL_MANIFEST.map((t) => t.function.name);

export function makeToolExecutor({ fetchImpl = fetch, origin = '' } = {}) {
  // GET-only by construction: this is the sole HTTP path the tools have.
  const apiGet = async (path) => {
    const res = await fetchImpl(`${origin}${path}`, { method: 'GET' });
    if (!res.ok) throw new Error(`read failed (${res.status}) for ${path}`);
    return res.json();
  };

  const impl = {
    async list_topics() {
      const topics = await apiGet('/api/topics');
      return topics.map((t) => ({ id: t.id, name: t.name }));
    },
    async get_topic_skeleton({ topic_id }) {
      const t = await apiGet(`/api/topics/${topic_id}`);
      return {
        topic: { id: t.id, name: t.name, description: t.description },
        claims: t.claims.map((c) => ({
          id: c.id,
          tier: c.radial_tier ?? 'off-axis (metaphysical)',
          layer: c.layer,
          kind: c.kind,
          status: c.status,
          text: c.text
        })),
        source_library: (t.sources || []).map((s) => ({
          id: s.id,
          tier: s.tier,
          citation: s.citation
        }))
      };
    },
    async get_claim_detail({ claim_id }) {
      return apiGet(`/api/claims/${claim_id}`);
    },
    async get_claim_lineage({ claim_id }) {
      return apiGet(`/api/claims/${claim_id}/lineage`);
    },
    async search_claims({ topic_id, query }) {
      const t = await apiGet(`/api/topics/${topic_id}`);
      const q = String(query || '').toLowerCase();
      return t.claims
        .filter(
          (c) =>
            c.text.toLowerCase().includes(q) || c.placement_reason.toLowerCase().includes(q)
        )
        .map((c) => ({ id: c.id, tier: c.radial_tier, text: c.text }));
    },
    async get_source({ topic_id, source_id }) {
      const t = await apiGet(`/api/topics/${topic_id}`);
      const source = (t.sources || []).find((s) => s.id === source_id);
      if (!source) throw new Error(`no source ${source_id} in topic ${topic_id}`);
      const attachments = t.claims
        .filter((c) => c.sources.some((s) => s.id === source_id))
        .map((c) => ({
          claim_id: c.id,
          claim_text: c.text,
          relation: c.sources.find((s) => s.id === source_id).relation
        }));
      return { source, attachments };
    }
  };

  return async function execTool(name, args) {
    if (!impl[name]) {
      throw new RefusedToolError(
        `"${name}" is not in the read-only tool manifest. The companion cannot place, promote, attach, or modify anything.`
      );
    }
    return impl[name](args || {});
  };
}

// Combine the game-data read executor with the live-search executor.
// Search tools are retrieval only; a name in neither set is refused — so the
// write boundary is unchanged whether or not search is enabled.
export function makeCompanionExecutor({ readExec, searchExec = null }) {
  return async function execTool(name, args) {
    if (searchExec && typeof searchExec[name] === 'function') {
      return searchExec[name](args || {});
    }
    return readExec(name, args);
  };
}
