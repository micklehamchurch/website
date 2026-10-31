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

## Seamless publication masthead (24 October 2026)

The date-free `NEWS / Pews News / Weekly news, services and events` masthead is emitted by the same renderer for every edition and the latest-edition alias. No date-specific hero implementation exists. Dates remain in the breadcrumbs and edition content. The edition body, archive, images, PDFs, notices, contact/Zoom information, links and native printing are unchanged.

The existing genuine `assets/images/about/church-hero.webp` (1600x899,311782 bytes) remains the source. Its existing `church-card.webp` derivative (720x405,66282 bytes) supplies smaller viewports through srcset; no photograph or new derivative was created. Custom heroImage overrides still work without assuming unrelated derivatives exist.

Only Pews News routes opt into the approved shared seamless-hero module: `pews-news.html` and generated `pews-news/YYYY-MM-DD.html`. Its module and shared CSS are unchanged. Pews-specific screen CSS removes the white title panel and green label pill, uses an ivory serif heading and gold eyebrow, and coordinates the source/copy crop with the one decoded decorative image spanning header and masthead. Original decorative alt remains empty; the cloned decorative layer is aria-hidden.

Desktop/tablet crop: the photo shifts24% right, with object-position50%28%. This places the tower/clock around the right-hand two-thirds without replacing/distorting the photograph. An opaque green lead-in hides the photo edge and fades through85% at42%,25% at58%,transparent at72%. It is a continuous background, not a title card. The header has the existing90% green readability plate and a short10px exit; no blur/filter or duplicate crop. The hidden original image stays inside the layout so it cannot create horizontal overflow.

At<=700px, the photo shifts14% right and uses0%28% positioning, keeping the clock clear of the copy. Copy gets stronger green protection (opaque through18%,92% at55%,78% at72%,12% at100%). Short landscape restores the24%/50%28% crop and a185px masthead to avoid excessive vertical height. The masthead uses the normal1240px editorial grid, with28px total phone side gutters.

Measured hero heights (header excluded): desktop1600/1920,197.98->240px;1366,197.98->240;1024,186.97->240;768,185->220;390,190->220;320,212.59->220;874x402,185->185. Header heights remain89/81/79/113/57px. Edition content moves only by the intended masthead-height difference.

Performance: exactly one selected church image request, shared between the existing source and decorative decoded layer; no generic garden header image. At desktop the old311782-byte church image remains, while the64196-byte generic header photograph is removed. DPR1 small screens select66282 bytes instead of the previous311782-byte hero plus25482-byte garden header. High-density screens may select1600 normally. Existing first-image priority, browser caching, source selection and graceful green fallback are preserved. No global preload or unrelated-page cache change.

Versioning uses the existing build hook, targeted only to the three generated Pews News pages: headerPhoto20261024-pews-1 and Pews CSS masthead-20261024-1. Home and other pages remain unchanged. Focused tests verify identical masthead markup across both available editions/latest alias and exact body/archive preservation outside masthead/cache changes. The existing older archive snapshot now excludes the intentionally refined masthead. No underlying publication data/schema changes.

## Source and images for 1 November 2026

The supplied three-page `Pews News Online 1st November 26 v2.pdf` is the authoritative source for All Saints’ Day. Its original bytes are retained at `assets/documents/news/pews-news/pews-news-2026-11-01.pdf` (SHA-256 `13a9d61e65c1a2dc7a51afe7c68c5e91966c0d90118c22f278a00a7ad25f679e`). All three pages, embedded illustrations and PDF link annotations were inspected. The source typo “Al who knew Barry” is retained without silent correction. No earlier edition’s Food Bank list or outdated poppy notice is carried forward.

Nine identical embedded images reuse existing optimized assets after comparing decoded pixels and dimensions. Four source illustrations have new WebP assets: autumn leaves, this Snowman variant, Christingle and Nativity. A 640px leaf derivative serves News/Home thumbnails. These five new files total 177,424 bytes. The existing verified Royal British Legion QR SVG is reused for the identical source QR and keeps its accessible direct donation link.

Optional `editionArt` uses the existing heading-art treatment. Optional `features` provide source-backed lower-page features with stable IDs, headings, paragraphs, images and HTTPS links; this edition uses one for Wintershall after the Food Bank panel. Both additions are absent from the older editions, whose approved bodies remain unchanged. Existing publication records automatically promote the newest edition in the latest alias, News, Home and online archive. Online Editions now contains three permanent web pages, newest first; the three genuine PDF-only records remain separate.
