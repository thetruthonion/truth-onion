// SPDX-License-Identifier: AGPL-3.0-only
// Character cards: the personality layer. Cards may contain ANY persona
// content — there is no content validation (§11, operator ruling). The
// protection is structural, not behavioral: in claim work, pass 1 runs
// core-only with the card absent, and the substance-lock guarantees findings
// arrive intact in any voice. String-checking persona text was a lock on a
// door the mask removed — and a bypassable rule teaches hiding, not honesty.
// The real floor lives in the immutable core layer no card touches: never
// fabricate what the onions contain; never leverage the companion
// relationship to steer beliefs.

// §12d: powers are structured DECLARATIONS, not loose backstory prose —
// {name, description, tags} — so future user-hosted sections can honor them
// via a capability handshake. They are real in worlds that run them,
// presentation everywhere else, and NEVER a key to the ledger: the tool
// boundary and evidence layer are untouched by card content.
function normPowers(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (typeof p === 'string') return { name: p, description: '', tags: [] };
      if (p && typeof p === 'object') {
        return {
          name: String(p.name || '').trim(),
          description: String(p.description || '').trim(),
          tags: Array.isArray(p.tags) ? p.tags.map((t) => String(t)) : []
        };
      }
      return null;
    })
    .filter((p) => p && p.name);
}

// 2.9d: SHAPE validation for .json import — content stays unvalidated (§11:
// any persona content is legal; the mask is the protection). A file is
// refused whole with the blocker NAMED — never partially imported.
export class CardValidationError extends Error {}

export function validateCardText(text) {
  let src;
  try {
    src = JSON.parse(text);
  } catch (e) {
    throw new CardValidationError(`Not valid JSON: ${e.message}`);
  }
  if (!src || typeof src !== 'object' || Array.isArray(src)) {
    throw new CardValidationError('A character card is a JSON object, not an array or a bare value.');
  }
  const d = src.data && typeof src.data === 'object' ? src.data : src;
  if (!d.name || typeof d.name !== 'string' || !d.name.trim()) {
    throw new CardValidationError('Missing required field: "name" (a non-empty string).');
  }
  for (const f of ['description', 'personality', 'scenario', 'example_messages', 'first_message', 'portrait']) {
    if (d[f] != null && typeof d[f] !== 'string') {
      throw new CardValidationError(`Wrong type for "${f}": expected a string.`);
    }
  }
  if (d.powers != null && !Array.isArray(d.powers)) {
    throw new CardValidationError('Wrong type for "powers": expected an array of declarations.');
  }
  if (d.voice != null && (typeof d.voice !== 'object' || Array.isArray(d.voice))) {
    throw new CardValidationError('Wrong type for "voice": expected an object ({provider, voice, …}).');
  }
  return parseCard(src);
}

// Export is SYMMETRIC with import: a card serialized here re-imports
// losslessly through validateCardText (round-trip pinned by test). Cards are
// client-side data — this writes a file for the user, nothing leaves the
// machine.
export function serializeCard(card) {
  return JSON.stringify(card, null, 2);
}

// Accepts our shape and standard character-card JSON (Tavern-style fields).
export function parseCard(json) {
  const src = typeof json === 'string' ? JSON.parse(json) : json;
  const d = src.data && typeof src.data === 'object' ? src.data : src;
  return {
    name: d.name || 'Companion',
    description: d.description || '',
    personality: d.personality || '',
    scenario: d.scenario || '',
    example_messages: d.example_messages || d.mes_example || '',
    first_message: d.first_message || d.first_mes || '',
    portrait: d.portrait || d.avatar || '',
    powers: normPowers(d.powers),
    voice: d.voice || null, // { provider, voice, endpoint?, rate?, pitch? }
    auto_speak: !!d.auto_speak
  };
}

// The personality-layer prompt block (loaded AFTER the immutable core, and
// only ever in pass 2 / commentary / downtime — never in pass-1 analysis).
export function cardPersonaText(card) {
  if (!card) return '';
  const parts = [
    `# Character card (personality layer — voice only)`,
    `Name: ${card.name}`,
    card.description && `Description: ${card.description}`,
    card.personality && `Personality: ${card.personality}`,
    card.scenario && `Scenario: ${card.scenario}`,
    card.example_messages && `Example dialogue:\n${card.example_messages}`,
    card.powers?.length &&
      `Powers (persona + presentation only — never system access):\n${card.powers
        .map((p) => `- ${p.name}${p.description ? `: ${p.description}` : ''}${p.tags?.length ? ` [${p.tags.join(', ')}]` : ''}`)
        .join('\n')}`
  ].filter(Boolean);
  return parts.join('\n');
}
