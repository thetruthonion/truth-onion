# Contributing to Truth Onion

Claims, topics, code, challenges, and demo save files are all contributions.
The path inward is you: run the suite, read `server/rules.js`, try to cheat
the engine, and file what you find. And when you play the demo, submit your
save file through the website drop box — no email address asked, none
recorded. That strain data is what the project needs before multiplayer can
go live: real sessions showing where the rules bend under real use.

## Licensing of contributions

- **Code** is licensed under **AGPL-3.0-only** (see `LICENSE`).
- **Documentation and curated topic content** are licensed under
  **CC BY-SA 4.0** (see `LICENSE-CONTENT`).

This section explains the contribution terms; the license texts in the
`LICENSE` and `LICENSE-CONTENT` files at the root of this repository control.

By submitting a contribution, you agree that it is licensed under the same
license as the material it modifies or adds to, with no additional terms.
Contributing transfers no ownership: you remain the copyright holder of your
contribution and grant only the license. There is no Contributor License
Agreement, and the
project's standing policy is that none will be introduced: no one — Truth
Onion LLC included — acquires the right to relicense your contribution, and
the canonical hosted instance operates under the same license terms as any
other deployment.

## Developer Certificate of Origin

This project uses the [Developer Certificate of Origin v1.1](https://developercertificate.org/).
Every commit must be signed off:

```
git commit -s
```

which adds a `Signed-off-by: Your Handle <email>` line certifying that you have
the right to submit the work under the project's license. Pseudonymous
sign-offs are welcome — a persistent handle and a working email address are
all that is required. This mirrors the platform's own posture: reputation
attaches to a handle, never a legal identity.

Commits without a sign-off will not be merged.

## What not to submit

The platform stores citations and captures of public material, never document
warehouses. Two classes of material are out of scope in every channel —
claims, captures, save files, and the drop box alike:

- **Non-public government material.** No channel here solicits it, no
  submission path is provided for it, and the companion will not assist in
  acquiring it. The demo save-file drop box accepts user-created engine data
  only. Claims sourced to published reporting *about* a disclosure are
  welcome and are priced as reporting-sourced claims.
- **Payloads barred by the identity-scope boundary** — residential addresses,
  personal contact information, government or financial identifiers,
  pseudonym unmasking, and private-life facts of private individuals —
  regardless of sourcing or truth. Conduct claims about people, sourced to
  documents that already name them in connection with that conduct, stay
  fully in scope.

Submissions in these classes are refused at the gate where detectable, and
removed as documented scope actions where not.

## Security issues

Do not open a public issue for a vulnerability. See `SECURITY.md`.

## What makes a good code contribution

- Test names are a prefix plus a sentence stating the guarantee.
- Code comments explain *why*, never *what* — the threat defended against or
  the decision encoded.
- Any change touching the rules layer must keep the full suite passing,
  pressure tests included. A change that weakens a write-time constraint will
  be treated as a bug regardless of what it enables.
