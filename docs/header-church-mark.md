# Approved church illustration in the header

Starting Dev: `7c59836829e2f4fab0068bc57321243e7306870c`.
Main recorded unchanged: `804a189ae8b09e8a88f4bb98947af0e9fcb34c30`.

Only the header's circular cross is replaced. `site.js` supplies an image with empty alt text, explicit 80×77 intrinsic dimensions and asynchronous decoding; the existing church name supplies the home link's accessible name. The existing mobile controller clones the real branding into its drawer, so it automatically uses the same SVG. The footer cross, church name/subtitle/fonts/colours, categories/dropdowns, Safeguarding/Policies links, opening information and all page bodies remain unchanged. Shared cache references are refreshed centrally.

## Asset and provenance

`assets/images/branding/church-illustration.svg` is a transparent, path-only vector traced directly from the user-supplied approved artwork `codex-clipboard-69af24f4-4d24-45ed-a870-74328273ae20.png` (2172×724). The church occupies crop x45/y40 through x675/y645. The crop excludes all generated lettering. Light paper and building gaps are transparent; the header ivory shows through. The recognisable spire, gold vane, blue/gold clock, porch, buttresses, arched nave windows, turret and small shrubs are retained.

The raster image-generation skill was used to assess a transparent extraction, but its linework differed slightly. It is not shipped. The delivered asset instead traces the approved original directly: a three-colour separation followed by VTracer 0.6.15 spline tracing and SVGO optimisation. The SVG contains no raster image, lettering, background rectangle, scripts, external resources or font dependency. It is about 58KB uncompressed / 25KB gzip, fetched as one browser-cached resource shared with the drawer. No new runtime library is added.

The image-generation assessment prompt requested only a faithful church cutout, preserving the existing spire/vane, clock, porch, nave and turret, removing all text/ivory background, with genuine alpha and no new architecture, decoration or shadow. Built-in tool mode was used, not an API/CLI image generator. That assessment is kept outside the website; the original artwork remains the delivered vector's source.

## Responsive dimensions

* Expanded desktop ≥1536px: 80×80 CSS box, preserving aspect ratio with `object-fit:contain`.
* Compact desktop and standard tablet/laptop: 52×52.
* Narrow tablet/phone ≤767px: 44×44.
* Short landscape ≤999px wide/460px tall: 36×36.
* Native drawer branding: 44×44.

Header heights remain 109px expanded desktop, 81px condensed desktop, 79px tablet/laptop, 113px phone and 57px short landscape. The SVG scales without raster blur; small architecture naturally resolves into the recognisable church silhouette at phone sizes. No header-height or hero-position change is required.

## Checks

`test/header-church-mark.test.cjs` checks exact header-only markup/style changes, all other shared behaviour, footer, safe/lightweight vector content and preservation of every public page body apart from central cache references. Existing historical preservation tests discount only the exact authorised logo/style/cache changes through a small test helper; actual feature tests inspect the real source.

`scripts/check-header-church-mark.cjs` reuses the previous header's complete functional/responsive checks and adds image decoding, source URL, decorative alt, mark dimensions, header-height preservation, bounds and text alignment assertions. Edge and WebKit cover 14 sizes each, including 1920/1600/1536 desktop, 1440/1280 laptop, tablet portrait/landscape, 430/393/375/320 phones and 852×393/568×320 short landscape. It verifies the current information links, dropdown keyboard/Escape/focus return, Search, Bible, Calendar, compact state, drawer and enlarged mobile text. Actual desktop/phone/drawer screenshots are inspected.

The Dev content workflow recognises this presentation-only release and rebuilds cache references and the home CSS bundle without regenerating page bodies, Calendar/service data, Search or Churchyard.
