# Homepage Next Sunday Service — Phase 1

## Single source and identity configuration

`home-next-service-config.json` contains the **only application configuration** of the selected Google UID in `googleSeriesUid`. It identifies the established weekly Sunday series at St Michael & All Angels, Mickleham (Google RRULE `FREQ=WEEKLY;BYDAY=SU`). The existing `_sync/google-calendar.json` registry provides occurrence-to-website-ID mappings. Do not replace this with title/category/time inference or a list of service names.

If Alison recreates the series, review its Google identity, let the existing sync establish its mappings, update this one configuration value, and rebuild Dev. A missing configured recurring identity produces an empty projection/neutral card; a similar title never substitutes for it. The audited original UID is recorded in that configuration file, not duplicated in controllers or tests.

`build-home-next-service.js` runs immediately after `import-calendar.js` in the existing content build. It uses the **existing Google adapter and public feed**, not a new calendar or provider. It validates live series membership against accepted sync mappings and published `events.json` occurrences. Suppressed/missing/conflicted mappings, drafts, all-day entries, non-Sundays and inconsistent title/date/time rows are excluded. Source title/time equality is consistency checking, not eligibility inference. Website event IDs supply the existing stable Calendar destination. The short Mickleham location line is configured alongside the series identity.

`home-next-service-data.json` is generated output, not a separately maintained service list. It contains only the small published projection: ID, actual title/start/end and concise location. It has no Admin identity, credentials or sync internals. Google feed failure, invalid data or missing series produces `{version:1,items:[]}`. Builds still complete and the rest of the homepage works.

This is a static Pages projection of the last build, following the existing sync → repository → content build → Pages workflow. A missing/recreated upstream series is detected at the next build; the homepage makes no live Google/API request. Existing sync safety blocks can delay publication of changed calendar data. A visitor's clock cannot make cached source data live. There is no hidden fallback to inferred services.

## Selection and wording

The browser selects the earliest not-yet-started Sunday occurrence using **Europe/London** local time, independent of the visitor's time zone. TODAY applies on the occurrence's date. NEXT SUNDAY means the nearest future Sunday (including next week after today's service has started). Later Sundays use UPCOMING SERVICE. Displayed date, three-letter month, title and `h:mm am/pm` time come from the occurrence, not the page date. Selection refreshes at minute boundaries, and data is revalidated when the tab becomes visible. No fixed 10am rule.

The real projection includes Holy Communion on 25 October 2026 at 10:00 and Christingle on 6 December 2026 at **11:00**. The latter retains the original 10am recurrence identity but correctly displays the changed actual occurrence time. Independent Christingle events, Westhumble BCP, concerts, no-service notices, other one-offs and non-Sunday major services are outside Phase 1 unless they actually belong to the configured Sunday series and satisfy the publication checks. No AI classification, Admin checkbox, Calendar schema extension or API change.

## UI and fallback

The single semantic anchor replaces the two `.hero-actions` buttons immediately below the existing introductory copy. The heading, label and copy are unchanged. It uses a dark translucent panel, gold border, rose date, vertical divider, gold status, serif title and ivory location. No arrow/icon/image/extra button. It links to `calendar.html?event=<encoded id>`, which the existing Calendar opens directly. Fallback links to Calendar and reads JOIN US FOR WORSHIP / See our upcoming services, with no empty visible date.

Width is at most 470px. Normal heights are 108px desktop, 104px phone, 98px wider short landscape, and 136px for the narrower wrapped states. Fallback reserves the normal populated height before data arrives. Long titles wrap rather than truncate. Hover lifts 2px; reduced motion removes movement/transition; keyboard uses the existing gold outline. All date/title context is included in the anchor's accessible name.

At 601–900px with normal screen height, the taller panel would overlap the existing centred photo controls. The controls receive a 96px left offset **only in this layout**, keeping the card aligned to the unchanged hero copy. Images, focal points, carousel timing and interaction code are unchanged. The original 8s/1.4s four-photo carousel remains independent; only its regression script's old CTA-focus selector changes to focus the new card.

## Verification

`test/home-next-service.test.cjs` covers identity-only projection, missing identity/conflicts/pending sync, actual real 10am/11am occurrences, UK/DST dates, TODAY/NEXT SUNDAY/UPCOMING SERVICE, expiry, malformed data, long titles and stable destinations. Existing homepage foreground snapshot still protects the label/heading/copy and later sections while allowing this approved CTA replacement.

`scripts/check-home-next-service.cjs` checks 13 responsive sizes from 320px to 2560px, all four photographs, stationary card geometry, no horizontal overflow, no header/photo-control collisions, keyboard event-detail navigation, real future service dates (including 6 December), long title/missing location/no services/past data/network failure. SERVICE_BASE_URL selects live Dev for the same checks. The four-photo carousel regression remains in `scripts/check-home-hero-carousel.cjs`.

No new image assets, framework, public API, Admin changes, Azure settings or permissions. Incremental homepage cost is one small stylesheet, one small script and one local JSON fetch. Provider verification occurs at build time, not during visitor rendering.
