// SPDX-License-Identifier: AGPL-3.0-only
// Seeds the MKUltra onion. Everything here goes through the same service
// layer as the UI — if the seed content couldn't survive the rules, it
// wouldn't load.

import { createClaim, demoteClaim, challengeClaim, addSupport, addKernelLink } from './service.js';
import { applySourceLinks } from './sourcelinks.js';
import { seedUAP } from './seed-uap.js';
import { seedAIEval } from './seed-aieval.js';

export function isSeeded(db) {
  return !!db.prepare('SELECT 1 FROM topics LIMIT 1').get();
}

export function seed(db) {
  const mkultra = seedMKUltra(db);
  const cointelpro = seedCointelpro(db);
  // Cross-topic support link (Stage Two): the Church Committee's MKUltra
  // exposure and its COINTELPRO documentation are the same investigative
  // record — core supporting core, the legal direction, across topics.
  addSupport(db, mkultra.exposedId, cointelpro.existedId);
  // 2.99b Part 3: the fourth curated topic (operator-verified sources).
  const uap = seedUAP(db);
  // 2.99b-2: the fifth curated topic (operator-verified sources, all eight
  // claim shapes by operator decision 2026-08-09).
  const aieval = seedAIEval(db);
  // 2.98b C: canonical links / honesty labels for every seeded source —
  // verified once, applied from the single mapping in sourcelinks.js.
  applySourceLinks(db);
  return {
    topicId: mkultra.topicId,
    cointelproTopicId: cointelpro.topicId,
    uapTopicId: uap.topicId,
    aievalTopicId: aieval.topicId
  };
}

