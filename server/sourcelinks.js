// 2.98b C: the seed source link audit, as code. Every seeded source gets
// its canonical online link, or an honest label — no naked linkless
// statements, and NO invented or approximate links (a wrong link is worse
// than a labeled absence). Verification record: every URL below was
// resolved live on 2026-08-01 (HTTP 200, DOI handle registry responseCode 1,
// or CourtListener API citation match); the two could-not-verify items are
// LABELED, not guessed. The audit table lives in
// truth-onion-2-98b-source-audit.md.

// Canonical homes preferred, per the kickoff: gov originals (Senate,
// govinfo, presidential library), court dockets (CourtListener/RECAP),
// agency reading rooms (FBI Vault), DOIs for journal articles, archive.org
// for defunct pages.

const BOOK_I = 'https://www.intelligence.senate.gov/sites/default/files/94755_I.pdf';
const BOOK_II = 'https://www.intelligence.senate.gov/sites/default/files/94755_II.pdf';
const BOOK_III = 'https://www.intelligence.senate.gov/sites/default/files/94755_III.pdf';
const MKULTRA_HEARING = 'https://www.intelligence.senate.gov/sites/default/files/hearings/95mkultra.pdf';
const MARKS_BOOK = 'https://archive.org/details/searchformanchur0000mark';

// Labels for sources that cannot carry a single canonical link. Appended to
// the citation once (idempotent).
export const CLASS_LABEL = ' [cited as a class of postings — no single canonical copy exists]';
export const CLASS_LABEL_HISTORIES = ' [cited as a class of published works — no single canonical copy]';
export const CNV_LABEL = ' [archival release — no canonical online copy verified; flagged could-not-verify in the 2.98b source audit]';

