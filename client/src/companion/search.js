// SPDX-License-Identifier: AGPL-3.0-only
// Live web search — retrieval, never vetting, never attachment.
//
// The companion searches the live web on request and hands back candidates
// PRE-SORTED into the existing source-tier vocabulary, each with a one-line
// basis, a ready-to-paste citation, and an archive-capture link. It cannot
// attach anything — the operator pastes into the normal flow by hand. Every
// search and fetch is logged and shown in the panel. A source that will not
// fit the current tiers is flagged as a TAXONOMY-STRAINS candidate: search is
// an active strain-hunting instrument, not just a convenience.
//
// Key discipline is identical to the LLM/TTS: a search-API call goes browser →
// provider only, guarded so a keyed request can never hit the app's origin.

import { guardProviderUrl } from './providers.js';

export const SEARCH_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the live web for candidate sources. Returns results pre-classified into the source-tier vocabulary (primary_doc / court_record / reputable_secondary / single_outlet / self_published / anonymous), each with a one-line basis, a ready-to-paste citation, and an archive-capture link. Retrieval only — you cannot attach anything; the operator pastes by hand. Present adverse findings too; omitting sources that cut against the claim is forbidden.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description:
        'Fetch the readable text of one URL to inspect a candidate source before recommending how to cite it. Goes through the app fetch proxy (reads pages a browser can, without CORS). Retrieval only.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'verify_source',
      description:
        'Mechanically verify that a source actually says what you are about to attribute to it: fetches the page and checks the exact quote is present. Returns {reachable, status, quote_found, verified}. You MAY call a source "verified/confirmed" ONLY when this returns verified:true. If reachable:false, say the source is unreachable — never claim a confirmation you did not get.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          quote: { type: 'string', description: 'a short exact phrase the claim relies on' }
        },
        required: ['url', 'quote']
      }
    }
  }
];

export const SEARCH_TOOL_NAMES = SEARCH_TOOLS.map((t) => t.function.name);

// Deterministic first-pass tier classification by host. The model still
// presents and explains; this gives it (and the strain hunt) an honest anchor
// and a reproducible "unclassifiable" signal.
const RULES = [
  { re: /(^|\.)supremecourt\.gov$/i, tier: 'court_record', basis: 'U.S. Supreme Court — a court record.' },
  // Judicial domains only. Note: justice.gov is the executive DOJ, not a
  // court — its press releases are the agency STATING things (a primary_doc
  // whose content is an assertion, not an adjudication). Keeping it out of
  // court_record is deliberate; conflating the two would bury that strain.
  { re: /(^|\.)(courtlistener\.com|pacer\.gov|courts\.gov|uscourts\.gov)$/i, tier: 'court_record', basis: 'court filing / judicial record.' },
  { re: /(^|\.)(sec\.gov|fda\.gov|congress\.gov|gao\.gov|whitehouse\.gov|regulations\.gov|justice\.gov|govinfo\.gov)$/i, tier: 'primary_doc', basis: 'primary government / regulatory document (verify document kind — an agency statement is not an adjudication).' },
  { re: /\.gov$/i, tier: 'primary_doc', basis: 'government record (verify the specific document kind).' },
  { re: /(^|\.)(reuters\.com|apnews\.com|nytimes\.com|washingtonpost\.com|wsj\.com|bbc\.co\.uk|bbc\.com|npr\.org|propublica\.org|theguardian\.com)$/i, tier: 'reputable_secondary', basis: 'established newsroom with editorial standards.' },
  { re: /(^|\.)(medium\.com|substack\.com|wordpress\.com|blogspot\.com|tumblr\.com)$/i, tier: 'self_published', basis: 'self-published platform — zero weight until independently corroborated.' },
  { re: /(^|\.)(reddit\.com|x\.com|twitter\.com|facebook\.com|quora\.com)$/i, tier: 'anonymous', basis: 'social / user-generated — zero weight.' }
];

export function classifySourceTier(url) {
  let host;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return { tier: null, basis: 'unparseable URL.', unclassifiable: true };
  }
  for (const r of RULES) {
    if (r.re.test(host)) return { tier: r.tier, basis: r.basis, unclassifiable: false };
  }
  // A plausible outlet we can't confidently rank — a single_outlet at best,
  // and explicitly a strain candidate the operator may want to log.
  return {
    tier: 'single_outlet',
    basis: `unrecognized outlet (${host}) — single_outlet at best; classification is uncertain.`,
    unclassifiable: true
  };
}

