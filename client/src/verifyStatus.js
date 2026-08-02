// Release 2b: verification-status labels, one copy for every client surface.
//
// Two truths, phrased as designed boundaries rather than bugs:
// - A RECORDED source with a curator verification (the 2.98b audit — server
//   payloads carry `verification: 'curator'`) was mechanically checked by the
//   curator on their own machine. That is a fact about the record.
// - A source attached ON a public demo host cannot be mechanically checked
//   there, because the live verifier (the fetch proxy) is deliberately
//   absent from that host. The full engine has it; multiplayer import will
//   run it. Save files carry `verification: 'pending'` so that promise is a
//   recorded state, not vibes — and NO other machinery exists behind it.
//
// The sandbox (2.99a) attaches sources normally, weighs them normally, and
// simply marks verification absent with this same label.

export const CURATOR_VERIFIED_LABEL = 'mechanically verified locally by curator';

export const DEMO_UNVERIFIED_LABEL =
  'not verified — the live verifier is deliberately switched off on this public demo; ' +
  'it runs in the full engine (clone the repo) and will verify this source automatically ' +
  'when your save is imported at multiplayer.';

// The status a demo-attached source records in drafts and save files.
export const DEMO_PENDING_STATUS = 'pending';
