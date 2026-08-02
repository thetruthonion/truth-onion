// Tour narration (2.96): the companion VOICES a stop; the stop's grounding
// doc is the substance. No doc → REFUSAL, before any model call — the
// companion does not invent UI (pinned by test). One script, two voices:
// this module is only ever used in keyed mode; keyless mode renders the doc
// verbatim and no model is involved anywhere.
//
// The render is gated like every persona render: substance tokens extracted
// from the grounding doc must survive the voicing, or the plain doc text is
// delivered with a one-line persona intro instead — written copy is always
// the honest fallback, never a fabricated chat.

import { cardPersonaText } from '../companion/cards.js';
import { extractSubstance, checkFidelity } from '../companion/pipeline.js';

export function missingGroundingReason(stop) {
  if (!stop || typeof stop.copy !== 'string' || !stop.copy.trim()) {
    return (
      'This stop has no grounding doc — there is nothing on record to narrate, and the ' +
      'companion does not invent UI. Showing nothing rather than guessing.'
    );
  }
  return null;
}

export async function narrateTourStop({ stop, card, corePrompt, callModel, onStage }) {
  const missing = missingGroundingReason(stop);
  if (missing) {
    // Refused BEFORE any provider call — narration without grounding is
    // exactly what this refusal exists to prevent.
    return { refused: true, text: missing, rendered_by: 'core' };
  }
  if (!card || !callModel) {
    return { text: stop.copy, rendered_by: 'core', plain: true };
  }

  if (onStage) onStage('render', 'drafting in voice…');
  const tokens = extractSubstance(stop.copy);
  const system =
    `${corePrompt}\n\n${cardPersonaText(card)}\n\n` +
    `Tour narration task: the visitor is standing at a tour stop. The grounding doc below is ` +
    `the COMPLETE substance — voice it in your character, warmly and briefly, but add no ` +
    `facts, no UI claims, and no promises the doc does not make. Do not describe controls the ` +
    `doc does not mention.`;
  const user = `Grounding doc for this stop ("${stop.title}"):\n${stop.copy}\n\nVoice it now.`;

  let out;
  try {
    out = await callModel({ system, messages: [{ role: 'user', content: user }] });
  } catch (e) {
    // A provider failure never becomes silence or invention — the written
    // copy is the fallback voice.
    return { text: stop.copy, rendered_by: 'core', plain: true, notice: `Companion unavailable (${e.message}) — written copy shown.` };
  }
  if (onStage) onStage('gate', 'checking the draft against the record…');
  const missingTokens = checkFidelity(out.text, tokens);
  if (missingTokens.length > 0) {
    return {
      text: `${card.name} is keeping this one plain.\n\n${stop.copy}`,
      rendered_by: card.name,
      plain: true,
      notice: 'The voiced draft dropped substance — the grounding doc is shown instead.'
    };
  }
  return { text: out.text, rendered_by: card.name };
}
