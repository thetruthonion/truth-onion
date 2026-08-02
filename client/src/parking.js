// The portable parking lot (2.97). Private scratch with no epistemic
// standing — no tier, no weight, no place on the rings, deletion unlogged
// (settled). This module holds all three pieces:
//
//   ADAPTER — one interface, two backends. The full engine keeps the
//   server-backed parking lot exactly as before. Demo mode stores notes
//   DEVICE-LOCALLY (`onion.parking.*`): a demo visitor's notes never touch
//   the server (the demo store holds no reference to the API at all) and
//   survive demo restarts and redeploys on their own device.
//
//   EXPORT — a versioned, pretty-printed JSON file the owner can read in a
//   text editor and recognize as their own work. User-initiated only;
//   nothing auto-uploads anywhere, ever.
//
//   IMPORT — the exported format back in, validated whole with the blocker
//   named; merge by default with duplicate detection on content; replace
//   only behind explicit confirmation. Imported content lands in the
//   parking lot AND ONLY the parking lot: this module never references any
//   record entity — no topics, no claims, no sources (pinned by test).
//   Promotion to a real claim stays the existing one-at-a-time flow through
//   the rules layer.
//
// THE FORMAT is the forward-compatibility contract (recorded in
// PROJECT-STATE): { format: 'truth-onion-parking', version: 1, exported_at,
// items: [{ text, created_at?, topic?, claim?, sources?: [{url?, title?,
// why?}], reasoning? }] }. `text` is the freeform note and the only
// required field; the structured fields are optional forward-looking
// carriers a future multiplayer import can read.

export const PARKING_FORMAT = 'truth-onion-parking';
// v2 (Amendment A): the parked unit is SUSPENDED WORK, not a blank note —
// {kind, context reference, draft fields, note, timestamps}. v1 files
// (text-only items) remain readable: a v1 item is a v2 'note'.
export const PARKING_VERSION = 2;
export const PARKING_KEY = 'onion.parking.notes';

// The parkable kinds. 'note' is the retained freeform notepad (no context
// ref); the others freeze a form mid-draft plus where it was pointed.
// 'topic-pointer' (2.97 punch list) parks a whole topic as a research
// pointer — topic reference, no claim id; resume opens the topic.
export const PARK_KINDS = ['note', 'claim-draft', 'challenge', 'source-attach', 'claim-pointer', 'topic-pointer'];

export class ParkingImportError extends Error {}

// ---- the freeze rule ------------------------------------------------------
// The park freezes the DRAFT, never the world. context stores only the
// pointer (topic/claim ids + a snippet labeled as noted-at-park-time for the
// listing); on resume the record is resolved LIVE here, and the caller
// renders today's record around the untouched draft. A dangling pointer
// degrades to a fully readable draft with the reason named — it never costs
// the user their words.
export function resolveParkedRef(entry, { topics = [] } = {}) {
  if (!entry.context || (entry.context.claim_id == null && entry.context.topic_id == null)) {
    return { resolved: true, draft: entry.draft };
  }
  const { claim_id, topic_id, topic_name } = entry.context;
  if (claim_id != null) {
    for (const t of topics) {
      const live = (t.claims || []).find((c) => c.id === claim_id);
      if (live) return { resolved: true, topicId: t.id, liveClaim: live, draft: entry.draft };
    }
    return {
      resolved: false,
      reason: `The referenced claim (#${claim_id}${entry.context.claim_text ? `, noted as "${String(entry.context.claim_text).slice(0, 60)}"` : ''}) is not in this record — a different deployment, a later seed, or a removed reference. Your draft is preserved in full below.`,
      draft: entry.draft
    };
  }
  const topic =
    topics.find((t) => t.id === topic_id) ||
    (topic_name && topics.find((t) => t.name === topic_name));
  if (topic) return { resolved: true, topicId: topic.id, draft: entry.draft };
  return {
    resolved: false,
    reason: `The referenced topic (${topic_name || `#${topic_id}`}) is not in this record. Your draft is preserved in full below.`,
    draft: entry.draft
  };
}

// ---- server text-column envelope -----------------------------------------
// The full engine's parked_notes table holds text; structured entries ride
// it as a JSON envelope, decoded by the adapter — lossless, no schema
// change, and a plain note stays a plain readable string.
const ENVELOPE_KEY = '@parked';

export function encodeEntryText(entry) {
  const { kind = 'note', text, note, context, draft } = entry;
  if (kind === 'note' && !context && !draft && !note) return String(text || '');
  return JSON.stringify({ [ENVELOPE_KEY]: PARKING_VERSION, kind, text, note, context, draft });
}

