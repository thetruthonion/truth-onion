# Stage 2.98b — Seed Source Link Audit

Every source across all seeded topics, per kickoff C: canonical online link,
honest offline/class label, or a reported could-not-verify — **no naked
linkless statements, no invented or approximate links**. Verification ran
2026-08-01: government/library/press URLs resolved live (HTTP 200), DOIs
confirmed registered via the doi.org handle registry (responseCode 1 —
SAGE's site blocks non-browser agents with 403, but the DOI is the
persistent identifier and is registered), court records confirmed by
citation match through the CourtListener API, and archive.org snapshots
confirmed by the CDX index. The mapping is applied from ONE module —
`server/sourcelinks.js` — by both `seed()` (fresh databases) and a one-time
run against the live database (38 rows updated). The seed-lint test
(stage298b C1) fails the build if a linkless, unlabeled source ever
reappears.

Legend: **linked** = canonical link verified · **class** = labeled class
citation (no single canonical copy can exist) · **CNV** = could-not-verify,
labeled as such — reported, not guessed.

## MKUltra

| # | Source | Status | Link / label |
|---|--------|--------|--------------|
| 1 | Church Committee, Book I — "Testing and Use of Chemical and Biological Agents…" | linked | intelligence.senate.gov `94755_I.pdf` (200) |
| 2 | Senate Joint Hearing, "Project MKULTRA" (Aug 3, 1977) | linked | intelligence.senate.gov `95mkultra.pdf` (200; pre-existing, re-verified) |
| 3 | Church Committee, Book I (1976) | linked | `94755_I.pdf` — replaced the generic committee-resources page with the canonical PDF |
| 4 | Senate Joint Hearing transcript incl. Turner opening statement | linked | `95mkultra.pdf` |
| 5 | Turner / CIA officials testimony (Aug 3, 1977) | linked | `95mkultra.pdf` |
| 6 | Book I on the 1973 destruction of MKULTRA files | linked | `94755_I.pdf` |
| 7 | Rockefeller Commission Report (1975) | linked | fordlibrarymuseum.gov `1561495.pdf` (200; pre-existing, re-verified) |
| 8 | Private Law 94-126 (1976), Olson family | linked | govinfo `STATUTE-90-Pg3006.pdf` — "An act for the relief of Alice W. Olson, Lisa Olson Hayward, Eric Olson, and Nils Olson" (200, title confirmed via govinfo search) |
| 9 | Joint Hearing: surviving financial records | linked | `95mkultra.pdf` |
| 10 | Marks, *The Search for the Manchurian Candidate* (1979) | linked | archive.org item `searchformanchur0000mark` (200 — the book's lawful online home, a lending copy) |
| 11 | Orlikow v. United States, 682 F. Supp. 77 (D.D.C. 1988) | linked | CourtListener opinion 1583126 (citation `682 F. Supp. 77`, dateFiled 1988-01-19, confirmed via API) |
| 12 | Marks (1979), Subproject 68 chapter | linked | archive.org `searchformanchur0000mark` |
| 13 | Chase, "Harvard and the Making of the Unabomber", The Atlantic (2000) | linked | theatlantic.com (200; pre-existing, re-verified) |
| 14 | Book I — documented record of unwitting testing | linked | `94755_I.pdf` |
| 15 | Anonymous online accounts (continued-programs claims) | class | "[cited as a class of postings — no single canonical copy exists]" |
| 16 | Proponents' own websites (self-targeting claims) | class | same label |
| 17 | Joint Hearing: program failed at reliable behavioral control | linked | `95mkultra.pdf` |

## COINTELPRO

| # | Source | Status | Link / label |
|---|--------|--------|--------------|
| 18 | Church Committee, Book II (1976) | linked | intelligence.senate.gov `94755_II.pdf` (200) |
| 19 | Church Committee, Book III — COINTELPRO staff report | linked | intelligence.senate.gov `94755_III.pdf` (200) |
| 20 | The Media, PA FBI documents (March 1971) | **CNV** | No canonical primary home verified (FBI Vault carries no MEDBURG/Media-burglary release per CDX sweep; the documents' 1971–72 press publications have no single canonical copy). Labeled could-not-verify. |
| 21 | Book III, account of the exposure | linked | `94755_III.pdf` |
| 22 | Book III, "Dr. Martin Luther King, Jr., Case Study" | linked | `94755_III.pdf` |
| 23 | November 1964 anonymous FBI letter to Dr. King | **CNV** | No canonical National Archives catalog entry verified (catalog API requires a key; no stable public identifier found without guessing). Labeled could-not-verify. |
| 24 | FBI memorandum terminating COINTELPRO (April 1971) | linked | vault.fbi.gov/cointel-pro — the agency reading room holding the released files (curl gets the vault's bot-block 403; liveness wayback-verified 2026-07-24) |
| 25 | Book III on the April 1971 termination | linked | `94755_III.pdf` |
| 26 | Hampton v. Hanrahan, 600 F.2d 600 (7th Cir. 1979) | linked | CourtListener opinion 8921213 (citation `600 F.2d 600`, 7th Cir., 1979-04-23, confirmed via API) |
| 27 | Book III, operations against the Black Panther Party | linked | `94755_III.pdf` |
| 28 | Reporting/histories of FBI–AIM conflict at Pine Ridge | class | "[cited as a class of published works — no single canonical copy]" |
| 29 | Anonymous continued-program accounts | class | class label |
| 30 | Proponents' websites (universal-assassination claim) | class | class label |
| 31 | Books II–III: grave abuses documented; no universal assassination program | linked | `94755_III.pdf` |

## The Replication Crisis

All journal articles are linked by DOI — the persistent identifier — each
confirmed registered in the doi.org handle registry.

| # | Source | Status | Link |
|---|--------|--------|------|
| 32 | Open Science Collaboration (2015), Science | linked | doi.org/10.1126/science.aac4716 (pre-existing, re-verified) |
| 33 | Camerer et al. (2018), Nat Hum Behav | linked | doi.org/10.1038/s41562-018-0399-z |
| 34 | Klein et al. (2014), Many Labs | linked | doi.org/10.1027/1864-9335/a000178 |
| 35 | Hagger et al. (2016), ego-depletion RRR | linked | doi.org/10.1177/1745691616652873 |
| 36 | Vohs et al. (2021), multisite ego-depletion | linked | doi.org/10.1177/09567976211024535 |
| 37 | Baumeister & Vohs (2016) objection | linked | doi.org/10.1177/1745691616652878 |
| 38 | Simmons, Nelson & Simonsohn (2011) | linked | doi.org/10.1177/0956797611417632 |
| 39 | Ranehill et al. (2015), power posing | linked | doi.org/10.1177/0956797614553946 |
| 40 | Carney (2016), "My position on 'Power Poses'" | linked | web.archive.org snapshot 20160926154028 of the Berkeley faculty PDF — the original URL is defunct (404); archive.org is the kickoff's stated home for defunct pages |
| 41 | Cuddy, Schultz & Fosse (2018) | linked | doi.org/10.1177/0956797617746749 |
| 42 | John, Loewenstein & Prelec (2012) | linked | doi.org/10.1177/0956797611430953 |
| 43 | Ioannidis (2005), PLoS Medicine | linked | doi.org/10.1371/journal.pmed.0020124 |
| 44 | Blogs/posts asserting the field is bunk | class | class label |
| 45 | OSC (2015) — the same audit, cited for what replicated | linked | doi.org/10.1126/science.aac4716 |
| 46 | Simmons et al. (2011) — the documented mechanism | linked | doi.org/10.1177/0956797611417632 |

## Purdue Pharma & the Sacklers

| # | Source | Status | Link |
|---|--------|--------|------|
| 47 | DOJ case page, United States v. Purdue Pharma L.P. | linked | justice.gov (pre-existing; wayback-verified in a prior stage) |
| 48 | DOJ case page (mechanically verified elements) | linked | justice.gov (same; archive snapshot recorded in the citation) |

**Totals: 48 sources — 40 linked, 6 class-labeled, 2 could-not-verify
(labeled).** Zero naked linkless statements remain; pinned by stage298b C1.

**Disclosure (no-silent-writes):** applying this audit to the live database
changed `sources.url` on 32 rows and appended honesty labels to 6
citations (38 changes; nothing removed, nothing reweighted — source tier
and relations untouched, so no claim moved). No event type exists for
source-metadata correction and the kickoff forbids adding event types
beyond what status rendering requires, so this correction is disclosed
here and in PROJECT-STATE instead of in the event log.
