// SPDX-License-Identifier: AGPL-3.0-only
// Stage 2.99a Amendment B, reworked per the punch list (item 8): autosave's
// two jobs are SPLIT and each is equalized across browsers — parity, no
// second-class mode.
//
//   JOB 1 — never lose work (identical everywhere): the browser-storage
//   MIRROR writes on every change in EVERY browser, Chromium included
//   (protects against revoked handles). Crash, refresh, TTL wipe, dropped
//   handle: nothing lost; resume is offered on return, never auto-imported.
//   The mirror is never the resting place — a dead demo origin strands its
//   browser storage — the FILE is.
//
//   JOB 2 — keep the file current: 'file' (File System Access, Chromium):
//   silent debounced writes to the picked file. 'download' (non-FSA, chosen
//   not imposed): programmatic downloads, debounced and batched upstream so
//   a burst of edits yields one download. 'manual': the user updates the
//   file themselves — a staleness counter tracks how many changes the file
//   is behind, surfaced as a badge with one-click update.
//
// A failed write — mirror or file — surfaces immediately through onStatus;
// never a silent stop behind a stale indicator. Setup order (all
// browsers): the flow opens with a real save creating the initial file;
// autosave maintains, it never originates.

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

// The save engine. `onStatus` receives the full state after every job —
// {fileMode, filename, behind, mirrorError, fileError} — so the indicator
// and the failure popover render from it and can never silently go stale.
export function makeSaveEngine({ storage = null, download = null, onStatus = () => {} } = {}) {
  let fileMode = null; // null | 'file' | 'download' | 'manual'
  let handle = null;
  let filename = null;
  let behind = 0; // changes the FILE is behind (job 2's staleness counter)
  const store = () => storage || localStorage;
  const dl = download || downloadSave;
  const status = (extra = {}) => ({ fileMode, filename, behind, mirrorError: null, fileError: null, ...extra });

  return {
    // Configure job 2 after the initial save exists.
    configureFile({ mode, handle: h = null, filename: name = null }) {
      fileMode = mode;
      handle = h;
      filename = name;
      onStatus(status());
    },
    // JOB 1: called on every change, every browser. Mirror first, count second.
    recordChange(text) {
      let mirrorError = null;
      try {
        store().setItem(AUTOSAVE_KEY, text);
      } catch (e) {
        mirrorError = e.message || String(e);
      }
      behind++;
      const s = status({ mirrorError });
      onStatus(s);
      return s;
    },
    // JOB 2: called debounced/batched by the owner (or by the one-click
    // update in manual mode). Resets the staleness counter on success.
    async writeFile(text) {
      let fileError = null;
      try {
        if (fileMode === 'file') {
          const w = await handle.createWritable();
          await w.write(text);
          await w.close();
        } else if (fileMode === 'download' || fileMode === 'manual') {
          dl(text);
        } else {
          return status(); // no file configured — the mirror already holds it
        }
        behind = 0;
      } catch (e) {
        // Revoked handle, blocked download, anything: surfaced; the mirror
        // (job 1) already holds the latest state, so nothing is lost.
        fileError = e.message || String(e);
      }
      const s = status({ fileError });
      onStatus(s);
      return s;
    },
    get behind() {
      return behind;
    },
    get fileMode() {
      return fileMode;
    },
    status: () => status()
  };
}

// ---- punch 10: the persisted file handle ---------------------------------
// FileSystemFileHandle is structured-cloneable, so it can live in IndexedDB
// alongside the mirror — a returning Chromium visitor reconnects to their
// file with at most the browser's own one-tap permission confirm. localStorage
// cannot hold handles; this tiny store exists only for that.
const HANDLE_DB = 'onion.sandbox.handles';
const HANDLE_KEY = 'autosave';

function handleDb(idb = typeof indexedDB !== 'undefined' ? indexedDB : null) {
  if (!idb) return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = idb.open(HANDLE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function storeHandle(handle) {
  const db = await handleDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

export async function loadStoredHandle() {
  const db = await handleDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

// 'granted' | 'prompt' | 'denied' | null (no handle / API absent).
export async function handlePermissionState(handle) {
  if (!handle?.queryPermission) return null;
  try {
    return await handle.queryPermission({ mode: 'readwrite' });
  } catch {
    return null;
  }
}

export async function requestHandlePermission(handle) {
  if (!handle?.requestPermission) return 'denied';
  try {
    return await handle.requestPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
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

// The download path — the initial save on non-FSA browsers, the batched
// auto-update, and the one-click manual update all use this one artifact:
// the standard save format, no forks.
export function downloadSave(text, doc = typeof document !== 'undefined' ? document : null) {
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
