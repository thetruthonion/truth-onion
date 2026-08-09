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
  { match: 'Simmons, Nelson & Simonsohn (2011), "False-Positive Psychology", Psychological Science 22(11): 1359–1366 — the documented mechanism the judgment rests on', url: 'https://doi.org/10.1177/0956797611417632' },

  // ---- UAP (2.99b Part 3 — web-verified 2026-08-02, operator-confirmed;
  // archive captures triggered at seed time, ledger in PROJECT-STATE) ----
  { match: "U.S. Department of Defense, 'Statement by the Department of Defense on the Release of Historical Navy Videos' (April 27, 2020) — published at defense.gov, since migrated to the renamed department domain; archive-captured at seed time", url: 'https://www.war.gov/News/Releases/Release/Article/2165713/statement-by-the-department-of-defense-on-the-release-of-historical-navy-videos/' },
  { match: 'Naval Air Systems Command FOIA Reading Room — the three Navy videos (FLIR, GIMBAL, GOFAST) as officially posted', url: 'https://www.navair.navy.mil/foia/documents' },
  { match: 'Congress.gov, House Event 116282 (118th Congress) — hearing record with witness list and submitted documents; Grusch listed as Former National Reconnaissance Office Representative, UAP Task Force', url: 'https://www.congress.gov/event/118th-congress/house-event/116282' },
  { match: 'Official GPO transcript of the July 26, 2023 hearing (serial 53-022) — the sworn record', url: 'https://www.congress.gov/118/meeting/house/116282/documents/HHRG-118-GO06-Transcript-20230726.pdf' },
  { match: 'House Oversight Committee announcement, "National Security Subcommittee to Hold Hearing on Unidentified Anomalous Phenomena" — hearing title, date, and witnesses', url: 'https://oversight.house.gov/release/national-security-subcommittee-to-hold-hearing-on-unidentified-anomalous-phenomena%ef%bf%bc/' },
  { match: 'AARO, Historical Record Report Volume 1 (2024) — released at aaro.mil March 8, 2024; stable full-text capture at Wikimedia Commons cited as archive', url: 'https://commons.wikimedia.org/wiki/File:AARO_Historical_Record_Report_Volume_1_2024.pdf' },
  { match: 'AARO, Historical Record Report Volume 1 (2024): "AARO has no evidence for the USG reverse-engineering narrative provided by interviewees and has been able to disprove the majority of the interviewees\' claims"', url: 'https://commons.wikimedia.org/wiki/File:AARO_Historical_Record_Report_Volume_1_2024.pdf' },
  { match: 'AARO, Historical Record Report Volume 1 (2024): the alleged off-world metal sample assessed as ordinary and terrestrial', url: 'https://commons.wikimedia.org/wiki/File:AARO_Historical_Record_Report_Volume_1_2024.pdf' },
  { match: 'Public Law 117-263 (James M. Inhofe NDAA for FY2023, signed Dec 23, 2022), full text — §1673, "Unidentified anomalous phenomena reporting procedures"', url: 'https://www.congress.gov/117/plaws/publ263/PLAW-117publ263.pdf' },
  { match: 'GovInfo record for Public Law 117-263', url: 'https://www.govinfo.gov/app/details/PLAW-117publ263' },
  { match: 'AARO reporting form DD-3212, citing §1673(b)(1) — the provision in operation', url: 'https://www.aaro.mil/Portals/136/PDFs/UAP_Program_Report/DD_3212.pdf' },
  { match: 'Metabunk analysis threads (Mick West et al.) on FLIR1/Nimitz, GIMBAL, and GOFAST — metabunk.org threads t9190, t9333, t9569 (old-style ids; they redirect on the current forum)', url: 'https://www.metabunk.org' },
  { match: 'Vice, "The Skeptic\'s Guide to the Pentagon\'s UFO Videos"', url: 'https://www.vice.com/en/article/the-skeptics-guide-to-the-pentagons-ufo-videos/' }
];

