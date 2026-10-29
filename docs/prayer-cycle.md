# Automated recurring Cycle of Prayer — 29 October 2026

Starting Dev: `4fb164f1be8aa3a8023e36d21dfb85150b049533`. Main at start: `804a189ae8b09e8a88f4bb98947af0e9fcb34c30`. Dev only.

## Architecture audit and chosen reuse

The existing Calendar flow is Google adapter → durable Azure sync/registry → published `events.json` / existing content build → Pages. `home-next-service-config.json` already contains the single authorised main-Sunday Google series identity. `build-home-next-service.js` validates membership/publication/conflicts and creates the small `home-next-service-data.json` projection. None of these files/configurations, Calendar APIs or Azure functions is changed.

`home-next-service.js` already exports `localNow` (Europe/London) and `choose`, including its exact stable `calendar.html?event=<encoded id>` destination. The Cycle model reuses both; there is no title/keyword classification, new service list or copied Google UID. Loading this shared script on Prayer finds no homepage service card and therefore starts no homepage polling timer.

Calendar integration reads only the existing static main-service projection and `events.json`, with the existing no-cache/timeout style. It uses the shared selector anchored to midnight of the relevant London Sunday, then accepts an event link only if the selected occurrence is on that exact Sunday and matches an existing published, non-all-day Calendar event by ID/title/start/end. Stale, missing, cancelled or changed entries fail closed to “See the Calendar”. Source title equality checks consistency, not eligibility. The Calendar's existing event-detail dialog handles the destination unchanged.

## Sunday definition

Monday–Saturday means the nearest upcoming Sunday; Sunday means today for the **whole London-local day**. The homepage's next-service card rolls forward once a service starts; that is unsuitable for prayers still associated with today, so this feature deliberately keeps today's Sunday until London midnight. Main-service selection still reuses its established identity/selector, with a date-specific anchor, rather than adding a second definition of worship.

`HomeNextService.localNow` supplies the UK local date regardless of the visitor's zone. Date-only arithmetic uses the site's established UTC-noon pattern. Ordinal is `floor((day - 1) / 7) + 1`. No annual date table. The browser recalculates on a normal visit, back/forward pageshow and tab visibility return; no midnight interval, new Azure timer or recurring scheduler. A page left continuously visible is refreshed on the next visit/visibility return, as the brief permits.

## One maintained data source

`prayer-cycle.json`: `{version:1, entries:[{month, ordinalSunday, community, localCause, overseas}]}`. The key is the month/ordinal pair, not a historical date. Validation rejects duplicate/invalid positions, missing fields, control characters or oversized text. Future Admin can edit this same JSON and use the existing Prayer build trigger; no public calculation rewrite or new Admin editor is introduced now.

The build renderer generates the current display shell, a safely escaped inline JSON snapshot, and a full recurring view **from that one file**. Browser date selection reads this snapshot immediately, independently of any Calendar fetch. There are no handwritten duplicate intention lists or runtime PDF parsing. The separately derived migration fixture/report are audit evidence, not editable runtime sources. Safe JSON encoding and DOM textContent prevent source text from becoming executable markup.

`prayer-cycle-model.js` is the deterministic shared browser/Node calculation model. `prayer-cycle.js` is a small enhancement controller. `prayer-cycle-render.js` produces the server/static markup. `prayer-cycle.css` styles only the new Cycle component. Existing Prayer-page CSS, imagery, heading and approved green panel remain intact.

## Migration and gaps

31 historical entries migrated and checked against the complete rendered source PDF. Every historical date was independently verified as Sunday, its month and ordinal calculated, and all three text columns preserved. The automated PDF table extractor merged several white-background blocks; extraction was corrected using actual word-column/row coordinates and rechecked visually. One corrupt extracted apostrophe in “Mickleham & W’humble Horticultural Society” was repaired to match the visible source. No other names or organisations were modernised or invented.

The complete verification table is `docs/prayer-cycle-migration.md`; independent dated source fixture is `test/fixtures/prayer-cycle-source.json`.

