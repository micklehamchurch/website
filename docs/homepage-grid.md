# Homepage content grid — Task 20

Starting Dev: 3cdd662d5bbfb2637e279dc3658154ae76f03529.

Existing widths: shared base container1180/1240px; shared desktop header1280px;
Task19 hero frame1600px above1600px; homepage navigation, parish, editorial,
involvement and footer structural containers1440px/92%. The duplicated lower
rules were consistent externally, but parish-row padding added an accidental
20px inset to its headings/images above900px. Card padding and text reading
widths are intentional and retained.

`home-grid.css` is linked only on the homepage and scoped to its body class.
It consolidates the three repeated homepage width declarations into one rule
using --home-content-max:1440px and --home-content-gutter:clamp(16px,4vw,64px).
Container width is min(1440px,100% minus twice that gutter), centred. Once capped,
actual outer margins grow equally with the viewport. The homepage footer uses
the same rule without modifying the shared footer stylesheet. The parish row
has no additional horizontal inset. No changes to card design, gaps, wording,
fonts, links, imagery, responsive grid-column breakpoints or functionality.

The existing1280px header remains centred and compact. Task19's1600px hero,
quote/welcome positions and full-bleed image are byte-for-byte unchanged.
Their relationship is intentionally nested; this is not one forced global width.

Responsive checks:320,390,768,1024,1280,1440,1600,1920,2560,3432px. Common left/right
edges, parish edges, no horizontal overflow, stacking,44px tiles, focus and hover
verified. Header/hero geometry compared against pre-grid CSS at every width.
Full-page screenshots at1440,1920,2560,3432, with and without red guide lines;
guides are injected only by the browser verification script, never site code.

Build passed. Full suite473:459 passed,14 failures with exactly the same names as
Task19 (existing historical snapshot/data/order assertions). Focused homepage
header/public-script checks9/9 passed after build. Screenshot/script artifacts
are in ../homepage-grid-verification. Run scripts/check-home-grid.cjs with an
installed Playwright module; HOME_GRID_BASE_URL selects deployed Dev verification.

Additional checks passed: lazy-loaded image decoding did not shift the editorial
section; injecting the scoped sheet left History, Churchyard and Calendar main
and header geometry unchanged. Guide lines are never part of deployed CSS/HTML.
