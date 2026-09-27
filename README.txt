MICKLEHAM CHURCH WEBSITE — VERSION 1 PREVIEW

Preview the site
1. On GitHub, open micklehamchurch/website and select the Dev branch.
2. Choose Code > Download ZIP, then extract the folder.
3. Install Node.js 18 or later, open a terminal in the extracted folder, run `npm run build`, then `npm run preview` and open http://127.0.0.1:4173. This lets the calendar data and website search load correctly.

This is a static front-end preview. GitHub Pages currently publishes main, so the Dev branch is not the live Pages site. Preview Dev locally without changing the Pages setting or main branch.

Pages included
- Home, Worship, Services and Events, Church Life, News and Magazine
- Plan a Visit, About Our Parish, Our History, Westhumble Chapel, Contact, Give, Gallery, Sunday Services (Media)

Content status
- The calendar restores the three sample services from the original homepage and can be filtered by church and schedule. Their dates and times are not confirmed; no new dates have been invented.
- Sunday Services and the homepage media feature use the church's YouTube playlist; video titles and service details come from YouTube.
- Directions, access details, parish news and online giving are not connected or confirmed.
- The contact email shown was carried over from the initial prototype and must be confirmed before publication.
- The existing approved church photograph remains on the home page. The new About pages use temporary illustrative placeholders until the church supplies approved photographs.
- About Our Parish uses four temporary AI-generated illustrative placeholders: church-exterior-placeholder.jpg, church-interior-placeholder.jpg, churchyard-placeholder.jpg and westhumble-placeholder.jpg. They are not photographs of the actual churches and must be replaced by church-approved photographs before publication.
- No verified street address was found in the project. The About and chapel pages use map searches by church name and village and direct visitors to contact the parish to confirm directions.

Search and editing
- Search results are generated from the current HTML page content and shared event data. The build script discovers pages automatically; it does not keep a hand-maintained result list.
- When adding or editing a page or events.json, run `npm run build` before publishing so search-index.json reflects the current content. For a future CMS, generate this same JSON index from the CMS content during its build/deployment step.
- Mark utility pages with `<meta name="search-index" content="exclude">` if they should not appear in results.

Forms and giving
The contact page uses a mailto link and the giving page explains that online payments are not available in this preview. No visitor data or donations are collected by the site.
