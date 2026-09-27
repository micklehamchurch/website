MICKLEHAM CHURCH WEBSITE — VERSION 1 PREVIEW

Preview the site
1. On GitHub, open micklehamchurch/website and select the Dev branch.
2. Choose Code > Download ZIP, then extract the folder.
3. Install Node.js 18 or later, open a terminal in the extracted folder, run `npm run build`, then `npm run preview` and open http://127.0.0.1:4173. This lets the calendar data and website search load correctly.

This is a static front-end preview. GitHub Pages currently publishes main, so the Dev branch is not the live Pages site. Preview Dev locally without changing the Pages setting or main branch.

New demonstration topic pages
- Worship pages: Sunday Services, Weekly Worship, Baptisms, Weddings, Funerals, Prayer and Special Services.
- Community pages: Our Parish, Church Community, Children & Families, Community Events, Groups & Activities, Volunteering, Supporting the Community, News & Magazine and Gallery.
- Visit & Learn pages: Visit the Church, Church History, The Church Building, Churchyard, Norman Architecture, What to Expect and Finding Us.
- Edit content-pages.json to update the sample topic copy, image filename, alt text and links. Run `npm run build` to regenerate the topic pages and refresh the search index.
- All generated topic pages carry a demonstration notice and image caption. Demo images live in assets/demo/ and can be replaced there with church-approved photographs while retaining each filename and updating alt text/captions.

Current Church Calendar
- calendar-source.ics is the church calendar feed supplied for this update. It contains 36 events from 6 September 2026 through 28 February 2027.
- import-calendar.js converts the ICS feed into structured events.json. The Calendar page, Community Events page, homepage preview and search index use this event data.
- To update the calendar, replace calendar-source.ics with the current feed and run `npm run build`. Do not add sample events to events.json; it is generated from the feed.
- Each event detail includes an Add to Google Calendar link when the feed provides its required fields. The supplied Mickleham address is attached only to events whose feed location is the Mickleham church; Westhumble events retain the feed's Chapel address.

News & Magazine demonstration
- The page at news.html contains six fictional SAMPLE / DEMO articles. Every article and sample date is visibly labelled; none is genuine parish information.
- Edit news-data.json to replace or update the sample copy. Keep the fields together there; do not edit the generated article HTML pages directly.
- Run `npm run build` to create one page per article in news/ and refresh search-index.json. Search indexes both the news listing and the generated article pages.
- The sample photo-story links to the existing gallery.html page.

Pages included
- Home, Worship, Weekly Worship, Baptisms, Weddings, Funerals, Prayer, Special Services, Calendar and Community Events
- Our Parish, Church Community, Children & Families, Groups & Activities, Volunteering, Supporting the Community, News and Magazine, Gallery
- Visit the Church, Church History, The Church Building, Churchyard, Norman Architecture, What to Expect, Finding Us
- About Our Parish, Our History, Westhumble Chapel, Contact, Give, Sunday Services (Media)

Content status
- Calendar events are imported from calendar-source.ics. Event names, dates, times, locations and descriptions are preserved from that feed; no placeholder events are mixed in.
- Sunday Services and the homepage media feature use the church's YouTube playlist; video titles and service details come from YouTube.
- Opening hours, access, parking and public transport details are not confirmed. The supplied St Michael's & All Angels address is shown for events listed at the Mickleham church; use the route planner and contact the parish to confirm travel details.
- The contact email shown was carried over from the initial prototype and must be confirmed before publication.
- The existing church photograph remains on the home page and gallery. Illustrative images in assets/demo/ are AI-generated and are not photographs of the actual churches, parishioners or events.
- About Our Parish and generated topic pages label their demo images and sample content. Replace the files in assets/demo/ with church-approved photographs and revise alt text/captions in content-pages.json and the relevant page HTML.

Search and editing
- Search results are generated from the current HTML page content and shared event data. The build script discovers pages automatically; it does not keep a hand-maintained result list.
- When adding or editing a page, calendar-source.ics or news-data.json, run `npm run build` before publishing so search-index.json reflects the current content. For a future CMS, generate this same JSON index from the CMS content during its build/deployment step.
- Mark utility pages with `<meta name="search-index" content="exclude">` if they should not appear in results.

Forms and giving
The contact page uses a mailto link and the giving page explains that online payments are not available in this preview. No visitor data or donations are collected by the site.
