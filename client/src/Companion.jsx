// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useMemo, useRef, useState } from 'react';
import { sha256Hex } from './companion/hash.js';
import { chatComplete, runToolLoop, PROVIDERS } from './companion/providers.js';
import { TOOL_MANIFEST, makeToolExecutor, makeCompanionExecutor } from './companion/tools.js';
import { SEARCH_TOOLS, makeSearchExecutor, onlineSearchBody } from './companion/search.js';
import { parseCard, validateCardText, serializeCard } from './companion/cards.js';
import { narrateClaim, chatTurn } from './companion/pipeline.js';
import { speak } from './companion/tts.js';
import {
  loadSettings,
  saveSettings,
  saveKeys,
  saveCard,
  providerConfig,
  loadNotebook,
  pinToNotebook,
  removeFromNotebook
} from './companion/store.js';
import {
  loadThreads,
  saveThreads,
  newThreadId,
  upsertThread,
  removeThread
} from './companion/threads.js';
import {
  BUILDER_CARD,
  builderSystem,
  extractCardBlock,
  describeVoiceOptions
} from './companion/builder.js';

const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';

// A single message may be plain text OR interleaved segments (§9b).
function MessageBody({ m }) {
  if (m.segments) {
    return (
      <div className="interleaved">
        {m.segments.map((s, i) =>
          s.type === 'record' ? (
            <div key={i} className="seg-record">{s.text}</div>
          ) : (
            <div key={i} className={`seg-commentary${s.plain ? ' plain' : ''}`}>{s.text}</div>
          )
        )}
      </div>
    );
  }
  return <div className="bubble-text">{m.text}</div>;
}

