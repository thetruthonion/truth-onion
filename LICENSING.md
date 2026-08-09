# Licensing

Copyright © 2026 Truth Onion LLC.

This repository contains two kinds of material under two licenses:

| Material | License | File |
|---|---|---|
| Software — all source code, schemas, rules, tests, scripts | **AGPL-3.0-only** | `LICENSE` |
| Documentation and curated topic content — claim text, placement reasons, source annotations, topic exports, docs | **CC BY-SA 4.0** | `LICENSE-CONTENT` |

This document is an explanation, not a license. The license texts in the
`LICENSE` and `LICENSE-CONTENT` files at the root of this repository are the
terms; where this summary and a license text differ, the license text
controls.

## Why AGPL

The engine's value proposition is that its rules are auditable. AGPL-3.0 makes
that legally enforceable, not just architecturally true: anyone who runs a
modified version of the engine as a network service must offer their users the
modified source. A hosted fork with quietly altered rules must publish the
alteration.

The known cost, stated plainly: some institutions prohibit AGPL dependencies,
which limits embedding the engine inside proprietary products. AGPL-3.0
permits running a private instance; the network-source obligation (section 13)
applies when a modified version is made available to users over a network, and
runs to those users.

## Why CC BY-SA for content

A seed topic is a curated evidentiary record. Share-alike means a fork of that
record must remain open and inspectable — the same auditability guarantee,
one layer up. Attribution is required; accuracy is not something a license can
require, which is why misrepresenting a fork as canonical is a trademark
matter, not a licensing one.

## What the licenses do not do

- They do not reserve any client layer for the copyright holder. Anyone may
  build clients — including commercial ones — that talk to the engine across
  its API. This repository's stated position is that a separate codebase
  communicating with the engine over its public API is not a derivative work
  of the engine, and Truth Onion LLC will not assert otherwise.
- They grant no trademark rights. The "Truth Onion" name and TO mark may not
  be used to identify a fork or third-party instance as canonical.

## Contributions

Contributions are accepted under the Developer Certificate of Origin
(see `CONTRIBUTING.md`), under the same license as the material contributed
to. There is no CLA. In practice this fixes the licenses permanently: once
outside contributions land, relicensing would require every contributor's
consent — including for the copyright holder. That is intentional.