function seedMKUltra(db) {
  const { lastInsertRowid: topicId } = db
    .prepare('INSERT INTO topics (name, description) VALUES (?,?)')
    .run(
      'MKUltra',
      'CIA program of covert human experimentation (1953–c. 1973). Chosen as the seed topic because it has a rock-solid documented core and a real fringe of overreach — the full range of evidence tiers gets exercised.'
    );

  // ---- CORE: primary documents & court records, ≥2 each ----
  const cExisted = createClaim(db, {
    topic_id: topicId,
    text: 'Project MKUltra existed: a CIA program of covert experimentation on human subjects, run from 1953 into the early 1970s, approved under DCI Allen Dulles, directed by Sidney Gottlieb, with Richard Helms as its key internal sponsor.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'Established by primary government documents and sworn testimony (Church Committee, 1977 Senate hearings, surviving CIA financial records). Has survived public challenge continuously since 1975.',
    vertical: { direction: 'harm', magnitude: 3, evidenced: true },
    sources: [
      {
        tier: 'primary_doc',
        citation:
          'Church Committee, Final Report, Book I: Foreign and Military Intelligence (1976), "Testing and Use of Chemical and Biological Agents by the Intelligence Community"',
        url: 'https://www.intelligence.senate.gov/resources/intelligence-related-commissions',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation:
          'Joint Hearing before the Senate Select Committee on Intelligence and the Subcommittee on Health and Scientific Research, "Project MKULTRA, the CIA\'s Program of Research in Behavioral Modification" (Aug 3, 1977)',
        url: 'https://www.intelligence.senate.gov/sites/default/files/hearings/95mkultra.pdf',
        relation: 'supports'
      }
    ]
  }).id;

  const cExposed = createClaim(db, {
    topic_id: topicId,
    text: 'The Church Committee (1975–76) and the August 1977 Senate hearings publicly exposed MKUltra, after ~20,000 pages of misfiled financial records were located in 1977.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'The exposure is itself the primary record: committee reports and the published hearing transcript.',
    sources: [
      {
        tier: 'primary_doc',
        citation: 'Church Committee, Final Report, Book I (1976)',
        url: 'https://www.intelligence.senate.gov/resources/intelligence-related-commissions',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation: 'Senate Joint Hearing transcript, "Project MKULTRA" (Aug 3, 1977), incl. opening statement of Adm. Stansfield Turner',
        url: 'https://www.intelligence.senate.gov/sites/default/files/hearings/95mkultra.pdf',
        relation: 'supports'
      }
    ]
  }).id;

  const cDestroyed = createClaim(db, {
    topic_id: topicId,
    text: 'In January 1973, on the order of CIA Director Richard Helms, most MKUltra records were destroyed by the CIA.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'Acknowledged under oath by CIA leadership in the 1977 hearings and documented by the Church Committee.',
    sources: [
      {
        tier: 'primary_doc',
        citation: 'Testimony of Adm. Stansfield Turner and CIA officials, Senate Joint Hearing (Aug 3, 1977)',
        url: 'https://www.intelligence.senate.gov/sites/default/files/hearings/95mkultra.pdf',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation: 'Church Committee, Final Report, Book I (1976), on the 1973 destruction of MKULTRA files',
        relation: 'supports'
      }
    ]
  }).id;

  const cOlson = createClaim(db, {
    topic_id: topicId,
    text: 'Frank Olson, a U.S. Army scientist, was covertly dosed with LSD by CIA personnel in November 1953 and died nine days later in a fall from the Statler Hotel in New York. The government acknowledged the dosing; Congress compensated his family by private law in 1976.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'Documented by the Rockefeller Commission and settled by act of Congress — primary and legal records, not reporting.',
    vertical: { direction: 'harm', magnitude: 2, evidenced: true },
    sources: [
      {
        tier: 'primary_doc',
        citation: 'Report to the President by the Commission on CIA Activities within the United States (Rockefeller Commission, 1975)',
        url: 'https://www.fordlibrarymuseum.gov/library/document/0005/1561495.pdf',
        relation: 'supports'
      },
      {
        tier: 'court_record',
        citation: 'Private Law 94-126 (1976), compensating the family of Frank R. Olson',
        relation: 'supports'
      }
    ]
  }).id;

  // ---- INNER: well-supported, credible dispute remains ----
  const cScope = createClaim(db, {
    topic_id: topicId,
    text: 'Because of the 1973 destruction, the surviving financial records give an incomplete picture: the full scope and content of MKUltra\'s ~150 subprojects cannot be fully reconstructed.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      'The incompleteness is documented in the 1977 hearings; how much is missing, and what it contained, remains credibly disputed — well-supported, but not Core.',
    sources: [
      {
        tier: 'primary_doc',
        citation: 'Senate Joint Hearing (Aug 3, 1977): surviving records are financial files that "do not reveal the full range" of activities',
        url: 'https://www.intelligence.senate.gov/sites/default/files/hearings/95mkultra.pdf',
        relation: 'supports'
      },
      {
        tier: 'reputable_secondary',
        citation: 'John Marks, "The Search for the Manchurian Candidate" (1979), built on ~16,000 pages obtained via FOIA',
        relation: 'supports'
      }
    ]
  }).id;

  const cCameron = createClaim(db, {
    topic_id: topicId,
    text: 'Ewen Cameron\'s "psychic driving" and de-patterning experiments at Montreal\'s Allan Memorial Institute received MKUltra funding (Subproject 68) and left patients with lasting harm.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      'CIA funding and patient harm are documented (Orlikow settlement, surviving subproject records); the precise share of CIA versus Canadian government responsibility remains credibly disputed.',
    vertical: { direction: 'harm', magnitude: 2, evidenced: true },
    sources: [
      {
        tier: 'court_record',
        citation: 'Orlikow v. United States, 682 F. Supp. 77 (D.D.C. 1988); CIA settlement with eight Cameron patients',
        relation: 'supports'
      },
      {
        tier: 'reputable_secondary',
        citation: 'John Marks, "The Search for the Manchurian Candidate" (1979), ch. on Subproject 68',
        relation: 'supports'
      }
    ]
  }).id;

  // ---- MIDDLE: partial support, links missing ----
  const cKaczynski = createClaim(db, {
    topic_id: topicId,
    text: 'Ted Kaczynski\'s participation in Henry Murray\'s abusive psychological study at Harvard (1959–62) connects him to MKUltra.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'middle',
    placement_reason:
      'The Murray study and Kaczynski\'s participation are documented; the study\'s tie to MKUltra funding is circumstantial and has never been shown in primary records. Path inward: a surviving subproject financial record naming the Murray study.',
    sources: [
      {
        tier: 'reputable_secondary',
        citation: 'Alston Chase, "Harvard and the Making of the Unabomber", The Atlantic (June 2000)',
        url: 'https://www.theatlantic.com/magazine/archive/2000/06/harvard-and-the-making-of-the-unabomber/378239/',
        relation: 'supports'
      }
    ]
  }).id;

  // ---- Moral claim: real, attributable, and barred from Core by rule ----
  const cMoral = createClaim(db, {
    topic_id: topicId,
    text: 'Experimenting on unwitting human subjects, as MKUltra did, was a profound moral wrong.',
    kind: 'empirical',
    layer: 'moral',
    radial_tier: 'inner',
    placement_reason:
      'A value judgment resting on a documented factual record. Barred from Core by rule — moral claims never sit in the factual core — but the facts beneath it are Core-grade.',
    sources: [
      {
        tier: 'primary_doc',
        citation: 'Church Committee, Final Report, Book I (1976) — the documented record of unwitting testing',
        relation: 'supports'
      }
    ]
  }).id;

  // ---- OUTER: stated faithfully, never fortified ----
  const cContinues = createClaim(db, {
    topic_id: topicId,
    text: 'MKUltra never really ended — it continues today under other names.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason:
      'Stated faithfully. No primary documentation of continuation after the program\'s termination in the early 1970s; the only offered source is anonymous, which carries zero weight. The 1973 record destruction explains missing history — it is not evidence of a present-day program. Path inward: verifiable post-1973 documents showing continuation.',
    sources: [
      {
        tier: 'anonymous',
        citation: 'Anonymous online accounts claiming insider knowledge of continued programs',
        relation: 'supports'
      }
    ]
  }).id;

  const cFraming = createClaim(db, {
    topic_id: topicId,
    text: 'MKUltra proves the government still treats citizens as expendable test subjects.',
    kind: 'empirical',
    layer: 'framing',
    radial_tier: 'outer',
    placement_reason:
      'Framing claim: it converts a documented historical program into a present-tense characterization of intent. The historical facts are established; the present-tense "still treats" carries no evidence of its own.',
    sources: []
  }).id;

  // ---- OUTERMOST: the debunked fringe, stated faithfully, not fleshed out ----
  // Created at outer, then pushed out through the real debunker flow so the
  // challenge history is genuine.
  const cMindControl = createClaim(db, {
    topic_id: topicId,
    text: 'MKUltra evolved into a fully operational present-day system of total mind control over the population, via implants and electromagnetic weapons.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason:
      'Stated faithfully as its proponents state it; under review.',
    sources: [
      {
        tier: 'self_published',
        citation: 'Websites of proponents asserting their own targeting',
        relation: 'supports',
        is_claimant_self_published: true
      },
      {
        tier: 'primary_doc',
        citation:
          'Senate Joint Hearing (Aug 3, 1977): the documented program pursued and failed at reliable behavioral control; no evidence of any operational mind-control capability',
        url: 'https://www.intelligence.senate.gov/sites/default/files/hearings/95mkultra.pdf',
        relation: 'contradicts'
      }
    ]
  }).id;
  demoteClaim(db, cMindControl, {
    target_tier: 'outermost',
    type: 'contradicting_evidence',
    established_facts:
      'MKUltra existed (1953–early 1970s), experimented on unwitting subjects, was exposed by the Church Committee and 1977 hearings, and most of its records were destroyed in 1973.',
    reason:
      'The present-day total-mind-control remainder is checked and failed: its only supporting source is the claimant\'s own publication (zero weight by rule), and the primary record documents a program that could not achieve reliable behavioral control. Debunked — kept visible, not fleshed out.'
  });

  // Kernel links for the debunked claim (2.9b content, release 0a-i): the
  // fan of true cores the overreach leaps from. First authored against the
  // live DB via curl, which mangled the non-ASCII glyphs to U+FFFD; this is
  // the logged data correction to the seed — same content, correct encoding.
  addKernelLink(db, cMindControl, {
    kernel_id: cExisted,
    establishes:
      'A CIA program of covert experimentation on human subjects ran from 1953 to circa 1973 — the program\'s existence is documented beyond dispute.',
    asserts_beyond:
      'A fully operational present-day system of total mind control over the population — a live, working capability of a different order entirely.',
    path_inward:
      'any post-1973 primary record — document, budget line, or court record — evidencing an operational successor program'
  });
  addKernelLink(db, cMindControl, {
    kernel_id: cExposed,
    establishes:
      'The program was exposed and publicly documented: the Church Committee (1975–76) and the August 1977 Senate hearings.',
    asserts_beyond:
      'That what was exposed continued and matured into total mind control — the exposure record documents a terminated program and ends in 1977.',
    path_inward:
      'primary documentation of continuation after the exposure record ends; nothing in the 1975–77 record asserts a successor'
  });

  // ---- METAPHYSICAL: off the rings entirely ----
  createClaim(db, {
    topic_id: topicId,
    text: 'MKUltra was one battle in a spiritual war over humanity\'s souls.',
    kind: 'metaphysical',
    layer: 'framing',
    placement_reason:
      'Not resolvable by documents, observation, or data in either direction. Routed off the radial axis by rule — ranking it "weak" would secretly assert its negation as "strong".',
    sources: []
  });

  // ---- Support links (strong feeding weak — the allowed direction) ----
  addSupport(db, cDestroyed, cScope); // core → inner: destruction explains the gap
  addSupport(db, cExisted, cMoral); // core → inner: the record the judgment rests on

  // ---- Attempt history on the outer claim: examined, not just parked ----
  challengeClaim(db, cContinues, {
    type: 'contradicting_evidence',
    description:
      'Checked for verifiable post-1973 continuation documents (FOIA releases, budget lines, whistleblower records that survive scrutiny). None found; nothing new surfaced in either direction. Investigated and still unsupported — stays at outer.',
    outcome: 'rejected'
  });

  return { topicId, existedId: cExisted, exposedId: cExposed };
}

