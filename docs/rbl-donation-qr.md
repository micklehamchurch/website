# Royal British Legion donation QR

Verified 25 October 2026. Both former photographed PNGs (18 and 25 October) decode independently with ZXing-C++ to exactly:

https://www.mygivinghub.com/go?id=jZ7arYjOPa

Opening this URL redirects to MyGivingHub `/donation/rbl` and displays “Mickleham (SEC10)”, Poppy Appeal, Royal British Legion, registered charity 219279. Both edition source notices explicitly identify this as the collection in Mickleham and Westhumble. The form itself labels the collection Mickleham (SEC10); Westhumble is established by those parish notices.

A shared digital SVG replaces the photographed image in `pews-news.html`, `pews-news/2026-10-18.html` and `pews-news/2026-10-25.html`. The catalogue contains the exact original short URL, square dimensions, and specific accessible alt text. The generator wraps the QR and “Donate to the Royal British Legion” text in a native link to that URL. Other extra images retain their existing image-view link. Original publication PDFs and unused source PNGs remain archival material.

Generation: Python qrcode 8.2, error correction M, four-module quiet zone, SvgPathImage, black modules with an explicit white background. Input is the exact URL above, including case. No photographic pixels were reused. The SVG is scalable. CSS prevents flex shrinking and reserves a square before decoding; the stylesheet version is refreshed.

Validation:
- Full `npm run build` passed. Unrelated generated date-sensitive files were restored before committing.
- 19 Pews News and News hub tests passed, including exact destination, alt text, asset usage and preservation of surrounding edition content. Historical snapshot comparisons exclude only the QR anchor and stylesheet version; the new QR gets its own assertions.
- Full suite: 388 passed, 30 failed. All failures also occurred on an unchanged Dev baseline in this environment (missing API dependencies and existing content/snapshot fixtures). No new failure names. Baseline additionally failed Find Us; that difference comes from existing build/test generation.
- All three pages at 320, 390, 768, 1024 and 1600px: loaded square image, no horizontal overflow, correct accessible alt, visible focus, Enter activation and exact destination checked. Navigation was intercepted at the exact destination after initial real destination verification, without submitting a donation.
- All 15 rendered QR screenshots decoded back to the exact original URL.
- At 390, 768 and 1600px: delayed QR load retained width and height; axe WCAG A/AA checks on the poppy panel passed; tapping the QR navigated correctly.
- Remembrance panel screenshots reviewed; existing illustration, colours and surrounding copy retained.
- Pages source checked before publishing: Dev at repository root; main untouched.
