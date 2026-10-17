# Phone-landscape responsive audit — 17 October 2026

Starting Dev: eca5e15a6efead5d3a5218851de9dde9566c5071.
Main before work: 804a189ae8b09e8a88f4bb98947af0e9fcb34c30.

## Existing system and diagnosis

styles.css provides the shared header/menu, page-hero bands, topic/article headings and section spacing. header-navigation.css is appended by site.js after public page styles. Its 999px mobile breakpoint is narrower than older 1200px styles, and full desktop navigation starts at 1000px. Photographic Home, Visit, About and History heroes have separate width-based rules. These rules did not consider short landscape heights. No content, navigation labels/hierarchy, images, fonts, colours, admin, canonical URLs, sitemap/robots or hosting configuration has been changed.

At 874 × 402 the existing header measured 71px, mobile menu 331px tall (417px of scrollable contents), and Community hero 247.47px with a 48.07px heading. Visit's portrait-style introductory photo stack measured 940px; Home's hero measured 440px. Topic pages and War Memorial contain actual article text rather than isolated title bands: their entire content must continue to scroll naturally.

## Single scoped breakpoint

The appended shared rule is `(orientation: landscape) and (max-width: 999px) and (max-height: 460px)`. The 999px limit follows the existing hamburger/desktop boundary. The tested phone heights are 360–430px; 460px adds modest browser/phone headroom while excluding the normal 768px+ tablet landscape and 800px+ portrait heights in the matrix. Orientation prevents accidental matching on portrait phones. This is a viewport-shape rule, not a device identifier. All new visual declarations live inside this one query; original CSS above it is unchanged. No !important rules or animations were introduced.

The header retains branding, YouTube and the hamburger with 44px controls. Its short-height row measures 57px including the border. The menu fills the header width, eliminating the inset panel's green side strips. Top-level navigation uses two columns in existing DOM/keyboard order. An expanded item spans both columns; all submenu links remain 44px tall. Search and Calendar share a utility row. The menu is capped to the dynamic viewport height below the header, with internal vertical scrolling and overscroll containment. Existing dismissal, keyboard and aria-expanded logic is unchanged.

Safe-area insets are used as maximums with ordinary edge padding; no viewport-fit change was added. Browsers that already exclude notch regions report zero insets, avoiding extra narrowing. Text-size-adjust stays at 100% in this viewport shape, preventing orientation text inflation without disabling page zoom.

Shared title bands now have 24px block padding and 30–36px headings. Topic/story headings, generic section gaps and Find Us follow the same compact rhythm. The same shared grouping covers the family, care, fellowship and life-event templates found during the broader public-page audit. Lead text stays at 17–18px. Home and Visit retain their genuine image sources, using short-screen side-by-side layouts instead of tall portrait stacks. About and History retain their photographic blends with shorter text compositions. War Memorial keeps all historical text and its full portrait photograph; it is intentionally not forced into a fixed-height screen. History dialogs and their behaviour are unchanged.

site.js changes only the header stylesheet version URL so the new CSS is requested. It does not change navigation logic. No public HTML source or original image asset changes are required.

## Measurements and visual comparison

At 874 × 402: header 71 → 57px; closed menu 331 → 198px; Community hero 247.47 → 149.38px; heading 48.07 → 34.96px; Home hero 439.91 → 258.75px; Visit’s 940px portrait stack becomes a compact side-by-side introduction, with its image sized by the text row rather than its intrinsic portrait height. The menu now leaves page content visible, maintains finger-sized controls and shows no green side strips. The Community hero no longer fills the short screen: the following section and photograph are visible immediately below it. These address the two supplied real-iPhone screenshots without changing the site's identity.

## Reproducible browser checks

`scripts/check-phone-landscape.cjs` follows the existing optional Playwright-check pattern. Set PLAYWRIGHT_MODULE to an installed Playwright module and optionally PLAYWRIGHT_CHANNEL (default msedge). LANDSCAPE_LIVE_SMOKE=1 runs the representative pages at 874 × 402 plus the full extra-template, orientation and accessibility checks. Run it locally with Node, or set LANDSCAPE_BASE_URL to the deployed Dev base URL. Screenshots are written outside the checkout to phone-landscape-verification.

Representative pages: Home, Worship, Visit & Learn, Church Community, News, About, Our History, Churchyard, War Memorial, Norman Architecture, Our Churches, Our Vision, Our Team. All other search-indexed public templates are also smoke-tested at 874 × 402.

Matrix: portrait 320 × 800, 390 × 844, 430 × 932; phone landscape 667 × 375, 740 × 360, 812 × 375, 844 × 390, 852 × 393, 874 × 402, 932 × 430; tablet 768 × 1024 and 1024 × 768; desktop 1280 × 900 and 1440 × 1000. These are CSS viewport sizes, not physical image pixel dimensions.

Checks include menu closed/open, every expandable section and all its links, scroll reachability, bottom Calendar access, minimum tap heights, overflow, heading sizes, header/menu bounds, keyboard opening/Escape/focus return, and portrait → landscape → portrait recovery without reload. Existing typography alternatives and reduced motion are also checked. The browser used is desktop Edge/Chromium with specified viewports; screenshots are compared to the supplied iPhone evidence, but this is not a physical iPhone/Safari test.

A separate before/after geometry/style baseline covers all 13 representative pages at all seven non-phone-landscape sizes (91 samples). Header, heading, section geometry and computed styles match within 0.1 CSS px; the only raw differences are 0.015625px font rounding. Thus portrait, tablet and desktop layouts retain their existing composition.

Production build passed. The 30 relevant existing tests have 28 passes and the same two failures on unchanged Dev: `promotion preserves existing homepage and is excluded from static search`, and `public HTML changes only refresh the shared header script cache` (its historical baseline lacks _templates/contact.html). These historical snapshot failures are outside this responsive change.

Local results: all 182 representative page/viewport combinations passed navigation checks; all 51 indexed public pages passed landscape smoke checks; orientation recovery, typography alternatives and reduced-motion checks passed. No remaining responsive defects were found in these emulated states. Real iPhone/Safari rendering remains a device-level verification limitation.
