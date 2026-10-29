# Prayer page approved mock-up — Dev implementation, 29 October 2026

Starting Dev: `aa561eed2d183e90b281b6180bf5adff5f692509`. Main at start: `804a189ae8b09e8a88f4bb98947af0e9fcb34c30`. Dev-only scope.

## Content and architecture

Prayer remains generated from the existing Prayer entry in `content-pages.json`. A dedicated build-time `prayer-render.js` supplies the approved composition; `build-content-pages.js` loads it lazily only for Prayer, so isolated unrelated page builds need no Prayer module. It creates no browser script, API, form, inbox or prayer-submission mechanism.

The baseline Prayer source had a plain care/text hero, rather than the floral hero described in the brief. Its title, eyebrow and exact summary are retained; the existing shared floral/lily treatment (`atmosphere-3`) is applied through the existing explicit editorial configuration to match the approved target. Shared header/navigation/footer code and assets are unchanged. This is the only necessary reconciliation between the stated existing hero and the actual starting implementation.

The introductory title and text are preserved verbatim. Ask about prayer links to the existing Contact page; See the Calendar keeps its destination. Shared-prayer descriptions retain the current careful Compline/workshop wording without adding old schedules or claiming a new event. The green panel retains the existing pastoral explanation and presents three real-text options with restrained SVG icons. Contact and Individual prayer link to Contact. No request is sent during testing.

Exact Prayer Tree wording (supplied/current parish information):

> You can also leave a prayer request on our prayer tree when you visit St Michael's.

Contact option: “Share what you would like us to pray for. All requests are treated with care and confidentiality.” Individual option uses the approved welcome to speak with the priest or ask for someone to listen and pray. No additional old-site content or old conversations-with-God graphic is restored.

Cycle of Prayer keeps its explicit archive status: August 2023–March 2024 is **not a current schedule**. Existing PDF: `assets/documents/prayer/cycle-of-prayer-2023-4.pdf`. Personal prayer retains its Contact route. Bottom destinations remain Worship, Pastoral Care, Calendar and Contact.

## Supplied illustrative image

User-supplied approved generated illustration: `codex-clipboard-4ea238b2-41ec-4b42-9ac1-ce85a825b640.png`. Original 2048 × 2048, 4,767,913 bytes, SHA-256 `25f5c83478a22636687b98909ba0a36ed27b285b297e9510edacfb019044be8e`. A byte-identical source copy is preserved outside public Git/Pages in the task workspace at `prayer-originals/approved-prayer-illustration.png`; attachment untouched.

Sharp WebP quality 82, proportional resize, no upscaling, metadata stripped. No regeneration, retouching, scene alteration or fabricated parish attribution. Derivatives preserve the complete square source; CSS alone frames it at 3:2 desktop and 4:3 mobile with `object-fit:cover` and a balanced crop.

| Derivative in assets/images/prayer/ | Pixels | Bytes |
|---|---|---:|
| prayer-illustration-480.webp | 480 × 480 | 35,524 |
| prayer-illustration-800.webp | 800 × 800 | 75,550 |
| prayer-illustration-1200.webp | 1200 × 1200 | 128,948 |
| prayer-illustration-1600.webp | 1600 × 1600 | 193,932 |

Exact alt: **Hands clasped in prayer beside an open Bible and a lit candle.** No visible caption or generated-image label, as requested. No description identifies the interior, person or objects as belonging to St Michael's. The image is not added to the Parish Gallery or photo albums. It remains clearly documented as generated illustration in this technical provenance record.

Responsive srcset/sizes chooses an appropriate derivative: approximately 35.5KB at small 1× widths, 75.6KB for an 800px request, 129KB at 1200px and 194KB at the maximum. It never serves the 4.77MB original. Dimensions, aspect ratios and lazy loading reserve space. The floral hero reuses an existing shared asset. No additional runtime layout JavaScript or heavy player.

## Visual composition and responsive rules

Intro copy/actions beside the approved illustration; two horizontal shared-prayer cards; one dark-green panel with three separated options; restrained PDF archive card; compact Personal prayer row; four secondary gateways. Gold SVG hands, candle, envelope, heart, botanical branch and document symbols are hand-authored, hidden from assistive technology. No extra photographs or ornamental feature cards.

Intro stacks at 760px; shared cards stack at 760px. The green panel has three columns above 900px, one full-width option per row at 900px and below. Archive action moves below its copy at 1000px. Personal prayer stacks at 760px; related gateways become two columns at 900px. Minmax tracks, wrapping and normal document flow prevent overlap; no percentage-height direct-grid images, absolute text placement or animation.

Accessibility: one H1; H2 section / H3 option/card hierarchy; descriptive neutral image alt; real request text; accessible native Contact/Calendar/PDF/navigation links; 44px action targets; visible focus rings (light gold inside the green panel); sufficient paper/green text contrast; decorative SVGs hidden; reduced-motion browser coverage and no new animations.

## Preservation and deployment build

Only the Prayer content record changes in the shared JSON; all other page records are byte-equivalent as parsed data. Shared hero/typography build hooks gain optional selected-file CLI arguments; their normal all-page behavior is unchanged. The scoped Prayer CI branch generates Prayer and runs those hooks for `prayer.html` only. It validates that non-Prayer content records are unchanged before taking the narrow branch. This avoids even reordering Worship's stylesheet links. Search code and its index, homepage, Worship, Latest Service, Sunday Services, News, Calendar data, Bible, Feedback, Admin, History, Gallery and Life Events remain untouched.

A production build is exercised locally with unrelated generated outputs restored. PDF signature/link destinations, source escaping and unrelated-record preservation have focused tests. Existing editorial-hero tests are extended to include Prayer's newly authorised ninth route; their existing eight-route baselines remain intact.

## Verification plan/results

Focused Prayer/navigation/editorial/isolated About/Memorial builders: 17 passed. Full regression results and live publication are recorded in the delivery report. Browser checks use Edge, WebKit 18 and current WebKit, three typography options and 22 viewports each (198 cases local / 198 live): 1920×1080, 1600×1000, 1440×900, 1280×800, 1024×768, 1000×800, 901/900×800, 834×1112, 768×1024, 761/760×900, 320×568, 360×800, 375×667, 390×844, 393×852, 414×896, 430×932, 667×375, 852×393, 932×430. Includes 200% text, actual panel-option and image bounds, reading order, no overflow, native focus/Enter, all Contact/Calendar/gateway destinations and the real archived PDF signature.

Local preview's pre-existing module MIME limitation is handled only by the external QA server wrapper. Localhost-only Feedback CORS errors are recorded separately; no errors are suppressed on the live site. Production Feedback and preview code are unchanged. No physical iPhone is controlled; current/older WebKit and actual bounds are tested. Live desktop/tablet/mobile/short-landscape screenshots must be compared with the approved mock-up before completion.

## Superseded Cycle presentation

The static archive section described above was replaced by the automated recurring cycle after a verified 31-row migration. The old public PDF and its active links were removed; the supplied original and migration audit remain outside runtime use. See `prayer-cycle.md` and `prayer-cycle-migration.md`. The rest of this approved page is unchanged.