- August: 4th Sunday only.
- September, November, January, February, March: 1st–4th Sundays.
- October and December: 1st–5th Sundays.
- April–July: no confirmed entries.
- Total: 31 confirmed positions / 29 unconfirmed out of the 60 possible month/ordinal combinations.

Missing state: **Our Cycle of Prayer for this Sunday is being prepared.** It includes a parish Contact link; Calendar remains available. No adjacent row is reused. Calendar failure never removes confirmed prayer intentions, because selection uses inline recurring data and London date calculation.

The example screenshot is not calendar data: 2 November 2026 is a Monday. On the delivery date, 29 October 2026, the actual upcoming Sunday is **1 November 2026**, November's first Sunday: **Cowslip Lane / St Michael's Community Nursery / Cambodia**. November's fourth-Sunday Byttom Hill row belongs to **22 November 2026**.

## Full recurring view and accessibility

The site already uses native `<details>/<summary>` for expandable history/source content. Reuse that pattern: one closed-by-default Full Cycle control, nested month expanders, then five Sunday positions per month. All 31 confirmed rows and all 29 explicit gaps are available without JavaScript. No obsolete dates are shown as current. Native keyboard/expanded semantics and focus on the summary require no custom modal focus trap, Escape handler or ARIA duplication. The Full Cycle is part of the same experience, not a second schedule.

One section H2, card-label H3, recurring-view H3 and Sunday H4 hierarchy; real text; hidden decorative SVG icons; visible focus; 44px summary/link controls; sufficient green/gold/ivory contrast; normal wrapping for long local-cause and region names. Three compact cards above 760px; stacked below. The service link moves below the heading on smaller screens. No introduced animation or transition. Data-driven text uses textContent; generated full-view copy is escaped.

## Obsolete PDF audit/removal

Supplied source and former public asset were byte-identical: SHA-256 `2d3336f4e2fd68a023eaedb99ed7eb598cb036cab4f3b3726975a71af6b1cded`, 136,657 bytes. The original supplied PDF is untouched. A verified copy is kept outside the public checkout at `cycle-source-audit/source-cycle-of-prayer-2023-4.pdf`, with extraction/render evidence.

After migration verification, `assets/documents/prayer/cycle-of-prayer-2023-4.pdf` was removed. Its Prayer archive block, legacy source fields, PDF CTA, two Admin Services links and document-index record were removed/replaced. Admin's existing Services shortcuts now lead to the recurring view and JSON source; no Admin form/API was added. Old technical Prayer redesign documentation is marked superseded. No unrelated PDF/resource is removed. Search's generated Prayer record is refreshed to remove obsolete archive wording; its code/other records are unchanged.

## Preservation and build

A focused preservation test compares the final Prayer page with the approved `4fb164f` baseline after stripping **only** the Cycle section and four dependency links. All remaining HTML is identical. Main-Sunday config and homepage/Calendar code are unchanged. The scoped existing Prayer build handles the new data, component and deletion paths and rebuilds Prayer plus its search projection, without refreshing unrelated Calendar/Home data. No Azure deployment or new cloud cost is required.

## Testing

Focused calculations/migration/preservation + Prayer + existing Next Service tests: 19 passed. Full regression and live results are recorded in the delivery report. Cases include all 31 mappings, every ordinal, unsupported positions/months, Sunday after service, Monday, month/year boundaries, leap years, 2032's fifth February Sunday, future years, London BST/GMT midnight, consistent/changed/cancelled/missing Calendar data, actual event URL, collapsed full view/all gaps, schema rejection and script escaping.

Cycle browser harness: `scripts/check-prayer-cycle.cjs`, 48 responsive cases per engine across three typography modes: 1920, 1536, 1440, 1280, 1024, 834, 768, 760, 600, 430, 393, 375, 360, 320 and 852×393/667×375 landscape. Fixed-date browser checks run in Pacific/Honolulu while the feature resolves London. They cover actual Calendar dialog navigation and Escape, Calendar outage, long source names, missing state, native full-cycle keyboard/focus behaviour and 200% text. Third-party font CSS is intentionally unavailable only during Calendar-failure scenarios after the normal-font matrix, to avoid unrelated font-network timing. No production test hooks or clock overrides are added.
