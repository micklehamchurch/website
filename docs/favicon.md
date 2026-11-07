# Simplified church tower favicon

The favicon follows approved Option 1. The cockerel, weather-vane arrow and orb
reuse the exact gold contours from `assets/images/branding/church-illustration.svg`
(path indices 4, 9 and 13). The spire, roof planes and upper tower are simplified
vector geometry based on that illustration. The enlarged blue/gold clock keeps
the church recognisable at 16px. The existing header illustration is unchanged.

Colours: original green `#004e2f`, gold `#b18510`, brighter blue `#0068b0` from
the supplied original illustration, and clock details `#d7a51c`. An opaque warm
ivory `#fbf8ef` square maintains legibility in both light and dark browser chrome.
At 16px the cockerel reads as a small gold silhouette rather than fine plumage.

Delivered assets: self-contained SVG with a 64×64 viewBox; PNGs rendered directly
at 16×16, 32×32, 48×48 and 180×180; and a BMP-based ICO containing 16/32/48px
images for older browsers. No runtime script or external image dependency.

All 64 public HTML pages and three reusable page templates share versioned local
references. Nested editions/articles already use a parent base URL. Admin icons
remain unchanged. `build-favicon-references.cjs` normalises head metadata only;
the full build and Dev publishing workflow run it after page generation.
Favicon-only releases bypass unrelated content and calendar regeneration.

`test/favicon.test.cjs` validates formats, dimensions, consistent resolvable
references, idempotence and unchanged page bodies/header against starting Dev
`d95cce9c01965c727cb93568d51afc91c138565c`. Historical preservation tests restore
only the exact new favicon block to its recorded former block before comparing
their older snapshots. Asset and current-head tests do not use that adapter.

Browser verification covers Edge and WebKit at desktop/tablet/phone sizes and
light/dark colour schemes, decoded PNG/SVG sizes, all asset responses and nested
page references. Mobile checks are emulated; physical iOS home-screen installation
is not available in this environment. Existing saved bookmarks/home-screen icons
may retain their cached old image until their browser refreshes it.
