# Centred floating landscape navigation — 17 October 2026

Starting Dev: 4177824db5521cee7a5d8bd5baaa24b237e3652e.
Main before work: 804a189ae8b09e8a88f4bb98947af0e9fcb34c30.

## Design evidence and scope

The supplied physical-iPhone photograph and equal-gap diagram are the design evidence available in this request. The polished second mockup mentioned by the pasted brief was not attached. The written styling requirements supply the ivory/green, restrained border/shadow, centred panel, one-column rows and backdrop direction.

The existing short-landscape query remains `(orientation: landscape) and (max-width: 999px) and (max-height: 460px)`. All previous closed-header, hero, typography and other landscape rules remain unchanged. No page content, image asset, navigation label/hierarchy, admin, hosting or main-branch change is involved.

## Real navigation in a native modal

landscape-navigation.js progressively enhances supported browsers. It moves the existing #mainNav into a native labelled dialog only while the landscape panel is open. Links, Search, Calendar, submenu buttons and their existing handlers are reused, not duplicated. A comment marks the original header location, and closing restores the original node there. Without native dialog support or if the enhancement does not load, the previous single-column scrolling menu remains available.

site.js loads the enhancement and routes existing backdrop/Escape handling to it while open. The legacy shared public-dialog mechanism otherwise remains unchanged; its regression tests pass. The original header button opens the panel; one 44px × control in the panel closes it. The native top layer makes the background inert and prevents its controls receiving focus/pointer interaction. The panel has an accessible title and semantic Main navigation landmark, maintains aria-expanded, wraps Tab/Shift+Tab within visible controls, and returns focus to the original menu button. The page's scroll position is held while open and restored afterward.

If an already-open portrait menu rotates into landscape, the same navigation is moved into the panel. Rotating back restores the normal portrait menu, including expanded state, without a reload or a new menu hierarchy.

## Centre, safe areas and scrolling

The panel width is `min(820px, viewport width minus two equal gutters)`. Each gutter is the maximum of 5vw, 16px, and the browser-reported left/right safe insets. Applying the larger inset symmetrically keeps approximately equal visual breathing room and protects either notch side. At ordinary 874px width this is about 43.7px on both sides. Width 932px is capped at 820px, leaving 56px per side. Safe-area values are not added to padding already supplied by the browser; zero insets retain the ordinary 5% spacing.

The panel is vertically centred, with maximum height based on 100dvh minus the larger of 10px and the top/bottom safe inset. Rounded ivory surfaces, thin separators, dark-green labels and a restrained shadow sit above the real current page. The native backdrop provides a translucent dark-green dim and 1px softening. No background image is substituted.

The close/title bar does not scroll. Only the panel's content wrapper scrolls, with overscroll containment and native touch scrolling. Submenus remain directly below their parent. Rows stay at least 44px high. Search flexes with a compact 160px basis; Calendar shares its utility row when both fit and wraps underneath on narrower panels. No device-specific secondary breakpoint is used.

## Closing and motion

- The × control closes the panel.
- A backdrop tap/click closes it; padding/title/other inside clicks do not. A drag starting inside cannot be reinterpreted as an outside tap.
- Escape follows the same close path and returns focus.
- Passive touch observers recognise an optional backdrop-only upward swipe: at least 70 CSS px upward, at most 48px horizontal drift, completed within 1200ms. A 35px movement or a horizontal swipe does not trigger it. Multi-touch cancels recognition. No touch event is prevented, and gestures starting inside the panel are never captured; they continue scrolling the menu. Safari browser gestures and pinch zoom remain under browser control.

Opening uses a 140ms fade with a 4px movement; closing reverses it over 100ms. prefers-reduced-motion skips these decorative animations entirely. The backdrop is not an extra scroll container.

## Verification

Production build and 22 relevant Node tests pass: navigation, shared dismissal, History, Visit and About. The dedicated optional Playwright script scripts/check-landscape-panel.cjs tests native touch events at 568×320, 667×375, 740×360, 812×375, 844×390, 852×393, 874×402, 932×430, 844×300 and 874×280. It covers all submenu links, panel bounds/equal gaps, inside clicks, all close methods, backdrop swipe thresholds, internal touch scrolling, native background inertness, focus return/containment, reduced motion, and simulated asymmetric 64px/12px safe insets.

The shared scripts/check-phone-landscape.cjs is updated for the new presentation. It retains Search submission, Calendar navigation, orientation recovery, all indexed public-page smoke checks and non-landscape viewports. Run either script with PLAYWRIGHT_MODULE pointing to an installed Playwright module; LANDSCAPE_BASE_URL selects a deployed site. The optional module/channel pattern matches the existing repository browser checks. Artifacts are written outside the checkout.

A direct before/after stylesheet-swap comparison passes 85 closed-page/header/hero samples across Home, Community, Visit, About and History at portrait, landscape, reduced-height, tablet and desktop sizes. Portrait/tablet/desktop open-menu geometry also matches. Public HTML, original responsive/hero declarations and all images are unchanged.

Browser verification is Edge/Chromium emulation with actual touch-event injection, not a second physical-iPhone/Safari test. Physical Safari may reserve or expose browser gesture/chrome areas differently; the physical-device photograph was used as the design constraint, and device retesting remains the final verification limitation.

## Compact content-driven refinement (physical iPhone feedback)

Starting Dev: ccfb87871b748477beab9ea0deb5a079fd000ddb. Main unchanged at
804a189ae8b09e8a88f4bb98947af0e9fcb34c30. The two new physical-device photographs
are the visual reference; no new physical-device test was performed.

The baseline has no explicit fixed/minimum panel height. In Chromium at 874×402
its natural content needed 391px, but the safe viewport cap clipped it to 382px.
A 51px title bar, 16px navigation padding and 12px utility top spacing contributed
to its size. The previous 380px Search flex basis also wrapped the utilities
unnecessarily on narrower landscape phones. The photographs' apparent extra
Safari space cannot be measured precisely from an oblique camera image.

The dialog now explicitly uses height:fit-content and min-height:0. Its content
body can shrink and scroll at the existing dynamic safe viewport cap; navigation
rows never stretch to fill it. Symmetric horizontal width/gutters are unchanged.
Block insets and auto margins centre it in the safe usable viewport. Title/close
bar is 45px including its separator; row targets remain 44px. Navigation has
4px bottom padding and utilities have 4px top spacing. Search and Calendar share
one compact row at every requested landscape width, wrapping only when genuinely
insufficient width remains. New natural collapsed height is 365px.

Measured panel heights (CSS pixels):

| Viewport | Collapsed panel |
| --- | ---: |
| 568×320 | 300 |
| 667×375 | 355 |
| 740×360 | 340 |
| 812×375 | 355 |
| 844×390 | 365 |
| 852×393 | 365 |
| 874×402 | 365 (previously 382) |
| 932×430 | 365 |
| 844×300 | 280 |
| 874×280 | 260 |

On screens shorter than the 365px content plus safe gaps, internal scrolling is
intentional. Expansion grows the card to the viewport cap; collapsing returns to
intrinsic height. Six 44px rows, a 44px close control and the utilities impose a
real minimum content height; they are not reduced to make the card artificially
small. Captured collapsed screenshots verify 4px after the footer, not a blank
cream block. Native modal, swipe thresholds, focus/keyboard and animation code are
unchanged. Only the shared stylesheet cache key changes in site.js.
