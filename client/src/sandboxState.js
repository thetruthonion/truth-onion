// Stage 2.99a: the sandbox client state, as PURE functions — the indicator
// is the honesty organ (Amendment C), so the text it shows is derived
// logic, testable outside the DOM, not scattered JSX conditions.
//
// One surface: every visitor browses the canonical curated record until
// their first attempted write transparently creates a private copy and the
// write lands in it. The visitor must always know which record they are
// looking at; these functions are the single source of that answer.

export const CANONICAL_LABEL = 'canonical record';

// Punch 2: the one description of what a copy IS — concrete verbs, no fog.
export const COPY_DESCRIPTION =
  'your own private copy — add claims, attach sources, file challenges; the rules accept or refuse them, with reasons';

// Punch 1: the one-time informational sentence at copy creation —
// non-blocking, plain, shown adjacent to where the action happened.
export const COPY_CREATED_NOTICE =
  `Your change landed in ${COPY_DESCRIPTION}. The shared record is untouched; save controls are in the header.`;
export const COPY_LABEL = 'your copy — diverged from the record';
export const COPY_SAFE_LABEL = 'canonical record — your copy is safe; switch back any time';

// indicator({sid, viewCanonical}) → the marker text, at all times truthful.
export function indicatorText({ sid = null, viewCanonical = false } = {}) {
  if (!sid) return CANONICAL_LABEL;
  return viewCanonical ? COPY_SAFE_LABEL : COPY_LABEL;
}

// The api base all reads and writes use. '' = the canonical record (whose
// writes 403 server-side — enforcement, not presentation).
export function apiBase({ sid = null, viewCanonical = false } = {}) {
  return sid && !viewCanonical ? `/sandbox/${sid}` : '';
}

// First-write interception: does this write attempt need a copy created
// first? Reads never create one (pinned server-side too: a read-only crawl
// leaves zero sessions).
export function needsCopy({ demo = false, sid = null } = {}) {
  return !!demo && !sid;
}

// The save-prompt message — fires at first write, the moment losable work
// begins existing (Amendment C timing): the issue and its solution before
// the first change is old enough to miss. Setup order (punch 8): a REAL
// save first — the file is the resting place; autosave maintains it.
export const SAVE_PROMPT_MESSAGE =
  'This copy is ephemeral — it lives on the server for 30 idle minutes and is wiped, and nothing in it is shared or saved server-side. Save your copy to a file now; autosave keeps it current as you work, and an in-browser mirror protects every change meanwhile.';

// Autosave labels (punch 8): equal-dignity copy — modes are stated as
// modes, never as deficiencies; the staleness counter is first-class; a
// write failure is never a silent stop with a stale indicator.
export function autosaveLabel({ fileMode = null, filename = null, behind = 0, mirrorError = null, fileError = null } = {}) {
  if (mirrorError) return `in-browser protection FAILED — ${mirrorError}`;
  if (fileError) return `file update FAILED — ${fileError}; every change is still protected in-browser`;
  if (fileMode === 'file') return `autosaving to ${filename || 'your file'}`;
  if (fileMode === 'download') return `autosaving to Downloads${behind > 0 ? ` — ${behind} change${behind === 1 ? '' : 's'} pending` : ''}`;
  if (fileMode === 'manual') {
    return behind > 0
      ? `protected in-browser — file ${behind} change${behind === 1 ? '' : 's'} behind`
      : 'protected in-browser — file current';
  }
  return 'protected in-browser — save your copy to keep it beyond this browser';
}

// Divergence: the copy's events past the canonical record's last event id
// are exactly what the visitor changed (restored ids are verbatim, new
// writes append after them).
export function divergenceEvents(copyEvents, canonicalMaxEventId) {
  return (copyEvents || []).filter((e) => e.id > canonicalMaxEventId);
}

export const PERSONA_SWITCH_LABEL =
  'simulated role · standing preset for demonstration, not earned; real standing rules arrive with multiplayer';

// The copy-link / page impermanence honesty (Amendment C): pages render the
// canonical record only, on a disposable host.
export const PAGE_IMPERMANENCE_HINT =
  'Pages show the canonical record on this demo host — temporary by design. Your copy has no public page; links go live at multiplayer.';

// ---- punch 10/12/14: what the save file carries beyond the record --------

// Punch 11: the voluntary contribution ask — one consistent line, shown at
// the save moments, dismissible, never repeated in-session, never gating.
// No endpoint exists; nothing sends automatically.
export const CONTRIBUTION_ASK =
  "Voluntary: email your save file to truth.onionwright@gmail.com — it shows us where the rules and the vocabulary strain, which is exactly what improves the engine. You'd be sending your own drafts and reasons, so read the file first — it's yours.";

// Punch 14: a cheap, stable fingerprint of a save's record (FNV-1a) so a
// resumed session can name its ancestor — an arc, not a snapshot.
export function saveFingerprint(save) {
  const s = JSON.stringify(save?.record ?? save ?? '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// Punch 10/12/14: decorate the server's save with the client-side blocks —
// preferences (so resume re-prompts nothing the browser doesn't mandate),
// the refusals ledger, and the session lineage. Pure; the caller supplies
// current state. v1 consumers ignore unknown blocks; the import validator
// reads `record` only, so every block survives round-trips untouched.
export function decorateSave(save, { autosaveMode = null, refusals = [], session = null } = {}) {
  return {
    ...save,
    preferences: { autosave_mode: autosaveMode, setup_complete: !!autosaveMode },
    refusals,
    session: session ?? { started_at: null, resumed_from: null }
  };
}

// Punch 10: the resume plan — given a save's preferences and what this
// browser can actually do, which prompts (if any) are mandated? Pure and
// pinned: non-FSA modes restore silently; a stored, granted handle
// reconnects silently; the browser's own permission confirm and the
// missing-handle "pick where" are the ONLY prompts, each with its one-line
// why. No preferences → the normal full setup.
export const RECONNECT_WHY =
  'Your save file is set to autosave — this browser asks once before writing to it again.';
export const PICK_WHERE_WHY =
  'Your save prefers file autosave, but browsers cannot carry file handles inside files — pick where once and autosave resumes.';

export function resumePlan({ preferences = null, fsaSupported = false, handleStored = false, handlePermission = null } = {}) {
  if (!preferences || !preferences.setup_complete || !preferences.autosave_mode) {
    return { fileMode: null, prompt: 'full-setup', why: null };
  }
  const mode = preferences.autosave_mode;
  if (mode === 'download' || mode === 'downloads' || mode === 'manual') {
    return { fileMode: mode === 'downloads' ? 'download' : mode, prompt: null, why: null };
  }
  // mode === 'file'
  if (!fsaSupported) {
    // A file-mode save opened where silent file writes don't exist: the
    // manual mode keeps the same file current by explicit one-click
    // updates — the staleness badge says how far behind it is.
    return { fileMode: 'manual', prompt: null, why: null };
  }
  if (handleStored && handlePermission === 'granted') {
    return { fileMode: 'file', prompt: null, why: null };
  }
  if (handleStored) {
    return { fileMode: 'file', prompt: 'reconnect', why: RECONNECT_WHY };
  }
  return { fileMode: 'file', prompt: 'pick-where', why: PICK_WHERE_WHY };
}
