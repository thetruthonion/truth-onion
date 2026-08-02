# Truth Onion — Spec Addendum (v2)

Additions and refinements agreed after the v1 spec. Append to the v1 project brief. Nothing here changes the Prototype 1 scope — most of this is foundational data-model and rule work that must be *designed in* now so later prototypes don't require a rewrite. Items tagged **[P1]** affect the first build; others are captured for the stage they belong to.

---

## 1. Claim categorization gate (extends the layer tag) **[P1]**

Before a claim gets a radial tier, it passes a categorization gate. The existing `layer` field (factual / moral / framing) gains a parallel `kind` field:

- **empirical** — resolvable by observation/documents/data → eligible for the radial axis normally.
- **metaphysical** — not resolvable by the tool's evidence types in *either* direction (e.g. "God exists," "no God exists," "the FSM is real"). Routed OFF the radial axis to an "attributed positions" layer. Never ranked proven/unproven.
- **historical** — events, dates, existence of texts/figures → eligible for the radial axis normally.

Rationale: an evidence axis that ranks metaphysical claims as "weak" secretly asserts their negation as "strong." The gate prevents the tool from becoming an anti-religion (or anti-anything) engine by measuring each claim only against the standard it's actually accountable to. Note: specific *empirical* claims attached to belief systems (e.g. young-earth timelines) still get mapped and can still land debunked. Faith-as-metaphysics is off-axis; falsifiable empirical bets are not.

---

## 2. The "attributed positions" layer (metaphysical home) 

Metaphysical claims are not dead-ends. They route to a layer that carries:
- The mapped arguments **for and against**, attributed (cosmological argument, problem of evil, etc.).
- **Discussion venues** — vigorous debate is fine here *because* nothing pretends to be settled.
- **Profile affiliation** — users may display what they hold.

**Hard rule:** affiliation is shown as *identity, not tally*. You see WHO holds a view and WHY they say they do — never a support-count that makes a popular view look proven. Headcount never functions as evidence, here or anywhere.

---

## 3. Outer-layer mechanics (the edge is a workspace, not a dump) **[P1 partial]**

The outer/outermost rings are labeled zones for weak claims, not exclusion. To make them functional rather than a graveyard, each outer claim carries:
- **A path inward** — the specific evidence that would move it to a stronger tier. The edge becomes a to-do list for investigators.
- **Attempt history** — has this been checked and failed, or just not examined yet? "Investigated 3×, no primary source found" ≠ "unexamined."
- **Stated reason for placement** — *why* it's out here (no primary source / single anonymous origin / contradicts record / relies on outer claim).

