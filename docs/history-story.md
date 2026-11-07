# Philippa Walton: publication evidence and reusable story pattern

Baseline Dev: d6a7cfa5f0e82277cb811d996cc02301150c9ea1. The earlier hub-only audit is superseded by this publication's external source review (26 October 2026).

The published entry remains in _content/history.json, sharing its identity across People & Families and Memorials. history-story-render.js adds a reusable static long-form renderer (hero, sourced narrative sections, facts, compact timeline, native details transcription, source list and related collections/people). build-history-hub.js uses its established history-entry-ID.html naming convention. Collections show only a story preview and CTA; no duplicate article. Existing period routes, clergy archive, Home, shared header/footer and APIs are unchanged. No new fonts, dependencies or browser JavaScript. Workflow recognizes story module, tests and generated history-entry outputs in its scoped History path. Draft removal uses existing owned-output cleanup.

## Evidence checked

- Original memorial photograph: preserved archival SHA256 b5f58364cd12563c43637acf587171ef83796416ab2fa1b4534c38434f887e04. Family description, John Bourchier M.D., London merchant William Walton, ten children/six sons and three daughters surviving, death date and inscription. Original 1200x1600 PNG remains excluded from Pages. Reuses committed WebPs 480x640 (66,378B),1200x1600 (316,258B); no new derivatives or image edits.
- https://www.royalgunpowdermills.com/philippawalton — Helen Hamlyn,24 August 2022,updated25 November2022: owner/manager after1711; London/Balham/Waltham sites; reduced demand1713;1719 acquisition;John25%1723,equal1730;active to1749. Brief business narrative is paraphrased; not copied from Wikipedia.
- https://www.gunpowdermills.com/history — Crown purchase1787; current site's broader history. It gives an earlier acquisition period than the dedicated biography; avoid making1702 an asserted milestone in the article.
- https://historicengland.org.uk/listing/the-list/list-entry/1028835 — independently identifies Mrs Phillipa Walton,d1749; shell features,swan-neckpediment; short quoted description of ashlar/marble rococo monument.
- https://searcharchives.bl.uk/catalog/040-002089770 — Add MS36182,f246,Philip Walton,Rector of Mickleham,1751–1753. This is catalogue metadata, not a transcription of manuscripts and not alone proof of parentage.
- https://collections.westminster.org.uk/index.php/walton-philip-d-1771 — GB-2014-WSA-17608,parentage William/Philippa,rectorship6Feb1744/5. The maternal grandfather is spelled Purchis there; monument independently says BOURCHIER,which the article follows. No unrelated portrait assigned.
- https://essex-lieutenancy.org.uk/special-projects/essex-womens-commemoration-project/ — official project's list includesPhilippa atWalthamAbbey.
- https://eastangliabylines.co.uk/lifestyle/history/objects-better-recognised-than-women/ — first-person account by project organiser Graham Watts,14Sep2023;plaque photograph verifies the five-word quoted description. No third-party photograph reproduced.

## Deliberate caution

Birth is approximate c1674. Retain monument wording "in the 74th Year of her Age" instead of claiming precisely aged74. Memorial spellsPHILLIPA; article usesPhilippa followingmuseum history. Transcription uses user's supplied text checked against source photograph:long-s rendered ass,raisedlettersbaseline,spacing/punctuationregularised with explicit reader note. No substantive wording discrepancy was found. Original typographic punctuation is not claimed to be a diplomatic facsimile.

Ipswich connection omitted: no independently inspected authoritative evidence beyond the supplied brief/Wikipedia trail. Exact1702 takeover and2022 plaque-unveiling year omitted from narrative rather than resolve source/access gaps by guessing. Plaque itself andproject confirmed independently. Do not inferher thoughts,monument commissioner,authenticatedportrait,manualmanufacturing work or exactgraveposition. "Interred near this Place" retained as inscription,not turned into an unverified location claim.

Philip relationship is evidenceVerified but not linked to a personal clergyID: no published Philip entry exists. Canonical relatedPeople metadata holds the evidence and pendingtarget; public link goes to the working ThoseWhoHaveServed archive. Future activation requires verified=true and a real publishedclergyrecord. Unverified relationships without evidenceVerified are never rendered. New paragraphs and timeline items require known referenced sources; unsafe source URLs fail validation. Text escaped.
