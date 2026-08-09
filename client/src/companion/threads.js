// SPDX-License-Identifier: AGPL-3.0-only
// Conversation persistence (§12a). Per-character threads, titled by the first
// exchange, resumable after the panel is closed and reopened. Stored in
// localStorage so a thread survives panel close, browser restart, and the
// demo's server-side DB reset (which never touches browser storage).
//
// Shape is account-ready for Stage 3: a thread already carries `owner` (the
// local user today) so multiplayer can key threads by account without a
// migration.

const KEY = 'onion.companion.threads';

function backend(storage) {
  return storage || (typeof localStorage !== 'undefined' ? localStorage : null);
}

export function loadThreads(storage) {
  const store = backend(storage);
  if (!store) return { threads: [], activeId: null };
  try {
    const raw = store.getItem(KEY);
    if (!raw) return { threads: [], activeId: null };
    const parsed = JSON.parse(raw);
    return {
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
      activeId: parsed.activeId ?? null
    };
  } catch {
    return { threads: [], activeId: null };
  }
}

export function saveThreads(state, storage) {
  const store = backend(storage);
  if (!store) return;
  store.setItem(KEY, JSON.stringify(state));
}

let counter = 0;
export function newThreadId() {
  counter += 1;
  return `t${Date.now().toString(36)}${counter.toString(36)}`;
}

export function titleFor(messages) {
  const firstUser = messages.find((m) => m.role === 'user');
  const seed = firstUser?.text || messages[0]?.text || 'New conversation';
  const clean = String(seed).replace(/\s+/g, ' ').trim();
  return clean.length > 40 ? clean.slice(0, 39) + '…' : clean;
}

// Upsert a thread's messages, retitling from the first exchange, bumping it to
// most-recent. Returns the new state.
export function upsertThread(state, { id, characterName, messages }) {
  const rest = state.threads.filter((t) => t.id !== id);
  const thread = {
    id,
    characterName: characterName || 'Sidekick',
    title: titleFor(messages),
    updatedAt: Date.now(),
    owner: 'local',
    messages
  };
  return { threads: [thread, ...rest], activeId: id };
}

export function removeThread(state, id) {
  const threads = state.threads.filter((t) => t.id !== id);
  return { threads, activeId: state.activeId === id ? (threads[0]?.id ?? null) : state.activeId };
}
