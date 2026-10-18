# Homepage large-display framing (Task 19)

Starting Dev: e3832f13af51711793eb910eb63309a03ed38545.

The shared header already stops at 1280px; lower homepage content already uses
1440px containers. The hero quote instead used left:4% of the viewport, while
the welcome block used a right edge tied to the viewport. This separated them
indefinitely as the image grew.

Compared 1400, 1500 and 1600px hero frames visually at 2560px. Selected 1600px to
preserve the ordinary desktop composition and leave clear sky around the spire.
`home-wide.css` is loaded only by index.html. Above 1600px it anchors the existing
text blocks to a shared centred 1600px frame, retaining the existing 4% quote and
3% welcome gutters relative to that frame (64px and 48px). No markup wrapper,
shared container change, typography change or photograph/crop change is needed.
The existing 1280px header cap and lower-page containers are unchanged.

At 1600px and below no new rule applies. Tested 320,390,768,874,1024,1280,1440,
1600,1920,2560 and3432px, including short landscape at874x402. Geometry comparisons
against the same page without this stylesheet confirm unchanged header/image and
unchanged full layout through1600px. Screenshots at1920,2560,3432 were reviewed
for text/spire separation. No horizontal overflow or overlapping navigation.
Keyboard focus and interior-page style isolation passed.

Run `node scripts/check-home-wide.cjs` with PLAYWRIGHT_MODULE pointing to an
installed Playwright package. Set HOME_WIDE_BASE_URL to the deployed Dev root
for live verification. HOME_WIDE_CANDIDATES=1 captures the three candidate frames.

Build passed. Full suite:473 tests,459 passed,14 existing failures (historical
snapshots/data expectations and generated-file test ordering). Homepage-header
unit tests:6/6. Public script-version tests after rebuilding:3/3. No unrelated
historical content or old snapshot assertions were changed.
