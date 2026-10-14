# Temporary homepage concert feature

The Flos Vocalis promotion is limited to the homepage. Its wide rounded cream composition follows the supplied reference: left-aligned editorial text, horizontal desktop event details, an orange rounded CTA with the organiser alongside, small crossed Italian/UK flags and a musical staff at the text/photo transition. Existing parish fonts are retained. On narrower screens the event information and photo area stack.

`home-concert.js` shows the initially hidden card only before midnight after Saturday 17 October 2026 in Europe/London: `2026-10-18T00:00:00+01:00` (17 October at 23:00 UTC). It also hides the card in open, restored and background tabs. This does not depend on a rebuild. With JavaScript disabled the promotion remains hidden; the rest of the homepage works normally.

After the event, optional source cleanup is to remove the `home-concert:start` / `home-concert:end` block and the two `home-concert` asset references from `index.html`, then delete `home-concert.css`, `home-concert-art.svg`, `home-concert.js`, and `test/home-concert.test.cjs`. No manual removal is needed to stop the normal homepage promotion.

The Arts Alive link is the supplied event listing; no ticket prices or admission claims are included.

## Genuine photograph

The user supplied and authorised the genuine Flos Vocalis group photograph on 14 October 2026. It is delivered as assets/images/home/flos-vocalis-choir.webp (680 × 304), optimised at quality 90 without upscaling or scene alterations. The image fills the right-hand area using object-fit: cover and centred, top-aligned positioning. A cream overlay fades from the left edge on desktop. On mobile the full source aspect ratio preserves the group beneath the event information, with a short cream fade at the top. The original flags/music artwork is retained above the mobile photo so it does not cover faces.