// match = the seeded citation, verbatim (pre-label). kind: 'url' | 'label'.
export const SOURCE_LINKS = [
  // ---- MKUltra ----
  { match: 'Church Committee, Final Report, Book I: Foreign and Military Intelligence (1976), "Testing and Use of Chemical and Biological Agents by the Intelligence Community"', url: BOOK_I },
  { match: `Joint Hearing before the Senate Select Committee on Intelligence and the Subcommittee on Health and Scientific Research, "Project MKULTRA, the CIA's Program of Research in Behavioral Modification" (Aug 3, 1977)`, url: MKULTRA_HEARING },
  { match: 'Church Committee, Final Report, Book I (1976)', url: BOOK_I },
  { match: 'Senate Joint Hearing transcript, "Project MKULTRA" (Aug 3, 1977), incl. opening statement of Adm. Stansfield Turner', url: MKULTRA_HEARING },
  { match: 'Testimony of Adm. Stansfield Turner and CIA officials, Senate Joint Hearing (Aug 3, 1977)', url: MKULTRA_HEARING },
  { match: 'Church Committee, Final Report, Book I (1976), on the 1973 destruction of MKULTRA files', url: BOOK_I },
  { match: 'Report to the President by the Commission on CIA Activities within the United States (Rockefeller Commission, 1975)', url: 'https://www.fordlibrarymuseum.gov/library/document/0005/1561495.pdf' },
  { match: 'Private Law 94-126 (1976), compensating the family of Frank R. Olson', url: 'https://www.govinfo.gov/content/pkg/STATUTE-90/pdf/STATUTE-90-Pg3006.pdf' },
  { match: 'Senate Joint Hearing (Aug 3, 1977): surviving records are financial files that "do not reveal the full range" of activities', url: MKULTRA_HEARING },
  { match: 'John Marks, "The Search for the Manchurian Candidate" (1979), built on ~16,000 pages obtained via FOIA', url: MARKS_BOOK },
  { match: 'Orlikow v. United States, 682 F. Supp. 77 (D.D.C. 1988); CIA settlement with eight Cameron patients', url: 'https://www.courtlistener.com/opinion/1583126/orlikow-v-united-states/' },
  { match: 'John Marks, "The Search for the Manchurian Candidate" (1979), ch. on Subproject 68', url: MARKS_BOOK },
  { match: 'Alston Chase, "Harvard and the Making of the Unabomber", The Atlantic (June 2000)', url: 'https://www.theatlantic.com/magazine/archive/2000/06/harvard-and-the-making-of-the-unabomber/378239/' },
  { match: 'Church Committee, Final Report, Book I (1976) — the documented record of unwitting testing', url: BOOK_I },
  { match: 'Anonymous online accounts claiming insider knowledge of continued programs', label: CLASS_LABEL },
  { match: 'Websites of proponents asserting their own targeting', label: CLASS_LABEL },
  { match: 'Senate Joint Hearing (Aug 3, 1977): the documented program pursued and failed at reliable behavioral control; no evidence of any operational mind-control capability', url: MKULTRA_HEARING },

  // ---- COINTELPRO ----
  { match: 'Church Committee, Final Report, Book II: Intelligence Activities and the Rights of Americans (1976)', url: BOOK_II },
  { match: `Church Committee, Final Report, Book III: Supplementary Detailed Staff Reports — "COINTELPRO: The FBI's Covert Action Programs Against American Citizens" (1976)`, url: BOOK_III },
  { match: 'The Media, PA FBI documents (March 1971), as published and later confirmed authentic', label: CNV_LABEL },
  { match: 'Church Committee, Final Report, Book III (1976), account of the exposure and press publication', url: BOOK_III },
  { match: 'Church Committee, Final Report, Book III (1976): "Dr. Martin Luther King, Jr., Case Study"', url: BOOK_III },
  { match: 'The November 1964 anonymous FBI letter to Dr. King (released; National Archives)', label: CNV_LABEL },
  { match: 'FBI memorandum terminating COINTELPRO operations (April 1971), released files', url: 'https://vault.fbi.gov/cointel-pro' },
  { match: 'Church Committee, Final Report, Book III (1976) on the April 1971 termination', url: BOOK_III },
  { match: 'Hampton v. Hanrahan, 600 F.2d 600 (7th Cir. 1979); 1982 settlement', url: 'https://www.courtlistener.com/opinion/8921213/hampton-v-hanrahan/' },
  { match: 'Church Committee, Final Report, Book III (1976), FBI operations against the Black Panther Party', url: BOOK_III },
  { match: "Investigative reporting and histories of the FBI's conflict with AIM at Pine Ridge (1973–76)", label: CLASS_LABEL_HISTORIES },
  { match: 'Anonymous accounts asserting the program secretly continued', label: CLASS_LABEL },
  { match: 'Websites of proponents asserting the universal-assassination claim', label: CLASS_LABEL },
  { match: 'Church Committee, Final Report, Books II–III (1976): documents grave abuses, including lethal ones, and does not support a universal assassination program', url: BOOK_III },

  // ---- The Replication Crisis (DOIs — persistent identifiers) ----
  { match: 'Camerer et al. (2018), “Evaluating the replicability of social science experiments in Nature and Science between 2010 and 2015”, Nature Human Behaviour 2: 637–644 — 21 preregistered replications; ~62% replicated, effect sizes about half the originals', url: 'https://doi.org/10.1038/s41562-018-0399-z' },
  { match: 'Klein et al. (2014), “Investigating variation in replicability: A “Many Labs” replication project”, Social Psychology 45(3): 142–152 — 36 labs, 13 classic effects; 10 of 13 replicated', url: 'https://doi.org/10.1027/1864-9335/a000178' },
  { match: 'Hagger et al. (2016), “A multilab preregistered replication of the ego-depletion effect”, Perspectives on Psychological Science 11(4): 546–573 — 23 labs, effect indistinguishable from zero', url: 'https://doi.org/10.1177/1745691616652873' },
  { match: 'Vohs et al. (2021), “A multisite preregistered paradigmatic test of the ego-depletion effect”, Psychological Science 32(10) — 36 labs, d ≈ 0.06', url: 'https://doi.org/10.1177/09567976211024535' },
  { match: 'Baumeister & Vohs (2016), “Misguided effort with elusive implications”, Perspectives on Psychological Science 11(4) — the original authors’ published objection that the RRR paradigm was a poor test of the effect', url: 'https://doi.org/10.1177/1745691616652878' },
  { match: 'Simmons, Nelson & Simonsohn (2011), "False-Positive Psychology: Undisclosed Flexibility in Data Collection and Analysis Allows Presenting Anything as Significant", Psychological Science 22(11): 1359–1366', url: 'https://doi.org/10.1177/0956797611417632' },
  { match: 'Ranehill et al. (2015), "Assessing the Robustness of Power Posing: No Effect on Hormones and Risk Tolerance in a Large Sample of Men and Women", Psychological Science 26(5): 653–656', url: 'https://doi.org/10.1177/0956797614553946' },
  { match: `Carney (2016), "My position on 'Power Poses'" — public statement by the original paper's first author: "I do not believe that 'power pose' effects are real." (Against-interest primary statement; this tool's source tiers have no dedicated slot for it — primary_doc is the closest honest fit.)`, url: 'https://web.archive.org/web/20160926154028/http://faculty.haas.berkeley.edu/dana_carney/pdf_My%20position%20on%20power%20poses.pdf' },
  { match: 'Cuddy, Schultz & Fosse (2018), "P-Curving a More Comprehensive Body of Research on Postural Feedback...", Psychological Science 29(4): 656–666 — the senior author\'s published defense of postural-feedback effects', url: 'https://doi.org/10.1177/0956797617746749' },
  { match: 'John, Loewenstein & Prelec (2012), "Measuring the Prevalence of Questionable Research Practices With Incentives for Truth Telling", Psychological Science 23(5): 524–532', url: 'https://doi.org/10.1177/0956797611430953' },
  { match: 'Ioannidis (2005), "Why Most Published Research Findings Are False", PLoS Medicine 2(8): e124 — the claim\'s own origin: a model, not a measurement', url: 'https://doi.org/10.1371/journal.pmed.0020124' },
  { match: 'Blogs and posts asserting the field is wholesale bunk, citing the crisis', label: CLASS_LABEL },
  { match: 'Open Science Collaboration (2015), Science 349(6251): aac4716 — the same audit that documents the failures also documents the ~36–39% that replicated, with large effects replicating most reliably', url: 'https://doi.org/10.1126/science.aac4716' },
  { match: 'Simmons, Nelson & Simonsohn (2011), "False-Positive Psychology", Psychological Science 22(11): 1359–1366 — the documented mechanism the judgment rests on', url: 'https://doi.org/10.1177/0956797611417632' }
];

