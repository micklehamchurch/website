# Shared public header redesign

Starting Dev: `4765effb004e9081ac0dc8b3ba9d6ab38167a3f5`. Main is outside this change.

## Architecture and appearance

`site.js` still defines one navigation tree for every standard public page. `responsive-navigation.js` moves that tree into the existing native right-side dialog; it does not clone navigation or replace its focus/scroll-lock system. The confirmed YouTube channel remains in the shared footer.

`header-navigation.css` consolidates the header styling. Existing short-landscape content/hero layout rules from that sheet are retained unchanged. The existing green `--deep`, cream `--cream`, and pale warm gold `#e7d8b7` are used. Search and Calendar are outlined circular controls, Bible an outlined book-and-label pill, and Plan your visit the filled cream action. Service is now Services; all destinations and submenu lists remain unchanged.

The desktop boundary remains 1360px: its condensed row fits the identity, six navigation entries, and four actions with 14px navigation text. Below that, the existing compact header/drawer is retained, including Calendar. Portrait phones use two rows; short landscape remains one safe-area-aware row with 44px controls. Drawer links have 44–48px targets and a Visit action after Contact/Find Us.

`public-header.js` identifies appropriate photographic heroes by their structural photo elements, not page URLs. Desktop photo pages use an 82% deep-green tint; compact/non-photo/scrolled headers use solid deep green. Foreground hero text is spaced below the new header without modifying any image or crop. After 64px scrolling, desktop header condenses from 145px to 81px. A stable non-photo spacer prevents document movement. The embedded Bible reader hides that spacer along with its existing hidden header. Old homepage-only header files remain tiny compatibility shims; the homepage no longer requests them.

Pointer hover and click both work. The first click on a hover-open menu keeps it open; a further click closes it. Keyboard retains Enter/Space, adds Up/Down/Home/End within submenus, closes an expanded submenu with Escape, then permits normal drawer dismissal. Native modal focus trap, return, backdrop close, resize restoration and scroll lock remain intact. Reduced motion disables the header transition.

## Build and verification

The central `build-typography-preview.js` hook updates shared-script cache versions on standard public documents. Generated HTML changes are cache URLs only, apart from removing the two obsolete homepage header hooks. Admin is excluded. No Azure/API, authentication, storage or publishing workflow changes.

- Build passed; focused header/Bible/Peace/landscape/shell tests: 27 passed.
- Full suite: 505/519 passed. The same 14 pre-existing contact, Calendar, clergy, footer/homepage snapshot, verse and gallery fixture/version failures remain. Obsolete frozen header/animated-cover assertions were replaced by the new approved header expectations.
- Browser matrix: 14 widths/heights from 320px to 2560px, across homepage, Calendar, Baptisms and History. Tests cover whole header targets, desktop hover/click, keyboard, drawer trapping/return, backdrop dismissal, scrolling, rotation, single-tree preservation, overflow and all header link destinations.
- All 54 standard public pages checked at tablet size for shared header, Search/Calendar/Bible and overflow. Home, Search, Calendar, Bible from header and drawer, Visit and Peace controls exercised at desktop/tablet/portrait/landscape sizes. Feedback is verified on its allowed live origin, not localhost.
- Axe WCAG A/AA: zero header/drawer violations. Lighthouse Accessibility: 100 homepage and 100 Calendar. Calendar has a pre-existing unscored event-button label/name warning outside the header; its content is unchanged.
- Rendered brightest-background contrast across seven existing hero pages: ivory >=6.48:1, gold >=5.10:1. Conservative pure-white-under-tint ratios: 6.52:1 and 5.13:1. Solid header ratios: 11.40:1 and 8.97:1. Visit button: 11.40:1.
- Shared asset footprint is about 1.4KiB smaller compressed, including the new small state script. No runtime libraries, raster assets or fonts added. QA dependencies are outside the repository.

Run `scripts/check-global-header.cjs` with Playwright available via `PLAYWRIGHT_MODULE`; optional `HEADER_BASE_URL` selects a deployed site. Axe defaults to the isolated local QA installation, or can be supplied by `AXE_CORE_PATH`. Screenshots and diagnostics are saved outside the repository in `../green-header-verification`.

Live keyboard verification identified that a native skip jump could put the non-photo heading partly under the condensed header. A shared main-target scroll margin fixes this; the skip link still focuses the original main element and remains the first keyboard destination.
