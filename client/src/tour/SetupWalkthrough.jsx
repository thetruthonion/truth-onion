// SPDX-License-Identifier: AGPL-3.0-only
// Setup walkthrough (2.96 phase 1). Skippable at every step; ends in a fork,
// never a wall. States the TRUE key guarantee in plain words — the key is
// stored in this browser only and never sent to this server — phrasing
// matched to what the key-privacy tests actually pin, no stronger. The live
// test call reuses the 2.9d adapter layer and surfaces its plain, named
// errors verbatim; nothing here is a new key path.

import { useState } from 'react';
import { PROVIDERS, chatComplete } from '../companion/providers.js';
import { loadSettings, saveSettings } from '../companion/store.js';
import { validateCardText } from '../companion/cards.js';

const KEY_SOURCES = {
  openrouter: 'openrouter.ai → Keys (one key fronts many models)',
  anthropic: 'console.anthropic.com → API keys',
  google: 'aistudio.google.com/apikey',
  'openai-compatible': 'wherever your gateway issues keys'
};

export default function SetupWalkthrough({ appOrigin, onDone }) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState(loadSettings);
  const [testState, setTestState] = useState(null); // null | 'testing' | {ok} | {error}
  const [cardError, setCardError] = useState(null);

  const provider = settings.provider;
  const spec = PROVIDERS[provider];
  const save = (next) => {
    setSettings(next);
    saveSettings(next);
  };

  const testCall = async () => {
    setTestState('testing');
    try {
      const out = await chatComplete(
        {
          provider,
          baseUrl: settings.baseUrl,
          apiKey: settings.keys[provider] || '',
          model: settings.model
        },
        {
          system: 'Reply with the single word: ready.',
          messages: [{ role: 'user', content: 'ready?' }]
        },
        { appOrigin, fetchImpl: (...a) => fetch(...a) }
      );
      setTestState({ ok: true, sample: (out.text || '').slice(0, 60) });
    } catch (e) {
      // 2.9d rule carried through: the failure is NAMED, never a silent
      // fallback to another provider.
      setTestState({ error: e.message });
    }
  };

  const steps = [
    // 0 — provider
    <div key="p">
      <h3>1 · Choose a provider</h3>
      <p className="empty">
        The companion runs on your own key, in your browser. Unsupported options say why —
        they are refused honestly, not proxied.
      </p>
      <select
        value={provider}
        onChange={(e) => save({ ...settings, provider: e.target.value })}
      >
        {Object.entries(PROVIDERS).map(([k, v]) => (
          <option key={k} value={k} disabled={!!v.browserBlocked}>
            {v.label}
          </option>
        ))}
      </select>
      {spec?.browserBlocked && <p className="rejection">{spec.browserBlocked}</p>}
      {provider === 'openai-compatible' && (
        <>
          <label>Base URL</label>
          <input
            value={settings.baseUrl}
            onChange={(e) => save({ ...settings, baseUrl: e.target.value })}
          />
        </>
      )}
      <label>Model</label>
      <input
        value={settings.model}
        list="walkthrough-models"
        onChange={(e) => save({ ...settings, model: e.target.value })}
      />
      <datalist id="walkthrough-models">
        {(spec?.models || []).map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </div>,
    // 1 — key + cost honesty
    <div key="k">
      <h3>2 · Get a key, know the cost</h3>
      <p className="empty">Where: {KEY_SOURCES[provider] || 'your provider’s console'}.</p>
      <p className="empty">
        Honest cost note: it is your key and your spend, billed per token by your provider —
        typically fractions of a cent per narration, but that meter is yours, not ours.
      </p>
      <p className="key-promise">
        The guarantee, exactly as tested: your key is stored in this browser (localStorage)
        only, rides only in requests from your browser to your provider, and is never sent to
        this app’s server.
      </p>
      <label>{provider} API key</label>
      <input
        type="password"
        value={settings.keys[provider] || ''}
        placeholder="paste your key…"
        onChange={(e) => save({ ...settings, keys: { ...settings.keys, [provider]: e.target.value } })}
      />
    </div>,
    // 2 — live test
    <div key="t">
      <h3>3 · Test it live</h3>
      <p className="empty">One tiny call, browser → provider. Failures are named, never papered over.</p>
      <button
        className="primary"
        disabled={testState === 'testing' || !(settings.keys[provider] || '').trim()}
        onClick={testCall}
      >
        {testState === 'testing' ? 'calling…' : 'make a test call'}
      </button>
      {testState?.ok && (
        <p className="key-promise">✓ Live reply received{testState.sample ? `: “${testState.sample}”` : ''}.</p>
      )}
      {testState?.error && <p className="rejection">{testState.error}</p>}
    </div>,
    // 3 — card
    <div key="c">
      <h3>4 · A voice (optional)</h3>
      <p className="empty">
        Use the default plain narrator, or import a character card (.json). Cards are voice
        only — no card can touch the rules or the record.
      </p>
      {settings.card ? (
        <p className="key-promise">Loaded: {settings.card.name}</p>
      ) : (
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            f.text().then((t) => {
              try {
                save({ ...settings, card: validateCardText(t) });
                setCardError(null);
              } catch (err) {
                setCardError(`Card refused: ${err.message}`);
              }
            });
            e.target.value = '';
          }}
        />
      )}
      {cardError && <p className="rejection">{cardError}</p>}
    </div>,
    // 4 — the fork
    <div key="f">
      <h3>Ready</h3>
      <p className="empty">A fork, never a wall:</p>
      <div className="row">
        <button
          className="primary"
          disabled={!testState?.ok}
          onClick={() => onDone('companion')}
          title={testState?.ok ? '' : 'Run the test call first — the tour never fakes a companion'}
        >
          companion ready — begin the tour
        </button>
        <button className="small" onClick={() => onDone('written')}>
          skip — tour without a companion
        </button>
      </div>
    </div>
  ];

  return (
    <div className="tour-panel" role="dialog" aria-label="Companion setup">
      <div className="tour-head">
        <strong>Set up a companion</strong>
        <span className="muted"> · step {step + 1} of {steps.length}</span>
        <button className="small" style={{ marginLeft: 'auto' }} onClick={() => onDone('written')}>
          skip setup → written tour
        </button>
        <button className="small" onClick={() => onDone('close')} title="Close — the tour is in the header any time">
          ✕
        </button>
      </div>
      {steps[step]}
      <div className="tour-nav">
        <button className="small" disabled={step === 0} onClick={() => setStep(step - 1)}>
          ← back
        </button>
        {step < steps.length - 1 && (
          <button className="primary" onClick={() => setStep(step + 1)}>
            next →
          </button>
        )}
      </div>
    </div>
  );
}