// An archive-capture link the operator can paste — never fetched here, just
// formed, so nothing is silently written to a third party.
export function captureUrl(url) {
  return `https://web.archive.org/web/*/${url}`;
}

export function formatCitation({ title, url, published }) {
  const bits = [title?.trim(), published ? `(${published})` : null, url].filter(Boolean);
  return bits.join(' — ');
}

// --- search backends (client-side, keyed browser → provider only) ----------

function braveRequest(query, key, maxResults) {
  return {
    url: `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
    options: { method: 'GET', headers: { 'x-subscription-token': key, accept: 'application/json' } },
    parse: (j) =>
      (j.web?.results || []).map((r) => ({ title: r.title, url: r.url, snippet: r.description, published: r.age }))
  };
}
function tavilyRequest(query, key, maxResults) {
  return {
    url: 'https://api.tavily.com/search',
    options: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, max_results: maxResults })
    },
    parse: (j) => (j.results || []).map((r) => ({ title: r.title, url: r.url, snippet: r.content, published: null }))
  };
}
function exaRequest(query, key, maxResults) {
  return {
    url: 'https://api.exa.ai/search',
    options: {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ query, numResults: maxResults, contents: { text: true } })
    },
    parse: (j) => (j.results || []).map((r) => ({ title: r.title, url: r.url, snippet: r.text?.slice(0, 300), published: r.publishedDate }))
  };
}

const BACKENDS = { brave: braveRequest, tavily: tavilyRequest, exa: exaRequest };

// Wrap raw results with tier classification, citation, capture, strain flag.
export function annotateResults(raw) {
  return raw.map((r) => {
    const cls = classifySourceTier(r.url);
    return {
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      tier: cls.tier,
      basis: cls.basis,
      unclassifiable: cls.unclassifiable,
      citation: formatCitation(r),
      capture: captureUrl(r.url)
    };
  });
}

// Release item 2: the showcase boundary, said plainly. The fetch proxy is
// deliberately absent from the public demo (an open keyless fetcher that can
// spawn a headless browser is an abuse relay — see server/index.js). When it
// is absent, fetch_url / verify_source surface THIS, never a raw 404. The
// wording is host-neutral on purpose: it must fit the read-only exhibit
// today and the 2.99a sandbox tomorrow.
export const SHOWCASE_VERIFY_UNAVAILABLE =
  'Mechanical verification is not available in this demo — clone the repo to run mechanical verification locally. ' +
  'The live fetcher is deliberately switched off on this public host; nothing was fetched, so nothing was learned about the page.';

// The search executor. `config` = { mode, apiProvider, maxResults }.
// In 'search-api' mode it performs a real HTTP search with the operator's
// dedicated key; in 'openrouter-online' mode the model already has web access
// via the chat request, so a direct web_search tool-call is answered with a
// note steering the model to search inline (no second key needed).
// `proxyAbsent` marks a host where /api/fetch is deliberately not served
// (the public demo): the proxy tools answer with the showcase message and
// never issue the doomed request at all.
export function makeSearchExecutor({
  config,
  keys = {},
  appOrigin,
  proxyOrigin = '',
  proxyAbsent = false,
  fetchImpl = fetch,
  log = () => {}
}) {
  const maxResults = config?.maxResults || 6;

  // fetch_url and verify_source go through the same-origin app proxy — no
  // key, no CORS, and the proxy reads pages a bare client-side fetch can't.
  // A 404 means the proxy is not served here (the demo, or a build that lost
  // the route): that is the showcase boundary, not an error to parrot.
  async function viaProxy(url, quote) {
    const q = `${proxyOrigin}/api/fetch?url=${encodeURIComponent(url)}${
      quote ? `&quote=${encodeURIComponent(quote)}` : ''
    }`;
    const res = await fetchImpl(q, { method: 'GET' });
    if (res.status === 404) return { proxy_absent: true };
    if (!res.ok) throw new Error(`fetch proxy error ${res.status}`);
    return res.json();
  }

  // The one honest answer both proxy tools give when the proxy is absent:
  // an inconclusive status carrying the boundary, never a dead error.
  function showcaseAnswer(url, kind) {
    log({ kind, url, showcase: true, at: Date.now() });
    const base = { url, unavailable: true, showcase: true, tier: classifySourceTier(url) };
    return kind === 'verify'
      ? { ...base, reachable: null, readable: null, quote_found: null, verified: false, inconclusive: true, reason: SHOWCASE_VERIFY_UNAVAILABLE }
      : { ...base, note: SHOWCASE_VERIFY_UNAVAILABLE };
  }

  async function web_search({ query }) {
    log({ kind: 'search', query, at: Date.now() });
    if (config?.mode !== 'search-api') {
      // Online mode: the model itself has the web plugin; the tool exists so
      // the boundary is explicit, but retrieval happens inline in generation.
      return {
        note: 'Web access is on for this request via the online model — search inline and present candidates sorted into the tier vocabulary, adverse findings included, each with a ready-to-paste citation and an archive link. You cannot attach anything.',
        mode: 'openrouter-online'
      };
    }
    const provider = config.apiProvider || 'brave';
    const key = keys[provider];
    if (!key) throw new Error(`No ${provider} search key set — add one in settings, or use online mode.`);
    const req = BACKENDS[provider](query, key, maxResults);
    guardProviderUrl(req.url, appOrigin);
    const res = await fetchImpl(req.url, req.options);
    if (!res.ok) throw new Error(`search provider error ${res.status}`);
    const results = annotateResults(req.parse(await res.json()));
    for (const r of results) if (r.unclassifiable) log({ kind: 'strain', url: r.url, basis: r.basis, at: Date.now() });
    return {
      query,
      results,
      reminder: 'Retrieval only — format citations for the operator to paste by hand; you cannot attach. Present adverse findings. Flag any unclassifiable source as a taxonomy-strain candidate.'
    };
  }

  async function fetch_url({ url }) {
    if (proxyAbsent) return showcaseAnswer(url, 'fetch');
    log({ kind: 'fetch', url, at: Date.now() });
    const page = await viaProxy(url);
    if (page.proxy_absent) return showcaseAnswer(url, 'fetch');
    if (!page.reachable) {
      log({ kind: 'unreachable', url, reason: page.reason || page.status, at: Date.now() });
      return { url, reachable: false, reason: page.reason || `status ${page.status}`, tier: classifySourceTier(url) };
    }
    if (page.readable === false) {
      // 200 but an empty shell — say so, never present it as read.
      log({ kind: 'unreadable', url, reason: page.reason, at: Date.now() });
      return { url, reachable: true, readable: false, reason: page.reason, tier: classifySourceTier(url) };
    }
    return { url, reachable: true, readable: true, status: page.status, title: page.title, text: page.text, tier: classifySourceTier(url) };
  }

  // Mechanical verification: the returned `verified` is a real substring check
  // on the actually-fetched page text, computed server-side — not a model
  // claim. The log records the ground-truth outcome so a fabricated
  // "confirmed" in prose is visible against what was actually verified.
  async function verify_source({ url, quote }) {
    if (proxyAbsent) return showcaseAnswer(url, 'verify');
    const page = await viaProxy(url, quote);
    if (page.proxy_absent) return showcaseAnswer(url, 'verify');
    // quote_found is a tri-state: true (present), false (readable but absent),
    // null (page unreadable — INCONCLUSIVE, never a confident "not found").
    const inconclusive = page.readable === false;
    const outcome = {
      url,
      reachable: !!page.reachable,
      readable: page.readable !== false,
      status: page.status,
      quote_found: inconclusive ? null : !!page.quote_found,
      verified: !!page.verified,
      ...(inconclusive
        ? { inconclusive: true, reason: page.reason || 'page not readable — cannot verify by plain fetch' }
        : {})
    };
    log({
      kind: 'verify',
      url,
      verified: outcome.verified,
      reachable: outcome.reachable,
      inconclusive,
      reason: page.reason,
      at: Date.now()
    });
    return outcome;
  }

  return { web_search, fetch_url, verify_source };
}

// OpenRouter online mode: attach the web plugin to a chat request so the model
// searches natively on the one key. Returns the fragment to merge into body.
export function onlineSearchBody(config) {
  if (!config?.enabled || config.mode !== 'openrouter-online') return {};
  return { plugins: [{ id: 'web', max_results: config.maxResults || 6 }] };
}