function seedCointelpro(db) {
  const { lastInsertRowid: topicId } = db
    .prepare('INSERT INTO topics (name, description) VALUES (?,?)')
    .run(
      'COINTELPRO',
      'FBI program (1956–1971) of covert surveillance, infiltration, and disruption of domestic political organizations. Companion topic to MKUltra: same declassification era, exposed by the 1971 Media, PA burglary and documented by the Church Committee.'
    );

  // ---- CORE ----
  const cExisted = createClaim(db, {
    topic_id: topicId,
    text: 'COINTELPRO existed: an FBI counterintelligence program (1956–1971) that covertly surveilled, infiltrated, and worked to disrupt and discredit domestic political organizations, from the Communist Party USA to civil-rights, Black-liberation, and New Left groups.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      "Established by the FBI's own released files and the Church Committee's investigation — primary government documents, publicly challenged and standing since 1971.",
    vertical: { direction: 'harm', magnitude: 3, evidenced: true },
    sources: [
      {
        tier: 'primary_doc',
        citation:
          'Church Committee, Final Report, Book II: Intelligence Activities and the Rights of Americans (1976)',
        url: 'https://www.intelligence.senate.gov/resources/intelligence-related-commissions',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation:
          'Church Committee, Final Report, Book III: Supplementary Detailed Staff Reports — "COINTELPRO: The FBI\'s Covert Action Programs Against American Citizens" (1976)',
        relation: 'supports'
      }
    ]
  }).id;

  const cMedia = createClaim(db, {
    topic_id: topicId,
    text: "The March 1971 burglary of the FBI's Media, Pennsylvania office by the Citizens' Commission to Investigate the FBI took internal files that, once passed to the press, first exposed COINTELPRO to the public.",
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'The stolen files are themselves the primary record; their authenticity was confirmed by the FBI and the subsequent investigations.',
    sources: [
      {
        tier: 'primary_doc',
        citation: 'The Media, PA FBI documents (March 1971), as published and later confirmed authentic',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation: 'Church Committee, Final Report, Book III (1976), account of the exposure and press publication',
        relation: 'supports'
      }
    ]
  }).id;

  const cKing = createClaim(db, {
    topic_id: topicId,
    text: 'The FBI targeted Martin Luther King Jr. with extensive surveillance and, in 1964, sent him an anonymous letter and tape urging him toward suicide.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      'Documented by the Church Committee from FBI files; the anonymous letter itself is in the released record.',
    vertical: { direction: 'harm', magnitude: 2, evidenced: true },
    sources: [
      {
        tier: 'primary_doc',
        citation:
          'Church Committee, Final Report, Book III (1976): "Dr. Martin Luther King, Jr., Case Study"',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation: 'The November 1964 anonymous FBI letter to Dr. King (released; National Archives)',
        relation: 'supports'
      }
    ]
  }).id;

  const cEnded = createClaim(db, {
    topic_id: topicId,
    text: 'J. Edgar Hoover formally terminated COINTELPRO in April 1971, weeks after the Media burglary put the program at risk of exposure.',
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'core',
    placement_reason:
      "Hoover's termination directive survives in the released files and is documented by the Church Committee.",
    sources: [
      {
        tier: 'primary_doc',
        citation: 'FBI memorandum terminating COINTELPRO operations (April 1971), released files',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation: 'Church Committee, Final Report, Book III (1976) on the April 1971 termination',
        relation: 'supports'
      }
    ]
  }).id;

  // ---- INNER ----
  const cHampton = createClaim(db, {
    topic_id: topicId,
    text: "The FBI's COINTELPRO campaign against the Black Panther Party contributed to the December 1969 police raid in which Chicago police killed Fred Hampton.",
    kind: 'historical',
    layer: 'factual',
    radial_tier: 'inner',
    placement_reason:
      "An FBI informant's floor plan and the Bureau's Panther operations are documented, and the families' civil suit ended in a substantial settlement; the precise degree of FBI direction of the raid itself remains credibly disputed — well-supported, not Core.",
    vertical: { direction: 'harm', magnitude: 2, evidenced: true },
    sources: [
      {
        tier: 'court_record',
        citation: 'Hampton v. Hanrahan, 600 F.2d 600 (7th Cir. 1979); 1982 settlement',
        relation: 'supports'
      },
      {
        tier: 'primary_doc',
        citation: 'Church Committee, Final Report, Book III (1976), FBI operations against the Black Panther Party',
        relation: 'supports'
      }
    ]
  }).id;

  // ---- MIDDLE ----
  createClaim(db, {
    topic_id: topicId,
    text: 'COINTELPRO-style FBI disruption was a decisive cause of the American Indian Movement\'s internal collapse in the mid-1970s.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'middle',
    placement_reason:
      'FBI activity around AIM and Pine Ridge is documented, but COINTELPRO formally ended in 1971 and the causal claim about AIM\'s collapse rests on inference from partial records. Path inward: released FBI files showing a directed disruption program against AIM comparable to the documented COINTELPRO operations.',
    sources: [
      {
        tier: 'reputable_secondary',
        citation: 'Investigative reporting and histories of the FBI\'s conflict with AIM at Pine Ridge (1973–76)',
        relation: 'supports'
      }
    ]
  });

  // ---- OUTER: faithful, weak, with a stated path inward ----
  createClaim(db, {
    topic_id: topicId,
    text: 'COINTELPRO never ended — domestic political policing continues today as the same program under new names.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason:
      'Stated faithfully. The program\'s 1971 termination is documented; later documented abuses (which are real) are not evidence that the same program continued. The only offered source is anonymous — zero weight. Path inward: verifiable post-1971 documents showing a successor program with the same charter and chain of command.',
    sources: [
      {
        tier: 'anonymous',
        citation: 'Anonymous accounts asserting the program secretly continued',
        relation: 'supports'
      }
    ]
  });

  // ---- OUTERMOST: debunked through the real flow ----
  const cAssassinations = createClaim(db, {
    topic_id: topicId,
    text: 'Every prominent activist death since 1968 was an FBI assassination carried out under COINTELPRO.',
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 'Stated faithfully as its proponents state it; under review.',
    sources: [
      {
        tier: 'self_published',
        citation: 'Websites of proponents asserting the universal-assassination claim',
        relation: 'supports',
        is_claimant_self_published: true
      },
      {
        tier: 'primary_doc',
        citation:
          'Church Committee, Final Report, Books II–III (1976): documents grave abuses, including lethal ones, and does not support a universal assassination program',
        relation: 'contradicts'
      }
    ]
  }).id;
  demoteClaim(db, cAssassinations, {
    target_tier: 'outermost',
    type: 'contradicting_evidence',
    established_facts:
      'COINTELPRO existed (1956–1971), targeted lawful domestic groups, and in documented cases contributed to deaths (e.g., Fred Hampton).',
    reason:
      'The universal version is checked and failed: its only support is the claimants\' own publications (zero weight), and the investigated record — which documents real abuses in detail — contradicts a program of universal assassination. Debunked; kept visible, not fleshed out.'
  });

  // Kernel links for the debunked claim (2.9b content, release 0a-i — see
  // the MKUltra note): the documented program and the one documented death
  // contribution the universal claim leaps from.
  addKernelLink(db, cAssassinations, {
    kernel_id: cExisted,
    establishes:
      'COINTELPRO existed (1956–1971): an FBI program that covertly surveilled, infiltrated, and disrupted domestic political organizations.',
    asserts_beyond:
      'Universal authorship of deaths — that every prominent activist death since 1968 was an FBI assassination, far past documented disruption.',
    path_inward:
      'case-by-case primary evidence tying each specific death to FBI operations; every death is its own evidentiary question'
  });
  addKernelLink(db, cAssassinations, {
    kernel_id: cHampton,
    establishes:
      'The FBI\'s COINTELPRO campaign against the Black Panther Party contributed to the December 1969 death of Fred Hampton — one documented case.',
    asserts_beyond:
      'Generalizing one documented contribution into FBI assassination of every prominent activist death since 1968.',
    path_inward:
      'the standard of evidence that documented the Hampton case, met separately for each further claimed death'
  });

  // ---- METAPHYSICAL ----
  createClaim(db, {
    topic_id: topicId,
    text: "COINTELPRO was the state's war on the nation's soul.",
    kind: 'metaphysical',
    layer: 'framing',
    placement_reason:
      'Not resolvable by documents or observation in either direction. Off the radial axis by rule.',
    sources: []
  });

  // Within-topic support: the Media burglary exposure supports the
  // documented-existence claim (core → core).
  addSupport(db, cMedia, cExisted);
  // The King and Hampton operations rest on the documented program (core → inner).
  addSupport(db, cExisted, cHampton);

  return { topicId, existedId: cExisted, kingId: cKing, endedId: cEnded };
}
