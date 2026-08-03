// The UAP topic (2.99b Part 3) — the fourth curated topic, seeded through
// the SAME service layer as everything else: if this content couldn't
// survive the rules, it wouldn't load.
//
// Sources: located and web-verified 2026-08-02 (PM instance live search),
// operator-confirmed for seeding ("here is everything verified — proceed").
// Division of labor honored: every URL below comes from the operator's
// verified ledger; nothing here was invented by the build. Print/film
// sources carry offline labels in the citation (2.98b honesty pattern).
//
// Discipline, applied without exception:
// - THE SPLIT-CLAIM RULE: "X testified that Y" and "Y is true" are two
//   claims in two universes. Sworn testimony is Core-grade evidence that
//   the testimony occurred and near-zero for its content absent artifacts
//   — which is why the GPO transcript sources the hearing claim ONLY, and
//   the program claim receives a zero-weight support LINK from it instead
//   of a weight-carrying source (taxonomy strain #8, logged).
// - Rule-11 pass: David Grusch appears only in testimony-occurred forms;
//   Paul Bennewitz (d. 2003) is historical; no other living person named.
// - The recast pair (claims 10→11) exercises recast_of end to end.
// - Claim 9 (the debunked specific) is the metal-sample claim, BUILT FROM
//   THE VERIFIED AARO MATERIAL and flagged for operator swap: the ledger
//   left the specific selection operator-led, and this is the one whose
//   contradicting primary record is already verified in hand.

import { createClaim, demoteClaim, addSupport, addKernelLink } from './service.js';

