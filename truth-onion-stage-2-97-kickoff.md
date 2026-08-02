# Truth Onion — Stage 2.97 Kickoff: Portable Parking Lot (give this to Claude Code)

Last pre-release feature stage. Read `PROJECT-STATE.md` first. Justification
for sitting before release rather than after: in the demo, parking is either a
403 on write or a data loss on reset — a broken surface for visitors. This
stage makes it honest and client-owned.

**Standing rule (permanent):** nothing created this session is removed before
operator verification.

## Settled context (not relitigated)

- The parking lot is private scratch with no epistemic standing — no tier, no
  weight, no place on the rings, deletion deliberately unlogged.
- Demo mutations 403; demo DB resets to pristine seed. Both stay true.

## In scope

**A. Storage adapter.**
- Parking lot reads/writes go through one adapter: server-backed in the full
  engine (current behavior), device-local (localStorage, `onion.parking.*`)
  in demo mode. Demo visitors get a fully working parking lot that never
  touches the server and survives demo restarts and redeploys on their own
  device. The demo UI states plainly that parked notes live in this browser
  only.

**B. Export.**
- One click exports the parking lot to a file on the user's device. Format:
  versioned JSON (`format` + `version` fields first), items carrying the
  freeform note plus optional structured fields — proposed topic, claim
  text, sources (url/title/why), reasoning — and timestamps. Human-readable
  pretty-printing; a visitor should be able to open it in a text editor and
  recognize their own work.
- Export is user-initiated only; nothing auto-uploads anywhere, ever.

**C. Import.**
- Accepts the exported format by file picker and drag-drop. Validated:
  wrong/missing version, malformed JSON, or unrecognized structure is
  refused with the blocker named — never partially imported, never silently
  coerced. Merge (not replace) by default, with duplicate detection on
  content; a replace option requires explicit confirmation.
- **Imported content lands in the parking lot and only the parking lot.**
  Nothing in an import gains epistemic standing; no import path creates
  topics, claims, sources, or any record entity. Promotion of a parked note
  to a real claim remains the existing one-at-a-time flow through the rules
  layer. Pinned by test: the importer writes to parking storage and nothing
  else.
- The format is the forward-compatibility contract: version it now so a
  future multiplayer import can read today's files. Record the schema in
  PROJECT-STATE.

## Out of scope — refused, not negotiated

- Any server-side storage of demo visitors' notes; any auto-sync or upload.
- Any import path that creates record entities directly.
- Logging parked-note deletion (settled: unlogged, no standing).
- Multiplayer identity or accounts of any kind.

## Definition of done

1. Demo-mode parking lot works end-to-end on-device: park, edit, delete,
   survive a server restart and a redeploy; server provably never receives
   note content (network-level test or request audit).
2. Export produces a versioned, readable file; import round-trips it
   losslessly (pinned); invalid files refused with named blockers; merge
   default with duplicate handling; replace requires confirmation.
3. Importer writes only to parking storage — pinned by test.
4. Full-engine behavior unchanged apart from routing through the adapter;
   full suite green including new tests; report totals by suite.
5. PROJECT-STATE updated: adapter design, export schema and version,
   anything tried and rejected.

Stop at the definition of done. This is the final feature stage before the
release checklist — anything new that surfaces during this session is
reported, not built. End with one line each: decided / finished / scrapped.
Nothing built this session is cleaned up.
