# Truth Onion — Stage 2.9 Addendum: Kernel Links, Lineages & Narration

Captured design for the 2.9 kickoff (which also carries the one deliberate taxonomy
revision). This bundle is read-side plus ONE new relation type. Nothing here adds a
write path for tier movement; every new object is challengeable through the existing
machinery.

---

## 1. The kernel link (`kernel_of`)

A new relation connecting an outer claim to its nearest **established kernel** — the
documented seed the outer claim grows from and overreaches beyond.

- **Annotation, not support.** Zero evidentiary weight, like `is_origin_of`. It can
  never move a tier, never be cited as support, never render as endorsement.
- **Display direction is the trick:** on the OUTER claim's panel: "nearest established
  ground: [kernel]" with the explicit line *"this connection shows where the evidence
  stops — it does not support this claim."* On the INNER claim's panel, the reverse
  view is a warning, not a family tree: "claims that overreach from this: …" (useful
  to challengers — the established claims attracting the most overreach are the ones
  to watch).
- **The gap is the payload.** Every kernel link carries a gap statement: what the
  kernel establishes, what the outer claim asserts beyond it, and the path inward
  ("documented through 1973 · asserted beyond · path inward: any post-1973 primary
  record"). This is the existing path-inward mechanic given a second job.
- **The debunker flow auto-creates these.** A correction already produces the pair
  (restated established fact + remainder pushed outward) — every debunk creates the
  kernel link between them. Manual creation also available.
- **Challengeable like everything else.** "What the kernel of this claim is" can be
  contested — a flattering kernel is the reverse-halo attack. Same review machinery;
  no special casing. Reverse-halo is the named risk of this whole feature: mitigations
  are the framing line, the warning-direction display, and challengeability.

## 2. Routed lineages

The kernel link renders not as a two-point jump but as a **traced path** through the
intermediate claims that genuinely share the lineage:

  [Core] kernel → [Middle] partial extension → [Outer] the overreach

- The path shows how far an idea travels on real evidence before it leaps — usually
  further than skeptics assume and shorter than believers assume.
- **Routing rule:** the path may only pass through claims with a genuine evidentiary/
  lineage relationship — never the nearest-looking claims. A fabricated genealogy
  (dressing a leap as a gentle slope) is the sophisticated reverse-halo; every hop is
  separately challengeable, and a contested hop renders visually distinct (a
  questioned segment).

## 3. Multiple lineages — the converging fan

Fusion claims (overreaching from two or more kernels) are common. Selecting one draws
ALL its lineages simultaneously as a converging fan:

- Two (or more) solid trunks rising from separate kernels, each routed through its own
  middle claims, meeting at the break before the selected claim. The honest anatomy of
  a fusion claim: *real roots, welded, then a leap beyond both.*
- **Each lineage keeps its own break point** — one may carry through Middle before
  snapping, another may break straight off the Core. The difference is information.
- Camera frames the whole fan on select; the user can step between lineages (tap one
  forward, others dim to ghosts).
- Each lineage separately challengeable, hop by hop — the fan makes a bad graft
  visible instead of buried in a link table.

## 4. Visual grammar (the whole-vs-broken rule)

- **Support link (legal, inner-feeds-outer): a SOLID, WHOLE line** — evidence actually
  connects those claims.
- **Kernel link: a BROKEN line** — solid on the evidenced side(s), visibly snapping at
  the boundary where sourcing runs out, dangling toward the outer claim.
- **Break position = evidentiary distance.** Nearly-established claims show a small
  gap; far-fetched ones a wide void. The gap statement labels the break itself.
- **No kernel at all = no line.** An unmoored outer claim floats free — that absence
  is its own honest signal.
- NEVER render a kernel link as a whole line (that is the reverse halo, drawn).

## 5. Interaction model: rest / hover / select / double-click

- **Rest:** the sphere is CLEAN — no link-noise, no fray. The tiles themselves carry
  the resting information (§6).
- **Hover:** a whisper — the hovered claim's lineage members softly illuminate. No
  lines drawn. You sense a genealogy exists before committing.
- **Select (single-click):** the lineage/fan draws; the 3D camera moves to frame the
  whole path from kernel to break, the world reorienting to tell that claim's descent
  from bedrock. Evidence panel opens as always.
- **Double-click:** the companion narrates (§7).

## 6. Rest-state tile materials (rewarding the wandering eye)

Three channels on the tile surface itself, plus existing size (evidence count) and
latitude (help/harm):

- **Mass/finish = evidence weight.** Rich sourcing reads dense and polished; thin
  sourcing reads matte and papery. Well-evidenced claims LOOK substantial.
- **Weathering = challenge survival.** A claim that has survived many challenges shows
  it — tempered, worn, scarred but standing. Never-tested claims look pristine in the
  suspicious way. Battle-tested is the badge; the surface says so.
- **Pulse = live contention.** Open challenges / recent re-tiering breathe faintly;
  settled claims go still. At rest, the sphere shows where the work is happening.

## 7. Companion narration (double-click)

- Double-click any tile/claim → the companion delivers the synthesis a colleague
  would: what it asserts, the documented ground it grows from, where evidence stops
  and why, what's been tried, what would move it.
- **Grounded, not generative:** built STRICTLY from the claim's record (text, sources,
  placement reason, challenge history, lineage). The companion never adds model-
  knowledge context; if it knows something the record lacks, the honest move is
  "worth investigating — want me to search for a source?" Narrate the record; never
  exceed it.
