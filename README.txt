MICKLEHAM CHURCH WEBSITE — DEV CONTENT WORKFLOW

The Admin Dashboard is a read-only content view with links to the tracked source files. GitHub Pages is static hosting: it cannot save edits from a form. The dashboard contains no GitHub token, browser database, or pretend Publish button. Editors need GitHub write access to the repository; GitHub authentication and branch protections control changes. Editable sources live under the Jekyll-excluded _content/ directory; only build-generated published data is emitted to the site. Source visibility on GitHub follows the repository's access settings, so do not store confidential notes in these files.

HOW CHANGES REACH THE DEV WEBSITE
1. Open the Admin Dashboard on the Dev site, or open the source file in the repository's Dev branch.
2. Edit the content file and commit to Dev (or submit a pull request to Dev if the church team enables that review process).
3. The GitHub Actions workflow “Build Dev website content” runs npm run build, validates the data, and commits regenerated event data, article pages and search index to Dev.
4. GitHub Pages deploys the updated Dev branch files. Check the workflow run before treating the change as published.

The workflow needs GitHub Actions enabled and permission for its repository GITHUB_TOKEN to write contents. The token exists only in the GitHub Actions environment; no token is sent to the public website. A content-edit commit may briefly reach branch-based Pages before the generated-output commit finishes.

CALENDAR
- _content/calendar.json is the sole production Calendar source. Builds and the secure API explicitly use no-feed mode. Legacy ICS fixtures are isolated tests only.
- _content/calendar.json is the repository-managed layer. It supports manual published events, edits/overrides keyed by an imported event's exact generated id, drafts, and hidden feed event ids.
- Do not edit events.json. It is generated from the ICS feed and _content/calendar.json on every build.
- To add an event, append a complete object to _content/calendar.json's events array. Required fields: unique id, title, start, end, timeZone and location. Use ISO local datetimes such as 2026-10-10T10:00:00 and the matching IANA zone, for example Europe/London. Description is optional. Use status "draft" to keep a valid item out of the public calendar; omit status or use "published" to publish it.
- To edit an imported feed entry, add its exact id and only the fields to change to overrides. Its original feed data remains intact. Use status "draft" to unpublish it. To delete/hide an imported item, add its id to hiddenEventIds. To delete a manual entry, remove it from events.
- Source IDs are available in the generated events.json (the Admin Calendar view links to it). Keep each ID unique; builds fail on invalid or duplicate entries.

NEWS & MAGAZINE
- _content/news.json is the single editable article source. Each article needs a unique lowercase slug, title, category, dateLabel, excerpt and at least one paragraph. The build writes a published-only news-data.json for the public listing; drafts stay in _content/news.json and are not copied into the Pages output.
- Omit status or use "published" to publish; use "draft" to retain an article in source while removing its public listing card, generated article page and search result. Delete an article by removing it from the articles array. Builds reject incomplete entries and duplicate slugs.
- Set "demo": true for fictional samples. Set "demo": false for parish-approved real content. Current articles are fictional examples; keep them clearly marked until replaced and approved.
- Do not edit generated files in news/ directly. build-news-pages.js creates/updates pages and removes generated pages for deleted or draft entries. news.js reads the same source data for the listing.

BUILD AND LOCAL PREVIEW
Run npm run build from this directory. It imports the calendar, writes published-only browser data, generates article pages and regenerates search-index.json from current HTML and published calendar/news content. For a local browser preview, run npm run preview and open http://127.0.0.1:4173.

SAFE UPDATE CHECKLIST
- Calendar edits: preserve the ICS file, use exact event IDs for overrides/hides, verify dates, times, venue and time zone.
- News edits: use only approved copy and image links, set demo false only after approval, and keep slugs unique.
- Review the GitHub Actions build and the generated public Calendar, News page, article page and search results on Dev before asking for approval to merge.

FUTURE CMS
This workflow is repository-backed, not a web CMS. Remote in-page editing, user roles, image uploads, approval queues and direct publication require a future authenticated backend/CMS (for example Azure with identity and a database). The static site should consume generated content from that trusted publishing pipeline; credentials must never be embedded in client-side code.
