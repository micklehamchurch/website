# Responsive physical Bible and mobile Phase C

The reader remains an HTML application backed by the existing authorised Azure/API.Bible service. `bible-physical.css` layers paper shading, curved page corners, repeating gold page edges and a leather cover around the live text. No image assets or animation dependencies are used. Decorative layers have no pointer input or accessibility nodes.

The iframe and native outer modal are transparent around the book. The existing outer backdrop dismissal remains; the reader forwards clicks on its own transparent background to the origin/source-checked parent. Scripture, toolbar controls, and native nested dialogs are protected. A pointer must begin and end outside before dismissal.

`BiblePagesModel.layoutColumns` uses the measured spread width, viewport height and Scripture font size. Facing pages require at least 900px of usable book width, 560px height and 17em of readable text width per page after margins. Other layouts use one page. Phones and short landscape layouts have compact controls and safe-area padding. Very short/enlarged layouts scroll vertically rather than shrinking or cutting off text.

Pagination measures the real text width and font against a viewport budget that reserves space for navigation, the full visible copyright/attribution, and About. Resize/orientation changes retain the semantic token offset. The existing last-reading position and single explicit bookmark are unchanged and contain metadata only.

Short taps in the outer 25% on either side of the single reading page navigate through the existing move function. The middle 50% is safe for reading. Text selection, long presses, vertical movement, controls and open dialogs are excluded. A single gesture decision chooses swipe or tap, once; pointer-capable browsers ignore compatibility touchend. Legacy touch-only browsers use the same classifier as a fallback. No invisible overlay or extra screen-reader elements are created.

The existing copyright remains visible with the reading. About additionally repeats the current translation/copyright as text, retaining the existing API.Bible link and anonymous usage reporting explanation. The provider tracker, chapter requests, caching/quota and backend authentication are unchanged.

Repeatable browser checks are in `scripts/check-bible-physical.mjs` and `scripts/check-bible-backdrop.mjs`, to run through a real CUA browser tab. They inspect rendered geometry, wait for pagination to settle and use actual pointer clicks. Node tests cover tap guards, responsive modes, semantic pagination offsets, swipe handlers and continuous chapter/book/Bible-boundary navigation.

Facing pages accept short stationary touch/pen taps on the left leaf for previous and right leaf for next, except a 12px strip beside the spine on each leaf. Mouse text clicks stay safe. Single pages retain 25% side zones and a 50% safe centre. Pointer/touch movement is tracked throughout, so moving away and back cannot become a tap. Native vertical pan/pinch policy is applied to the text overflow container as well as paper and spread; selection and long presses never navigate.
