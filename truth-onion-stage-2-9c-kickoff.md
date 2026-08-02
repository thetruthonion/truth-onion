# Truth Onion — Stage 2.9c Kickoff: Color System, Tabs, Search (give this to Claude Code)

UI shell stage between 2.9b and 2.95. Read `PROJECT-STATE.md` first. Design
authority for color is `truth-onion-design-brief.md` — the palette below
implements it, not replaces it. Read-side and presentation only: no schema
changes, no rule changes, no new write paths.

**Standing rule (from 2.9b, permanent):** nothing created this session is
removed before operator verification.

## A. Tier color tokens — the logo system applied to the map

Define as CSS variables / design tokens, single source of truth, consumed by
the 3D tiles, 2D rings, tier chips, and tier-floor panel alike:

Dark surfaces (3D map, dark UI — neon set):
- core `#3680E0` · inner `#FF5E3A` · middle `#8A4DFF` · outer `#1FA8FF` ·
  outermost `#2BE08A`

Light surfaces (parchment/reading/exports — pastel set, same order):
- core `#C97F1F` · inner `#F3BFA8` · middle `#C9BEE0` · outer `#AFCBE3` ·
  outermost `#BFD8CB`

Rules, with reasoning stated:
1. **Hue encodes tier and nothing else.** The brief reserves these sets for
   evidence-tier encoding; any ornamental use of a tier color is a bug.
2. **Outward falloff is luminance/saturation stepping, not opacity.** The
   logo's rings fade by opacity, but the motion rule makes transparency an
   event, never a resting state. Tiles rest opaque.
3. **Material grammar untouched.** Mass/finish, weathering, pulse keep their
   2.9 meanings. Color adds a channel; it does not overload one.
4. **Claim-kind indicators (factual/moral/framing) move off the tier hues** —
   outlined chips or a visibly distinct treatment, no fills in the five tier
   colors — so kind can never be misread as tier. Refuted/status chips keep
   their current treatment unless they collide the same way; report if so.
5. The 2D rings view uses the same tokens so 2D/3D toggling never changes
   what a color means.

## B. Tabbed panels (replaces scroll-to-find)

Claim panel tabs: **Claim** (text, kind chips, why-it-sits-here, outcome
note) · **Sources** (source list, attach) · **Move** (tier floors, challenge
actions) · **History** (challenge record; structured so the 2.95 timeline
jump can land here without rework).

Topic panel tabs: **About** (description) · **Parking Lot** · **Off-axis**
(not empirically decidable).

Rules:
- Tab state is presentation only — nothing about which tab is open ever
  gates or reorders data. The UI never decides.
- Deep behavior preserved: everything reachable today remains reachable, and
  refusal messages render wherever the action lives.
- Default tab is Claim (or About). A tab with pending required input (e.g.
  a half-filled challenge) may indicate so, but never auto-switches.
- Keyboard navigable; reduced-motion respected on tab transitions.

## C. Predictive search (replaces the topic row)

- One search field in the header replaces the horizontal topic list.
- Empty-focus: full topic list plus "+ new topic".
- Typing filters live across **topic titles** and **claim text**, results in
  two labeled groups (Topics / Claims). Selecting a topic opens it; selecting
  a claim opens its topic with that claim selected (single-click semantics —
  panel opens, no chain view).
- **Ranking is lexical match quality only.** Never activity, never recency of
  edits, never challenge counts, never any popularity signal, and
  tier-neutral within match quality. Reasoning: a search that surfaces
  "active" claims first is a soft popularity channel, and popularity moving
  visibility is adjacent to popularity moving claims — refused. Pin with a
  test that the ranking function reads only text-match features.
- Keyboard: arrows + enter; escape closes; works at every viewport width the
  demo supports.

## Out of scope — refused, not negotiated

- Time machine (2.95), taxonomy (2.99), multiplayer/reputation anything.
- Any change to placement, promotion, challenge, or event-log behavior.
- Search ranking inputs beyond lexical match (see C).
- Restyling the companion panel beyond what the tokens require.

## Definition of done

1. Tier tokens defined once, consumed everywhere a tier is colored; 3D tiles,
   2D rings, chips, and tier-floor panel all match; light surfaces use the
   pastel set. No ornamental use of tier colors (spot-check reported).
2. Kind indicators visually distinct from tier colors.
3. Tabs implemented on both panels per B; everything previously reachable
   still reachable; no auto-switching; keyboard + reduced-motion respected.
4. Search replaces the topic row per C; lexical-only ranking pinned by test;
   claim selection lands correctly in-topic.
5. Full suite green including new tests; report totals by suite.
6. PROJECT-STATE updated: token file location, tab structure, search ranking
   rationale, anything tried and rejected.

Stop at the definition of done. End with one line each: decided / finished /
scrapped. Nothing built this session is cleaned up.