export function decodeEntry(row) {
  const raw = String(row.text ?? '');
  if (raw.startsWith(`{"${ENVELOPE_KEY}"`)) {
    try {
      const doc = JSON.parse(raw);
      if (doc[ENVELOPE_KEY]) {
        const { [ENVELOPE_KEY]: _v, ...rest } = doc;
        // The raw envelope string must never surface as the entry's text —
        // only a text field the envelope itself carries.
        const { text: _envelope, ...rowRest } = row;
        return { ...rowRest, ...rest, kind: rest.kind || 'note' };
      }
    } catch {}
  }
  return { ...row, kind: 'note', text: raw };
}

const normText = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// ---- adapter --------------------------------------------------------------
// makeParkingStore({demo, api, storage}) → {mode, list, park, remove, bulkAdd}
// The DEMO branch is constructed without touching `api` at all — device-only
// by structure, not by discipline.
export function makeParkingStore({ demo, api, storage }) {
  if (!demo) {
    const list = async (topicId) => (await api.parking(topicId)).map(decodeEntry);
    return {
      mode: 'server',
      list,
      park: (topicId, text) => api.parkNote(topicId, text),
      // Structured entries ride the text column as a lossless envelope —
      // still the parked_notes table and nothing else.
      parkEntry: (topicId, entry) => api.parkNote(topicId, encodeEntryText(entry)),
      remove: (id) => api.deleteParkedNote(id),
      bulkAdd: async (topicId, items) => {
        for (const item of items) await api.parkNote(topicId, encodeEntryText(item));
      },
      readAll: list
    };
  }

  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  const readRaw = () => {
    try {
      const v = JSON.parse(store.getItem(PARKING_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const writeRaw = (items) => store.setItem(PARKING_KEY, JSON.stringify(items));
  let counter = 0;
  const nextId = () => `local-${Date.now()}-${counter++}`;

  return {
    mode: 'local',
    list: async (topicId) => readRaw().filter((n) => n.topic_id === topicId),
    park: async (topicId, text) => {
      const note = {
        id: nextId(),
        topic_id: topicId,
        kind: 'note',
        text: String(text).trim(),
        created_at: new Date().toISOString()
      };
      writeRaw([...readRaw(), note]);
      return note;
    },
    parkEntry: async (topicId, entry) => {
      // Release 2b: a source drafted ON the demo host cannot be mechanically
      // verified here (the live verifier is deliberately absent), so the
      // save records that as a STATE — pending, verified at import — rather
      // than leaving it ambiguous. No other machinery exists behind this.
      const draft =
        entry.kind === 'source-attach' && entry.draft && entry.draft.verification == null
          ? { ...entry.draft, verification: 'pending' }
          : entry.draft;
      const full = {
        id: nextId(),
        topic_id: topicId,
        created_at: new Date().toISOString(),
        kind: entry.kind || 'note',
        ...(entry.text != null ? { text: entry.text } : {}),
        ...(entry.note != null ? { note: entry.note } : {}),
        ...(entry.context ? { context: entry.context } : {}),
        ...(draft ? { draft } : {})
      };
      writeRaw([...readRaw(), full]);
      return full;
    },
    remove: async (id) => {
      writeRaw(readRaw().filter((n) => n.id !== id));
      return { deleted: true };
    },
    bulkAdd: async (topicId, items) => {
      const now = new Date().toISOString();
      const notes = items.map((item) => ({
        id: nextId(),
        topic_id: topicId,
        created_at: item.created_at || now,
        kind: item.kind || 'note',
        ...(item.text != null ? { text: String(item.text) } : {}),
        ...(item.note != null ? { note: item.note } : {}),
        ...(item.context ? { context: item.context } : {}),
        ...(item.draft ? { draft: item.draft } : {}),
        // v1 structured carriers ride along losslessly on-device.
        ...(item.topic ? { topic: item.topic } : {}),
        ...(item.claim ? { claim: item.claim } : {}),
        ...(item.sources ? { sources: item.sources } : {}),
        ...(item.reasoning ? { reasoning: item.reasoning } : {})
      }));
      writeRaw([...readRaw(), ...notes]);
      return notes;
    },
    replaceAll: async (topicId, items) => {
      const others = readRaw().filter((n) => n.topic_id !== topicId);
      writeRaw(others);
      return store; // caller follows with bulkAdd
    },
    readAll: async (topicId) => readRaw().filter((n) => n.topic_id === topicId)
  };
}

// ---- export ---------------------------------------------------------------
export function serializeParking(items) {
  return JSON.stringify(
    {
      format: PARKING_FORMAT,
      version: PARKING_VERSION,
      exported_at: new Date().toISOString(),
      items: items.map((n) => ({
        kind: n.kind || 'note',
        ...(n.text != null ? { text: n.text } : {}),
        ...(n.note != null ? { note: n.note } : {}),
        ...(n.context ? { context: n.context } : {}),
        ...(n.draft ? { draft: n.draft } : {}),
        ...(n.created_at ? { created_at: n.created_at } : {}),
        ...(n.topic ? { topic: n.topic } : {}),
        ...(n.claim ? { claim: n.claim } : {}),
        ...(n.sources ? { sources: n.sources } : {}),
        ...(n.reasoning ? { reasoning: n.reasoning } : {})
      }))
    },
    null,
    2
  );
}

// ---- import ---------------------------------------------------------------
// Refused whole with the blocker NAMED — never partially imported, never
// silently coerced.
export function validateParkingText(text) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    throw new ParkingImportError(`Not valid JSON: ${e.message}`);
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new ParkingImportError('A parking export is a JSON object, not an array or bare value.');
  }
  if (doc.format !== PARKING_FORMAT) {
    throw new ParkingImportError(
      `Wrong or missing "format" field: expected "${PARKING_FORMAT}"${doc.format ? `, got "${doc.format}"` : ''}.`
    );
  }
  if (!Number.isInteger(doc.version)) {
    throw new ParkingImportError('Missing "version" field (an integer).');
  }
  if (doc.version > PARKING_VERSION) {
    throw new ParkingImportError(
      `This file is version ${doc.version}; this build reads up to version ${PARKING_VERSION}. Nothing was imported.`
    );
  }
  if (!Array.isArray(doc.items)) {
    throw new ParkingImportError('Missing "items" array.');
  }
  const items = doc.items.map((item, i) => {
    if (!item || typeof item !== 'object') {
      throw new ParkingImportError(`Item ${i + 1} is not an object.`);
    }
    if (doc.version === 1) {
      // v1: text-only notes. Read forever — a v1 item is a v2 'note'.
      if (typeof item.text !== 'string' || !item.text.trim()) {
        throw new ParkingImportError(`Item ${i + 1} is missing "text" (the note itself).`);
      }
    } else {
      if (!PARK_KINDS.includes(item.kind)) {
        throw new ParkingImportError(
          `Item ${i + 1}: unrecognized kind "${item.kind}" — this build knows ${PARK_KINDS.join(', ')}.`
        );
      }
      if (item.kind === 'note' && (typeof item.text !== 'string' || !item.text.trim())) {
        throw new ParkingImportError(`Item ${i + 1} is a note with no "text".`);
      }
      if (item.context != null && (typeof item.context !== 'object' || Array.isArray(item.context))) {
        throw new ParkingImportError(`Item ${i + 1}: "context" must be an object.`);
      }
      if (item.draft != null && (typeof item.draft !== 'object' || Array.isArray(item.draft))) {
        throw new ParkingImportError(`Item ${i + 1}: "draft" must be an object.`);
      }
      if (item.note != null && typeof item.note !== 'string') {
        throw new ParkingImportError(`Item ${i + 1}: "note" must be a string.`);
      }
    }
    for (const f of ['topic', 'claim', 'reasoning']) {
      if (item[f] != null && typeof item[f] !== 'string') {
        throw new ParkingImportError(`Item ${i + 1}: "${f}" must be a string.`);
      }
    }
    if (item.sources != null) {
      if (!Array.isArray(item.sources)) {
        throw new ParkingImportError(`Item ${i + 1}: "sources" must be an array.`);
      }
      item.sources.forEach((s, j) => {
        if (!s || typeof s !== 'object') {
          throw new ParkingImportError(`Item ${i + 1}, source ${j + 1}: expected {url, title, why}.`);
        }
      });
    }
    return doc.version === 1 ? { ...item, kind: 'note' } : item;
  });
  return { version: doc.version, items };
}

// Merge is the default: duplicates detected on note CONTENT, reported not
// re-imported. Replace is a separate, explicitly confirmed path.
export function mergeParking(existingItems, incomingItems) {
  // Content identity spans the whole parked unit: kind + note + text +
  // draft fields — two different drafts about the same claim are NOT dupes.
  const keyOf = (n) =>
    JSON.stringify({
      kind: n.kind || 'note',
      text: normText(n.text),
      note: normText(n.note),
      draft: n.draft || null
    });
  const seen = new Set(existingItems.map(keyOf));
  const fresh = [];
  let duplicates = 0;
  for (const item of incomingItems) {
    const key = keyOf(item);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    fresh.push(item);
  }
  return { fresh, duplicates };
}

// A structured item flattened for the full engine's text-only parking —
// used ONLY in server mode, and the flattening is REPORTED, never silent.
export function flattenStructuredItem(item) {
  const parts = [item.text];
  if (item.topic) parts.push(`[proposed topic] ${item.topic}`);
  if (item.claim) parts.push(`[claim text] ${item.claim}`);
  for (const s of item.sources || []) {
    parts.push(`[source] ${[s.title, s.url, s.why].filter(Boolean).join(' — ')}`);
  }
  if (item.reasoning) parts.push(`[reasoning] ${item.reasoning}`);
  return parts.join('\n');
}

export function hasStructure(item) {
  return !!(item.topic || item.claim || (item.sources && item.sources.length) || item.reasoning);
}
