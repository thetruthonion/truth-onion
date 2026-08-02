# Truth Onion — Stage 2.96 Kickoff: Setup Walkthrough & Guided Tour (give this to Claude Code)

**Run condition: starts only after Stage 2.95 is done and operator-verified.**
The tour covers the finished demo surface including the time scrubber; built
earlier it would tour a moving target. Read `PROJECT-STATE.md` first.
Presentation and client-side only; no schema changes, no rule changes, no new
write paths to the record.

**Standing rule (permanent):** nothing created this session is removed before
operator verification.

## Design decisions carried in this kickoff (with reasoning)

- **The tour never gates on a key.** The visitors the demo most needs to
  convince will not paste an API key into an unfamiliar site, and they spend
  minutes, not an hour. Keyless visitors get the full tour with written copy;
  keyed visitors get the same tour voiced live by their companion. One
  script, two voices.
- **The script navigates; the companion narrates.** The advises/decides split
  extends to the tour: the tour framework owns stops, navigation, and
  highlighting deterministically; the companion supplies voice and answers
  questions at each stop. The model never drives the UI.
- **No fake companion, ever.** Keyless mode is plainly written tour copy. No
  canned responses styled as a live companion, no scripted "chat."
- **The cold open survives.** Demo kickoff DoD #3 (Depth 1, solid core,
  honesty note) stays intact: the tour offers itself as a small dismissible
  invite, never a takeover modal. Offered once (flag in `onion.ui.*`),
  re-launchable any time from the header.

## A. Setup walkthrough (phase 1)

- Skippable, step-at-a-time: choose provider (from the 2.9d adapter list,
  including which are unsupported and why) → where to obtain a key → honest
  cost note (their key, their spend, per-token) → paste → live test call →
  success or a plainly named failure (reusing 2.9d error surfaces).
- States the true guarantee in plain words: the key is stored in the browser
  only and never sent to this server — phrasing consistent with what the
  key-privacy tests actually pin, no stronger.
- Card step: use the default persona or import a card .json (2.9d import).
- Ends in a fork, never a wall: "companion ready — begin the tour" /
  "skip — tour without a companion."

## B. The tour (phase 2)

- Deterministic stop sequence covering, at minimum: depth dial (uncertainty
  is opt-in; the dial hides content, never existence) · tier colors and what
  a shell means · single-click a claim → tabs (sources, why-it-sits-here,
  tier floors as "the floor, not a promise") · double-click chain view on a
  seeded lineage claim (clear, rotate, gap statement) · search, including a
  cross-topic name search with tier chips visible · off-axis tab and why it
  exists · the time scrubber, including the log epoch rendered honestly ·
  where the "not available in the showcase" boundary sits and the
  clone-the-repo path.
- Each stop has a grounding doc (what is on screen, what it means, what the
  visitor can try); companion narration at a stop is grounded in that doc
  plus the existing record manifest — the companion does not invent UI.
- Companion mode: stop text voiced live; visitor questions answered in-stop;
  all existing narration guarantees untouched (gate, mask-lift, ephemeral,
  pin rules). Keyless mode: written copy, same stops, same order.
- Always skippable, resumable, exit-anywhere; keyboard navigable;
  reduced-motion respected; works at demo-supported viewport widths.
- Stage indicators from 2.9d Amendment B apply to tour narration like any
  other companion response.

## Out of scope — refused, not negotiated

- Companion control of navigation or any UI action.
- Fabricated companion output in keyless mode.
- Sandbox / visitor writes of any kind (separately parked decision).
- Any change to record behavior, narration gating, or key handling.

## Definition of done

1. Setup walkthrough runs end-to-end for at least one direct provider and
   OpenRouter; every failure mode surfaces a named error; skip path clean.
2. Tour completes in both modes — keyed (live companion voice, in-stop
   questions work) and keyless (written copy) — covering every listed stop.
3. Cold open unchanged with the tour invite present (fresh-profile check);
   invite remembered, re-launchable from the header.
4. Companion tour narration provably grounded per-stop (spot-test: a stop's
   grounding doc removed in dev → narration for that stop refuses rather
   than invents).
5. Full suite green including new tests; report totals by suite.
6. PROJECT-STATE updated: stop list, grounding-doc locations, anything tried
   and rejected.

Stop at the definition of done. End with one line each: decided / finished /
scrapped. Nothing built this session is cleaned up.
