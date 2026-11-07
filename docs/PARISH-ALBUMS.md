# Parish photograph albums

`parish-albums.json` is the existing public gallery manifest. It remains at the repository root; this site does not use `_content/parish-albums.json` or an Admin album editor.

Each album has a stable `id`, `title`, `context` (short description), optional `cover` photo id, and `photos`. Each photo has a stable `id`, source filename for provenance, factual `alt`, and ascending `variants` with `src`, actual pixel `width`/`height`, and exact `bytes`. The source filename is metadata only: no original upload is served. Without an explicit cover the first photograph is used. Keep Harvest first and preserve its existing metadata and assets.

Store source uploads privately outside the public checkout. Apply EXIF orientation, preserve aspect ratio, and generate compressed WebP derivatives bounded by 480, 960 and 1600 pixels on the longest edge without enlarging the source. The nine October 2026 additions use WebP quality 83. Strip EXIF/location metadata from public derivatives. Do not add source originals or generated imagery to public assets.

Run `node build-parish-gallery.js` after editing the manifest. It builds **only** `gallery.html`; it never regenerates or edits the approved homepage. Album cards request one responsive cover each. Inert HTML templates hold the grids and request no images until the selected album is mounted. Only one album is mounted at a time. Full-size photographs load when the lightbox opens. Cover cropping is CSS only; gallery images retain their full composition.

Routes are `gallery.html` (landing), `gallery.html#albums` (back to albums), and `gallery.html#<album-id>` (album grid). Existing Harvest links continue to work. Unknown hashes show the landing page. Browser Back/Forward follows album selections. The viewer wraps within the active album; arrows, Tab/Shift+Tab, Escape, Close and outside click work with shared public-dialog focus restoration. JavaScript is required to browse album grids; a noscript message explains this.

Validation: `node --test test/parish-gallery.test.cjs test/home-content.test.cjs test/photographic-overlays.test.cjs`, `npm run build`, and `node scripts/check-parish-albums.cjs`. Set `PLAYWRIGHT_MODULE` when Playwright is provided externally. Set `CHECK_BASE_URL=https://micklehamchurch.github.io/website/` to run the same browser checks against Dev Pages. Reports/screenshots default to the checkout's sibling `parish-albums-verification` directory; `CHECK_OUTPUT` can override it.

Keep gallery changes on Dev. Review generated changes from the full site build separately so unrelated homepage, Calendar, Admin and other content are not included in a gallery commit.
