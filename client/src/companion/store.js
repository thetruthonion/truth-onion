// SPDX-License-Identifier: AGPL-3.0-only
// Companion settings, keys, and active card — localStorage ONLY (survives
// browser and computer restarts). Nothing here ever enters a request to the
// app, is logged, or appears in the topic export.
//
// Durability layout (§12b + §13c): the volatile things each live in their OWN
// isolated `onion.companion.*` entry so no single bad write or reset can take
// another down with it:
//   onion.companion        UI prefs (provider, model, modes, search config)
//   onion.companion.keys   API keys
//   onion.companion.card   the active character card
//   onion.companion.threads  conversations (managed in threads.js)
//
// loadSettings NEVER silently returns bare defaults on a read error and lets a
// later save clobber a good entry — on a parse failure it reports _ok=false so
// the caller refuses to overwrite. The key/card/threads survive every reset
// path (all app resets are server-side DB operations that cannot reach browser
// storage — pinned by test).

const SETTINGS_KEY = 'onion.companion';
const KEYS_KEY = 'onion.companion.keys';
const CARD_KEY = 'onion.companion.card';
const NOTEBOOK_KEY = 'onion.companion.notebook';
export const STORAGE_KEYS = { SETTINGS_KEY, KEYS_KEY, CARD_KEY, NOTEBOOK_KEY };
// The full family a reset audit must never touch.
export const STORAGE_FAMILY = [
  SETTINGS_KEY,
  KEYS_KEY,
  CARD_KEY,
  'onion.companion.threads',
  NOTEBOOK_KEY
];

const DEFAULTS = {
  provider: 'openrouter',
  model: 'anthropic/claude-3.5-sonnet',
  baseUrl: '',
  helpingMode: 'full', // full | interleaved | light | bare
  autoSpeak: false,
  // §14 live search config (client-side only, same key discipline).
  search: {
    enabled: true,
    mode: 'openrouter-online', // 'openrouter-online' | 'search-api'
    apiProvider: 'brave', // brave | tavily | exa  (used when mode === 'search-api')
    maxResults: 6
  }
};

function backend(storage) {
  return storage || (typeof localStorage !== 'undefined' ? localStorage : null);
}

function readJSON(store, key) {
  const raw = store.getItem(key);
  if (!raw) return { value: null, ok: true };
  try {
    return { value: JSON.parse(raw), ok: true };
  } catch {
    return { value: null, ok: false };
  }
}

// Returns { ...settings, keys, card, _ok }. _ok === false means a stored value
// failed to parse — the caller must NOT immediately save over it (the clobber
// bug). Each isolated entry is read independently, so a corrupt settings blob
// never takes the key or card down with it.
export function loadSettings(storage) {
  const store = backend(storage);
  if (!store) return { ...DEFAULTS, keys: {}, card: null, _ok: true };
  let ok = true;

  const s = readJSON(store, SETTINGS_KEY);
  if (!s.ok) ok = false;
  const stored = s.value && typeof s.value === 'object' ? s.value : {};
  const settings = {
    ...DEFAULTS,
    ...stored,
    search: { ...DEFAULTS.search, ...(stored.search || {}) }
  };

  // Migrate a legacy combined blob (keys/card inside settings) into the split.
  let keys = {};
  let card = null;
  if (settings.keys && typeof settings.keys === 'object') keys = { ...settings.keys };
  if (settings.card) card = settings.card;
  delete settings.keys;
  delete settings.card;

  const k = readJSON(store, KEYS_KEY);
  if (!k.ok) ok = false;
  if (k.value && typeof k.value === 'object') keys = { ...keys, ...k.value };

  const c = readJSON(store, CARD_KEY);
  if (!c.ok) ok = false;
  if (c.value !== null) card = c.value;

  return { ...settings, keys, card, _ok: ok };
}

export function saveSettings(s, storage) {
  const store = backend(storage);
  if (!store) return;
  const { keys = {}, card = null, _ok, ...settings } = s;
  store.setItem(SETTINGS_KEY, JSON.stringify(settings));
  store.setItem(KEYS_KEY, JSON.stringify(keys));
  saveCard(card, store);
}

// Save ONLY the card — used so a card write can never wait on (or be lost to)
// a settings write. An isolated entry, exactly like keys.
export function saveCard(card, storage) {
  const store = backend(storage);
  if (!store) return;
  if (card == null) store.removeItem(CARD_KEY);
  else store.setItem(CARD_KEY, JSON.stringify(card));
}

export function saveKeys(keys, storage) {
  const store = backend(storage);
  if (!store) return;
  store.setItem(KEYS_KEY, JSON.stringify(keys || {}));
}

// ---- The notebook (Stage 2.9) --------------------------------------------
// Narrations are ephemeral by default — tour-guide moments, not provenance.
// "Pin this explanation" saves to the USER'S OWN notebook, never the claim's
// record: this module has no path to the API, and the notebook lives in its
// own isolated onion.companion.* entry like keys and card.
export function loadNotebook(storage) {
  const store = backend(storage);
  if (!store) return [];
  const n = readJSON(store, NOTEBOOK_KEY);
  return Array.isArray(n.value) ? n.value : [];
}

export function pinToNotebook(entry, storage) {
  const store = backend(storage);
  if (!store) return [];
  const notebook = loadNotebook(store);
  notebook.unshift({
    pinned_at: new Date().toISOString(),
    claim_id: entry.claim_id ?? null,
    claim_text: entry.claim_text ?? '',
    text: String(entry.text || ''),
    by: entry.by || 'core'
  });
  store.setItem(NOTEBOOK_KEY, JSON.stringify(notebook));
  return notebook;
}

export function removeFromNotebook(index, storage) {
  const store = backend(storage);
  if (!store) return [];
  const notebook = loadNotebook(store);
  notebook.splice(index, 1);
  store.setItem(NOTEBOOK_KEY, JSON.stringify(notebook));
  return notebook;
}

export function providerConfig(s) {
  return {
    provider: s.provider,
    baseUrl: s.baseUrl,
    apiKey: (s.keys && (s.keys[s.provider] || s.keys.local)) || '',
    model: s.model
  };
}
