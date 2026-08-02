// Stage 2.99a Amendment B: autosave. One save format (the server's
// sandbox-save JSON — no forks); two labeled persistence modes:
//
//   'file'    — File System Access API (Chromium): the visitor picks a file
//               once; every change writes it (debounced upstream).
//   'browser' — everywhere else: continuous persistence to localStorage
//               (survives refresh/reopen within its limits) plus an exit
//               nudge to download.
//
// A failed write surfaces immediately through onStatus — never a silent
// stop behind a stale indicator.

export const AUTOSAVE_KEY = 'onion.sandbox.autosave';

export function fileHandlesSupported(w = typeof window !== 'undefined' ? window : {}) {
  return typeof w.showSaveFilePicker === 'function';
}

// Ask the visitor for the file, once. Returns {handle, filename} or null on
// cancel. Caller feature-detects first.
export async function pickAutosaveFile(w = window) {
  try {
    const handle = await w.showSaveFilePicker({
      suggestedName: 'truth-onion-sandbox-save.json',
      types: [{ description: 'Truth Onion sandbox save', accept: { 'application/json': ['.json'] } }]
    });
    return { handle, filename: handle.name };
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.code === 20)) return null;
    throw e;
  }
}

// makeAutosaver({mode, handle, storage, onStatus}) → async write(text).
// onStatus receives {ok, error?, at} after every attempt — the indicator
// renders from it, so the indicator can never silently go stale.
export function makeAutosaver({ mode, handle = null, storage = null, onStatus = () => {} }) {
  return async function write(text) {
    try {
      if (mode === 'file') {
        const w = await handle.createWritable();
        await w.write(text);
        await w.close();
      } else if (mode === 'browser') {
        const store = storage || localStorage;
        store.setItem(AUTOSAVE_KEY, text);
      } else {
        throw new Error(`unknown autosave mode "${mode}"`);
      }
      onStatus({ ok: true, at: Date.now() });
      return true;
    } catch (e) {
      // Revoked handle, storage full, anything: surfaced, plainly.
      onStatus({ ok: false, error: e.message || String(e), at: Date.now() });
      return false;
    }
  };
}

export function readBrowserAutosave(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    return save && save.format === 'truth-onion-sandbox-save' ? save : null;
  } catch {
    return null;
  }
}

export function clearBrowserAutosave(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    storage?.removeItem(AUTOSAVE_KEY);
  } catch {}
}

// The manual download — same artifact as the autosave (one format).
export function downloadSave(text, doc = document) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = 'truth-onion-sandbox-save.json';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
