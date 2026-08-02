# Truth Onion — Stage 2.9 Kickoff: Kernel Links & Lineages (give this to Claude Code)

Fresh session: read `PROJECT-STATE.md` first — it is authoritative on
architecture. Design authority for this stage is
`truth-onion-stage-2-9-addendum.md`; this kickoff scopes it into buildable work.

**Superseded framing, stated per convention:** the addendum's opening line says
this kickoff "also carries the one deliberate taxonomy revision." Operator
decision 2026-07-27 moved the taxonomy revision to Stage 2.99, last before
multiplayer. Append a dated amendment note to the addendum file saying exactly
that — do not rewrite its text. The taxonomy is otherwise UNTOUCHED this stage:
`kernel_of` joins the relation vocabulary; no tier, kind, or layer definitions
change.

## Preconditions (do these before any 2.9 code)

1. **Verify the 2026-07-20 demo fix — it is a reported fix, not a verified
   one.** Run the full suite (expect 102 across seven suites; report actual
   numbers), run `npm run build-demo`, boot the built package from `demo/`,
   confirm it serves three topics and `/api/fetch` answers 404, confirm tests
   D4/D5 exist and pass. If any of that fails, apply exactly the previously
   specified fix (route registered only when demo is false; lazy imports;
   D4/D5) and re-verify before proceeding. Report what was found either way.
2. **Append the correction to strain journal Entry 6:** plain fetch defeats the
   bot-block, not JavaScript rendering; both occur on the same domain
   (disproven 2026-07-20). Entries are never revised — corrections are
   appended.
3. Do not run `npm run reset` (destroys hand-built topics). Do not start the
   dev server through a preview harness (blocks the browser spawn).

## In scope

**A. `kernel_of` relation (schema + rules layer).**
- New relation type: outer claim → its nearest established kernel. Zero
  evidentiary weight, exactly like `is_origin_of`: can never move a tier, never
  count as support, never satisfy any placement requirement. Enforce in
  `rules.js` AND as a schema backstop — two independent layers say no, per the
  house pattern.
- Every kernel link REQUIRES a gap statement (what the kernel establishes, what
  the outer claim asserts beyond it, the path inward). Creation without one is
  refused with the reason named.
- Auto-created by the debunker flow (the correct/demote pair already produces
  kernel + remainder); manual creation also available, through the rules layer
  like every write.
- Challengeable through the existing machinery, no special casing. A contested
  kernel link is recorded like any challenge.

**B. Routed lineages + fans (read-side).**
- A kernel link renders as a traced path through intermediate claims that hold
  a genuine evidentiary/lineage relation — never nearest-looking neighbors. The
  routing rule is enforced where routes are computed, not in the renderer.
- Per-hop challengeability; a contested hop renders visually distinct.
- Multi-kernel claims draw all lineages as a converging fan, each lineage with
  its own break point, steppable (tapped lineage forward, others ghost).
- Camera frames the whole path/fan on select.

**C. Visual grammar (whole-vs-broken) — an invariant of the renderer.**
- Support links: solid, whole lines. Kernel links: broken lines, snapping at
  the evidentiary boundary, break position proportional to distance, gap
  statement labeling the break. No kernel = no line.
- NO code path may render a kernel link as a whole line. Pin with a test at
  the data-to-render boundary, not by screenshot.

**D. Interaction model: rest / hover / select / double-click.**
- Rest: clean sphere, no link noise. Hover: lineage members softly illuminate,
  no lines. Select: lineage/fan draws, camera frames, evidence panel opens.
  Double-click: narration (E).
- Rest-state tile materials: mass/finish = evidence weight; weathering =
  challenge survival; pulse = live contention. All derived from existing
  record data; no new stored fields for appearance.
- Deselect behavior: prototype both return-home and stay-put; pick by feel;
  record which and why in PROJECT-STATE (addendum §8 delegates this to build).

**E. Lineage-aware narration.**
- Extends the existing double-click narration: the manifest now includes
  lineage/fan data, so the companion narrates descent from bedrock — what the
  kernel establishes, where evidence stops, the gap.
- Everything already true of narration stays true and stays tested: grounded
  strictly in the record, tier-faithful through the fidelity gate, two-pass
  mask-lift, ephemeral with pin-to-notebook (pin writes to the user's local
  notebook only, never the claim record).

**F. Event-log completeness audit (2.95 dependency, done now while the schema
is open).**
- Audit every state-changing event: placement, promotion (including FAILED
  attempts), demotion, source attach/delete and ripple demotes, link
  creation/removal (including `kernel_of`), challenges and outcomes. Each must
  be recorded with actor, timestamp, and reason.
- Close any gaps found in this schema pass. Report which gaps existed — 2.95's
  replay is only as honest as this log.
- If the schema has no record types for hash-supersession or scope events
  (Legal Amendments F/G), do NOT invent them here; report their absence so
  2.95 scopes around it. That is a design decision, not a gap-fill.

## Out of scope — refused, not negotiated

- Taxonomy changes of any kind (2.99).
- Time machine work beyond the audit in F (2.95).
- Anything multiplayer, reputation, or federation (3+).
- Any write path for tier movement via kernel links, any override path, any
  popularity input. The UI never decides; nothing in this stage changes that.
- Public hosting work (release checklist runs after 2.95).

## Definition of done

1. `kernel_of` exists with zero weight — pinned by tests that it can never
   support, never promote, never satisfy a placement requirement; schema
   backstop present; gap statement required and refusal names the blocker.
2. Debunker flow auto-creates kernel links; manual creation goes through the
   rules layer; both challengeable.
3. Routed lineages draw with per-hop challenge marking; the routing rule is
   enforced and tested.
4. Fans render for multi-kernel claims with independent break points and
   lineage stepping.
5. Whole-vs-broken grammar has no violating code path — pinned by test.
6. Rest/hover/select/double-click implemented; rest state clean; tile
   materials carry mass/weathering/pulse from record data.
7. Narration is lineage-aware, grounded, tier-faithful (gate-tested),
   ephemeral with working pin-to-notebook.
8. Event-log audit complete; gaps closed or reported per F; every
   state-changing event carries actor, timestamp, reason.
9. Full suite green: all 102 existing tests plus the new ones. Report the new
   total by suite.
10. PROJECT-STATE updated: status line, deselect decision, audit findings,
    anything tried and rejected.

Stop at the definition of done. 2.95 is a separate kickoff and does not start
in this session. End with one line each: decided / finished / scrapped, for
the operator to carry to the Reconciler.
