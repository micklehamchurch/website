# Approved mobile Bible hierarchy — 19 October 2026

The same live edition node moves between the mobile toolbar and desktop heading at 959px. Its reader/API update path is unchanged, with no duplicate translation label on the reading surface. The toolbar is a four-column grid: 44px menu, flexible edition, 44px bookmark, 44px close. The full name stays readable at .75rem; narrow phones can wrap within that row instead of shrinking the controls or truncating the edition. The chapter remains centred directly below.

Only primary-coarse-pointer phone layouts (up to 600px, or up to 959px in short landscape) hide the existing page buttons using display:none. This removes their focus stops as well as their visual circles. The page-status live region remains. Native tap/swipe handlers, keyboard left/right, programmatic button listeners and semantic storage are unchanged. Tablet portrait/facing and non-touch desktop retain visible controls. Reading instructions describe arrow keys, gestures and page buttons when shown.

The compact phone footer and modest About gap leave more space for Scripture without changing its font. A phone-only layout reserve includes the measured safe-area bottom padding. Root enlargement still wraps; short viewports can scroll rather than clip. Existing paper, leather, page stack and ribbon decorations stay attached to the same book.

The existing html.bible-modal-open class hides the parent's floating Feedback launcher with display:none. bible-page hides the reader's independently loaded launcher and its now-unneeded clearance spacer, including standalone readers. Late launcher injection is covered by CSS. Closing the overlay removes the existing class and restores normal Feedback. No Feedback request, content, permission or backend code changes.

The approved mockup is recreated with live HTML/CSS, not used as a background. At 390px, a full edition name can occupy two lines within the control row because three 44px touch targets plus readable type cannot reproduce the concept's smaller visual icons exactly. Actual viewport ratio, browser chrome, page count and Scripture paragraph lengths also differ. These are intentional accessibility/responsive differences, not an assertion of pixel identity.

scripts/check-bible-mobile-target.cjs checks both browser engines at phone, tablet and desktop widths, actual keyboard page turning, edition geometry, arrows, Feedback open/hide/restore and copyright. Existing touch checks now verify native Chromium swipes in both directions; Saved Places tests use actual text-side taps when phone arrows are hidden. No manufactured overlay event is used to stand in for real hit testing.

API/Azure/security, licensing/reporting, Saved Places metadata and performance/audio scope are unchanged.