// ---- AI Evaluation (2.99b-2 — web-verified 2026-08-09, operator-confirmed
// same day; ledger in truth-onion-ai-eval-topic-sources-verified.md; archive
// captures triggered at seed time, mandatory for the hash-based CDN PDFs,
// the living deprecations page, and the renamed-institute domain). Defined
// as ONE object the seed imports, so the seeded citation and the audit
// mapping are the same string structurally — a typo cannot silently drop a
// curator-verified chip.
export const AIEVAL_SOURCES = {
  a35Announce: {
    citation:
      'Anthropic, "Introducing computer use, a new Claude 3.5 Sonnet, and Claude 3.5 Haiku" (Oct 22, 2024): "improves performance on SWE-bench Verified from 33.4% to 49.0%"',
    url: 'https://www.anthropic.com/news/3-5-models-and-computer-use'
  },
  aisiJoint: {
    citation:
      'UK AI Security Institute and US AI Safety Institute, "Pre-deployment evaluation of Anthropic\'s upgraded Claude 3.5 Sonnet" (Nov 19, 2024) — joint government evaluation across cyber, biological, software, and safeguard domains; institute since renamed (Safety → Security); archive-captured at seed time',
    url: 'https://www.aisi.gov.uk/work/pre-deployment-evaluation-of-anthropics-upgraded-claude-3-5-sonnet'
  },
  gpt5Card: {
    citation:
      'OpenAI, "GPT-5 System Card" (Aug 7, 2025) — the third-party-evaluations section names METR (PDF opened and confirmed by the operator, 2026-08-09)',
    url: 'https://openai.com/index/gpt-5-system-card/'
  },
  metrGpt5: {
    citation:
      'METR, "Details about METR\'s evaluation of OpenAI GPT-5" (Aug 7, 2025) — pre-deployment access from July 10, 2025; measured 50%-success time horizon ≈ 2h17m (CI 1–4.5h), 80% horizon ≈ 25min (CI 8–65min)',
    url: 'https://metr.org/evaluations/gpt-5-report/'
  },
  gpt5Intro: {
    citation:
      'OpenAI, "Introducing GPT-5" (Aug 7, 2025) — reported scores: SWE-bench Verified 74.9%, AIME 2025 (no tools) 94.6%, MMMU 84.2%, GPQA (GPT-5 Pro) 88.4%',
    url: 'https://openai.com/index/introducing-gpt-5/'
  },
  raji2021: {
    citation:
      'Raji, Bender, Paullada, Denton & Hanna, "AI and the Everything in the Whole Wide World Benchmark", NeurIPS 2021 Datasets & Benchmarks — construct-validity critique of general-capability benchmarks',
    url: 'https://arxiv.org/abs/2111.15366'
  },
  eriksson2025: {
    citation:
      'Eriksson et al., "Can We Trust AI Benchmarks? An Interdisciplinary Review of Current Issues in AI Evaluation", arXiv:2502.06559 (v2, May 25, 2025 — version pinned) — ~100-study review: construct validity, contamination, benchmark gaming (a preprint; primary_doc is the closest honest fit, per the Carney precedent)',
    url: 'https://arxiv.org/abs/2502.06559'
  },
  opus4Card: {
    citation:
      'Anthropic, "System Card: Claude Opus 4 & Claude Sonnet 4" (May 2025), §§1.2.3, 4.1.1.2 — the developer\'s own record of its own evaluation; hash-based CDN URL, archive-captured at seed time; stable landing page anthropic.com/claude-4-system-card (operator-confirmed it points at this PDF)',
    url: 'https://www-cdn.anthropic.com/6be99a52cb68eb70eb9572b4cafad13df32ed995.pdf'
  },
  o1Card: {
    citation:
      'OpenAI, "OpenAI o1 System Card" (Dec 5, 2024) — the developer\'s own record; the 5%/99% figures therein are Apollo Research\'s, on pre-deployment access; CDN URL, archive-captured at seed time',
    url: 'https://cdn.openai.com/o1-system-card-20241205.pdf'
  },
  deprecations: {
    citation:
      'Anthropic, "Model deprecations" documentation (living page, accessed Aug 9, 2026) — row "January 5, 2026 | claude-3-opus-20240229"; archive-captured at seed time',
    url: 'https://platform.claude.com/docs/en/about-claude/model-deprecations'
  },
  claude3Card: {
    citation:
      'Anthropic, "The Claude 3 Model Family: Opus, Sonnet, Haiku" model card (March 2024), Table 1 — Claude 3 Opus: MMLU 86.8% (5-shot), GPQA Diamond 50.4% (0-shot CoT); hash-based CDN URL, archive-captured at seed time',
    url: 'https://www-cdn.anthropic.com/de8ba9b01c9ab7cbabf5c33b80b7bbc618857627/Model_Card_Claude_3.pdf'
  },
  gpt4GA: {
    citation:
      'OpenAI, "GPT-4 API general availability and deprecation of older models in the Completions API" (July 6, 2023): "Starting January 4, 2024, older completion models will no longer be available." (page since updated; the canonical deprecations table 403s automation — operator-checked in a browser, 2026-08-09)',
    url: 'https://openai.com/index/gpt-4-api-general-availability/'
  },
  kosinskiToM: {
    citation:
      'Kosinski, "Evaluating Large Language Models in Theory of Mind Tasks", arXiv:2302.02083 (v7, Nov 2024 — version pinned; published PNAS 2024): "GPT-3-davinci-003 (from November 2022) and ChatGPT-3.5-turbo (from March 2023) solved 20% of the tasks."',
    url: 'https://arxiv.org/abs/2302.02083'
  },
  sparks: {
    citation:
      'Bubeck et al. (Microsoft Research), "Sparks of Artificial General Intelligence: Early experiments with GPT-4", arXiv:2303.12712 (posted Mar 22, 2023) — never peer-reviewed; the paper\'s own hedge is part of the record',
    url: 'https://arxiv.org/abs/2303.12712'
  },
  mitchellKrakauer: {
    citation:
      'Mitchell & Krakauer, "The Debate Over Understanding in AI\'s Large Language Models", PNAS 120(13), 2023 — cited by DOI (pnas.org 403s automation; open access for humans; arXiv mirror 2210.13966 verified)',
    url: 'https://doi.org/10.1073/pnas.2215907120'
  },
  arkoudas: {
    citation:
      'Arkoudas, "GPT-4 Can\'t Reason", arXiv:2308.03762 (July 21, 2023) — self-published preprint, never peer-reviewed: "GPT-4 at present is utterly incapable of reasoning."',
    url: 'https://arxiv.org/abs/2308.03762'
  },
  othello: {
    citation:
      'Li, Hopkins, Bau, Viégas, Pfister & Wattenberg, "Emergent World Representations: Exploring a Sequence Model Trained on a Synthetic Task", arXiv:2210.13382 (v5; "ICLR 2023" reported, not fetch-verified — OpenReview CAPTCHA-walled): "evidence of an emergent nonlinear internal representation of the board state"',
    url: 'https://arxiv.org/abs/2210.13382'
  },
  benderKoller: {
    citation:
      'Bender & Koller, "Climbing towards NLU: On Meaning, Form, and Understanding in the Age of Data", ACL 2020 (open-access Anthology record): "a system trained only on form has a priori no way to learn meaning"',
    url: 'https://aclanthology.org/2020.acl-main.463/'
  },
  parrots: {
    citation:
      'Bender, Gebru, McMillan-Major & Shmitchell, "On the Dangers of Stochastic Parrots: Can Language Models Be Too Big?", ACM FAccT 2021 — cited by title and DOI only; no verbatim quote carried (the §6.1 passage was read by the operator off the ACM PDF and not transcribed; fourth author is a pseudonym in print, cited as printed)',
    url: 'https://doi.org/10.1145/3442188.3445922'
  },
  graceSurvey: {
    citation:
      'Grace, Stewart, Sandkühler, Thomas, Weinstein-Raun, Brauner & Korzekwa, "Thousands of AI Authors on the Future of AI", arXiv:2401.02843 (v3, Oct 8, 2025 — version pinned) — 2,778 AI researchers surveyed October 2023; abstract: 50% chance of unaided machines outperforming humans on every possible task by 2047 (10% by 2027)',
    url: 'https://arxiv.org/abs/2401.02843'
  },
  graceFraming: {
    citation:
      'Grace et al., "Thousands of AI Authors on the Future of AI", arXiv:2401.02843 (v3 — version pinned) — the survey itself: aggregate probabilistic forecasts with large question-framing effects the paper reports (the full-automation-of-occupations framing puts the 50% point "as late as 2116"), not a collective expectation of a date',
    url: 'https://arxiv.org/abs/2401.02843'
  },
  aiImpacts: {
    citation:
      'AI Impacts, "2023 Expert Survey on Progress in AI" results page (editable wiki) — used ONLY for per-question respondent counts (HLMI 1,714; FAOL 774); dates anchored to the arXiv paper',
    url: 'https://wiki.aiimpacts.org/ai_timelines/predictions_of_human-level_ai_timelines/ai_timeline_surveys/2023_expert_survey_on_progress_in_ai'
  },
  dutchDpa: {
    citation:
      'Autoriteit Persoonsgegevens, "Tax Administration fined for discriminatory and unlawful data processing" (announced December 2021 — the English page carries no explicit publication date; date element per the Dutch boetebesluit): "It used applicants\' nationality (Dutch/not Dutch) as an indicator in a system that automatically designated certain applications as risky."',
    url: 'https://www.autoriteitpersoonsgegevens.nl/en/current/tax-administration-fined-for-discriminatory-and-unlawful-data-processing'
  },
  garante: {
    citation:
      'Garante per la protezione dei dati personali, press release docweb 10085432 (Dec 20, 2024; docweb ID operator-confirmed) — €15M fine against OpenAI; OpenAI has announced an appeal, so the findings are the Garante\'s decision, not settled wrongdoing',
    url: 'https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10085432'
  },
  moffattCanlii: {
    citation:
      'Moffatt v. Air Canada, 2024 BCCRT 149 (Feb 14, 2024), B.C. Civil Resolution Tribunal — CanLII (robots-disallowed to automation; opened and read by the operator 2026-08-09, the order text read off the decision)',
    url: 'https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html'
  },
  moffattAba: {
    citation:
      'American Bar Association, Business Law Today, "BC Tribunal Confirms Companies Remain Liable for Information Provided by AI Chatbot" (Feb 2024), quoting the tribunal: "Air Canada still bore responsibility for all the information on its website, whether it came from a static page or a chatbot"',
    url: 'https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/'
  }
};
SOURCE_LINKS.push(
  ...Object.values(AIEVAL_SOURCES).map((s) => ({ match: s.citation, url: s.url }))
);

// 2.99b (UAP): offline-source labels — print books and film carry their
// full citations with an honest no-canonical-online-copy label instead of
// a URL, per the 2.98b rule.
export const PRINT_LABEL = ' [print source — no canonical online copy]';
export const FILM_LABEL = ' [print/film — offline citation]';
export const CLASS_LABEL_WORKS = ' [cited as a class of works — no single canonical copy]';

// Every label this audit may append — the lint test accepts a source as
// honestly labeled when its citation carries one of these.
export const HONEST_LABELS = [CLASS_LABEL, CLASS_LABEL_HISTORIES, CNV_LABEL, PRINT_LABEL, FILM_LABEL, CLASS_LABEL_WORKS];

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
