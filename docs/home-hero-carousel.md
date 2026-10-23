# Homepage hero photography carousel — Phase 1

## Preserved layout

The original `home-hero-v3.css` is unchanged. Above 600px the photo frame remains 4786 / 2409 (approximately 1.987:1), minimum 320px high; inside the unchanged 1600px site shell this measures 1600 × 805.34px. At 1280px it is 1280 × 644.27px. Phone photography remains 8:5 with the welcome block below it. Existing short-landscape header rules retain their photo/text grid (874px: hero height 258.75px; 568px: wrapping content determines the existing taller frame). The first picture reserves geometry; subsequent layers are absolute. The heading, quote, CTA positions, quick-card overlap and Moment of Peace entry are unchanged.

## Genuine photographs and derivatives

Sources remain untouched in the supplied original directory. `assets/images/home/hero-sources.json` records original filenames, dimensions and SHA-256 hashes. No generation, sky replacement, retouching, architecture manipulation or colour grading is used. The exact pre-carousel E6523 assets are restored as the first/default slide, without replacement or recompression. All six existing JPEG/WebP files are regression-checked byte-for-byte against pre-carousel commit 1c52b837b391f4d833746874343ff64488103f95.

1. `original` — IMG_E6523.JPG, the established pre-carousel photograph. Reuse `ed-popov-e6523-v2-tablet.webp` (1920 × 1080) and `ed-popov-e6523-v2-large.webp` (3200 × 1800) as a responsive srcset, with the exact existing progressive large JPEG fallback. Reuse `ed-popov-e6523-v3-mobile.webp` (960 × 600, existing approved crop) on phones and the smallest landscape frame. Desktop focus is the original 50% 62%; phone 50% 50%; short landscape 40% 50%, cover. No new E6523 derivatives are needed.
2. `exterior` — IMG_E6550.JPG, 5712 × 3213. Second slide, after the established original. Desktop focal point 50% 20% retains the spire and entrance in the shallow frame. Phone 50% 50%. The smallest short-landscape crop concentrates on the tower and entrance.
3. `memorial` — IMG_E6555.JPG, 5712 × 3213. Desktop 50% 70%; phone uses the complete scene aligned to the top with contain; short landscape uses contain to protect the whole Mary Munday board. The smallest landscape crop retains both board posts.
4. `churchyard` — IMG_E6530.JPG, 8064 × 4536. Desktop 50% 62%, phone 50% 50%, short landscape 35% 55%, retaining side architecture, graves and autumn foliage.

Each of the three newer photos has WebP 640 × 360, 960 × 540, 1600 × 900, 2560 × 1440; an 800 × 500 phone derivative (memorial 800 × 450, full scene); a 640 × 640 derivative for landscape widths up to 650px/460px height; and a progressive 1600 × 900 JPEG fallback. No upscaling. Rebuild with `node scripts/build-home-hero-images.cjs ORIGINAL_DIRECTORY` and Sharp installed (or set SHARP_MODULE to its module path). Source files are never written.

`home-hero-photos.js` owns photo names, sources, responsive focal settings, fit overrides and timing. Add a definition plus derivatives to extend the set; keep approximately 3–5 photos. The initial original picture/preload remains explicit HTML for predictable LCP/no-script rendering.

## Behaviour and accessibility

8-second interval, 1.4-second opacity cross-fade, no zoom/slide/parallax. Foreground content never transitions. Real named Previous/Next buttons, four position buttons with `aria-current`, and an explicit Pause/Resume button. All controls have 44px hit areas and visible focus. No live region announces automatic scenery changes. Hover, focus within hero, explicit pause, active touch and hidden documents stop automatic progression. Leaving interaction starts a fresh interval; a pending automatic image load also rechecks pause state before displaying. Reduced motion disables rotation, warming and fades, but keeps manual selection. Touch requires 65px horizontally with 1.8× horizontal dominance, at most one second; cancellation/vertical scrolling is not hijacked (no preventDefault or touch-action restrictions).

The unchanged shared green header remains readable over all scenes. One consistent subtle edge gradient at widths where the quote overlays the photograph supplements the existing text shadows; there are no photo-specific header themes. No captions.

## Loading and performance

Only the original's matching responsive preload is active. First image high priority; other photos low priority. After first decode, wait 1.6 seconds before warming only the next image. The third and fourth images each wait until their predecessor is selected. Decode completes before display; a failed image leaves the existing photograph visible, and another selection retries it. No-script rendering keeps the original visible.

Restored DPR-1 desktop first photo: the existing 1920px WebP is 403,184 bytes (previous three-photo carousel first image 262,328; pre-carousel fixed large image 828,104). Phone first image: the exact pre-carousel 134,282-byte mobile WebP (previous carousel first image 73,986). Four-photo totals at DPR 1: desktop 1,545,382 bytes; phone 447,474 bytes, deferred across rotation. Higher DPR can select the original 3200px file plus newer 2560px files (all four: 3,606,744 bytes). Three small additional initial resources: photo definitions, controller and CSS. The existing hero stylesheet, header, APIs and shared shell are unchanged. Browser timing and overall CLS include existing dynamic header/font/verse activity; distinguish this from slide-induced CLS, which must remain zero.

## Verification

`node --test test/home-hero-carousel.test.cjs test/home-content.test.cjs` protects definitions, gestures, no-script/preload, fixed foreground and later content. `scripts/check-home-hero-carousel.cjs` runs 14 sizes and captures all four images at each size, fixed hero/text/cards geometry, overflow, touch targets, keyboard/manual/reduced-motion/real-time automatic progression, hover/pause/focus, failed-photo recovery and no-script fallback. Set PLAYWRIGHT_MODULE when needed and HERO_BASE_URL to the actual Dev URL for live verification. Screenshots/reports are written outside the repository.

Existing unrelated full-suite fixture/snapshot failures are reported separately; no API, Azure, authentication, Admin or main changes are required.

On the smallest landscape photo column, the separate Pause button sits just above the arrow/dot strip so four dots and both arrows retain their 44px targets without clipping. Other layouts retain the existing control arrangement.