export default function Companion({ corePrompt, currentClaim, activeTopic = null, narrationRequest, onNarrationDone, demo = false, apiBase = '' }) {
  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [hash, setHash] = useState('');
  // Conversation persistence (§12a): threads survive panel close/reopen and
  // restart because they live in localStorage, not component state.
  const [threadState, setThreadState] = useState(loadThreads);
  const activeThread = threadState.threads.find((t) => t.id === threadState.activeId) || null;
  const [messages, setMessages] = useState(() => activeThread?.messages || []);
  const [activeId, setActiveId] = useState(() => threadState.activeId);
  const [showThreads, setShowThreads] = useState(false);
  // The notebook (2.9): pinned narrations, isolated local storage, no API path.
  const [notebook, setNotebook] = useState(loadNotebook);
  const [showNotebook, setShowNotebook] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchLog, setSearchLog] = useState([]);
  const [cardText, setCardText] = useState('');
  const [cardError, setCardError] = useState(null);
  const [building, setBuilding] = useState(false);
  const [buildHistory, setBuildHistory] = useState([]);
  const [draftCard, setDraftCard] = useState(null);
  const scrollRef = useRef(null);
  const firstSave = useRef(true);

  useEffect(() => {
    if (corePrompt) sha256Hex(corePrompt).then(setHash);
  }, [corePrompt]);

  // §12b/§13c persistence. Keys and the active card live in their OWN isolated
  // localStorage entries and are saved UNCONDITIONALLY — so they survive even
  // if the settings blob is corrupt (a read failure must never take the key or
  // card down with it). The settings blob itself keeps the clobber guard:
  // skip the mount save, and never overwrite a good entry after a read failure.
  useEffect(() => {
    saveKeys(settings.keys);
    saveCard(settings.card);
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    if (settings._ok === false) return;
    saveSettings(settings);
  }, [settings]);

  // Persist the active conversation on every change (not in the Builder,
  // whose transient draft chat is not a saved thread until adopted).
  useEffect(() => {
    if (building || messages.length === 0) return;
    const id = activeId || newThreadId();
    if (!activeId) setActiveId(id);
    const next = upsertThread(threadState, {
      id,
      characterName: settings.card?.name || 'Sidekick',
      messages
    });
    setThreadState(next);
    saveThreads(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, building]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const config = useMemo(() => providerConfig(settings), [settings]);
  const env = { appOrigin, fetchImpl: (...a) => fetch(...a) };
  const hasKey = !!config.apiKey || settings.provider === 'openai-compatible';

  // ---- Amendment B: stage indicator + working view -----------------------
  // `stage` mirrors REAL pipeline transitions (pipeline.js onStage) — it is
  // never advanced by a timer. Working notes hold provider reasoning ONLY
  // when the provider actually returned some (never fabricated); they are
  // component state: never a message, so never a thread, never pinnable,
  // never persisted anywhere.
  const [stage, setStage] = useState(null);
  const [stageTimes, setStageTimes] = useState([]);
  const [workingNotes, setWorkingNotes] = useState([]);
  const stageRef = useRef([]);
  const onStage = (key, label) => {
    const now = performance.now();
    const arr = stageRef.current;
    if (arr.length) arr[arr.length - 1].ms = Math.round(now - arr[arr.length - 1].at);
    arr.push({ key, label, at: now });
    setStage(label);
  };
  const beginStages = () => {
    stageRef.current = [];
    setStageTimes([]);
    setWorkingNotes([]);
    setStage(null);
  };
  const finishStages = () => {
    const arr = stageRef.current;
    if (arr.length) {
      arr[arr.length - 1].ms = Math.round(performance.now() - arr[arr.length - 1].at);
      // Dev-visible per-stage timing readout (Amendment B): measured, so
      // future latency work targets the real slow stage, not a guess.
      console.debug('[companion] stage timings:', arr.map((s) => `${s.key} ${s.ms}ms`).join(' · '));
      setStageTimes(arr.map(({ key, label, ms }) => ({ key, label, ms })));
    }
    stageRef.current = [];
    setStage(null);
  };

  const searchEnabled = !!settings.search?.enabled;
  const logEvent = (e) => setSearchLog((l) => [...l, { ...e, at: new Date().toLocaleTimeString() }]);
  const callModel = async ({ system, messages: m, extraBody }) => {
    const out = await chatComplete(config, { system, messages: m, extraBody }, env);
    if (out.reasoning) setWorkingNotes((w) => [...w, out.reasoning]);
    return out;
  };
  const runBareLoop = async ({ system, messages: m }) => {
    // 2.99a: when the visitor has a private copy, the companion reads THAT
    // record — its tools follow the same base the app's own reads use.
    const readExec = makeToolExecutor({ origin: apiBase });
    let tools = TOOL_MANIFEST;
    let execTool = readExec;
    let extraBody;
    if (searchEnabled) {
      const mode = settings.search?.mode || 'openrouter-online';
      if (mode === 'search-api') {
        // Dedicated search API: our executor performs the search, so we
        // declare the search tools alongside the read tools.
        const searchExec = makeSearchExecutor({
          config: settings.search,
          keys: settings.keys,
          appOrigin,
          proxyOrigin: '', // fetch_url / verify_source hit the same-origin app proxy
          proxyAbsent: demo, // the demo host deliberately serves no fetch proxy — showcase message, never a 404
          fetchImpl: (...a) => fetch(...a),
          log: logEvent
        });
        tools = [...TOOL_MANIFEST, ...SEARCH_TOOLS];
        execTool = makeCompanionExecutor({ readExec, searchExec });
      } else {
        // OpenRouter online: the web plugin injects its OWN search tool and
        // searches inline. Declaring our web_search too collides on the
        // provider ("tool names must be unique"), so we add ONLY the plugin.
        extraBody = onlineSearchBody(settings.search);
      }
    }
    const out = await runToolLoop(config, { system, messages: m, tools, execTool, extraBody, log: logEvent }, env);
    if (out.reasoning) setWorkingNotes((w) => [...w, out.reasoning]);
    return out;
  };

  // Double-click narration: grounded, tier-faithful, ephemeral.
  useEffect(() => {
    if (!narrationRequest) return;
    if (!hasKey) {
      setMessages((ms) => [
        ...ms,
        { role: 'assistant', text: 'Add a provider key in settings and I can narrate this claim.', by: 'system' }
      ]);
      onNarrationDone?.();
      return;
    }
    let cancelled = false;
    (async () => {
      setBusy(true);
      beginStages();
      setMessages((ms) => [...ms, { role: 'user', text: `Narrate claim #${narrationRequest.id}.`, by: 'you' }]);
      try {
        // Stage 2.9: the lineage/fan is part of the record being narrated —
        // fetch the routed descent so the companion can tell it from bedrock:
        // what the kernel establishes, where evidence stops, the gap. A fetch
        // failure narrates the claim without it rather than inventing one.
        let claimForNarration = narrationRequest;
        try {
          const lin = await (await fetch(`${apiBase}/api/claims/${narrationRequest.id}/lineage`)).json();
          if (lin && Array.isArray(lin.lineages)) {
            claimForNarration = { ...narrationRequest, lineage: lin.lineages };
          }
        } catch {}
        const out = await narrateClaim({
          claim: claimForNarration,
          corePrompt,
          card: settings.card,
          mode: settings.helpingMode,
          callModel,
          onStage
        });
        if (cancelled) return;
        setMessages((ms) => [
          ...ms,
          {
            role: 'assistant',
            text: out.text,
            segments: out.segments,
            by: out.rendered_by,
            notices: out.notices,
            // Pinnable: narrations are ephemeral unless the user keeps them.
            narrated_claim: { id: narrationRequest.id, text: narrationRequest.text }
          }
        ]);
        if (settings.autoSpeak) doSpeak(out.text);
      } catch (e) {
        if (!cancelled) setMessages((ms) => [...ms, { role: 'assistant', text: `Narration failed: ${e.message}`, by: 'system' }]);
      } finally {
        finishStages();
        if (!cancelled) setBusy(false);
        onNarrationDone?.();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrationRequest]);

  const doSpeak = (text) =>
    speak({
      text,
      voice: settings.card?.voice,
      keys: settings.keys,
      appOrigin,
      onNotice: (n) => setMessages((ms) => [...ms, { role: 'assistant', text: n, by: 'system' }])
    }).catch(() => {});

  const send = async () => {
    if (!input.trim() || busy) return;
    const userText = input.trim();
    if (building) return sendToBuilder(userText);
    const history = messages.filter((m) => m.by !== 'system').map((m) => ({ role: m.role, content: m.text }));
    setMessages((ms) => [...ms, { role: 'user', text: userText, by: 'you' }]);
    setInput('');
    setBusy(true);
    beginStages();
    try {
      const out = await chatTurn({
        history,
        userText,
        corePrompt,
        card: settings.card,
        mode: settings.helpingMode,
        onStage,
        runBareLoop,
        callModel,
        currentClaim,
        activeTopic,
        searchEnabled
      });
      setMessages((ms) => [
        ...ms,
        { role: 'assistant', text: out.text, segments: out.segments, by: out.rendered_by, notices: out.notices }
      ]);
      if (settings.autoSpeak) doSpeak(out.text);
    } catch (e) {
      setMessages((ms) => [...ms, { role: 'assistant', text: `Error: ${e.message}`, by: 'system' }]);
    } finally {
      finishStages();
      setBusy(false);
    }
  };

  // ---- The Builder: guided card creation, no JSON ever shown ----
  const startBuilder = () => {
    setBuilding(true);
    setDraftCard(null);
    setBuildHistory([]);
    setMessages([{ role: 'assistant', text: BUILDER_CARD.first_message, by: BUILDER_CARD.name }]);
  };

  const sendToBuilder = async (userText) => {
    setMessages((ms) => [...ms, { role: 'user', text: userText, by: 'you' }]);
    setInput('');
    setBusy(true);
    const voiceOptions = describeVoiceOptions({ keys: settings.keys });
    const system = `${corePrompt}\n\n${BUILDER_CARD.description}\nPersonality: ${BUILDER_CARD.personality}\n\n${builderSystem({ voiceOptions })}`;
    const newHistory = [...buildHistory, { role: 'user', content: userText }];
    try {
      const out = await callModel({ system, messages: newHistory });
      const { card, cleanedText } = extractCardBlock(out.text);
      setMessages((ms) => [...ms, { role: 'assistant', text: cleanedText, by: BUILDER_CARD.name }]);
      setBuildHistory([...newHistory, { role: 'assistant', content: out.text }]);
      if (card) setDraftCard(card);
    } catch (e) {
      setMessages((ms) => [...ms, { role: 'assistant', text: `Error: ${e.message}`, by: 'system' }]);
    } finally {
      setBusy(false);
    }
  };

  const adoptDraft = () => {
    if (!draftCard) return;
    const card = parseCard(draftCard);
    setSettings((s) => ({ ...s, card }));
    setBuilding(false);
    setMessages((ms) => [
      ...ms,
      { role: 'assistant', text: card.first_message || `${card.name} steps in.`, by: card.name }
    ]);
    if (card.first_message) {
      speak({ text: card.first_message, voice: card.voice, keys: settings.keys, appOrigin, onNotice: () => {} }).catch(() => {});
    }
  };

  // 2.9d: paste, file picker, and drag-drop all funnel through the SAME
  // shape validation — refusals name the blocker, nothing partially imports.
  const importCardText = (text) => {
    setCardError(null);
    try {
      const card = validateCardText(text);
      setSettings((s) => ({ ...s, card }));
      setCardText('');
    } catch (e) {
      setCardError(`Card refused: ${e.message}`);
    }
  };
  const importCard = () => importCardText(cardText);
  const importCardFile = (file) => {
    if (!file) return;
    if (!/\.json$/i.test(file.name)) {
      setCardError(`Card refused: "${file.name}" is not a .json file.`);
      return;
    }
    file.text().then(importCardText, (e) => setCardError(`Could not read the file: ${e.message}`));
  };
  const exportCard = () => {
    if (!settings.card) return;
    const blob = new Blob([serializeCard(settings.card)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(settings.card.name || 'card').replace(/[^\w-]+/g, '_')}.card.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const setKey = (which, value) => setSettings((s) => ({ ...s, keys: { ...s.keys, [which]: value } }));

  // ---- Conversation list (§12a) ----
  const newConversation = () => {
    setActiveId(null);
    setMessages([]);
    setSearchLog([]);
    setShowThreads(false);
    setThreadState((st) => ({ ...st, activeId: null }));
  };

  const resumeThread = (id) => {
    const thread = threadState.threads.find((t) => t.id === id);
    if (!thread) return;
    setActiveId(id);
    setMessages(thread.messages);
    setThreadState((st) => ({ ...st, activeId: id }));
    setShowThreads(false);
  };

  const deleteThread = (id) => {
    const next = removeThread(threadState, id);
    setThreadState(next);
    saveThreads(next);
    if (id === activeId) {
      setActiveId(next.activeId);
      const resumed = next.threads.find((t) => t.id === next.activeId);
      setMessages(resumed?.messages || []);
    }
  };

  return (
    <div className="companion">
      <div className="companion-head">
        <div className="companion-id">
          {(building ? BUILDER_CARD : settings.card)?.portrait && (
            <img src={(building ? BUILDER_CARD : settings.card).portrait} alt="" className="portrait" />
          )}
          <strong>{building ? BUILDER_CARD.name : settings.card?.name || 'Sidekick'}</strong>
          {building && <span className="badge">building a companion</span>}
        </div>
        <div className="companion-head-actions">
          {!building && (
            <>
              <button className="small" title="New conversation" onClick={newConversation}>+ new</button>
              <button
                className="small"
                title="Resume a conversation"
                onClick={() => setShowThreads((v) => !v)}
              >
                threads ({threadState.threads.length})
              </button>
              <button
                className="small"
                title="Pinned explanations — yours alone, never the claim record"
                onClick={() => setShowNotebook((v) => !v)}
              >
                notebook ({notebook.length})
              </button>
            </>
          )}
          <button className="small" onClick={() => setShowSettings((v) => !v)}>
            {showSettings ? 'close' : 'settings'}
          </button>
        </div>
      </div>

      {showThreads && !building && (
        <div className="thread-list">
          {threadState.threads.length === 0 && <div className="empty">No saved conversations yet.</div>}
          {threadState.threads.map((t) => (
            <div key={t.id} className={`thread-row${t.id === activeId ? ' active' : ''}`}>
              <button className="thread-open" onClick={() => resumeThread(t.id)}>
                <span className="thread-title">{t.title}</span>
                <span className="thread-meta">{t.characterName} · {new Date(t.updatedAt).toLocaleString()}</span>
              </button>
              <button className="small danger-soft" title="Delete" onClick={() => deleteThread(t.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="companion-banner">
        {building
          ? 'The Builder makes companions. Powers shape how a character acts and appears — never what it can access.'
          : demo
          ? 'The companion narrates and answers. It cannot place, promote, or attach anything — and in this demo, neither can you.'
          : 'The sidekick advises. The rules decide. It cannot place, promote, or attach anything.'}
      </div>

      {showSettings && !building && (
        <div className="companion-settings">
          <p className="key-promise">
            Keys live in this browser only (localStorage). Calls go straight from here to the
            provider — never to this app's server, never logged.
          </p>
          <label>Provider</label>
          <select value={settings.provider} onChange={(e) => setSettings((s) => ({ ...s, provider: e.target.value }))}>
            {Object.entries(PROVIDERS).map(([k, v]) => (
              <option key={k} value={k} disabled={!!v.browserBlocked}>{v.label}</option>
            ))}
          </select>
          {PROVIDERS[settings.provider]?.browserBlocked && (
            <p className="rejection" style={{ fontSize: 12 }}>
              {PROVIDERS[settings.provider].browserBlocked}
            </p>
          )}
          {settings.provider === 'openai-compatible' && (
            <>
              <label>Base URL</label>
              <input value={settings.baseUrl} onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))} />
            </>
          )}
          <label>Model</label>
          <input
            value={settings.model}
            list="model-suggestions"
            onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
          />
          <datalist id="model-suggestions">
            {(PROVIDERS[settings.provider]?.models || []).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <label>{settings.provider} API key</label>
          <input
            type="password"
            value={settings.keys[settings.provider] || ''}
            onChange={(e) => setKey(settings.provider, e.target.value)}
            placeholder="stored in localStorage only"
          />
          <label>Rendering style</label>
          <select value={settings.helpingMode} onChange={(e) => setSettings((s) => ({ ...s, helpingMode: e.target.value }))}>
            <option value="full">persona-full (voice + fidelity gate)</option>
            <option value="interleaved">interleaved (record blocks + commentary)</option>
            <option value="light">light voice</option>
            <option value="bare">bare core (no persona)</option>
          </select>
          <div className="checkline">
            <input
              type="checkbox"
              id="autospeak"
              checked={settings.autoSpeak}
              onChange={(e) => setSettings((s) => ({ ...s, autoSpeak: e.target.checked }))}
            />
            <label htmlFor="autospeak" style={{ margin: 0 }}>Auto-speak narration (Web Speech by default)</label>
          </div>

          <h3>Live web search</h3>
          <div className="checkline">
            <input
              type="checkbox"
              id="searchEnabled"
              checked={settings.search?.enabled ?? true}
              onChange={(e) => setSettings((s) => ({ ...s, search: { ...s.search, enabled: e.target.checked } }))}
            />
            <label htmlFor="searchEnabled" style={{ margin: 0 }}>Enable source-finding — retrieval only, never attaches</label>
          </div>
          {settings.search?.enabled && (
            <>
              <label>Search backend</label>
              <select
                value={settings.search?.mode || 'openrouter-online'}
                onChange={(e) => setSettings((s) => ({ ...s, search: { ...s.search, mode: e.target.value } }))}
              >
                <option value="openrouter-online">OpenRouter online (rides your one key)</option>
                <option value="search-api">Dedicated search API (link-first)</option>
              </select>
              {settings.search?.mode === 'search-api' && (
                <>
                  <label>Search provider</label>
                  <select
                    value={settings.search?.apiProvider || 'brave'}
                    onChange={(e) => setSettings((s) => ({ ...s, search: { ...s.search, apiProvider: e.target.value } }))}
                  >
                    <option value="brave">Brave</option>
                    <option value="tavily">Tavily</option>
                    <option value="exa">Exa</option>
                  </select>
                  <label>{settings.search?.apiProvider || 'brave'} search key</label>
                  <input
                    type="password"
                    value={settings.keys[settings.search?.apiProvider || 'brave'] || ''}
                    onChange={(e) => setKey(settings.search?.apiProvider || 'brave', e.target.value)}
                    placeholder="stored in localStorage only"
                  />
                </>
              )}
            </>
          )}

          <h3>Character card</h3>
          {settings.card && (
            <div className="card-current">
              Loaded: <strong>{settings.card.name}</strong>
              {settings.card.voice && ` · voice: ${settings.card.voice.provider}`}
              <button className="small" onClick={exportCard} title="Download this card as .json — re-imports losslessly">export</button>
              <button className="small" onClick={() => setSettings((s) => ({ ...s, card: null }))}>remove</button>
            </div>
          )}
          <button className="small primary" onClick={startBuilder} disabled={!hasKey} style={{ marginBottom: 8 }}>
            ✦ Build a companion by conversation
          </button>
          <div
            className="card-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              importCardFile(e.dataTransfer.files?.[0]);
            }}
          >
            <p className="muted" style={{ fontSize: 11.5, margin: '0 0 8px' }}>
              …or import a card: pick a .json file, drop one here, or paste. One format, three doors.
            </p>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                importCardFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <textarea
              placeholder="Paste character-card JSON (name / description / personality / scenario / example_messages; optional voice + portrait)…"
              value={cardText}
              onChange={(e) => setCardText(e.target.value)}
            />
            <button className="small" onClick={importCard} disabled={!cardText.trim()}>Import pasted card</button>
          </div>
          {cardError && <div className="rejection" style={{ marginTop: 8 }}>{cardError}</div>}

          <div className="hashline">
            core prompt hash: <code>{hash ? hash.slice(0, 16) + '…' : '…'}</code>
            <span className="muted"> (the immutable §2 core — independent of any card)</span>
          </div>
        </div>
      )}

      <div className="companion-chat" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty">
            Double-click any claim tile to have {settings.card?.name || 'the companion'} narrate it —
            strictly from its record. Or ask a question about the topic below.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === 'assistant' && m.by && m.by !== 'system' && <div className="by">{m.by}</div>}
            <MessageBody m={m} />
            {m.notices?.map((n, j) => (
              <div key={j} className="companion-notice">{n}</div>
            ))}
            {m.role === 'assistant' && m.by !== 'system' && (
              <>
                <button className="small speak" onClick={() => doSpeak(m.text)}>▶ speak</button>
                {m.narrated_claim && (
                  <button
                    className="small"
                    title="Save this explanation to YOUR notebook — never to the claim's record"
                    onClick={() => {
                      setNotebook(
                        pinToNotebook({
                          claim_id: m.narrated_claim.id,
                          claim_text: m.narrated_claim.text,
                          text: m.text,
                          by: m.by
                        })
                      );
                    }}
                  >
                    ⚲ pin
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        {busy && (
          <div className="empty stage-indicator">
            …{building ? 'shaping' : stage || 'thinking'}…
          </div>
        )}
        {workingNotes.length > 0 && (
          <details className="working-notes">
            <summary>⚠ model’s ungated working notes — scratch, not narration, not pinnable</summary>
            {workingNotes.map((w, i) => (
              <pre key={i}>{w}</pre>
            ))}
          </details>
        )}
        {!busy && stageTimes.length > 0 && (
          <div className="stage-timings" title="Per-stage timings (dev readout — Amendment B)">
            {stageTimes.map((s) => `${s.key} ${s.ms}ms`).join(' · ')}
          </div>
        )}
      </div>

      {showNotebook && (
        <div className="notebook">
          <div className="notebook-head">
            <strong>Your notebook</strong>
            <span className="muted"> — pinned explanations live here, never on the claim record</span>
          </div>
          {notebook.length === 0 && <div className="empty">Nothing pinned yet.</div>}
          {notebook.map((n, i) => (
            <div className="notebook-entry" key={i}>
              <div className="muted">
                claim #{n.claim_id} · {n.by} · {new Date(n.pinned_at).toLocaleString()}
              </div>
              <div className="notebook-text">{n.text}</div>
              <button className="small danger-soft" onClick={() => setNotebook(removeFromNotebook(i))}>
                unpin
              </button>
            </div>
          ))}
        </div>
      )}

      {building && draftCard && (
        <div className="build-preview">
          <div>
            <strong>{draftCard.name}</strong>
            {draftCard.voice && ` · voice: ${draftCard.voice.provider}`}
            <div className="muted">{draftCard.personality?.slice(0, 90)}</div>
          </div>
          <button className="small primary" onClick={adoptDraft}>Adopt {draftCard.name}</button>
        </div>
      )}
      {building && (
        <div className="build-preview" style={{ justifyContent: 'flex-end' }}>
          <button className="small" onClick={() => setBuilding(false)}>cancel build</button>
        </div>
      )}

      <div className="companion-input">
        {/* 2.9d composer: auto-grows with content to a max, then scrolls
            internally. Enter sends; Shift+Enter newlines. */}
        <textarea
          className="composer"
          rows={1}
          value={input}
          disabled={busy}
          placeholder={
            building ? 'Answer the Builder…' : hasKey ? 'Ask about this topic…' : 'Add a key in settings to begin'
          }
          onChange={(e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
              e.target.style.height = 'auto';
            }
          }}
        />
        <button className="small" disabled={busy || !input.trim()} onClick={send}>send</button>
      </div>

      {searchLog.length > 0 && !building && (
        <details className="search-log">
          <summary>Tool/search log ({searchLog.length})</summary>
          {searchLog.slice(-12).map((e, i) => (
            <div key={i} className={e.ok ? 'log-ok' : 'log-refused'}>
              {e.at} · {e.tool} {e.ok ? '' : `· refused: ${e.error}`}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
