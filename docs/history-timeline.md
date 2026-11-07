# Seven-period timeline upgrade — 27 October 2026

Starting Dev: `7ed48653365b2fdbd024174c5565f2116585e478`.
Starting main (read from GitHub): `804a189ae8b09e8a88f4bb98947af0e9fcb34c30`.
Work is confined to Dev. No standalone Saxon/Norman page was created.

## Audit and content decisions

The existing timeline is generated from `_content/history.json`. Its seven retained
period pages supply the dialog. Previously the dialog extracted only direct paragraph
text, dropping links and preventing editorial components. It now imports a small
allowlist of text markup, safe links, lists, quotations and source disclosures. Scripts,
event attributes, embeds and arbitrary classes are not imported. Native modal dialog,
background inertness, abort handling, load-error fallback, scroll lock and focus return
are retained. One fixed 44px close button serves every story. Keyboard cycling now
includes summaries and excludes links within closed disclosures.

The hero, clergy feature and four story cards remain in their exact positions. The
Philippa article and collection pages change only their History CSS cache key. No
shared JavaScript or other page content is part of this release. Historical preservation
tests were narrowed only where they previously prohibited the authorised timeline
changes; replacement tests compare unrelated content to the starting Dev revision.

Read-only project reference: `outputs/saxon-norman-prototype/History-source.pdf`,
the supplied parish History printout. It agrees with the live parish history below.
No synced source files were edited. The existing church album metadata was audited:
its interior photographs show stained glass and wooden figures, not a clearly
identified close-up of these Norman features. No image was added to the modals.

| Period | Evidence and decision |
| --- | --- |
| Early history | [Historic England, entry 1028835](https://historicengland.org.uk/listing/the-list/list-entry/1028835) identifies C10 origins and calls the west doorway probably C10. Use 10th-century origins; retain probably for the doorway. The parish account's c.950 is explicitly an interpretation, not a proven foundation date. No Edgar attribution or alleged dated plaster is asserted. |
| Domesday | The supplied parish account and [Sue Tatham's article, reprinted in the Local History Group 2018 newsletter](https://www.micklehamwesthumblehistory.co.uk/shared/attachments.asp?f=32c38d8f-def5-4649-8b85-15a18f9719a2.pdf&o=M%26WLHG-Newsletter-2018.pdf) reproduce the church/meadow entry. Quote only the short 11-word English wording from the parish source; label it a rendering rather than a direct transcription of the manuscript. Open Domesday could not be accessed, so no independent manuscript consultation is claimed. Presence by 1086 does not establish foundation date or appearance. |
| Norman work | Historic England supports late C12 fabric, Norman arch raised in 1872 and Norman font. Use late C12 rather than c.1180. Explain font and arch details. The listing distinguishes three C19 east lancets; do not claim all lancets are original C12. Avoid Caen comparisons, construction-date certainty and unsupported visitor directions. |
| Norbury | Historic England supports c.1300 chapel, chequered flint/stone and chest tomb/brass monument. Parish account supports mercer, wife and subsequent Stydolf/Lock use. Historic England gives 1514; [British Library Add MS 32490 KK, f.15](https://searcharchives.bl.uk/catalog/040-002026504) dates the Wyddowsoun brass record 1513. Use early 16th century, explain source disagreement, omit exact year and unreliable regnal conversion. No Great Fire panelling or stolen helmet story added. |
| Restoration | Historic England corroborates Robinson in 1823, new north aisle and extensive rebuilding in 1872, and arch raising. 1842 and 1891 come from the parish account and are explicitly attributed/qualified. Do not repeat the potentially misleading unqualified claim that the north aisle was simply dismantled in 1891. |
| Bells | [Parish history](https://www.micklehamchurch.org.uk/history.htm) records four larger bells, ring of six, Dame Elizabeth Lawrence, memorial to her husband Sir James Lawrence and 1913. Retain with explicit attribution; no independent bell inscription or donor archive inspected. Same source supplies film credits, Heritage Weekend 11 September 2010, Mark Day, John Wynn and Martin Cox. YouTube oEmbed returned HTTP 200, title The Bells Of Mickleham, author coxwalker, for [the recorded film](https://www.youtube.com/watch?v=9eNFCR04xWE). Add a normal watch link, no iframe/autoplay. Credits are attributed to parish record, not independently inferred from video content. |
| Today | Two short paragraphs and Worship link connect the history to present parish life. No newly asserted service times. |

Historic England's listed text is available under OGL v3.0; the public source links
provide attribution. No third-party photographs or full historical texts are copied.

## Validation

- Full `npm run build` completed. Unrelated generated output excluded from release;
  CI history-only build rule extended for the dialog, tests and this report so it will
  not refresh unrelated date-sensitive content.
- Focused history plus preservation checks: 20/20 passed.
- Full `node --test`: baseline 595 tests, 580 pass, 15 fail; final 597 tests,
  582 pass, 15 fail. Existing suite has in-place generator side effects and historical
  snapshot assertions; failures outside this change vary with build state. In the final
  run the unrelated internal-header cache test names `news/a-harvest-of-thankfulness.html`;
  initial run instead failed Find Us generation. Neither file is changed here.
- Existing failures cover Our Team, calendar migration (three), news preview, clergy
  search, footer preservation, homepage preservation/artwork, verse dates, Harvest album
  counts and script-version snapshots. Full logs retained in the project delivery files.
- Browser checks at 1600×1000, 834×1112, 390×844, 320×568, 874×402 and 667×375:
  all seven correct stories; mouse/keyboard activation; focus containment in both
  directions; Escape, button and backdrop close; focus return; source expansion and
  keyboard links; locked page scrolling; reachable 44px close button; no horizontal
  overflow; no page errors. No-JS fallback and failed-load/reopen also passed.
- Screenshots saved for page and editorial modals at each width; phone and short
  landscape reviewed. Global-control and deployment results are in the final delivery.

The full regression suite is not green. Its existing failures are not silently waived
or fixed by unrelated changes in this release.