**New hard rule — self-assertion scores zero.** A person publishing their own claim (a website asserting they're right) is a *restatement of the claim*, not evidence for it. Only provenance independent of the claimant can move a claim inward. This is the backbone that stops "anyone with hosting wins."

---

## 4. Source-preservation model (defeats censorship without becoming a content host)

Every source is captured at submission time, not just linked:
- **Archive snapshot** (Internet Archive / archive.today style) + **content hash** + **timestamp** + capturing party.
- If a live link later dies or is altered, the hashed capture stands as verifiable evidence of what the source said and when.

**Guardrails:**
- Snapshot the *provenance of already-public material* — never a channel to host material that couldn't be referenced in the first place (illegal/private content stays out; a hash of illegal content is still illegal content).
- **"It was censored" only counts when there's a real capture to point to.** A since-deleted post with no capture and no corroboration stays weak — the scrubbing excuse cannot substitute for missing evidence. Real capture vs. no capture is the distinguisher.

---

## 5. Reference-based storage + participant privacy 

- **Store references, not payloads.** The onion maps *where verifiable evidence lives and how strong it is*, pointing to primary sources that are already public (archives, court records, reporting) — plus captures per §4. The tool is an evidence *map*, not a content *warehouse*.
- **"Reference" means the full set of verifiable sources, not just legacy media.** The bar is *verifiability*, not prominence. Legitimate-but-underreported material (independent journalism, leaked-but-authentic documents, academic work) flows in; verifiability (not "was it in the NYT") is the gate.
- **Pseudonymous identity** — reputation attaches to a persistent handle, not a legal identity.
- **Minimal activity trails** — don't concentrate a reconstructable "who-investigated-what" log. Collect little, retain briefly.

---

## 6. Active-investigation mode (Bellingcat model) 

Upgrades the tool from "maps settled history" to "supports live open-source investigation." Adopt the Bellingcat methodology:
- **Open, verifiable sources only** — anything anyone can independently check (imagery, public footage, flight/shipping data, geolocation). No uncheckable "a source told us."
- **Shown, reproducible method** — the map *is* the shown work; every claim carries its evidence chain so the path is walkable by a critic or a court.
- **Calibrated confidence language** — confirmed / probable / possible stated explicitly; never flatten an inference into a fact. (Maps onto radial tiers.)
- **Verification over consensus** — findings advance by surviving verification, not by popularity.

Case-building = tiering evidentiary facts by strength toward a conclusion that stays **held in the unproven rings until earned.**

**New hard rule — heightened bar for naming living people.** A claim accusing a living, identifiable person of wrongdoing before adjudication carries real harm potential (see: Boston Marathon misidentification). It gets extra friction: a higher evidence bar to move inward and a strong default to "under investigation / unproven." This encoded caution substitutes for the human editorial layer that professional outfits have and a crowd does not.

---

## 7. Dual-audience principle (foundational) **[P1 shapes everything]**

One rigorous system, engaged at variable depth — NOT a forked "easy mode / pro mode."
- **Layman** engages the top layer: sees what's established/contested/fringe and *why*, in plain language. Learns media literacy by watching real work.
- **Professional** engages the full depth: provenance, chain-of-evidence, capture/hash preservation, calibrated confidence, reproducible method, collaborative challenge — rigorous enough to hold up to a skeptic, editor, or court.
- **Rigor is always present and legible.** The pro layer is never theater; the layman view is a *window into* the real foundation, not a simplified fake laid over it.
- **Incentives train the crowd upward** — every contribution is nudged toward "what's your source, how do you know," pulling amateurs toward the professional standard rather than dragging pros down to the crowd.

Design consequence: build the foundation to the professional standard first; the layman experience is a legible view onto it. The depth-dial governs both "how far out (how speculative)" and "how deep into the method" a user wants to go.

---

## 8. Backend & deployment (Prototype 3+; design-for-it now)

- **Two backends, clean seam:** Matrix (Synapse/Dendrite) for identity, chat, presence, rooms, and **federation** (fits the main-server + user-hosted-server model). A **relational DB (Postgres)** for the evidence ledger and its enforced constraints. Matrix CANNOT hold the truth-ledger — it has no concept of the relational invariants; don't try.
- **Canonical placement never lives in the federated layer.** Federated servers share chat/presence/social freely; a claim earns canonical map placement only through the review pipeline in the relational layer. This prevents federation from becoming the back door that lets unreviewed content wear the canonical badge.
- **Bundleable deployment:** package services (Matrix + evidence backend + DB) for **one-command install** (containers / Compose) so operators experience one app. Redundancy: Matrix federation for the social layer, DB replication for the evidence layer. Build each service to containerize cleanly from the start so this isn't a later retrofit.
- **Not for Prototype 1** — P1 is one local app. Design the pieces to be separable/bundleable; don't stand up Matrix or federation until real multiplayer (P3).

---

## Updated hard-rules list (the enforced constraints)

Carry all of these into the data layer as validated-on-write constraints:

1. Promotion requires surviving challenge (hard to promote, easy to demote).
2. Outer cannot feed inner.
3. Moral & framing claims cannot occupy the Core ring.
4. Vertical axis = documented outcomes only, same review rigor as rings.
5. The tool must be able to tell its own user "no."
6. Outer/outermost claims stated faithfully, never fortified; nothing hidden, nothing propped up.
7. **Metaphysical claims routed off the radial axis; never ranked proven/unproven.** *(new)*
8. **Affiliation shown as identity, never as an evidence-tally.** *(new)*
9. **Self-assertion scores zero; only claimant-independent provenance moves a claim inward.** *(new)*
10. **"Censored" only counts with a real capture; it cannot substitute for missing evidence.** *(new)*
11. **Heightened evidence bar for accusations against living, identifiable people.** *(new)*

---

## The game is still a game

The virtual shared space remains the goal (Prototypes 4–6): the empty center sphere where everyone spawns on shared bedrock, the radial (how-proven) and vertical (documented-outcome) axes, the X-ray depth dial, user-hosted decorated sections you travel past, identified-profile presence and chat, discovery through the center. The space is built literally on what's been established — the world's geometry *is* the epistemology. Everything in this addendum is what makes that shared space trustworthy enough to be worth inhabiting.

---

## 9. Original-evidence model (material not already online)

For evidence a contributor gathers themselves (photographed documents, recordings, field research, interviews) — material with no prior public existence.

**Core reframe:** storage is downstream of *independence*. Material that exists only because one contributor holds it runs into the self-assertion rule (§3, rule 9) — it's closer to "my assertion" than to independent provenance, because it can't be checked against anything. So the real question is how contributor-originated material earns independence from the contributor.

**Recommended storage path:**
- **Primary: deposit in an established third-party archive** (DocumentCloud — purpose-built for verifiable primary-document hosting — university/subject archives, Internet Archive). A neutral custodian now holds and timestamps it, giving independence, permanence, and credibility. The onion *references* it; the tool stays a map, not a warehouse.
- **Optional integrity layer: content-addressed storage (IPFS-style).** The identifier is the hash, so material is tamper-evident and censorship-resistant. IMPORTANT: this proves the file is *unaltered*, NOT *authentic* — a doctored document has a valid hash. Integrity, not authenticity. Also a governance burden (less control over network contents), so treat as an add-on, not the primary home.
- **Avoid: hosting original material in your own storage** as the primary custodian — it creates liability, a single censorship/failure point, and adds no independence (evidence held by the tool that hosts the claim isn't independent of it). Note: §4 captures of already-public sources are fine; original never-elsewhere material is a different risk class.

**Authenticity is a separate mechanism from storage — handled by chain-of-custody + corroboration:**
- Contributor-originated evidence **enters at the outer rings by default** ("single-source, provenance unconfirmed") and earns inward status only through independent corroboration, a second party confirming, the material surfacing in a verifiable public record, expert authentication, or checkable metadata.
- A single photographed document from one contributor is weak *by design* — not distrust, but because the tool can't distinguish a real one from a forgery without corroboration. If genuine, corroboration comes and it moves inward.

**Hard rule (new):** original evidence about a living, identifiable person's alleged wrongdoing, held single-source, faces the HEAVIEST corroboration bar and stays at the edge marked "unverified single-source" until it clears it. This is where fabrication does the most damage (combines with rule 11). The tool must not be usable to launder a fabricated document into apparent legitimacy against a real person.

Add to hard-rules list:
12. Contributor-originated evidence enters weak (outer), earns inward only via corroboration/chain-of-custody — never on the upload alone. Original evidence against living people faces the heaviest bar.
