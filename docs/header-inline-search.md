# Single-row header and expandable Search

Starting Dev: `21f33a9a3ec85853321e9ecbea3c5eb64446f312`.

## Header refinement

The same shared header and navigation tree remain in `site.js` and `responsive-navigation.js`. The desktop boundary is now 1536px, with the existing compact header/native drawer below it. This intentionally avoids a squeezed intermediate desktop layout.

At 1536px the usable row is 1472px: about 321px for the identity, 402px for the actions, two 22px gaps and about 705px for navigation. The navigation remains 16px and the church name 26px, with a 52px cross mark. The inner row can reach 1536px inside the unchanged 1600px shell, leaving 32px outer padding instead of the old 80px. At the top the header measures 89px; after 64px scrolling it settles to 81px with the same structure and typography. Non-hero spacing and native skip-link clearance continue to use the shared reserve variable. Hero foreground copy clears the shorter header; no image/crop/content or quick-card changes.

## Search architecture

The original normalization, partial matching, all-term filtering, title/content weights, sorting and excerpts are extracted unchanged into `search-model.js`. Both `search.js` on the retained full Search page and the new lazy `header-search.js` call that model and its shared index loader. `search-index.json` is unchanged. A regression compares the old implementation's ordering and excerpts against the shared model over representative queries.

The original Search anchor remains a direct `search.html` fallback. The shared header adds button semantics and Space activation; only first activation imports the controller/model and fetches the existing index. On desktop the absolute search field occupies central navigation space, temporarily hiding those navigation links without moving the identity or right actions. At smaller widths the same field/results appear beneath the compact header. Activation from the existing drawer closes/unlocks it first, then focuses the input. No second menu tree or new search engine exists.

The labelled search form, polite status and list of real links use a disclosure pattern, not a fake autocomplete. Results are limited to five, with short excerpts and a permanently visible View all results link carrying `q` to the full Search page. Enter in the field opens that full Search page; Tab reaches the close button and results; Down can focus the first result; native Enter activates links. Escape restores Search-button focus. Pointer dismissal does not trap or prevent outside actions. No-results, loading, failed index and failed controller paths have friendly/fallback behavior. Text is rendered with textContent; result URLs must share the site's origin.

The input remains 16px with 44px controls. Results have bounded internal scrolling. Resize/visualViewport updates keep the field usable with changing viewport and keyboard heights. Very short views drop snippets; extremely short views retain the full-results action. Existing native drawer focus trapping, backdrop dismissal, restoration, scroll locking and rotation behavior remain unchanged.

## Validation and performance

Build passed. Focused Search/header/Bible/Peace/landscape/shell tests: 30 passed. Full suite: 508/522 passed, retaining the same 14 known pre-existing Contacts/Calendar/clergy/footer/homepage/verse/gallery failures. The browser checks cover 16 Search sizes, partial/multiple/special queries, matching the full results page, limited results, keyboard/links, repeated opening, lazy requests/cache, failures/loading, drawer hand-off, orientation and simulated keyboard-height changes. Shared navigation checks cover the new 1535/1536/1537 boundary on hero/non-hero pages; all 54 standard pages also receive shared-header regression checks. Real phone virtual keyboards still warrant physical-device acceptance; automated tests simulate reduced visible heights.

Header and expanded Search axe WCAG A/AA checks have zero violations. Lighthouse Accessibility remains 100 on homepage and Calendar; the Calendar's existing unscored event-button naming warning remains outside scope. Re-measured brightest header background across seven existing hero pages at 1600px: ivory at least 6.48:1, warm gold at least 5.10:1. The solid Search panel uses the same deep green/cream/gold contrast.

Initial shared JS/CSS increases by about 982 bytes gzip, without extra homepage requests. First Search adds two small JS requests (about 3.8KB gzip combined) and the existing index (about 38.8KB gzip); repeat opening reuses the same data on that page. Full Search adds the shared-model request, with the old ranking implementation removed from search.js. No fonts, raster assets, runtime libraries, external services, Admin/API/authentication or workflow changes.

Run `scripts/check-inline-search.cjs` and `scripts/check-global-header.cjs` with Playwright available through PLAYWRIGHT_MODULE, optional AXE_CORE_PATH, and HEADER_BASE_URL for live Dev. Diagnostics/screenshots are stored outside the repository.
