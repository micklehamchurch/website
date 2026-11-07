# Our History redesign

The supplied mockup defines the green/photo hero, centred introduction, dated editorial timeline, cream clergy feature and three related cards. The normal header and footer remain shared site components outside main. our-history.css is scoped to History main content; no shared styles or navigation scripts changed.

## Pages and sources

Handwritten source pages: our-history.html and history-{saxon,domesday,norman,norbury,restoration,bells,today}.html. Each complete timeline row is one keyboard-accessible same-tab anchor, including its Read more affordance. Detail pages have a back link above and below the content and a next-period link. No JavaScript is required for history navigation.

Historical statements are limited to the existing Our History content at e0d0786, plus the Norman features already described in content-pages.json. The approximate Saxon date remains explicitly uncertain. Details are intentionally concise where the repository provides only a short account, particularly Domesday, the chapel and bells. No additional historical dates, people or events were researched or invented. Visitor-facing migration and former-website explanations were removed. Canonical search indexing discovers all eight handwritten pages automatically.

## Genuine existing photographs

- Hero: assets/images/about/church-hero.webp, administrator-supplied church photograph documented in docs/about-parish.md. CSS crops the existing derivative without changing the file.
- Clergy feature: assets/images/clergy/2-360.jpg (Alfred Burmester), 7-360.jpg (Arthur W. Bedford), 13-360.jpg (Barbara Steadman-Allen), genuine photographs of the parish clergy display identified in _content/clergy.json. Three existing portraits replace the mockup's unavailable group photograph, with a cream blend at the text transition.
- Building card: assets/images/about/church-card.webp, same supplied church photograph.
- Memorial card: assets/images/war-memorial/memorial.webp, supplied IMG_6564 photograph.
- Churchyard card: assets/images/visit/churchyard-1600.webp, supplied IMG_6529 photograph.

No suitable verified period-specific images of Saxon work, the Domesday entry, Norman features, the chapel, nineteenth-century restoration or bells were identified in the approved photograph assets. All timeline rows therefore use a consistent text-only composition rather than falsely associating a modern scene or invented archive image with a historical period. No matching clergy group photograph was available. No new image derivatives or invented images were created.

## Build compatibility

build-clergy-archive.js retains the editorial history-feature panel instead of replacing it with the older generated plain aside. It removes the History-only stylesheet when deriving the existing clergy archive page, preserving that page's output. Existing homepage teaser generation is unchanged. test/our-history.test.cjs verifies the rebuild preserves the landing page and all period pages are searchable, meaningful image alt text and routes exist, and header/footer remain separate.

## Story dialog interaction — 16 October 2026

Timeline links retain the existing direct page URLs and no longer show Read more. our-history.js progressively enhances ordinary activation to open a native modal dialog without changing the URL. It fetches only the existing detail article paragraphs and renders them as text, preserving the wording and avoiding a second historical content source. Missing JavaScript/dialog support retains direct links; a loading failure offers the direct detail page inside the dialog.

The modal has a labelled title, visible close control, native background inertness/Escape behaviour, Tab/Shift+Tab containment and explicit focus return. The body is held at its previous scroll position while open, including narrow screens; the internal story scrolls independently and the close control stays visible. Outside clicks close it; inside clicks do not. The archive builder strips this landing-page interaction script when generating the clergy page. Header, footer, hero, images, related cards and all seven detail page sources remain unchanged.

Browser checks cover all seven stories at 1440, 768, 390 and 320 pixels: exact paragraph equality with direct pages; date/summary/row-whitespace/keyboard activation; unchanged URL; outside, close-control and Escape closing; inside clicks; background focus prevention; tab containment; focus return; background scroll lock; mobile internal scrolling and visible close control; no overflow; direct URLs; no-JavaScript fallback and search indexing.
