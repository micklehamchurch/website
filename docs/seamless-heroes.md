# Seamless approved photographic heroes — Phase 2

Starting Dev:3af1e91af8483c67898693e8e8ef5da30174526b. Home/main are excluded. The supplied mock-up is a composition reference only; no photograph is generated, substituted or added.

## Deliberate page patterns
A. Seamless photographic hero: the eight explicitly approved routes below, subject to narrow-layout exceptions.
B. Section landing: Phase 1 shared garden navigation header with existing coloured/editorial hero, e.g. worship.html.
C. Editorial/content: Phase 1 garden navigation header and ordinary reading content, e.g. church-building.html.
The opt-in map is central in site.js. Other public internal pages remain Phase 1; Home, Admin/auth, immersive/utility exclusions remain unchanged.

## Single composition architecture
The original semantic img/picture stays in its original position, retaining its exact responsive selection, alt text and layout contribution. After decoding the already-selected currentSrc, one aria-hidden decorative image is painted in a single layer spanning the existing header and photo area. The original is visually suppressed with opacity only in screen media; it remains the single semantic image for assistive technology. No independent header background-cover image is rendered, and the generic Phase 1 image is not requested on seamless layouts. Existing CSS editorial overlays are coordinated in the same layer, including Find Us's ::before treatment. Side photographs keep their original width/left edge; image-first mobile life-event layouts extend only the photo area, leaving separate copy areas unchanged. No font, wording, controls or image assets change.

Original header border width stays1px, with transparent colour at the seamless top state, so dimensions remain exact. A green navigation shade is90% through most of the header,86% at its bottom, tapering away25px below it; existing ivory/green editorial shades preserve hero-copy readability. At scroll the existing fixed/condensed controls keep their geometry and use a safe solid-green header. Image failures preserve the original hero and functional green header. ResizeObserver and requestAnimationFrame coordinate paint bounds only; no changes to breakpoints, sizes, margins or copy positions. The print view hides the decorative layer and retains the original images. No image-loading fetch/API is introduced.

## Narrow-layout exceptions — deliberately not forced
About at <=600px and History at <=760px put copy before their photo. Visit at <=900px uses a separate copy/photo composition, including its established short-landscape adaptation. These retain Phase 1 to avoid recropping a full tall composition that hides subjects, or changing the approved copy treatment. The module detects the actual stacked photo geometry, and also honours Visit's existing900px boundary; it restores the existing photograph and Phase1 stylesheet. It recovers correctly when resized back to a suitable wide layout. Thus all eight are seamless in suitable wide layouts; five are seamless throughout the tested matrix and three deliberately retain narrow fallbacks. No page is redesigned to force compliance.

## Assets, crops and dimensions
Existing responsive image URLs are reused, including query versions. No derivatives or source files are modified. Default focal points follow each original image's computed responsive object-position. Page-specific adjustments: Pastoral50%55%; About wide50%42%; History wide50%30%; Visit wide50%41%. Baptism original80%55%/65%50%; Wedding78%50%/70%50%/64%0; Funeral85%50%/65%50%; Find Us62%50%/50%50%. The same crop is shared across header and photo, not independently recomputed for each box.

| Route | Existing hero assets (under assets/) | Hero height at1600px before→after |
|---|---|---|
| baptisms.html | images/baptisms/font-640.webp; images/baptisms/font-1536.webp | 760.00→760.00px |
| weddings.html | images/weddings/hero-640.webp; images/weddings/hero-1536.webp | 830.00→830.00px |
| funerals.html | images/funerals/candles-640.webp; images/funerals/candles-1536.webp | 780.00→780.00px |
| about.html | images/about/church-card.webp; images/about/church-hero.webp | 352.84→352.84px |
| our-history.html | images/about/church-hero.webp | 375.08→375.08px |
| pastoral-care.html | images/peace/garden-640.webp; images/peace/garden-1600.webp | 296.59→296.59px |
| visit.html | images/visit/st-michaels-960.webp?v=20261010-v2; images/visit/st-michaels-1440.webp?v=20261010-v2 | 769.22→769.22px |
| finding-us.html | images/visit/st-michaels-960.webp; images/visit/st-michaels-1440.webp | 255.33→255.33px |

Header heights remain89px desktop,81px condensed,79px compact/tablet,113px phone portrait,57px short landscape. All64 measured page/viewport combinations preserve header/hero/heading bounds and following-content offsets exactly. Pastoral uses the full15-size matrix; every other page uses representative portrait/landscape/tablet/desktop sizes. Sizes:320,375,390,430;667×375,740×360,844×390,874×402;768×1024,1024×768;1280,1366,1536,1600,1920.

## Validation
scripts/check-seamless-heroes.cjs records before/after/live geometry and screenshots (baseline must be captured from prior Dev). scripts/check-seamless-quality.cjs checks image reuse, header contrast/axe, failure fallback and responsive recovery. Real browser request counts show exactly one request for each selected hero URL, and no generic garden header request in seamless layouts. Existing responsive sources are not rewritten. Header contrast passes4.5:1, including all tested crops; fallback uses unchanged Phase1 contrast. Existing semantic image descriptions are retained. Home's HTML/assets/styles remain unchanged; internal public HTML changes only the shared script cache parameter headerPhoto=20261024-2. Existing original page CSS, photography and textual content remain unchanged.

Lowest measured gold header contrast in the quality matrix: 5.10:1.

## Final visual polish (Dev, 24 October 2026)
Baseline: 316c0007defc6de4ebe1f281b6c7832abf7e8233. No photograph or geometry changes.

The pale Baptisms/Weddings/Funerals editorial washes made the navigation overlay's 25px post-header tail look like a fuzzy horizontal strip. Toggling only that overlay removed the strip; there was no filter, mask, duplicate image or mismatched crop. Longer fade experiments made the haze more conspicuous and were rejected. Above 900px, these three pages now retain the dark navigation plateau but finish its tail 10px below the header (86% at header minus 1px, 40% at plus 4px, transparent at plus 10px). Narrow layouts retain their existing treatment.

Weddings above 900px uses 64% 20% object-position instead of the original desktop 64% 0. At 1600px this raises the image about 47px, placing the spire tip within the navigation photograph rather than at its lower edge. The architecture and couple remain visible. Narrow focal points are untouched.

Visit retains its original left overlay through 45% of the image, including the entire copy area. Only the right-hand fade finishes earlier: 68% rather than 75%. This removes at most about 9.3 percentage points of green overlay opacity in that region; there is no image brightness/filter change. An earlier trial reducing the middle stop was rejected because it reduced copy contrast. The overlay stops covering the copy area are unchanged. The dark navigation gradient is retained.

Pastoral Care, About, History and Find Us have no CSS changes and are pixel-identical in browser comparisons. Home, ordinary Phase1 header styling, original assets, page CSS, structure, copy and controls are unchanged. The shared script and stylesheet cache parameters are bumped so existing visitors receive the new CSS. Internal HTML changes are cache parameters only.

Validation: 44 polish page/viewport comparisons (320,375,390,430,874x402,768x1024,1024x768,1280,1536,1600,1920), plus the existing 64-layout geometry checks. Header/hero/copy/following-content bounds remain identical; no overflow. Existing quality checks verify one hero URL request, header contrast and axe, image failure fallback and narrow fallback recovery. Before/after screenshots and diagnostic experiments are retained outside the repository in seamless-polish/. Focused tests:17 pass; full suite:523 pass,14 unchanged pre-existing failures out of537.
