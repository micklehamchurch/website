# Online Pews News

The shared `_content/publications.json` catalogue remains authoritative for publication identity, dates, status and the original PDF. The existing News & Magazine admin PDF uploader continues unchanged. Existing PDF editions remain linked as PDFs; only editions with an approved web source become online pages.

## Add a weekly web edition on Dev

1. Upload the real PDF through the existing admin workflow (or add its PDF and catalogue record together on Dev).
2. Add `_content/pews-news/YYYY-MM-DD.json`, using 2026-10-25 as the content schema reference. Transcribe from the approved PDF. Services, collect, readings, Zoom, notices, contacts and corrections are plain text. Notice sections have unique lowercase IDs. Notice images, emphasis and additional Zoom meetings are optional.
3. Extract suitable original images. Store modest-sized WebP assets under `assets/images/pews-news/YYYY-MM-DD/`; preserve QR codes losslessly as PNG. Add that date’s image map to `_content/pews-news-images.json` with safe site-relative `src`, intrinsic `width`/`height`, and meaningful `alt` for new image keys. Existing keys have descriptive defaults. No stock image substitutions are needed.
4. The `pumpkins`/`pumpkinImage` community notice and `foodbank` section are optional; omit them when absent from the source. The `clock` panel is optional and should only appear when relevant; do not copy its message into subsequent weeks. General future notices belong in the `sections` array. No layout markup needs copying.
5. Run `npm run build` and the Pews News/publication tests. Inspect desktop and mobile. Commit to Dev only. The existing build workflow regenerates and deploys Dev.

## Editorial presentation

The same edition schema supports the desktop archive / main edition / feature layout and the tablet/mobile arrangements. The following optional fields control presentation without changing source text or copying page markup:

- Section `layout`: `timeline` for compact dated rows, or `grid` for calendar cards with native expandable full details. Existing sections without this field retain timeline rendering.
- Notice `dates`: an array of real ISO dates used for calendar badges (including notices with two dates).
- Notice `placement: "sidebar"`: moves the whole notice into the selected feature column. Use sparingly; every notice is rendered once.
- Notice `featured: true`: gives a calendar card larger original imagery.
- Notice `poppyFeature: true`: presents the first paragraph as service information in the calendar and the remaining paragraphs plus donation QR in the side feature. This is optional and only appropriate for an edition with that source material.
- Edition `heroImage`: an existing genuine site photograph. The edition’s extracted artwork remains unchanged and is used within the newsletter. No stock replacement of source imagery is introduced.

The November-style grid is not tied to a particular month: section headings, dates, notices and feature choices come from each edition. The closing Harvest and Food Bank notices remain optional. Native details controls work without JavaScript. Printing automatically expands the full notices, removes navigation/feedback controls, and uses a dedicated compact layout; it does not replace the unchanged original PDF download.

The build also refreshes a published-only static Pews News hub inside the marked region of `news.html`. It includes the latest real edition, up to four recent real editions, and a full archive action. The existing publication script refreshes the same information in the browser. The large Harvest story and separate Parish Magazine area are retained. This hub remains readable with JavaScript disabled.

`build-pews-news.js` generates permanent `pews-news/YYYY-MM-DD.html` pages, the `pews-news.html` latest-online route, and the small `pews-news-data.json` index used by News links. It reads only published catalogue records, groups real editions by year, leaves PDF-only editions available, and removes withdrawn generated pages. Empty online archives show a neutral link to the PDF catalogue. The central public script/typography hook also processes the new edition folder. Search indexes the permanent editions, excluding the duplicate latest-online page.

Web transcription is currently a repository content step; the PDF uploader does not automatically extract text or create an online edition. There are no fake dates or placeholder published editions.

## Source and images for 25 October 2026

The original PDF was already present on Dev and matches the supplied `Pews News Online 25th October 26 v2.pdf` byte for byte. The original PDF is retained unchanged. Images were extracted using pypdf, capped at 900 pixels without upscaling, and encoded as WebP quality 82; the donation QR image is lossless PNG. The source’s meaningful artwork is reused, including the Food Bank painting. The complete extracted asset set is approximately 410 KB. The edition artwork loads eagerly with intrinsic dimensions so native printing also includes illustrations beyond the current viewport.

## Online and PDF-only archives

The edition sidebar groups published records with a matching web source under **Online Editions**, newest first, and the remaining published Pews records under **Past PDF Editions**. Year counts apply to each group separately. HTML edition links use ordinary same-tab navigation, permanent URLs and a single `aria-current="page"` highlight. The News hub recognises both types; its secondary PDF archive excludes records that now have web editions. All original PDFs remain available from each web edition’s download action. These rules apply to future editions without special page-to-page routing.

## Source and images for 18 October 2026

The supplied four-page `Pews News Online 18th October 26 v2.pdf` also matches the existing repository PDF byte for byte (SHA-256 `c999695e51666802c0180494d4f53705b28cc8961dce7915a67c5c19e6a5df1f`). Its original PDF is unchanged. Thirteen meaningful embedded images were extracted from this source, capped at 900 pixels without enlargement and encoded as WebP quality 82, with the donation QR preserved as lossless PNG; the complete set is about 270 KB.

The source’s printed “Sunday 17th November” for Ascending Deeper is retained in the displayed wording, despite the weekday/date inconsistency. That notice omits an automatically calculated weekday badge. No Snowman/Christingle/Harvest/clock notice from 25 October is copied into this edition. The Food Bank’s separate “As always” milk/juice statement uses an optional `foodbank.note` field. The prominent shoebox notice uses the existing sidebar/featured metadata; a modifier enlarges only that selected sidebar illustration. A single-service Sunday uses the same service panel at full width.

References to the covering email and Parish Magazine remain faithful to the PDF. No email attachment or donation destination was invented.
