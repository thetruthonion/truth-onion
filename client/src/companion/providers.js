// SPDX-License-Identifier: AGPL-3.0-only
// BYOK provider layer. Every provider call flows through providerFetch, the
// single choke point that enforces the key promise: a request carrying an
// API key may NEVER target the app's own origin. Keys live in localStorage
// on the user's machine and travel only browser -> provider.

// The adapter registry (2.9d). Per provider: endpoint base, auth header
// shape, wire shape, suggested models, and — verified per provider — whether
// direct browser calls are permitted. A provider that blocks browser CORS is
// listed as UNSUPPORTED with the honest reason and a pointer at OpenRouter;
// it is never proxied. A server-side relay would make the public demo host a
// handler of visitors' API keys — refused, not deferred.
export const PROVIDERS = {
  openrouter: {
    label: 'OpenRouter (one key, many models)',
    base: 'https://openrouter.ai/api/v1',
    shape: 'openai',
    models: ['anthropic/claude-sonnet-5', 'openai/gpt-5.2', 'google/gemini-3-flash']
  },
  anthropic: {
    label: 'Anthropic (direct)',
    base: 'https://api.anthropic.com',
    shape: 'anthropic',
    // Browser calls verified permitted WITH the explicit opt-in header
    // (anthropic-dangerous-direct-browser-access) — set in buildChatRequest.
    models: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001']
  },
  google: {
    label: 'Google (Gemini, direct)',
    base: 'https://generativelanguage.googleapis.com',
    shape: 'google',
    // Browser calls verified permitted: the Generative Language API serves
    // CORS and takes the key in the x-goog-api-key header (never the URL —
    // a key in a query string lands in server logs).
    models: ['gemini-3-flash', 'gemini-3-pro']
  },
  openai: {
    label: 'OpenAI (direct) — not supported in the browser',
    base: 'https://api.openai.com/v1',
    shape: 'openai',
    browserBlocked:
      'api.openai.com does not serve CORS headers, so a browser cannot call it directly. ' +
      'Use OpenRouter (which fronts OpenAI models) or an OpenAI-compatible gateway you run yourself. ' +
      'This app will not relay your key through its own server — keys never touch it.',
    models: []
  },
  'openai-compatible': {
    label: 'OpenAI-compatible endpoint (custom base URL)',
    base: '',
    shape: 'openai',
    models: []
  }
};

export class KeyPrivacyError extends Error {}
export class RefusedToolError extends Error {}

// Refuse to attach a key to any request that resolves to the app's own
// origin (or is relative, which would resolve there). This is what makes
// "keys never touch the server" a property, not a promise.
export function guardProviderUrl(url, appOrigin) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new KeyPrivacyError(
      `Refusing provider call to relative URL "${url}" — a keyed request must never target the app's own server.`
    );
  }
  if (appOrigin && parsed.origin === appOrigin) {
    throw new KeyPrivacyError(
      `Refusing to send credentials to ${parsed.origin} — that is this app's own origin. Keys go browser → provider only.`
    );
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new KeyPrivacyError(`Refusing provider call to ${parsed.protocol} URL.`);
  }
  return parsed;
}

export async function providerFetch(url, options, { appOrigin, fetchImpl = fetch } = {}) {
  guardProviderUrl(url, appOrigin);
  return fetchImpl(url, options);
}

// Drop any duplicate tool names — providers reject a tools array with a
// repeated name ("Tool names must be unique"). First declaration wins.
export function dedupeTools(tools) {
  if (!Array.isArray(tools)) return tools;
  const seen = new Set();
  const out = [];
  for (const t of tools) {
    const name = t?.function?.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(t);
  }
  return out;
}

// Translate the canonical tool manifest (OpenAI function shape) per provider.
function toolsFor(shape, tools) {
  const unique = dedupeTools(tools);
  if (!unique || unique.length === 0) return undefined;
  if (shape === 'anthropic') {
    return unique.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters
    }));
  }
  if (shape === 'google') {
    return [
      {
        functionDeclarations: unique.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters
        }))
      }
    ];
  }
  return unique;
}

// Convert a history message to Gemini wire shape. Messages appended by the
// tool loop are already google-native ({role, parts}); plain chat history is
// OpenAI-shape ({role, content}).
function googleContent(m) {
  if (m.parts) return m;
  return {
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content ?? '') }]
  };
}

