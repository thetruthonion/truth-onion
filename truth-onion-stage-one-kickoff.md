# Truth Onion — Stage One Kickoff (give this to Claude Code)

You have two reference documents: `truth-onion-spec.md` (v1 — full brief + roadmap) and
`truth-onion-spec-addendum.md` (v2 — later design decisions). **Read both, but build ONLY
what this kickoff scopes.** Most of the addendum is foundational design for later stages;
do not build it yet. When in doubt, do less.

---

## What you are building in Stage One

A **single-user, local** web app that lets one person build an evidence map ("onion")
for ONE topic — **MKUltra** — and that **refuses to let the user cheat.**

No accounts. No chat. No multiplayer. No federation. No Matrix. No 3D/spatial world.
No active-investigation mode. No metaphysical discussion layer. No IPFS/archival deposit.
Those are all later stages. Stage One is the evidence engine and nothing else.

---

## Stack

- Frontend: React.
- Backend: a real server with a **relational database (Postgres, or SQLite for local dev)**.
  The rules below MUST be enforced server-side / at the data layer as validated-on-write
  constraints — NOT in the UI, NOT as suggestions. This is the whole point.
- Keep it runnable locally with one command.

---

## Data model (build this)

```
Claim {
  id
  topic_id
  text                        // stated faithfully, never fortified
  kind: empirical | metaphysical | historical      // categorization gate
  layer: factual | moral | framing
  radial_tier: core | inner | middle | outer | outermost
  vertical: { direction: help | harm | neutral, magnitude, evidenced: bool }
  status: confirmed | contested | refuted
  sources: [Source]
  challenges: [Challenge]
  supports_claims: [claim_id]         // constrained (see rules)
  placement_reason: text              // WHY it sits at this tier
}

Source {
  id
  claim_id
  tier: primary_doc | court_record | reputable_secondary | single_outlet
        | self_published | anonymous
  citation / url
  relation: supports | contradicts
  is_claimant_self_published: bool     // if true, contributes ZERO weight
}

Challenge {
  id
  claim_id
  type: bad_source | contradicting_evidence | equivocation | mis_tiered | layer_mismatch
  outcome: upheld | rejected
  resulting_tier_change
}
```

---

## The rules — enforce these at the data layer (this IS the product)

1. **Promotion requires surviving a challenge.** A claim moves inward only after evidence
   is attached AND a challenge step passes. Hard to promote, easy to demote.
2. **Outer cannot feed inner.** A claim may not list a claim in a weaker tier in its
   `supports_claims`. Reject on write.
3. **Moral & framing claims cannot occupy Core.** Reject on write.
4. **Metaphysical claims cannot take a radial tier at all.** If `kind = metaphysical`,
   the claim is routed off the radial axis (for Stage One, simply: it cannot be placed on
   the rings — show it in a separate "not empirically decidable" list).
5. **Self-assertion scores zero.** A source with `is_claimant_self_published = true`
   contributes no weight and cannot by itself justify any inward movement.
6. **Vertical placement (help/harm) requires `evidenced = true`.** No conviction-based
   up/down placement.
7. **The tool must be able to tell the user "no."** All of the above apply to the single
   user. There is no override.
8. **Outer claims are stated faithfully, never fortified**, and always carry a
   `placement_reason` explaining what's missing.

---

## Required interactions

- **Visual onion:** concentric rings; claims placed by `radial_tier`; vertical offset shows
  help/harm. Metaphysical claims shown off to the side, not on the rings.
- **Add a claim:** enter text → pick `kind` → pick `layer` → attach sources (each with a
  tier + self-published flag) → propose a `radial_tier`.
- **The app pushes back automatically** (single-user stand-in for community review): if the
  user tries to place something the rules forbid, it is blocked with a plain-language reason
  ("this source is anonymous — it can't move a claim to Core"; "this is a moral claim — it
  can't sit in the factual core"; "this claim relies on an outer claim — not allowed").
- **Challenge flow:** open a claim, raise a challenge, and if upheld the claim moves OUTWARD.
  Demoting must be as easy and satisfying as promoting.
- **Debunker flow:** a correction = restate the established facts plainly + push the unproven
  remainder outward to the tier its evidence earns.
- **Evidence panel:** click a claim → see its sources, tiers, status, placement_reason, and
  challenge history.

---

## Seed content

Pre-load the MKUltra onion so the full range is visible:
- **Core:** program existed (1953–early 70s, Helms/Gottlieb); Church Committee + 1977 Senate
  hearings exposed it; 1973 record destruction; Frank Olson case. (primary_doc / court_record)
- **Inner/Middle:** contested scope of destroyed records; circumstantial links often attached
  to the program.
- **Outer:** "it never ended / continues today under other names" — stated faithfully, sources
  none/anonymous, placement_reason given.
- **Outermost:** expansive present-day-total-mind-control versions — stated faithfully, marked
  debunked/unsupported, NOT fleshed out or made persuasive.

---

## Definition of done

The build succeeds if, with the MKUltra onion loaded, the app correctly:
1. **Blocks** an unsourced or anonymous-only claim from Core.
2. **Blocks** a moral or framing claim from Core.
3. **Blocks** an outer claim from being used to support an inner one.
4. **Refuses** to place a metaphysical claim on the rings.
5. **Ignores** a self-published-only source as zero-weight.
6. Makes **demoting a weak claim as easy as promoting a strong one**, each with a stated reason.

If it does those six things, the honest engine works. Everything else in the roadmap is
additive and comes later. Do not start Stage Two until these hold.
EOF
echo "created"