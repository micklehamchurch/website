# Public News hub: content audit and publishing

Dev baseline:9bfcffb159b715741c3f22b3598c7b16be65dc6a. Main is not modified. Home is deliberately not connected to the new feed.

## Real content audit

_content/news.json contains one genuine published story and six explicitly demo/draft samples. Only the genuine story qualifies. The existing news/ directory has its generated article; news-stories.html remains a compatibility redirect. The mock-up’s Choral Evensong and friendship/service stories have no published web-news records and are not reproduced. Its Harvest date/title are not copied: authoritative metadata says A Harvest of Thankfulness,4October2026.

_content/publications.json contains five published Pews News PDF records (27September,4/10/18/25October) and one October2026 Parish Magazine PDF. Only18 and25October have prepared, valid web-edition source and generated HTML in the existing Pews News architecture. The other three Pews PDFs and Parish Magazine remain publication resources, not invented web articles. Existing source fields agree for the selected items; there is no need to guess dates/categories.

| Feed order | Exact item | Date | URL | Summary source | Image source |
|---|---|---|---|---|---|
| 1 | Pews News — 25 October 2026 | 2026-10-25 | pews-news/2026-10-25.html | _content/publications.json description | No suitable existing edition thumbnail; decorative document treatment, not a photograph or claimed PDF facsimile |
| 2 | Pews News — 18 October 2026 | 2026-10-18 | pews-news/2026-10-18.html | _content/pews-news/2026-10-18.json subtitle (publication description is empty) | No suitable existing edition thumbnail; decorative document treatment, not a photograph or claimed PDF facsimile |
| 3 | A Harvest of Thankfulness | 2026-10-04 | news/a-harvest-of-thankfulness.html | _content/news.json excerpt | _content/news-media.json cover; existing genuine Harvest entrance photo |

Story title/date/excerpt/slug come from _content/news.json. Optional approved cover data (src/small/dimensions/alt) comes from _content/news-media.json, otherwise the existing article image/imageAlt pair. Publication title/date/description/type come from _content/publications.json through the existing publications-model validator. Edition availability is the generated pews-news-data.json projection plus actual source/HTML; no PDF-only record becomes a fake web destination. Missing Pews summaries use that edition’s existing subtitle. No bodies or Zoom/contact data are copied into the feed.

## Reusable architecture

news-feed-model.js is a pure CommonJS/browser-compatible projection, selector and escaped renderer. build-news-hub.js reads the existing sources after their normal generators run, produces news-feed.json and server-rendered news.html, and embeds the same projection as safe non-executable JSON for filters. No second editable news list or public PDF parser exists. Date sorting is ISO date descending, then stable identity; featured does not override order. Existing published/non-demo/non-expired story eligibility is preserved. A published Pews record also needs an actual prepared web edition. Day-level ties are deterministic; no missing timestamp is invented.

The default feed is readable without JavaScript. The optional controller uses the same renderer for All news / Pews News / Parish stories. These groups reflect structured source membership, not title/category guesses. Topic labels such as Services, Events, Community and Notices are not invented from the single published Harvest category or draft demos. Filters update the query string and aria-current/status and honour Back/Forward. Unknown filters safely show All. No nested interactive card controls. SSR/filter escaping and embedded-JSON safety are tested.

The generated JSON can later serve the homepage’s latest/previous/another feature. This task changes no Home content or feed selection there.

## Publishing and remaining automation

Ordinary Admin publishing already writes _content/news.json with date, excerpt, publication state and optional approved images. The existing Dev content workflow now also runs the aggregate builder, so a newly published eligible story automatically becomes Latest by date and moves the old Latest into More. No HTML layout/manual feed edit is needed. Expiration is evaluated at build time, matching the existing story generator.

Pews News publishing still has its existing prerequisite: prepared _content/pews-news/YYYY-MM-DD.json and approved extracted artwork must exist, linked to the real published publication/PDF record. Once built, a new edition automatically joins this same ordering. Uploading a PDF in Admin alone does not create its editorial web body. Full Admin automation still needs a web-edition authoring/import-and-review workflow that writes the existing edition schema/artwork. No new API, schema, Azure change or browser PDF parsing was added here.