// Build one non-streaming chat request. Sampling params are deliberately
// never sent — newer models reject them, and the companion doesn't need them.
// `extraBody` carries provider-specific additions (e.g. the OpenRouter web
// plugin for online search) merged into the OpenAI-shape body.
export function buildChatRequest({ provider, baseUrl, apiKey, model, system, messages, tools, extraBody }) {
  const spec = PROVIDERS[provider];
  if (!spec) throw new Error(`Unknown provider "${provider}".`);
  if (spec.browserBlocked) {
    // Plain error, never a silent fallback to another provider.
    throw new Error(`${spec.label}: ${spec.browserBlocked}`);
  }
  const base = (provider === 'openai-compatible' ? baseUrl : spec.base || baseUrl) || '';
  if (!base) throw new Error('This provider needs a base URL.');
  const trimmed = base.replace(/\/+$/, '');

  if (spec.shape === 'google') {
    return {
      // The key rides in a header, NEVER the URL — query-string keys land in
      // server logs, and the per-adapter privacy test pins this.
      url: `${trimmed}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: {
        system_instruction: { parts: [{ text: system }] },
        contents: messages.map(googleContent),
        ...(toolsFor('google', tools) ? { tools: toolsFor('google', tools) } : {})
      }
    };
  }

  if (spec.shape === 'anthropic') {
    return {
      url: `${trimmed}/v1/messages`,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: {
        model,
        max_tokens: 8000,
        system,
        messages,
        ...(toolsFor('anthropic', tools) ? { tools: toolsFor('anthropic', tools) } : {})
      }
    };
  }
  return {
    url: `${trimmed}/chat/completions`,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: {
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      ...(toolsFor('openai', tools) ? { tools: toolsFor('openai', tools) } : {}),
      ...(extraBody || {})
    }
  };
}

// Normalize a provider response to { text, toolCalls: [{id, name, args}],
// reasoning? }. `reasoning` is set ONLY when the provider actually returned
// a separate reasoning/thinking channel — a thinking trace is never
// fabricated (Amendment B: absent rather than guessed). Reasoning is
// ungated working material: the pipeline never reads it, the record never
// stores it; only the live working view may show it.
export function normalizeResponse(provider, json) {
  if (PROVIDERS[provider].shape === 'google') {
    const parts = json.candidates?.[0]?.content?.parts || [];
    // Gemini thinking parts carry {thought: true}: they are working notes,
    // NOT answer text — never joined into the narration.
    const text = parts
      .filter((p) => typeof p.text === 'string' && !p.thought)
      .map((p) => p.text)
      .join('');
    const thought = parts
      .filter((p) => p.thought && typeof p.text === 'string')
      .map((p) => p.text)
      .join('\n');
    const toolCalls = parts
      .filter((p) => p.functionCall)
      .map((p, i) => ({ id: `g${i}`, name: p.functionCall.name, args: p.functionCall.args || {} }));
    return { text, toolCalls, raw: json, ...(thought ? { reasoning: thought } : {}) };
  }
  if (PROVIDERS[provider].shape === 'anthropic') {
    const text = (json.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const thinking = (json.content || [])
      .filter((b) => b.type === 'thinking' && typeof b.thinking === 'string')
      .map((b) => b.thinking)
      .join('\n');
    const toolCalls = (json.content || [])
      .filter((b) => b.type === 'tool_use')
      .map((b) => ({ id: b.id, name: b.name, args: b.input }));
    return { text, toolCalls, raw: json, ...(thinking ? { reasoning: thinking } : {}) };
  }
  const msg = json.choices?.[0]?.message || {};
  const toolCalls = (msg.tool_calls || []).map((c) => ({
    id: c.id,
    name: c.function?.name,
    args: safeParse(c.function?.arguments)
  }));
  const reasoning =
    (typeof msg.reasoning === 'string' && msg.reasoning) ||
    (typeof msg.reasoning_content === 'string' && msg.reasoning_content) ||
    '';
  return { text: msg.content || '', toolCalls, raw: json, ...(reasoning ? { reasoning } : {}) };
}

function safeParse(s) {
  try {
    return typeof s === 'string' ? JSON.parse(s) : s || {};
  } catch {
    return {};
  }
}

// Append the assistant turn + tool results in the provider's wire shape.
function appendToolExchange(provider, messages, normalized, results) {
  if (PROVIDERS[provider].shape === 'google') {
    messages.push({
      role: 'model',
      parts: normalized.raw.candidates[0].content.parts
    });
    messages.push({
      role: 'user',
      parts: results.map((r) => {
        const call = normalized.toolCalls.find((c) => c.id === r.id);
        return {
          functionResponse: {
            name: call?.name || 'tool',
            response: { content: r.content }
          }
        };
      })
    });
    return;
  }
  if (PROVIDERS[provider].shape === 'anthropic') {
    messages.push({ role: 'assistant', content: normalized.raw.content });
    messages.push({
      role: 'user',
      content: results.map((r) => ({
        type: 'tool_result',
        tool_use_id: r.id,
        content: r.content,
        ...(r.is_error ? { is_error: true } : {})
      }))
    });
  } else {
    messages.push(normalized.raw.choices[0].message);
    for (const r of results) {
      messages.push({ role: 'tool', tool_call_id: r.id, content: r.content });
    }
  }
}

// One model call, no tools.
export async function chatComplete(config, { system, messages, extraBody }, env = {}) {
  const req = buildChatRequest({ ...config, system, messages, extraBody });
  const res = await providerFetch(
    req.url,
    { method: 'POST', headers: req.headers, body: JSON.stringify(req.body) },
    env
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Provider error ${res.status}: ${body.slice(0, 300)}`);
  }
  return normalizeResponse(config.provider, await res.json());
}

// The tool loop. execTool is the READ-ONLY executor; a model that requests
// anything outside the manifest gets an error result, never an execution.
export async function runToolLoop(
  config,
  { system, messages, tools, execTool, extraBody, maxIterations = 6, log = () => {} },
  env = {}
) {
  const convo = [...messages];
  for (let i = 0; i < maxIterations; i++) {
    const req = buildChatRequest({ ...config, system, messages: convo, tools, extraBody });
    const res = await providerFetch(
      req.url,
      { method: 'POST', headers: req.headers, body: JSON.stringify(req.body) },
      env
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Provider error ${res.status}: ${body.slice(0, 300)}`);
    }
    const normalized = normalizeResponse(config.provider, await res.json());
    if (normalized.toolCalls.length === 0) return normalized;

    const results = [];
    for (const call of normalized.toolCalls) {
      try {
        const out = await execTool(call.name, call.args || {});
        log({ tool: call.name, args: call.args, ok: true });
        results.push({ id: call.id, content: JSON.stringify(out) });
      } catch (e) {
        log({ tool: call.name, args: call.args, ok: false, error: e.message });
        results.push({
          id: call.id,
          content: `Refused: ${e.message}`,
          is_error: true
        });
      }
    }
    appendToolExchange(config.provider, convo, normalized, results);
  }
  return { text: '(The companion ran out of tool-call budget before finishing.)', toolCalls: [] };
}
