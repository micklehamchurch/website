# News & Stories

Story text, date, slug, excerpt, image and publication status remain in _content/news.json, edited by the existing Admin News workflow. build-news-pages.js generates the published article pages, News & Stories journal and homepage latest-story section. Drafts and demo samples are excluded. Stories sort newest first; expired stories are omitted from the journal/home feature. Existing News & Magazine/PDF publications remain available.

Optional editorial photography is in _content/news-media.json, keyed by the same slug. It contains no independent story text/status: cover (homepage/listing), lead (article opening), and groups of one/two photographs placed after zero-based paragraph indexes. Each photo has src, small, width, height and descriptive alt. This metadata stays intact when the existing Admin saves article text. Additional photo layouts currently require a repository edit, not an Admin rewrite. Keep group indexes in range when changing paragraph structure.

Harvest 4 October 2026: Ed supplied ten selected real photographs and confirmed permission for website use including adults and children. Originals were EXIF-oriented, resized (640/1280px widths) and compressed as WebP, without colour/scene alterations. Embedded metadata was removed. Originals are not served. No photographer name or licence was invented.

Selected files and roles:
- welcome-doors: WhatsApp Image 2026-10-04 at 16.25.47.jpeg
- congregation: 2WhatsApp Image 2026-10-04 at 14.31.21.jpeg
- sunflowers: WhatsApp Image 2026-10-04 at 16.22.48.jpeg
- window-flowers: 1WhatsApp Image 2026-10-04 at 16.22.48.jpeg
- harvest-altar: 4WhatsApp Image 2026-10-04 at 16.25.47.jpeg
- harvest-reflection: 3WhatsApp Image 2026-10-04 at 14.31.21.jpeg
- family-crafts: WhatsApp Image 2026-10-04 at 14.31.20.jpeg
- shared-table: WhatsApp Image 2026-10-04 at 12.29.59.jpeg
- fellowship: 7WhatsApp Image 2026-10-04 at 16.25.47.jpeg
- church-welcome: 1WhatsApp Image 2026-10-04 at 14.31.21.jpeg

Run npm run build and npm test. Dev-only content workflow rebuilds when story text/media changes. Never edit generated article pages directly.

Editorial refinement: Harvest uses eight article photographs. The congregation leads at a maximum 800px width; flowers and altar follow paragraphs 1–2; reflection follows paragraphs 3–4; crafts follow paragraph 5; shared-table and fellowship follow paragraph 6; window-flowers closes after the final thanks. Single landscapes are capped at 650px, portraits at 380px (300px on mobile), and paired rows at 840px. Cover images in teasers are capped at 420px. The excerpt is used for teasers/metadata rather than repeated above the opening photograph on editorial photo stories.

Public consolidation: news.html is the canonical News landing page, generated stories are refreshed inside news-stories markers, followed by the existing Pews News and Parish Magazine latest-edition widgets and a collapsed previous-editions archive. news-stories.html is a relative redirect with a fallback link and is excluded from search. Article links and the homepage More news link point to news.html. The two content sources and Admin publishing remain separate and unchanged.
