// SPDX-License-Identifier: AGPL-3.0-only
// Stage 2.95: the client side of "strict read-only, structurally".
// Every write in the app funnels through App.run(); run() consults this
// module first. While the scrubber is anywhere but Now, the answer is a
// plain refusal naming the moment and the way back — an action NEVER writes
// against a past state. Pinned by test (pure function + source scan).

export function writeBlockedReason(scrubTs) {
  if (scrubTs == null) return null;
  return (
    `You are viewing the map as of ${formatTs(scrubTs)} — a historical view is ` +
    `strictly read-only. Return to Now to act; the past does not take edits.`
  );
}

export function formatTs(ts) {
  const d = new Date(String(ts).replace(' ', 'T') + (String(ts).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

// Scrubber domain helpers: timestamps travel as sqlite-format UTC strings
// ('YYYY-MM-DD HH:MM:SS'), sliders work in epoch-milliseconds.
export function tsToMs(ts) {
  return Date.parse(String(ts).replace(' ', 'T') + 'Z');
}

export function msToTs(ms) {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}
