# A Moment of Peace

## Entry and architecture

The homepage has a single understated **Take a moment** entry directly below the four quick links, before parish news/about content. It is not a permanent navigation item or another large promotional card. Its ordinary link destination is `prayer.html` if JavaScript is unavailable; the feature intercepts it only when the reusable controller is ready. Other pages can opt in by including the two scripts/stylesheet and adding `data-peace-open` to a meaningful fallback link.

- `peace-moments.json`: versioned collection of image sources/alt/focal point, passage identifier/reference, optional exact-boundary excerpt rule and original reflection. It contains no copied Bible passage, view token, key or personal data. Future Admin editing is possible through this data boundary, but is not implemented.
- `peace-model.js`: dependency-free validation and passage/excerpt handling, shared by browser and Node tests.
- `peace.js`: native modal, manual navigation, touch/keyboard/focus, lazy photography and licensed reading retrieval.
- `peace.css`: feature-scoped styling, ivory type over genuine photography, restrained gold/leaf identity, responsive controls and reduced-motion transitions. No shared typography or shell rules are changed.

No API, Azure, Admin, permissions, storage or global navigation changes. No autoplay, slide rotation or generated photographs. At ultrawide sizes the dialog is capped at1600px; the existing public site shell stays unchanged.

## Moments

1. **Be still — Psalm46:10:** first clause, exactly extracted from the provider response and explicitly labelled excerpt. Reflection: Let the noise of the day settle. You do not need to have everything resolved before you pause in God’s presence.
2. **Come and rest — Matthew11:28:** full verse. Reflection: Bring the weariness you are carrying, without needing to explain it away. Let this be a moment to rest in Christ’s welcome.
3. **Quiet trust — Psalm23:1:** full verse. Reflection: Take a slow breath and make room for a little quiet. You may offer God one simple prayer for what you need today.
4. **Lift your eyes — Psalm121:2:** full verse. Reflection: Notice the light and the beauty around you. Allow a small word of gratitude, or a question, to become your prayer.
5. **Peace for today — John14:27:** first sentence, labelled excerpt. Reflection: Whatever waits beyond this moment, pause before you return to it. Ask Christ for peace to carry into the next small step.

Reflections are original editorial writing, visually separate from the quotation; they are not represented as Bible text.

## Scripture and attribution

Uses the existing public `/api/bible/niv/passages/{id}` endpoint and its configured NIV Anglicised licence, with credentials omitted. No Azure configuration is changed. Exact provider text is used; verse-number markers/whitespace are removed, and only the configured exact clause/sentence boundary is selected. Missing copyright, wrong passage ID or missing FUMS token prevents quotation display. There is no invented/offline quote fallback.

The visible reference identifies NIV and any excerpt. The compact publisher notice follows the existing reader's known Biblica notice format; unfamiliar notices remain full. The exact full copyright is available in **About this moment**, with linked Biblica and API.Bible attribution. Every displayed Scripture selection calls `fums('trackView', token)`, including cache hits. A short in-memory cache expires after five minutes and is cleared when closed; no Scripture is put into persistent browser storage or committed as API response data.

Published sources reviewed20 October2026: [API.Bible terms, §§7/14 and AppendixA](https://api.bible/terms-and-conditions), [FUMS implementation](https://docs.api.bible/guides/fair-use/), [licensing quick reference](https://care.api.bible/article/396-licensing-policies-quick-reference). This follows the already-configured integration; it does not create a new translation licence or assume public-domain rights.

## Genuine photographs and performance

All five originals were visually inspected. No generated concept image, stock photo or generated architecture is used.

1. `assets/images/about/church-hero.webp` — genuine exterior, spire/blue clock/red door,1600×899. New640px derivative in `assets/images/peace/church-640.webp`,45164bytes.
2. `assets/images/albums/st-michaels-church-churchyard/st-michaels-church-churchyard-03-{480,960,1600}.webp` — genuine churchyard, headstones, trees and sunlight; existing responsive variants reused unchanged.
3. `assets/eco-church/garden-of-remembrance-lavender.jpg` — genuine garden/benches/lavender. New WebP derivatives: `assets/images/peace/garden-640.webp` (640×480,136790bytes), `garden-1600.webp` (1600×1200,793958bytes).
4. `assets/images/stories/harvest-2026/window-flowers-{640,1280}.webp` — genuine Harvest flowers and stained glass, existing variants unchanged.
5. `assets/images/stories/harvest-2026/welcome-doors-{640,1280}.webp` — genuine red entrance doors with Harvest flowers, existing variants unchanged.

New derivatives were resized/encoded with Sharp, WebP quality82, no upscaling or scene manipulation. No existing photo was overwritten. Images are requested only after opening and selecting their moment, not preloaded as a five-image homepage download. `srcset`/`sizes` chooses appropriate sources; image dimensions are reserved by the fixed scene. A dark green background/reflection stays usable on slow/failed image requests, and a visible message explains a failed photograph. A failed reading offers Retry; stale responses cannot replace a later selection.

To replace a photograph, use an approved genuine parish image, inspect it, update the data sources/real pixel widths/alt/focal point and this provenance record, then check all responsive crops. Do not substitute a generated church. Keep reflections separate from provider Scripture.

## Bells

No suitable permitted recording exists in the repository. The desktop **Play gentle bells** control is disabled with the explanation “Parish recording not yet available”; compact views hide the inactive audio area. `audio:null` is deliberately maintained in data. There is no audio element, synthesized recording, third-party download or autoplay. A future implementation must verify a genuine recording's permission, provide a user-initiated play/pause control and accessible status, and stop playback when closed. Adding an audio path alone does not enable playback.

## Accessibility and verification

Native named dialog makes background content inert; Escape, close control and outside click dismiss. Scroll position and opener focus are restored. Close/navigation/progress/information controls are44px or larger, visible focus is retained, manual next/previous wrap, and left/right keys/swipes change moments. Internal reading scrolling preserves close/control access on short screens. Reduced motion disables the photographic fade. Safe-area maximum-based gaps and dynamic viewport height keep controls within phones. The screen reader has moment counts, selected dots, reference/translation and loading/error status.

`node --test test/peace.test.cjs` checks data, local genuine sources, exact excerpt handling, metadata failure, navigation and scope. `scripts/check-peace.cjs` checks real licensed passages, ten desktop/ultrawide/iPad/phone/landscape sizes, five moments, photos, swipe, arrows, dots, Escape/close/focus, touch targets, reduced motion, failed reading/photo, retry and stale-response protection. Local browser routes replay real licensed API responses with local CORS only for the test; production uses the unchanged public endpoint. Set `PEACE_BASE_URL=https://micklehamchurch.github.io/website/` for actual live verification. Artifacts go outside the checkout to `../peace-verification`.
