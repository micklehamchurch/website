# Temporary homepage concert feature

The Flos Vocalis promotion is limited to the homepage. It uses the existing parish fonts in a rounded ivory editorial card, with a warm gold ticket button, calendar/time/location icons, and original lightweight SVG artwork of crossed Italian/UK flags and a musical staff. No choir photograph is used. The decoration is hidden from assistive technology; all event information remains accessible text.

`home-concert.js` shows the initially hidden card only before midnight after Saturday 17 October 2026 in Europe/London: `2026-10-18T00:00:00+01:00` (17 October at 23:00 UTC). It also hides the card in open, restored and background tabs. This does not depend on a rebuild. With JavaScript disabled the promotion remains hidden; the rest of the homepage works normally.

After the event, optional source cleanup is to remove the `home-concert:start` / `home-concert:end` block and the two `home-concert` asset references from `index.html`, then delete `home-concert.css`, `home-concert-art.svg`, `home-concert.js`, and `test/home-concert.test.cjs`. No manual removal is needed to stop the normal homepage promotion.

The Arts Alive link is the supplied event listing; no ticket prices or admission claims are included.
