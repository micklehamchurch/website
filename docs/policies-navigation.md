# Policies and documents disclosure

Starting Dev: `c91f7942d71a2ff5ac769675329f23adec5ff657`.
Main: `804a189ae8b09e8a88f4bb98947af0e9fcb34c30`.

The shared public-header enhancement loads a small scoped stylesheet and script. The existing direct Policies anchor remains usable if enhancement assets fail. After successful loading, a semantic button controls one named navigation section; ordinary links and native Tab navigation are retained. No ARIA application-menu roles or desktop focus trap are introduced.

At the existing 1536px desktop breakpoint, the panel overlays the page beneath the fixed header. ResizeObserver and passive scroll updates follow the expanded/condensed header without changing page layout. The 220ms opacity/short-slide opening animation is omitted for reduced motion. The panel is bounded by the available viewport height, with internal scrolling when necessary. Hidden content is inert. Escape returns focus to the trigger, or the visible brand link if the existing compact header has hidden its information row. Outside click, destination selection, focus departure, page lifecycle and responsive mode changes dismiss it.

Below 1536px the same panel moves into Important information in the existing native mobile drawer. It becomes a compact expandable list; no second modal, photograph or desktop columns appear. Closing the drawer also clears the disclosure state.

## Confirmed destinations

- Safeguarding: `safeguarding.html`.
- Baptisms: `baptisms.html`, existing practical guidance (not an invented policy).
- Churchyard: `churchyard-regulations.html`, unchanged.
- Other policies: `policies.html#policies-3`, existing Privacy and other documents section.
- View all: `policies.html`, unchanged central hub.

All URLs resolve against the actual shared site script, so root and nested article pages use the same destinations.

## Photograph

`assets/images/about/church-card.webp` is the existing genuine St Michael's exterior (720×405, approximately 66KB). The previous navigation audit also identifies this source for `assets/images/navigation/visit-480.webp`. The original is reused without modification and downloaded only when opening the desktop panel. No new image derivative or fictional imagery is introduced.

## Preservation and validation

Existing header markup, logo, navigation categories, stylesheet, responsive drawer implementation, public pages, documents, hero, service/Zoom behaviour and homepage cards remain unchanged. Only the additional Policies disclosure is loaded by the shared header. Focused preservation tests enforce that boundary. The Dev workflow recognises this narrow asset-only release without rebuilding public content projections.

The browser checker covers desktop and drawer layouts, expanded/compact header positions, short landscape screens, keyboard focus/activation, toggling, outside click, Escape, responsive dismissal, nested routes, destinations, reduced motion and existing Search/Calendar/Bible/main-navigation functionality. Delivery evidence records results and screenshots separately.
