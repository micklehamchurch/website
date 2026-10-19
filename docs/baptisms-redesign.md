# Baptisms landing page

Canonical content remains `content-pages.json`, Baptisms entry. `build-content-pages.js` delegates only the baptism life-event kind to `baptisms-render.js` and loads `baptisms.css`. The content workflow watches the renderer, stylesheet and assets. Other page renderers and shared styles are unchanged.

The page retains all eight canonical policy paragraphs verbatim, including eligibility, preparation, children/godparents, adult candidates, timing, thanksgiving and initial enquiries/continuing support. The journey summarises those paragraphs; full guidance remains visible, not hidden in accordions. Both policy/application documents, the real baptism officer email, Children & Families and all related destinations remain available. No rules, fees, dates, contacts or service promises are added.

Design: ivory/daylight font hero, gentle code-native water curves, introductory features, editorial welcome, numbered journey, water reflection feature, full practical guidance and documents, genuine parish exterior and invitation. No new runtime JavaScript or fonts. CSS is scoped to Baptisms; a page-specific short-landscape utility-row compatibility rule follows the existing Weddings approach without changing shared CSS.

Tests: `node --test test/baptisms.test.cjs test/weddings.test.cjs`; build with `npm run build`. `scripts/check-baptisms.cjs` uses Playwright/Edge at ten sizes from 320px to 2560px and short landscape. Set `BAPTISMS_BASE_URL` to the live Dev base URL for fresh-context live checks/screenshots. Artifacts are written outside the repository in `../baptisms-verification`.

Image provenance, prompts, sizes and replacement instructions: `assets/images/baptisms/README.md`.
