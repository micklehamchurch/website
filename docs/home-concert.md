# Temporary homepage concert feature

The Flos Vocalis promotion is limited to the homepage. Its wide rounded cream composition follows the supplied reference: left-aligned editorial text, horizontal desktop event details, an orange rounded CTA with the organiser alongside, small crossed Italian/UK flags and a musical staff at the text/photo transition. Existing parish fonts are retained. On narrower screens the event information and photo area stack.

`home-concert.js` shows the initially hidden card only before midnight after Saturday 17 October 2026 in Europe/London: `2026-10-18T00:00:00+01:00` (17 October at 23:00 UTC). It also hides the card in open, restored and background tabs. This does not depend on a rebuild. With JavaScript disabled the promotion remains hidden; the rest of the homepage works normally.

After the event, optional source cleanup is to remove the `home-concert:start` / `home-concert:end` block and the two `home-concert` asset references from `index.html`, then delete `home-concert.css`, `home-concert-art.svg`, `home-concert.js`, and `test/home-concert.test.cjs`. No manual removal is needed to stop the normal homepage promotion.

The Arts Alive link is the supplied event listing; no ticket prices or admission claims are included.

## Genuine photograph required

The repository image inventory and content/permission records contain no identifiable, approved Flos Vocalis photograph. The generated reference photograph must not be published. The right 47% is therefore an empty, labelled photo slot, softly blended into the cream background. No unrelated people or generated singers are used.

Once an authorised image is supplied, replace the placeholder span in .home-concert-photo with an image using a descriptive alt, remove data-concert-photo-pending and the placeholder role/aria-label. Existing CSS fills and crops the photo and retains the desktop left-edge blend and mobile top-edge blend. Check the crop at desktop and mobile widths before deployment.
