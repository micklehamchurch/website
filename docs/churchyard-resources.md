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

## Practical summary expansion (1 November 2026)

The regulations page now uses `churchyard-practical-guidance.json` for five scan-friendly sections: burials; memorials following a burial; flowers/plants/memorabilia; cremated remains; records/remembrance. Each section links to the complete relevant document and PDF page. The three original document cards, contact panel and historical route remain.

Source comparison:

- Former webpage capture: `Regulations - St. Michael and All Angels Church.pdf` supplied by owner, records local approval 7 November 2023. Used to audit missing practical subjects; not republished as current full regulations.
- Burial eligibility, reservations, ownership, memorial process, ordinary grave care: supplied diocesan 2022 document, regulations 7–15, 19–32, 44.
- Ashes: local March 2026 document is principal. Normally no container; biodegradable urn/casket only at Incumbent's discretion. Distinguish Garden (maximum two family members; church-supplied 5×3-inch bronze plaque) and extension ashes plots (maximum four; small upright headstone, six-month settlement period; maximum 55×45×7.5 cm, material/inscription/application requirements). No old blanket 2×2-foot plot assumption or automatic container choice.
- Ashes flowers: local 2026 loose-laid preference, maximum one plant/small vase, non-plastic containers, no cellophane, removal rules. These limits are not applied indiscriminately to burial graves.
- Burial memorial waiting time is deliberately qualified: diocesan six-month minimum can be extended to 12; old local page specified 12. Visitors must confirm with parish; no new local rule chosen.
- Faculty wording follows supplied diocesan rules identifying the Chancellor, not the old page's DAC wording.
- Register/Book of Remembrance: diocesan 12/36 and local 2026 sections 1.3/1.4. No new right, historical claim or independent legal interpretation.

No source PDF or historical guide was changed. Summary content has limited line lengths, section jump links and restrained dividers rather than another card collection.

## Approved UX redesign (1 November 2026)

The Churchyard Regulations page now uses a dedicated `churchyard-regulations-render.cjs`, scoped stylesheet and small progressive-enhancement script. The Churchyard guide and Funerals still use their original shared renderer/CSS and are not redesigned.

Hierarchy follows the approved mock-up: genuine photo/green hero; two-column introduction; five topic cards; early parish contact panel; five guidance accordions alongside compact official documents; one authoritative-document notice and a secondary history link. No unverified charity number from the mock-up was copied.

Photography audit considered the genuine churchyard album (including portrait IMG_6543, the headstones/trees image IMG_6529 and the narrow path photograph IMG_1833) and existing homepage photographs. Selected the existing wide IMG_E6550 church exterior: `assets/images/home/hero-exterior-{640,960,1600}.webp`, 640×360 / 42,654 bytes, 960×540 / 93,080 bytes, 1600×900 / 262,328 bytes. Reused responsive derivatives; no new images, stock, generation or visual alteration. Desktop right-hand framing uses 53% 25%; phone uses 58% 20% in a short stacked image. No PDF preload; one eager high-priority hero image, no redundant preload.

Accordions are real buttons with `aria-expanded`/`aria-controls` and labelled regions. Server-rendered content is expanded and readable with JavaScript disabled. Enhancement initially collapses panels, except valid deep links. Enter/Space toggle; Up/Down/Home/End move trigger focus; native Tab stays intact. Cards reveal/focus the relevant section or documents without page reloads. Native hash history supports Back/Forward and reload. Small Web Animations height/opacity transitions are cancelled safely on repeated actions, and removed under reduced motion. Closed panels are hidden/inert. No third-party library.

All rule lists, dimensions and permission limits remain. Attribution-only copy was made visitor-facing. The internal reference to the former webpage was removed from public waiting-period copy, but the cautious instruction to confirm the applicable period, six-month diocesan minimum and possible 12-month extension remain. Delivery notes retain the historical local 12-month statement; no new local policy was chosen. Quiet “Based on” references remain inside all five panels.

Focused content/preservation suite: 29/29. Full regression: 699 total, 684 passed, 15 failed. Fourteen failure names match earlier baseline logs. The Home semantic snapshot failure was independently reproduced by comparing the starting Dev HTML against the test's older 8f15696 baseline; current Home equals starting Dev. This release does not change Home or those baseline expectations.

Browser verification covers ten sizes (1920, 1600, 1366, 1024, 768, 430, 390, 375, 320 and 844×390 landscape), closed/open accessibility checks, all cards, keyboard/ARIA states, hash Back/Forward and direct deep-link reload, no-JS content, reduced and normal motion, enlarged text and a 200% desktop reflow equivalent. Actual Dev verification and final SHA/deployment receipt are recorded in the delivery report.
