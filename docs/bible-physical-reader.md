# Responsive physical Bible and mobile Phase C

The reader remains an HTML application backed by the existing authorised Azure/API.Bible service. `bible-physical.css` layers paper shading, curved page corners, repeating gold page edges and a leather cover around the live text. No image assets or animation dependencies are used. Decorative layers have no pointer input or accessibility nodes.

The iframe and native outer modal are transparent around the book. The existing outer backdrop dismissal remains; the reader forwards clicks on its own transparent background to the origin/source-checked parent. Scripture, toolbar controls, and native nested dialogs are protected. A pointer must begin and end outside before dismissal.

`BiblePagesModel.layoutColumns` uses the measured spread width, viewport height and Scripture font size. Facing pages require at least 900px of usable book width, 560px height and 17em of readable text width per page after margins. Other layouts use one page. Phones and short landscape layouts have compact controls and safe-area padding. Very short/enlarged layouts scroll vertically rather than shrinking or cutting off text.

Pagination measures the real text width and font against a viewport budget that reserves space for navigation, the full visible copyright/attribution, and About. Resize/orientation changes retain the semantic token offset. The existing last-reading position and single explicit bookmark are unchanged and contain metadata only.

Short margin taps navigate only in one-page mode, through the same `move` function as buttons. The Scripture text block is excluded. Movement over 10px, presses over 350ms, selected text, secondary pointers, links/forms/buttons and open dialogs are excluded. Swipes retain the existing touch handlers. There is no large invisible overlay over Scripture. Buttons and arrow keys remain the accessible alternatives. Reduced motion disables the opening/page leaf effects.

The existing copyright remains visible with the reading. About additionally repeats the current translation/copyright as text, retaining the existing API.Bible link and anonymous usage reporting explanation. The provider tracker, chapter requests, caching/quota and backend authentication are unchanged.

Repeatable browser checks are in `scripts/check-bible-physical.mjs` and `scripts/check-bible-backdrop.mjs`, to run through a real CUA browser tab. They inspect rendered geometry, wait for pagination to settle and use actual pointer clicks. Node tests cover tap guards, responsive modes, semantic pagination offsets, swipe handlers and continuous chapter/book/Bible-boundary navigation.
