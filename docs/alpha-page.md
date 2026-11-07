# Alpha Course page

Dedicated generated layout in alpha-render.cjs, selected by the Alpha record in content-pages.json. Rebuild only Alpha with `node build-content-pages.js alpha` then `node build-typography-preview.js alpha.html`; refresh Search with `node build-search-index.js`. Workflow uses this scoped path to preserve other pages.

Twelve original topics are stored in order in the Alpha record. No dates, available places or named organisers are asserted. Enquiries use contact.html. The three ingredients remain tea/cake, a short film and discussion. Historical migration prose is replaced with visitor-facing future-course guidance.

The local 960×540 WebP preview (18,292 bytes) comes from the actual supplied video's YouTube max-resolution thumbnail. Original video: https://www.youtube.com/watch?v=jvCORHeFHYo . YouTube oEmbed identifies Alpha Sessions by St Michael and All Angels Church Mickleham. No stock or generated photography used.

No external thumbnail, iframe, YouTube script or connection is loaded before activation. Native named button creates a titled youtube-nocookie.com iframe only after click/Enter/Space. autoplay=0; the visitor starts playback through YouTube's own player. Player replacement retains16:9 geometry, receives focus and announces loaded status. The direct Watch on YouTube link remains available before and after activation and without JavaScript. Playback is subject to YouTube/network permissions and is tested separately from our activation control.

Alpha CSS is scoped, uses existing Playfair/DM Sans, deep green/ivory/gold. Topic grid is two columns on desktop, one on phone. No new animations. Shared header/navigation/footer and1600px shell remain unchanged. Session numbers use an ordered list with visible Session labels; decorative badges are hidden from assistive technology.

Tests: test/alpha-page.test.cjs and existing navigation/regression tests. Browser evidence outside repository in alpha-qa; checks include320,375,390,430,768,1024,1440,1920 and844×390, keyboard activation/focus,2×text,nooverflow,axeAA,noinitialYouTube andstableplayergeometry. No new regressions against the current Dev baseline.
