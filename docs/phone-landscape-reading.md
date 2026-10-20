# Physical-phone landscape readability correction

The user's physical photograph is the design evidence. No-overflow checks alone previously missed a 154px header and three 234px History text columns at 874×402. A legacy `.site-header .nav-utilities {flex-direction:column}` survived the newer compact header rules, which reset gaps but not direction. Several page grids stack only at 600/700/760px, leaving phone landscape in a small-tablet composition. These are CSS cascade and layout issues, not device-pixel-ratio scaling fixes.

## Scoped correction

`phone-landscape.css` is loaded after the shared header stylesheet by `site.js`. All declarations are inside orientation: landscape, max-width:999px, max-height:460px; the narrow one-column fallback is max-width:699px within the same height/orientation constraints. Outside those conditions it has no visual effect. This includes future public pages using the shared components.

- Header utilities explicitly form one row, preserving identity and Search/Calendar/Bible/Menu; header 57px, controls at least44×44px. Existing menu logic/drawer remains unchanged, including its scrolling, dismissal, focus and keyboard operation.
- Body copy stays at least16px with1.6 line height. Eyebrows/kickers remain small labels; body text is not scaled down.
- Shared text-card, news, History, clergy, family, care, fellowship, gallery and life-event feature grids use two columns at wider phone landscape and one for text-heavy cards below700px. Longer editorial splits stack. Decorative portrait compositions and the seven-day Calendar grid are exempt.
- History dates/titles/summaries stay a two-part timeline, thumbnail removed only in this viewport shape. History dialogs/content remain unchanged.
- Weddings/Baptisms/Funerals source content and page styles are untouched. Shared landscape overrides reflow introductory values/planning and stack longer editorial copies, preserving their visual identities and photographs. Existing short-screen heroes remain.
- Feedback becomes a44px speech-bubble control in this viewport shape, reducing its footprint from the wide text pill. The original text/name stays in the DOM and remains accessible; dialog/API/permissions are unchanged. Safe-area edge expressions remain, with modest maximum-based padding, not additive guessed notch spacing.

## Verification

`scripts/check-landscape-reading.cjs` checks16 representative pages at eight landscape sizes (128 combinations), including3× device pixel ratio at874×402. It tests computed readable text size, no horizontal overflow, maximum two content columns, utility-row alignment,57px header,44px targets, every expanded menu and reachable submenu links, Escape/focus, Bible and live Feedback. Search/Calendar destinations are requested. History screenshots at844×390,874×402,932×430 are saved outside the checkout. A stylesheet-disabled baseline records the actual previous header/columns.

64 non-landscape comparisons cover390×844,768×1024,1024×768,1440×1000. Geometry and fonts for header/main/headings/body are compared with the new sheet enabled/disabled. These are browser/viewport tests, not physical-device testing or a Safari/notch hardware certification. Real safe-area values remain supplied by the browser. The user's device photograph remains the physical evidence.

Set `PLAYWRIGHT_MODULE` and optional `READING_BASE_URL=https://micklehamchurch.github.io/website/`. Screenshots/results: `../landscape-reading-verification`. Unit regression: `node --test test/landscape-reading.test.cjs`; normal build and broader tests also run. Existing content-fixture failures must be reported separately.

Initial checkout:083e1342a2d0178349cbe3b1650b25f215cb15b7. During the task, Dev advanced legitimately to4751edeaf5e4fb21f84e01b9a5da3ce3e9571718 (Bible session cache and calendar updates); those commits were preserved by fast-forwarding before committing. Main remains804a189ae8b09e8a88f4bb98947af0e9fcb34c30.