Build order keeps the existing article/publication/Pews generators, then runs the News hub after editorial decoration and before Search indexing. Existing story and edition URLs, latest Pews alias and news-stories redirect remain. Legacy publication anchors latest-pews-news,latest-parish-magazine,publication-archive and previous-editions-heading remain usable. Search is regenerated with the real landing content and existing published destinations. The workflow stages the derived news-feed.json.

## Visual system and assets

News now opts into the existing seamless module instead of the generic generated editorial image. No Pews News masthead/module/body is rewritten. The real assets/images/about/church-hero.webp (1600x899,311782B) and church-card.webp (720x405,66282B) are reused unchanged. The same24% right-shift/50%28% wide crop and14%/0%28% phone crop keep the clock on the right. The News CSS is scoped; all established global header dimensions and controls remain unchanged. Masthead uses the established green/gold/ivory typography and a dark left gradient; no opaque title card.

The genuine Harvest thumbnail reuses the existing welcome-doors640/1280 WebP derivatives and meaningful source alt text. No AI image or invented news photograph is added. Pews News uses a neutral typeset document preview because existing notice artwork does not represent the whole edition. Missing story images receive a truthful Parish news document fallback; failed images retain the actual story link/title. Decorative previews/hero layers are aria-hidden or empty-alt as appropriate. Below-fold photos are lazy, decoded asynchronously and aspect-ratio reserved.

Desktop uses a220px left filter panel and a large horizontal feature, with a balanced auto-fit More grid (currently two real remaining items). Tablet converts filters into a compact row; phone uses one column,44px minimum filter/link targets and a shorter non-photo preview. Short landscape uses a126px masthead and compact filter strip so the content appears sooner. At1600px masthead is247.08px (including copy-driven padding),phone220px. Header heights89/81/79/113/57px are untouched.

## Local validation and weight

12 viewport checks pass:320,375,390,430,874x402,768x1024,1024x768,1280,1366,1536,1600,1920. Filters/order/history, one H1, no overflow and one selected hero URL all pass. Minimum copy contrast 6.81:1; navigation 6.71:1. Header/main axe scans pass at390 and1600. Keyboard focus uses a visible gold card outline. Hero failure retains readable green; content-image failure uses a truthful non-photo preview. Delayed hero decode yields CLS0. Both existing editions/latest alias, Harvest story and Home are byte-identical to the baseline. Native archive/PDF bodies and inbound destinations are retained.

Weights are measured initial same-origin encoded resource bytes after fonts/navigation+400ms, excluding variable favicon timing and third-party resources without Timing-Allow-Origin. HTML shown separately. These are comparable local before/after snapshots, not full third-party transfer claims.

| Viewport | Before HTML bytes | After HTML bytes | Before resource bytes | After resource bytes | Difference |
|---|---:|---:|---:|---:|---:|
| 1600 | 6324 | 8056 | 513824 | 555474 | +41650 |
| 390 | 6324 | 8056 | 302998 | 309974 | +6976 |
| 874 | 6324 | 8056 | 513824 | 555474 | +41650 |

The genuine hero replaces the former generated banner. Smaller story thumbnail selection and removal of the old publication-fetch UI offset much of its extra payload. Exactly one responsive church image is requested; no generic garden or generated editorial image is downloaded. No global preload, full-resolution originals or new raster assets are introduced.

Focused tests cover date-driven future-item promotion, PDF-only exclusion, demo/draft/expiry exclusion, filtering, escaping, valid links and source preservation. Full suite555 tests:541 pass,14 unchanged baseline failures. Browser evidence and complete logs are retained outside the repository in news-hub-verification/. Live verification and final commit/deployment results are recorded in the completion report there.

The reused Harvest cover derivatives are640x480/46052 bytes and1280x960/152714 bytes. Document previews are inline vector/typeset UI, not raster photographs or asserted PDF covers. No source assets or edition artwork are changed.
