# Online Pews News

The shared `_content/publications.json` catalogue remains authoritative for publication identity, dates, status and the original PDF. The existing News & Magazine admin PDF uploader continues unchanged. Existing PDF editions remain linked as PDFs; only editions with an approved web source become online pages.

## Add a weekly web edition on Dev

1. Upload the real PDF through the existing admin workflow (or add its PDF and catalogue record together on Dev).
2. Add `_content/pews-news/YYYY-MM-DD.json`, using 2026-10-25 as the content schema reference. Transcribe from the approved PDF. Services, collect, readings, Zoom, notices, contacts and corrections are plain text. Notice sections have unique lowercase IDs. Notice images, emphasis and additional Zoom meetings are optional.
3. Extract suitable original images. Store modest-sized WebP assets under `assets/images/pews-news/YYYY-MM-DD/`; preserve QR codes losslessly as PNG. Add that date’s image map to `_content/pews-news-images.json` with safe site-relative `src`, intrinsic `width`/`height`, and meaningful `alt` for new image keys. Existing keys have descriptive defaults. No stock image substitutions are needed.
4. The `pumpkins`/`pumpkinImage` community notice and `foodbank` section are optional; omit them when absent from the source. The `clock` panel is optional and should only appear when relevant; do not copy its message into subsequent weeks. General future notices belong in the `sections` array. No layout markup needs copying.
5. Run `npm run build` and the Pews News/publication tests. Inspect desktop and mobile. Commit to Dev only. The existing build workflow regenerates and deploys Dev.

`build-pews-news.js` generates permanent `pews-news/YYYY-MM-DD.html` pages, the `pews-news.html` latest-online route, and the small `pews-news-data.json` index used by News links. It reads only published catalogue records, groups real editions by year, leaves PDF-only editions available, and removes withdrawn generated pages. Empty online archives show a neutral link to the PDF catalogue. The central public script/typography hook also processes the new edition folder. Search indexes the permanent editions, excluding the duplicate latest-online page.

Web transcription is currently a repository content step; the PDF uploader does not automatically extract text or create an online edition. There are no fake dates or placeholder published editions.

## Source and images for 25 October 2026

The original PDF was already present on Dev and matches the supplied `Pews News Online 25th October 26 v2.pdf` byte for byte. The original PDF is retained unchanged. Images were extracted using pypdf, capped at 900 pixels without upscaling, and encoded as WebP quality 82; the donation QR image is lossless PNG. The source’s meaningful artwork is reused, including the Food Bank painting. The complete extracted asset set is approximately 410 KB; below-the-fold images load lazily with intrinsic dimensions.

References to the covering email and Parish Magazine remain faithful to the PDF. No email attachment or donation destination was invented.
