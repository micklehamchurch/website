# Automatic latest Sunday service

The homepage feature uses cached metadata and a cached real YouTube thumbnail, not a player or browser-side YouTube request. The existing canonical News feed is unchanged; its newest two items sit beside the service. If no valid cache has ever been obtained, three ordinary News items are rendered.

## Audited source and limitation

Official channel: https://www.youtube.com/@stmichaelandallangelschurc3012 — channel `UCl4pbewCT91iZhcdoEjJBIw`.

Existing parish Services playlist: https://www.youtube.com/playlist?list=PLB3x60CMpqckqRCWtb5t-0MWZMImPM_Wb . The site already embeds this playlist on Sunday Services. Its public Atom feed supplies real titles and publication timestamps. On 28 October 2026 its latest entry is `zdybAROB5Zg`, “Last Sunday of Trinity 25th October 2026”, published 25 October at 11:53 UTC. The audited latest 15 entries mainly contain Sunday worship, but the playlist also contains a Monday school service, Christmas worship and other special services. It is **not exclusively a Sunday playlist**.

`youtube-sunday-source.json` is the one-time configuration point. Current conservative policy: `playlist-sunday-publication`. A video must be in this Services playlist, uploaded by the church channel, and published on a Sunday in Europe/London. The known Bells film ID is always excluded. Other channel uploads, History, concerts and announcements outside the Services playlist are not queried or selected. No AI or title-based service classifier is used.

**Limitation:** a Sunday recording first published on Monday is skipped. Publication day does not prove the worship date, so the page labels its reliable date “Published” and retains the actual YouTube title. This policy is deliberately conservative, not a claim that every item in the general Services playlist is a Sunday service.

For date-independent weekly automation, use a genuinely Sunday-only playlist on the church channel and change the one-time configuration to its ID with `selection: "curated-sunday-playlist"`. Editors then only publish/add each service to that source on YouTube. They never edit homepage HTML, metadata JSON, GitHub or Admin each week. Do not select curated mode for the existing mixed playlist unless its contents are made Sunday-only. The runtime reads configuration from Dev on every scheduled check; changing this source does not require a new interface or backend code.

## Runtime and cache

An Azure Functions timer, `sunday-service-sync`, checks every 15 minutes (`0 */15 * * * *`), with host monitoring and startup execution disabled. It reuses the existing GitHub App settings and writes **only Dev**. No new key, YouTube API key, public API route, storage account or Admin UI is required. GitHub cron was not used because scheduled workflows run from the default branch, which is main; this release must not modify main.

Feed and metadata requests are bounded and time-limited. Playlist/channel identity, video IDs, XML entities, dates and cache image paths are validated. DTDs/entities, oversized responses and foreign ownership are rejected. Public oEmbed checks identify unavailable entries. Real thumbnails are fetched only from fixed YouTube image paths and decoded with the existing Sharp dependency under a pixel/byte budget, producing a WebP of at most 960 px.

`sunday-service.json` and any new thumbnail are committed atomically to Dev with a non-forced Git reference update. A competing editor/build commit causes a safe retry on a later check, never an overwrite. Read-scoped credentials are used until a publication is necessary. Unchanged checks create no commit or Pages rebuild. First automatic validation changes the bootstrap receipt to `verifiedBy: "azure-timer"`; subsequent identical checks do not change the receipt timestamp just to create activity.

A changed cache triggers the existing scoped homepage build, then Pages. Expected freshness is the next 15-minute check plus build/deployment time, subject to YouTube feed publication and service availability. The RSS endpoint exposes a bounded recent window rather than the whole historical catalogue.

Temporary feed/oEmbed failure and rate limiting retain the last known valid cache. Older feed windows do not silently replace a newer cached service. Missing thumbnails can use a reserved, labelled text treatment; when a valid thumbnail cache exists, a temporary thumbnail failure retains it. If cached content is confirmed permanently unavailable and no eligible available replacement exists, the homepage returns to ordinary News. No raw technical error is shown to visitors. The `checkedAt` field records the last changed/initially verified public cache, not every unchanged timer attempt; operational check results remain in Azure logs.

## Performance and operation

No iframe, autoplay, sound, YouTube JavaScript, YouTube thumbnail host request or runtime Azure request is added to homepage viewing. The service is one ordinary external link with a labelled accessible name. Its thumbnail is served from Pages and lazy-loaded with reserved dimensions. The initial verified WebP is 67,070 bytes. The News area still has three image slots overall, replacing one normal News card with the video card. Combined gzip size of HTML + existing News CSS/JS increased by approximately 701 bytes in local measurement; gzip figures are estimates of compressed text, not a network timing claim.

The deployment workflow checks the new timer is indexed, preserves the existing exact Easy Auth/Feedback boundary, and invokes the timer through the authenticated Azure management proxy. It then verifies a real automatic cache receipt from Dev. No host key or private key is logged or sent to a browser.

Browser failure handling leaves a labelled link when an image fails to load. On phones the media, title/copy, News stories and View all news follow normal flow, with a 16:9 service image. Desktop keeps the leading service beside two News cards. All unrelated homepage sections, including the corrected iPhone Gallery architecture, are preserved.

## Verification commands

- `node --test azure-function/test/sunday-service.test.js test/home-sunday-service.test.cjs test/home-news.test.cjs test/news-hub.test.cjs test/news-stories.test.cjs`
- `npm run build`
- Full root `node --test --test-concurrency=1` and Azure `node --test`.

Tests cover source identity and newest eligible selection; newer unrelated channel material; the known Bells film; unavailable/private/deleted entries; conservative and curated modes; missing/malformed metadata and thumbnail; stale cache, rate limits and upstream failure; no eligible item; safe Dev-only atomic publication; unchanged checks; independent News promotion; no iframe/autoplay; image/link accessibility; and preservation outside From our parish.