// Every label this audit may append — the lint test accepts a source as
// honestly labeled when its citation carries one of these.
export const HONEST_LABELS = [CLASS_LABEL, CLASS_LABEL_HISTORIES, CNV_LABEL];

// Release 2b: verification-status labels. A recorded source whose entry
// above carries a canonical URL was resolved live and mechanically verified
// in the 2.98b audit — that FACT (not a fresh check) is what the label
// states, so the status derives from this mapping and nowhere else. The
// class-labeled and could-not-verify entries already say their own honest
// piece inside the citation text; they get no verification chip.
export const CURATOR_VERIFIED_LABEL = 'mechanically verified locally by curator';
const VERIFIED_CITATIONS = new Set(SOURCE_LINKS.filter((e) => e.url).map((e) => e.match));
export function curatorVerified(citation) {
  return VERIFIED_CITATIONS.has(citation);
}

// Apply the audit to a database: set canonical URLs (canonical wins over a
// weaker existing link) and append honesty labels. Idempotent. Re-indexes
// changed citations (the FTS triggers cover attach/withdraw, not citation
// edits).
export function applySourceLinks(db) {
  const changed = [];
  const findAll = db.prepare('SELECT id, citation, url FROM sources WHERE citation = ? OR citation = ?');
  for (const entry of SOURCE_LINKS) {
    const labeled = entry.label ? entry.match + entry.label : entry.match;
    for (const row of findAll.all(entry.match, labeled)) {
      if (entry.url && row.url !== entry.url) {
        db.prepare('UPDATE sources SET url = ? WHERE id = ?').run(entry.url, row.id);
        changed.push({ id: row.id, set: 'url' });
      }
      if (entry.label && row.citation === entry.match) {
        db.prepare('UPDATE sources SET citation = ? WHERE id = ?').run(labeled, row.id);
        changed.push({ id: row.id, set: 'label' });
      }
    }
  }
  // Re-index citations that changed.
  for (const c of changed.filter((x) => x.set === 'label')) {
    db.prepare(`DELETE FROM search_index WHERE field = 'source' AND ref_id = ?`).run(c.id);
    db.prepare(
      `INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
       SELECT s.citation, 'source', cs.claim_id, c.topic_id, cs.source_id
       FROM claim_sources cs JOIN sources s ON s.id = cs.source_id JOIN claims c ON c.id = cs.claim_id
       WHERE s.id = ? AND cs.withdrawn_at IS NULL AND s.withdrawn_at IS NULL`
    ).run(c.id);
  }
  return changed;
}
