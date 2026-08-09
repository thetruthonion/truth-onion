// SPDX-License-Identifier: AGPL-3.0-only
// Stage 2.99a: per-visitor sandbox sessions — the demo's participation
// layer. A read-only exhibit cannot show the engine's defining behavior,
// the refusal; a private copy can. Each session is an in-memory database
// restored from the SAME curated-record fixture the shared exhibit is
// built from, served by an app built by the SAME buildApp — not a fork,
// the same code path, so sandbox behavior structurally cannot drift from
// engine behavior.
//
// Copy-on-first-write (kickoff Amendment C): a copy exists only because a
// visitor attempted a write. Reads never create one; reads never consume a
// session slot. Ephemeral by design: wiped on TTL expiry, capped in count
// and size, never persisted server-side — the visitor's save file is the
// only persistence, and it is theirs.

import { openDb } from './db.js';
import { restoreHistory, exportRecord } from './history.js';

// Small-host discipline (recorded in PROJECT-STATE for host sizing):
// 24 concurrent copies (each an in-memory SQLite of a ~2 MB record, well
// inside the 512 MB baseline), 30-minute idle TTL, 8 MB per-copy size cap,
// sweep every minute.
export const SANDBOX_LIMITS = {
  cap: 24,
  ttlMs: 30 * 60_000,
  sizeCapBytes: 8 * 1024 * 1024,
  sweepMs: 60_000
};

// The honest boundary statements, each said once.
export const SANDBOX_ENTRY_NOTE =
  'This copy is yours alone. Nothing here is shared or saved on the server — export a save file to keep your work.';
export const SANDBOX_FULL_MESSAGE =
  'The sandbox is full — every private-copy slot is in use right now, so a copy cannot be created. Reading the record stays fully available; try your write again shortly.';
export const SANDBOX_GONE_MESSAGE =
  'This private copy has expired (copies are wiped after 30 idle minutes) or never existed. Reading is unaffected — import your save file to resume from where it left off.';
export const SANDBOX_SIZE_MESSAGE =
  'This copy has reached its size cap — export a save file to keep your work; further writes are refused, reading continues.';

// ---- the save format (extends the 2.97 contract to record-shaped work) ----
export const SAVE_FORMAT = 'truth-onion-sandbox-save';
export const SAVE_VERSION = 1;
export const SAVE_STANDING_NOTE =
  'Personas and standing in this save are simulation data — preset for demonstration, never earned. At Stage 3 (multiplayer), imports pass the real rules layer entry by entry; nothing carries standing in from a file.';

export class SaveFormatError extends Error {}

export function makeSave(db) {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    saved_at: new Date().toISOString(),
    standing_note: SAVE_STANDING_NOTE,
    record: exportRecord(db)
  };
}

// Validated whole with the blocker named — never partial, never coerced
// (the 2.97 import discipline, restated for record-shaped saves).
export function validateSave(save) {
  if (!save || typeof save !== 'object') {
    throw new SaveFormatError('A sandbox save is a JSON object.');
  }
  if (save.format !== SAVE_FORMAT) {
    throw new SaveFormatError(
      `Wrong or missing "format": expected "${SAVE_FORMAT}"${save.format ? `, got "${save.format}"` : ''}.`
    );
  }
  if (!Number.isInteger(save.version)) {
    throw new SaveFormatError('Missing "version" (an integer).');
  }
  if (save.version > SAVE_VERSION) {
    throw new SaveFormatError(
      `This save is version ${save.version}; this build reads up to ${SAVE_VERSION}. Nothing was imported.`
    );
  }
  if (!save.record || typeof save.record !== 'object') {
    throw new SaveFormatError('Missing "record" — the copy\'s content.');
  }
  for (const key of ['topics', 'claims', 'sources', 'attachments', 'supports', 'kernels', 'challenges', 'events']) {
    if (!Array.isArray(save.record[key])) {
      throw new SaveFormatError(`The save's record is missing "${key}".`);
    }
  }
  return save.record;
}

// ---- the session manager --------------------------------------------------
export function makeSandboxManager({ fixture, buildApp, limits = SANDBOX_LIMITS, now = Date.now }) {
  const sessions = new Map();
  let sweeper = null;

  function destroy(id) {
    const s = sessions.get(id);
    if (!s) return false;
    // The wipe: close the in-memory database — the copy ceases to exist.
    try {
      s.db.close();
    } catch {}
    sessions.delete(id);
    return true;
  }

  function sweep(t = now()) {
    for (const [id, s] of [...sessions]) if (s.expiresAt <= t) destroy(id);
  }

  function create({ save } = {}) {
    sweep();
    if (sessions.size >= limits.cap) return { full: true };
    const db = openDb(':memory:');
    try {
      // A fresh copy is the curated fixture; an imported one is the save's
      // record — either way the SAME restore path the pristine DB uses.
      restoreHistory(
        db,
        save ? { format: 'truth-onion-history', version: 1, ...validateSave(save) } : fixture
      );
    } catch (e) {
      try {
        db.close();
      } catch {}
      throw e;
    }
    const id = crypto.randomUUID();
    const s = {
      id,
      db,
      app: buildApp(db, { sandbox: true }),
      createdAt: now(),
      expiresAt: now() + limits.ttlMs
    };
    sessions.set(id, s);
    return { session: s };
  }

  function get(id) {
    const s = sessions.get(id);
    if (!s) return null;
    if (s.expiresAt <= now()) {
      destroy(id);
      return null;
    }
    return s;
  }

  function touch(id) {
    const s = sessions.get(id);
    if (s) s.expiresAt = now() + limits.ttlMs;
  }

  function sizeOf(s) {
    const pages = s.db.prepare('PRAGMA page_count').get();
    const size = s.db.prepare('PRAGMA page_size').get();
    return Number(pages.page_count) * Number(size.page_size);
  }

  function startSweeper() {
    if (sweeper) return;
    sweeper = setInterval(() => sweep(), limits.sweepMs);
    sweeper.unref?.();
  }

  function stop() {
    if (sweeper) clearInterval(sweeper);
    sweeper = null;
    for (const id of [...sessions.keys()]) destroy(id);
  }

  return { create, get, touch, sweep, destroy, sizeOf, startSweeper, stop, count: () => sessions.size, limits };
}