export function seedUAP(db, { actor } = {}) {
  const { lastInsertRowid: topicId } = db
    .prepare('INSERT INTO topics (name, description) VALUES (?,?)')
    .run(
      'UAP: Disclosure, Evidence, and Overreach',
      'Government UAP disclosure — releases, hearings, and reports — and the claims built on them. Chosen because the genre splits testimony from content, releases from depictions, and documented disinformation from the phenomena it imitated: the full range of evidence tiers, under live national attention.'
    );

  // ---- CORE: primary documents and congressional records ----
  const cRelease = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'In April 2020 the Department of Defense officially released three Navy videos — FLIR (recorded November 2004), GIMBAL and GOFAST (recorded January 2015) — depicting unidentified aerial phenomena, after prior unauthorized circulation in 2007 and 2017.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      "Established by the department's own release statement and the officially posted files — primary government documents. The release statement says it was issued to clear up misconceptions about the videos' authenticity and characterizes the phenomena only as 'unidentified.' The release proves the release; what the footage depicts is a separate question (see the disputed-analyses claim).",
    sources: [
      {
        tier: 'primary_doc',
        citation:
          "U.S. Department of Defense, 'Statement by the Department of Defense on the Release of Historical Navy Videos' (April 27, 2020) — published at defense.gov, since migrated to the renamed department domain; archive-captured at seed time",
        url: 'https://www.war.gov/News/Releases/Release/Article/2165713/statement-by-the-department-of-defense-on-the-release-of-historical-navy-videos/',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation:
          'Naval Air Systems Command FOIA Reading Room — the three Navy videos (FLIR, GIMBAL, GOFAST) as officially posted',
        url: 'https://www.navair.navy.mil/foia/documents',
        relation: 'supports'
      }
    ]
  }).id;

  const cHearing = createClaim(db, {
    topic_id: topicId,
    actor,
    text: "On July 26, 2023 the House Oversight Committee's national security subcommittee held a public hearing on unidentified anomalous phenomena at which David Grusch testified under oath that the United States operates a multi-decade UAP crash-retrieval and reverse-engineering program.",
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'The congressional event record and the GPO transcript are the primary record that the hearing occurred and that this testimony was given under oath. Sworn testimony is Core-grade evidence that the testimony occurred and near-zero evidence for its content absent inspectable artifacts — the program claim is its own claim, placed on its own evidence.',
    sources: [
      {
        tier: 'primary_doc',
        citation:
          'Congress.gov, House Event 116282 (118th Congress) — hearing record with witness list and submitted documents; Grusch listed as Former National Reconnaissance Office Representative, UAP Task Force',
        url: 'https://www.congress.gov/event/118th-congress/house-event/116282',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation: 'Official GPO transcript of the July 26, 2023 hearing (serial 53-022) — the sworn record',
        url: 'https://www.congress.gov/118/meeting/house/116282/documents/HHRG-118-GO06-Transcript-20230726.pdf',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation:
          'House Oversight Committee announcement, "National Security Subcommittee to Hold Hearing on Unidentified Anomalous Phenomena" — hearing title, date, and witnesses',
        url: 'https://oversight.house.gov/release/national-security-subcommittee-to-hold-hearing-on-unidentified-anomalous-phenomena%ef%bf%bc/',
        relation: 'supports'
      }
    ]
  }).id;

  const cAaro = createClaim(db, {
    topic_id: topicId,
    actor,
    text: "AARO's 2024 Historical Record Report Volume 1 states that AARO found no verifiable evidence that any UAP sighting represented extraterrestrial technology, no evidence for the alleged government reverse-engineering program, and that the alleged off-world metal sample it examined is ordinary and terrestrial.",
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      "A claim about WHAT THE REPORT STATES, established by the report itself — a primary government document released to the public March 8, 2024 at aaro.mil. As the record of its own contents the document is definitive, yet the Core floor requires TWO independent primary documents and admits no carve-out for self-describing records — so this sits at inner on one primary (a recorded taxonomy strain: the rules refused the build's own Core placement here, and the refusal stands). Path inward: a second independent primary record, e.g. the department's release announcement. The cover carries its DOPSR stamp — 'CLEARED For Open Publication Mar 06, 2024' — clearance for release, not review as true (also a recorded strain).",
    sources: [
      {
        tier: 'primary_doc',
        citation:
          'AARO, Historical Record Report Volume 1 (2024) — released at aaro.mil March 8, 2024; stable full-text capture at Wikimedia Commons cited as archive',
        url: 'https://commons.wikimedia.org/wiki/File:AARO_Historical_Record_Report_Volume_1_2024.pdf',
        relation: 'supports'
      }
    ]
  }).id;

  const cNdaa = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'The FY2023 National Defense Authorization Act (Public Law 117-263) established unidentified anomalous phenomena reporting procedures (§1673) and a protected authorized-disclosure channel for UAP-related whistleblowers, codified at 50 U.S.C. §3373b.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      "The public law's own text — §1673 appears in the law's table of sections — and the government's DD-3212 reporting form cites §1673(b)(1): the provision in operation. Anchored on FY2023, which is fully verified; the FY2024 NARA records provision is deliberately not asserted here.",
    sources: [
      {
        tier: 'primary_doc',
        citation: 'Public Law 117-263 (James M. Inhofe NDAA for FY2023, signed Dec 23, 2022), full text — §1673, "Unidentified anomalous phenomena reporting procedures"',
        url: 'https://www.congress.gov/117/plaws/publ263/PLAW-117publ263.pdf',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation: 'GovInfo record for Public Law 117-263',
        url: 'https://www.govinfo.gov/app/details/PLAW-117publ263',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation: 'AARO reporting form DD-3212, citing §1673(b)(1) — the provision in operation',
        url: 'https://www.aaro.mil/Portals/136/PDFs/UAP_Program_Report/DD_3212.pdf',
        relation: 'supports'
      }
    ]
  }).id;

  // ---- MIDDLE: the propaganda counter-layer, and disputed analyses ----
  const cBennewitz = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'In the 1980s U.S. Air Force personnel fed fabricated UFO material to civilian Paul Bennewitz — a documented disinformation operation against an American civilian.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'middle',
    placement_reason:
      "Documented through reputable secondary accounts and participant admissions (Richard Doty's on-record statements in the Mirage Men film); no released government primary document confirms the operation as such. That evidentiary shape earns middle — reputable secondary, no primary. Path inward: released Air Force records of the operation.",
    sources: [
      {
        tier: 'reputable_secondary',
        citation:
          'Greg Bishop, "Project Beta: The Story of Paul Bennewitz, National Security, and the Creation of a Modern UFO Myth" (Paraview Pocket Books, 2005) [print source — no canonical online copy]',
        relation: 'supports'
      },
      {
        tier: 'reputable_secondary',
        citation:
          'Mark Pilkington, "Mirage Men" (2010, book) and "Mirage Men" (2013 documentary, dir. Denham/Kypourgos/Pilkington) — the documentary carries Richard Doty\'s on-camera statements [print/film — offline citation]',
        relation: 'supports'
      },
      {
        tier: 'reputable_secondary',
        citation:
          'Adam Gorightly, "Saucers, Spooks and Kooks: UFO Disinformation in the Age of Aquarius" (2021) [print source — no canonical online copy]',
        relation: 'supports'
      }
    ]
  }).id;

  const cAnalyses = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Independent technical analyses dispute that the three released Navy videos show phenomena beyond conventional explanation, offering parallax, engine glare, and sensor or gimbal artifacts as candidate explanations.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'middle',
    placement_reason:
      'Presented as dispute, not resolution. The analyses are methodical and reproducible but published on forum/self-published venues, with a reputable-secondary summary attached — that mix earns middle. The venue-versus-method tension is a recorded taxonomy strain, logged not solved.',
    sources: [
      {
        tier: 'self_published',
        citation:
          'Metabunk analysis threads (Mick West et al.) on FLIR1/Nimitz, GIMBAL, and GOFAST — metabunk.org threads t9190, t9333, t9569 (old-style ids; they redirect on the current forum)',
        url: 'https://www.metabunk.org',
        relation: 'supports'
      },
      {
        tier: 'reputable_secondary',
        citation: 'Vice, "The Skeptic\'s Guide to the Pentagon\'s UFO Videos"',
        url: 'https://www.vice.com/en/article/the-skeptics-guide-to-the-pentagons-ufo-videos/',
        relation: 'supports'
      }
    ]
  }).id;

  // ---- OUTER: stated faithfully, path inward explicit ----
  const cProgram = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'The United States operates a multi-decade UAP crash-retrieval and reverse-engineering program.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason:
      "Stated faithfully. Its principal support is sworn testimony — Core-grade evidence that the testimony occurred (the hearing claim, linked below), near-zero for its content absent inspectable artifacts; the transcript therefore sources the hearing claim, not this one. AARO's Historical Record Report states it found no evidence for the reverse-engineering narrative (attached as contradicting). Path inward: released artifacts, or corroborating documents that can be inspected.",
    sources: [
      {
        tier: 'primary_doc',
        citation:
          'AARO, Historical Record Report Volume 1 (2024): "AARO has no evidence for the USG reverse-engineering narrative provided by interviewees and has been able to disprove the majority of the interviewees\' claims"',
        url: 'https://commons.wikimedia.org/wiki/File:AARO_Historical_Record_Report_Volume_1_2024.pdf',
        relation: 'contradicts'
      }
    ]
  }).id;

  const cDisinfoNow = createClaim(db, {
    topic_id: topicId,
    actor,
    text: "The government's released UAP materials are a controlled disinformation operation.",
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason:
      'Stated faithfully. The documented Bennewitz operation (linked below) establishes that the CLASS of government UFO disinformation against civilians is real; the class being real is not evidence that this instance is — this claim currently sits on no evidence of its own. Path inward: documents showing the specific releases were directed disinformation.',
    sources: []
  }).id;

  // ---- OUTERMOST: the debunked specific, through the real debunker flow.
  // OPERATOR-SWAPPABLE SELECTION: the ledger left the specific choice
  // operator-led; this one is built entirely from the verified AARO
  // material (its contradicting primary record is already in hand).
  const cSample = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'The metal sample recovered from an alleged UAP crash and examined by AARO is extraterrestrial technology whose properties cannot be explained by terrestrial manufacture.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 'Stated faithfully as its proponents state it; under review.',
    sources: [
      {
        tier: 'self_published',
        citation:
          "Websites and programs of proponents asserting the sample's off-world origin [cited as a class of postings — no single canonical copy exists]",
        relation: 'supports',
        is_claimant_self_published: true
      },
      {
        tier: 'primary_doc',
        citation:
          'AARO, Historical Record Report Volume 1 (2024): the alleged off-world metal sample assessed as ordinary and terrestrial',
        url: 'https://commons.wikimedia.org/wiki/File:AARO_Historical_Record_Report_Volume_1_2024.pdf',
        relation: 'contradicts'
      }
    ]
  }).id;
  demoteClaim(db, cSample, {
    actor,
    target_tier: 'outermost',
    type: 'contradicting_evidence',
    established_facts:
      'A metal sample alleged to be off-world was submitted to and examined by AARO; the 2024 Historical Record Report states its assessment: ordinary and terrestrial.',
    reason:
      "The off-world remainder is checked and failed: its only supporting source is the claimants' own publications (zero weight by rule), and the primary record of the examination states the sample is ordinary and terrestrial. Debunked — kept visible, not fleshed out."
  });
  addKernelLink(db, cSample, {
    actor,
    kernel_id: cAaro,
    establishes:
      "A metal sample alleged to be off-world was submitted to and examined by AARO, whose 2024 report states its assessment: ordinary and terrestrial.",
    asserts_beyond:
      'That the sample is extraterrestrial technology beyond terrestrial manufacture — the opposite of the examination record, with no inspectable analysis behind it.',
    path_inward:
      "independent, inspectable materials analysis contradicting AARO's assessment — reproducible data, not assertion"
  });

  // ---- OFF-AXIS + the recast pair (exercises recast_of end to end) ----
  const cSpiritual = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'Non-human intelligences exist as supernatural or spiritual beings.',
    kind: 'metaphysical',
    layer: 'framing',
    placement_reason:
      'Not resolvable by documents, observation, or data in either direction. Routed off the radial axis by rule — ranking it weak would covertly assert its negation as strong. The attributed position, rendered with this explanation, never ranked.',
    sources: []
  }).id;

  const cRecast = createClaim(db, {
    topic_id: topicId,
    actor,
    text: 'The beings described in religious texts as angels and demons were extraterrestrial visitors.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'outer',
    recast_of: cSpiritual,
    placement_reason:
      'Stated faithfully — the empirical-historical recast of the off-axis position, deliberately written to be evidence-eligible, and answerable to the evidence axis alone. Its evidence: none carrying weight. Path inward: physical or documentary evidence tying specific textual descriptions to non-human technology. It cannot borrow the retrieval-program claim\'s standing — outer cannot feed inner, on exactly the chain a disclosure narrative wants to build.',
    sources: [
      {
        tier: 'self_published',
        citation:
          'Ancient-astronaut literature and programs asserting the identification [cited as a class of works — no single canonical copy]',
        relation: 'supports',
        is_claimant_self_published: true
      }
    ]
  }).id;

  // ---- Support links: the honest connective tissue (zero tier weight) ----
  // The hearing claim supports the program claim — the testimony-occurred
  // record IS the program claim's provenance, linked rather than sourced
  // (the split-claim rule made mechanical; strain #8).
  addSupport(db, cHearing, cProgram, { actor });
  // The documented Bennewitz class supports the present-day instance claim
  // (middle → outer: strong feeding weak, the allowed direction).
  addSupport(db, cBennewitz, cDisinfoNow, { actor });
  // The disclosure chain the recast wants: program (outer) → recast
  // (outer). Legal at equal rank — and exactly the chain outer-cannot-
  // feed-inner blocks the moment either tries to move inward (pinned).
  addSupport(db, cProgram, cRecast, { actor });

  return { topicId, releaseId: cRelease, hearingId: cHearing, aaroId: cAaro, programId: cProgram, sampleId: cSample, spiritualId: cSpiritual, recastId: cRecast };
}
