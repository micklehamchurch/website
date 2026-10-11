# Photo Albums — Dev administration

Open Admin Dashboard → Photo Albums. The existing Microsoft sign-in and Azure Easy Auth/server allowlist protect every read and mutation. Susan can use the existing Entra/B2B onboarding and allowlist process later; this feature does not grant anyone new access.

## Editor

Create an album, enter its title and short description, select photographs, choose a cover and optionally add captions. Write image descriptions yourself for accessibility; the system does not recognise or name people. Reorder using the visible drag handles on desktop or Earlier/Later buttons (keyboard and touch). Save Draft or confirm the church has permission/appropriate consent and Publish. Existing albums also support adding/removing photographs, editing descriptions/captions, changing covers and Unpublish / Save Draft. Deleting requires typing the exact saved album title in a modal confirmation. Unsaved edits prompt before leaving; an active request prevents internal navigation.

Save persists metadata and uploaded derivatives together; the Dev content workflow rebuilds Parish Photographs and Pages follows. It is not an immediate public-page update. The editor displays the confirmed Dev save and explains the rebuild. On an ambiguous network/save failure or a concurrency conflict, reload shared albums before trying again; staged edits are not silently replayed. Reload asks before discarding unsaved work.

## Formats, limits and image policy

- JPEG/JPG (`image/jpeg`), PNG (`image/png`) and non-animated WebP (`image/webp`). HEIC/HEIF, GIF, SVG, TIFF and other formats are unsupported; export a JPEG first.
- At most 6 new uploads per save; 10 MiB (10,485,760 bytes) per source, 20 MiB (20,971,520 bytes) combined source bytes. JSON body is capped at 29,010,604 bytes, including base64 and metadata. Add larger collections in separate saved batches.
- Maximum 40 million decoded pixels, 200 photographs per album, 100 albums, 1 MiB serialized gallery metadata. Titles: 150 characters; descriptions: 500; captions and accessibility descriptions: 300 each.
- Sharp already exists in the API dependencies (`^0.35.5`); no dependency, runtime, secret, CORS, permission, storage or SaaS change is needed. The existing Node 24 Azure deployment builds the production package and verifies function registration.
- The server validates bounded canonical base64, actual format signatures, MIME/filename agreement, full JPEG/PNG/WebP container endings, successful strict decoding and single-frame dimensions. Corrupt, animated, trailing payload/polyglot and common embedded executable payloads are rejected. File paths from clients are never accepted. Upload IDs in the browser are only temporary references; album/photo IDs and filenames are generated server-side.
- Derivatives use WebP at longest-side bounds 480, 960 and 1600 pixels, with qualities 78, 82 and 84 respectively and effort 4. Automatic EXIF rotation, aspect preservation and `withoutEnlargement` apply. No metadata is retained: GPS/EXIF, XMP, ICC and device information are omitted from the new files. Identical resulting dimensions are stored only once, so a 120×80 source produces one derivative. Exact dimensions and byte lengths populate the existing `variants` array.
- Approximate size goals are 30–100 KB thumbnail, 100–300 KB normal and 250–700 KB large where image content/quality permits. These are not rejection thresholds. A simple image can be much smaller.
- **Keep master originals separately.** No new source originals or original filenames are committed or served. This stage provides no private source storage. Existing legacy photos/assets are retained unchanged.
- **Drafts are not private storage.** Drafts are excluded from the public gallery and search rebuild, but their metadata and optimized files remain in the public GitHub repository. Upload only photographs suitable for public storage, even when saving a draft. Unpublish/delete removes gallery presentation and current uploaded assets as applicable, not copies already downloaded or Git history.

## Existing schema and public behaviour

`parish-albums.json` at repository root is authoritative (not `_content/parish-albums.json`). Album `id`, `title`, `context`, `cover` and `photos`, and photo `id`, `alt`, `source`, `featured` and `variants` are retained. Minimal additions are album `status` (`draft`/`published`) and optional photo `caption`. Missing status means published; missing caption preserves legacy `alt` as the displayed caption. The existing six albums / 36 photos are not migrated or rewritten by this implementation.

The existing hash routes, templates and lightbox remain. Landing requests only optimized cover variants. Album grids use the first two responsive variants with the existing `sizes`, dimensions, async decoding and lazy loading. Large images load through the existing lightbox link on demand. Small photos naturally share one optimized asset between grid/lightbox. Existing focus return, keyboard/Escape/outside close, touch controls and typography modes remain.

The homepage and its Harvest slideshow are unchanged. Legacy derivatives may be shared by that slideshow, so removing legacy album photos or deleting a legacy album does not delete their assets. The dashboard deletes derivatives only for its own server-generated `photo-UUID-size.webp` files that are no longer referenced by gallery metadata. Album deletion intentionally removes that gallery route; existing homepage links to a deleted album fall back to the album landing via the existing router.

## Scoped API and atomicity

`GET /api/photo-albums` returns the current albums, metadata blob SHA and exact Dev head SHA. `POST /api/photo-albums` accepts only:

- `action: save`, `id` (existing album or null for create), `sha`, `headSha`, `album: {title, context, status, cover, photos: [{id, alt, caption}]}`, `uploads: [{id, fileName, mimeType, base64}]`, `consentConfirmed`.
- `action: delete`, existing `id`, `sha`, `headSha`, `confirmTitle` matching the saved title exactly.

Every handler calls the existing `requireAdministrator` before parsing payloads or accessing GitHub. Easy Auth is responsible for stripping externally supplied principal headers; deployment must continue to require it. No body identity, email, browser flag, GitHub token/private key or arbitrary branch/path is trusted. All repository targets are fixed to `micklehamchurch/website`, `heads/Dev`, root gallery metadata and validated album asset paths. Unknown keys/query parameters are rejected. Existing photos must be referenced from the same album; paths/dimensions/variants are resolved from the validated server copy.

Both SHAs must match. Image processing finishes before creating blobs. A single Git tree/commit includes all new derivatives, metadata and eligible deletions; only a non-forced fast-forward of the exact parent makes it visible. Concurrent commits become siblings and are rejected. Partial processing, blob/tree/commit failures do not advance Dev or publish broken metadata. GitHub can retain unattached content-addressed blobs/commits after a failed save; these are not branch assets and cannot be deleted via GitHub's blob API. No cleanup commit is necessary or attempted against someone else's changes.

Public responses expose safe error categories only, and the editor maps them to actionable messages. Azure deployment checks now require the `photo-albums` registration; the content workflow includes the new Admin module paths.

## Verification

API unit/integration suite: 166 tests passed, including 15 focused album tests. Browser API/gallery build checks: 9 passed. Full regression suite: 376 tests, 368 passed, the same 8 baseline failures observed before implementation. Baseline failures are three Calendar migration assertions plus historical footer/homepage/header snapshot checks and the existing gallery script-version assertion; they are not fixed in this feature.

Local Admin integration harness uses the actual handler and Sharp processor with an in-memory GitHub adapter, never bypassing production authentication. At 390/768/1440 it tests creation, save, batch upload, cover/captions, accessible reorder, draft/publish/unpublish, removal, typed delete, focus return, unsaved navigation, concurrency and overflow; desktop also tests drag reorder. Public browser regression tests all six albums / 36 photographs at all three typography modes and those widths, DPR 1/2 cover loading, keyboard/lightbox focus and every one of 108 image URLs/byte sizes.

The implementation starts from Dev `a687070b6c5b0dcaa78d5508446ef97091125193`. Main is `804a189ae8b09e8a88f4bb98947af0e9fcb34c30` and is not a deployment target.
