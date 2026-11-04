# Whole-card involvement links — functionality only

Starting Dev: `1d40b78d66497830630882cda08b8c63187d9c0d`.
Starting main: `804a189ae8b09e8a88f4bb98947af0e9fcb34c30`.

The homepage's three “Ways to get involved” cards keep their exact HTML. No card/article is replaced, no inner link is duplicated, and all copy, images, image attributes, CTA text/arrows and link attributes remain byte-for-byte unchanged. Their existing native links are:

* Eco Church: `eco-church.html` (same tab).
* Support our church: `give.html` (same tab).
* Diocese: `https://www.cofeguildford.org.uk/`, `target="_blank" rel="noopener noreferrer"`.

Four CSS rules extend each existing anchor's transparent `::after` hit area to its relatively positioned card. This preserves the one existing semantic anchor and keyboard stop per card, with no nested links, click handlers, new controls or runtime JavaScript. The hit area uses the card as its containing block; it does not participate in layout. Images, headings, descriptions, the original CTA and empty padding all activate the same native link.

On keyboard focus only, the same existing gold three-pixel outline is drawn around the full hit area rather than the small CTA. Normal and pointer-hover rendering are unchanged. No hover selector, animation, transition, transform, colour, background, shadow, typography, spacing, grid or card-size rule is added. Every original byte of `home-bottom.css` is retained as the prefix; only the functional/focus rules are appended. The existing manifest versions that source and rebuilds the existing initial CSS bundle/hash.

`test/home-involvement-links.test.cjs` checks unchanged homepage markup apart from the CSS delivery hash; the three exact URLs and external attributes; one original anchor per card; the original stylesheet prefix; absence of new visual/hover declarations; unchanged surrounding systems; and deterministic bundling. One older stylesheet freeze now defers this authorised extension to that more specific independent test.

`scripts/check-home-involvement-links.cjs` renders the starting Dev source and the result in the same browser engine at identical sizes. Starting HTML and CSS are read from Git, not reconstructed. It waits for the actual fonts and card images, captures the grid before/after and compares decoded PNG pixels. Unrelated fixed header/feedback/skip-link overlays are hidden in both comparison captures to avoid obscuring tall mobile grids; no card styling is overridden. It also compares card/image/text/CTA geometry and their computed visual styles. Pointer-hover captures must be identical too.

Edge and WebKit cover 1600×1000,1280×800,1024×768,834×1112,768×1024,430×932,393×852,375×667,320×568,852×393 and568×320. Tests click the image, heading, description, existing CTA and empty padding of every card at every size. Internal links navigate normally; the Diocese destination is intercepted in the test to verify its exact popup URL and null opener without depending on the external website's availability. Keyboard focus/activation, one-link focus structure and overflow are also checked.

The Dev content workflow recognises this narrowly scoped release and rebuilds only the homepage CSS bundle. It never regenerates Calendar, service data, Search, News or unrelated page content.
