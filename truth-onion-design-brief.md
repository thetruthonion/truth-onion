# The Truth Onion — Design Concept Brief

For Claude Design. Build the visual identity from this brief: logo system, palette,
type, and the in-product application rules.

---

## What the product is

An investigation game and research tool. Claims about real topics are placed on nested
spherical layers strictly by strength of evidence — proven at the center, speculative at
the edge, debunked on the outermost skin. Users move claims inward only by surviving
challenge. It ships with an AI companion (user-authored character cards) that narrates
the map in voice. Later stages become a shared 3D universe where user-built worlds
surround the evidence core.

Audience: investigative researchers and journalists at one end, curious newcomers at the
other. It must read as **rigorous but not clinical, atmospheric but not conspiratorial.**
The thing to avoid at all costs is "conspiracy aesthetic" — no red string, no corkboard,
no grunge, no redacted-document textures, no all-seeing eyes. This is a tool that tells
people when they're wrong, including its own author. It should look like an *instrument*.

## The organizing idea

**Certainty is warm, dense, and central. Speculation is cool, thin, and distant.**
Every visual decision derives from that. The geometry is the epistemology.

## The mark

"TO" — a structural T beside an O built entirely from concentric rings (no letterform
arc, no half-circle). The rings step outward from a **hollow core ring** through
progressively thinner, fainter rings. The O is a halved onion and the product diagram at
once: at a glance it's a monogram; on a second look it's the map.

Two variants, and the relationship between them is the system:

- **Light variant** — parchment ground `#F7F2E7`; letterforms Void Indigo `#131A2A`;
  hollow core ring Amber `#C97F1F`; rings **pastel**, warm→cool going outward
  (coral `#F3BFA8` → lavender `#C9BEE0` → blue `#AFCBE3` → green `#BFD8CB`), opacity
  falling toward the edge.
- **Dark variant** — Void Indigo ground; letterforms Vellum `#F2E8D5`; hollow core ring
  `#3680E0`, which is the **exact RGB inversion** of the light core's amber; rings
  **neon** — the same hues at maximum saturation (`#FF5E3A` → `#8A4DFF` → `#1FA8FF` →
  `#2BE08A`), opacity falling outward.

So the two variants are inversions of one another in both color and register: pastel
warmth on parchment, neon cool on void. Pastel and neon are the opposition — same hue
family, opposite energy.

Core is always **hollow**. Nothing at the center is filled in; the center is where you
stand, not a dot to look at.

## In-product behavior

The mark sits bottom-left as the menu logo during gameplay, over constantly changing 3D
backdrops. It **swaps between the light and dark variants based on the luminance behind
it** — sample the screen region a few times per second, cross-fade on threshold crossing,
with hysteresis so it never flickers at the boundary. The mark always sits on its
designed contrast. (Consider `mix-blend-mode: difference` only for a loading or
transition flourish — it sacrifices the ring colors, so it must not be the default.)

## Palette beyond the mark

- `#131A2A` Void Indigo — ground for the world and dark UI
- `#F7F2E7` Parchment — ground for documents, reading surfaces, light UI
- `#C97F1F` / `#3680E0` — the certainty pair (light/dark cores); use as the primary
  accent in the respective mode
- Pastel set (light UI) and neon set (dark UI) as above — reserve these for
  **evidence-tier encoding**, never as decoration. A tier color used ornamentally
  breaks the system's honesty.
- `#F2E8D5` Vellum — type on dark

## Type

Pair a **precise, slightly technical sans** for UI and data (tier labels, source tiers,
counts, placement reasons — it must handle dense citation text at small sizes) with a
**humane, high-contrast serif** for claim text and narration — claims are *statements*,
and they should read like something written by a person rather than emitted by a system.
Utility/monospace for citations, hashes, and IDs. No display face with personality that
competes with the companion's voice.

## Motion

Sparse and meaningful. The signature motion is the **depth dial**: turning it outward
makes shells appear around the core, translucent during the transition, settling opaque.
Transparency is the *event*, never the resting state. Selecting a claim draws its lineage
inward toward the core and the camera frames that descent. Nothing else animates without
a reason. Respect reduced-motion.

## Voice in the interface

Plain, direct, never apologetic and never portentous. Refusals are the product, so they
must read as informative rather than scolding: "This is a moral claim — it cannot sit in
the factual Core, no matter how strongly held," followed by the tier the evidence
actually earns. Empty states are invitations. Errors say what happened and what fixes it.

## What to deliver

1. Logo system: both variants, plus favicon/small-size reductions (fewer rings survive at
   16px — design that reduction deliberately, don't let it degrade).
2. Design tokens: color, type scale, spacing, radii, elevation — as CSS variables.
3. Application examples: the app header, a claim panel with its evidence profile, the
   depth dial control, and the companion panel with a character portrait.
4. The luminance-swap rule documented for implementation.

## One thing to protect

Every visual choice should be traceable to the epistemics. If a color, weight, or motion
can't answer "what true thing does this encode," cut it. The design's job is to make the
difference between *proven* and *asserted* legible before anyone reads a word.
