# Churchyard documents and heritage guide

The source of truth is `churchyard-resources.json`. It records each original PDF's path, byte size and SHA-256. PDFs were copied without rewriting, recompression, form flattening or metadata edits from the four originals supplied on 1 November 2026.

## Visitor routes

- Life Events → Funerals → Churchyard Regulations (`churchyard-regulations.html`): diocesan 2022 regulations, parish Garden of Remembrance/Ashes Plots regulations revised March 2026, and CR1 monument application form.
- Visit & Explore → The Churchyard → `#churchyard-guide`: the historical guide compiled by Carole Brough Fuller for Heritage Weekend September 2010, latest reprint 2019; 56 PDF pages, 28 numbered features.
- The regulations page links to the historical feature and explicitly distinguishes it from regulations.

The supplied older-page screenshot is a historical reference, not a substitute for the dated PDFs. No detailed old rules were reissued as current. Page summaries describe document purpose; authoritative wording remains in the unchanged originals. Existing parish contact route: `contact.html`.

## Historical audit / cross-links

Existing Our History, Churchyard and War Memorial material is retained. The Historical Archive already contains Alfred Burmester (`those-who-have-served.html#alfred-burmester`); link there rather than create a duplicate. The guide's entries on memorials and the war memorial are connected via existing Our History, Historical Archive and War Memorial destinations. No 28-profile import, invented biographical account or new historical photograph.

The only revised existing Churchyard paragraph replaces the former statement that guide availability was unconfirmed. Its introductory/history narrative, genuine parish photo, external Local History Group source and Eco Church source remain.

## Assets / performance

- `assets/documents/churchyard/`: three original regulatory/form PDFs.
- `assets/documents/history/guide-to-churchyard-2019.pdf`: complete original heritage PDF (9,540,794 bytes), loaded only on request.
- `assets/images/churchyard/guide-cover-320.webp`: 320×452, 24,266 bytes.
- `assets/images/churchyard/guide-cover-640.webp`: 640×905, 82,116 bytes.

Cover derivatives are proportional renders of PDF page 1, with no retouching or generated content. The original historic illustration, typography and compiler credit remain. Responsive cover artwork is lazy-loaded and dimensioned; PDFs are never embedded/preloaded. View opens a new browser tab, clearly announced in the accessible name; Download uses the same original with a download attribute.

## Build and SEO

`build-content-pages.js` retains the existing generated-page architecture. `churchyard-resources-render.cjs` supplies the document and heritage additions; `funerals-render.js` adds one contextual card. `churchyard-resources.css` is scoped to these additions, loaded on these three pages only. No global navigation/header/footer or Admin changes.

Run `node build-churchyard-resources.cjs` for the three affected pages, standard script versioning and existing search index. The Dev workflow uses that guarded scoped build for this release's files, avoiding unrelated/date-sensitive Home and Calendar projections. Mixed/unrelated content retains the existing normal build. Page title/meta description and relative links follow existing Dev architecture; no production canonical is added to Dev pages.

## Verification

`node --test test/churchyard-resources.test.cjs test/funerals.test.cjs test/history-preservation.test.cjs test/history-hub.test.cjs test/history-story.test.cjs`

Tests cover PDF hashes, official/form/history separation, compiler/date credit, download/view links, lazy dimensioned cover, preservation of historical narrative and unrelated models, scoped build preservation, and search inclusion. Browser checks at desktop/tablet/portrait/landscape/320px check overflow, contrast/axe, PDF requests, image loading, touch targets and focus. Live PDF downloads must be hash-checked against the manifest after Pages succeeds.
