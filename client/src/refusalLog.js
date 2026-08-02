// 2.99a punch 12: the refusals ledger — a thin CLIENT-side recorder of
// every refusal the visitor was shown, riding the save file and the
// in-browser mirror. Zero server involvement: nothing here is sent
// anywhere; the save's read-it-first line covers consent, and the ledger
// exists because refusals are exactly where the rules and the vocabulary
// strain — the input the engine improves on.
//
// Entry shape: {when, action, target, persona, source: 'rules'|'client',
// blocker_code, blocker_text, inputs_as_submitted}. 'rules' = the rules
// layer said no (a 422 with its named blocker); 'client' = a client-side
// block (e.g. the scrubbed-view write guard) that never reached the rules.

let ledger = [];

export function recordRefusal({ action, target, persona = null, source, blocker_code = null, blocker_text, inputs_as_submitted = null }) {
  ledger.push({
    when: new Date().toISOString(),
    action,
    target,
    persona,
    source,
    blocker_code,
    blocker_text,
    inputs_as_submitted
  });
}

export function refusalLedger() {
  return ledger.slice();
}

// Import/resume: restore the prior sessions' ledger and ACCUMULATE — the
// arc of refusals across sessions is the point.
export function seedRefusals(entries) {
  if (Array.isArray(entries)) ledger = [...entries, ...ledger];
}

export function resetRefusals() {
  ledger = [];
}
