# CLAUDE.md — Truth Onion engine repository

Instructions for Claude Code sessions working in this repository. This file is
public once the repository is; nothing here states status, numbers, or guarantees —
those live in PROJECT-STATE.md and the project's reconciled documents.

**Before any work: read PROJECT-STATE.md.** It is authoritative on architecture,
file-level decisions, technical rationale, and what a fresh session should read
first. Its status lines are build-session reports. Nothing in this file overrides
it on build detail.

A companion file, CLAUDE.local.md, carries machine-local instructions (paths,
the session-close export). It is gitignored and must stay that way — if it is
missing from .gitignore, add it before anything else.

## Scope discipline

- Build only what the current kickoff scopes. Kickoff documents live in the build
  supervision workstream, are not in this repository, and are never read for what
  the system does — a kickoff is a stage's input and goes stale the moment a build
  deviates from it; PROJECT-STATE.md is the record of what was built. (The
  release-prep note recording internal documents as committed "so § citations
  resolve" — PROJECT-STATE.md §3.2k, the 0c line of the combined 0b/0c bullet —
  was superseded by operator ruling 2026-08-11; those documents are out of HEAD,
  and this line was the rule all along.) If work depends on a kickoff and it is
  not available to this session, say so and stop rather than reconstructing it
  from memory.
- A new stage means a new kickoff with an explicit definition of done, and work
  stops at the definition of done. When in doubt, do less.
- Later-stage design in the spec addendum is foundational, not buildable now.

## Invariants — hard constraints, not preferences

The master statement lives in the project's legal founding document; where wording
differs, that document wins. In compressed form:

1. The write path is automated — no human review before a claim commits; human
   action is reactive and post-commit only.
2. Tiers are never overridden by anyone, operator included. Scope rules may refuse
   admission; nothing re-ranks an admitted claim except evidence surviving
   challenge.
3. Minimal collection is a feature — never store legal identities, PII, or
   identity mappings.
4. Keys are client-side only; BYOK credentials never touch platform servers.
5. Capture-and-hash preservation stands; removal is a scope action with a stated
   reason, never a silent scrub.
6. Popularity moves nothing — no headcount, votes, or reputation as a tier input.
7. Reference-not-payload — citations and captures of public material, not content
   warehouses.
8. Claim text is immutable post-placement; revisions are new claims earning their
   own placement.
9. The self-refusal promise is about substance — refusals name the blocker and the
   honest path, never the detection mechanics.

Alongside them: enforcement lives at the data layer, and the UI never decides.
Anything that would move enforcement out of the data layer, add a tier override
path, store identity data, or let popularity move a claim is refused, not
negotiated. If a task appears to require breaking an invariant, flag the tension
and stop — never propose the break.

## Conventions

- The strain journal in PROJECT-STATE.md is append-only. A superseded entry gets a
  correction appended, never a rewrite into agreement with later understanding.
- Do not hardcode status numbers (test counts, claim counts) into documents or
  code comments — state them in PROJECT-STATE.md only, and update them there when
  they change. Stale numbers in multiple places have caused real errors in this
  project.
- Run the full test suite before closing a session. Green suites are necessary,
  not sufficient: completion is "reported" until the operator has booted the
  package and run the suites independently, and only then "verified." State your
  own session's results in those terms.

## Session close

1. Update PROJECT-STATE.md: status lines for what this session did, in
   reported-not-verified terms; strain journal entries appended if any; numbers
   updated where they changed.
2. Perform the export step in CLAUDE.local.md, which delivers PROJECT-STATE.md to
   the project's document tree. If CLAUDE.local.md is absent (fresh clone,
   different machine), say so in the closing summary so the operator knows the
   export did not happen — a session whose state never reaches the tree is
   invisible to the rest of the project.
3. Close with one line each: what was decided, what was finished, what was
   scrapped — with reasoning attached to anything scrapped.