- **Tier-faithful in voice:** an Outer claim must SOUND unestablished in any persona.
  The manifest carries the tier framing; the fidelity gate verifies it survives the
  rendering. A noir detective can make "unproven" atmospheric; it cannot make it
  sound likely.
- **Ephemeral by default** — tour-guide moments, not provenance. Optional "pin this
  explanation" saves to the user's own notebook, never the claim's record.
- Runs on the standard two-pass mask-lift; already shipping in tour-guide form in the
  demo (see demo kickoff §6) — the 2.9 build extends it to lineage-aware narration
  (the fan is part of the record it narrates).

## 8. Deselect behavior (open question, decide in build)

When a selection clears: camera returns home to the resting sphere, or stays where
the story ended? Prototype both; pick by feel. Bias: return-home keeps the resting
state canonical (clean sphere as the default truth-posture); staying rewards deep
dives. Possibly: stay on deselect, home on Escape/double-deselect.

---

## Placement in 2.9

The 2.9 kickoff = the taxonomy revision (informed by TAXONOMY-STRAINS.md across both
genres + the sidekick's unclassifiable-source entries) + this bundle. `kernel_of`
joins the relation vocabulary in the same schema pass as the revision. The visual/
interaction work (§2–§6) is read-side over existing data. Narration (§7) extends the
already-built companion.

Definition-of-done seeds for the kickoff:
1. `kernel_of` exists with zero weight, warning-direction display, gap statement
   required, auto-created by the debunker flow, challengeable (pinned by tests: it
   can never support, never promote, never render whole).
2. Routed lineages draw with per-hop challengeability; contested hops render
   distinct.
3. Fans render for multi-lineage claims with independent break points and lineage
   stepping.
4. Whole-vs-broken grammar enforced: no code path renders a kernel link as a whole
   line.
5. Rest/hover/select/double-click model implemented; rest state clean; tile
   materials carry mass/weathering/pulse.
6. Narration is lineage-aware, grounded, tier-faithful (fidelity-gated), ephemeral
   with pin-to-notebook.

---

## Amendment — 2026-07-27

The opening line above says the 2.9 kickoff "also carries the one deliberate
taxonomy revision." By operator decision of 2026-07-27, the taxonomy revision
is moved to **Stage 2.99**, last before multiplayer. It is not part of Stage
2.9. The taxonomy is otherwise untouched this stage: `kernel_of` joins the
relation vocabulary; no tier, kind, or layer definitions change. Entries are
amended, never rewritten — the original text above stands as captured.
