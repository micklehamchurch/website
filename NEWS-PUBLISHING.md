# Scoped News & Magazine publishing on Dev

The existing Easy Auth perimeter and Stage 2C administrator policy are unchanged. All four operations below require the same verified server-side identity as Calendar. The frontend obtains the separate Admin API scope through the existing MSAL helper; credentials never become dashboard properties or response data.

## Routes

* `GET /api/publications` — all shared edition metadata, metadata blob `sha`, and Dev `headSha`.
* `POST /api/publications` — one new Pews News or Magazine PDF edition.
* `GET /api/news` — shared articles including drafts, metadata `sha`, and Dev `headSha`.
* `POST /api/news` — one article creation/edit (`originalSlug: null` creates; an existing original slug edits).

Both POST bodies require the versions returned by GET. Queries and unrecognised schema properties are rejected. Repository, branch, paths, identities and authorization flags are never request selectors. POST responses contain only `ok`, `sha`, `headSha`, `commitSha`; errors contain only fixed categories.

## Permanent boundaries and atomic commits

The owner/repository is fixed to `micklehamchurch/website`, the ref to `heads/Dev`. PDF metadata is only `_content/publications.json`; articles only `_content/news.json`. PDF destinations are generated server-side:

* Pews: `assets/documents/news/pews-news/pews-news-YYYY-MM-DD.pdf`
* Magazine: `assets/documents/news/parish-magazine/parish-magazine-YYYY-MM.pdf` (date must be the first of the month).

PDF and metadata blobs are added to one tree/commit based on the current Dev tree. The final non-forced ref update fast-forwards only from that commit's parent. Stale metadata/blob or branch versions return 409 before blob creation. A competing ref update returns 409 rather than rewriting history. Unreferenced blobs/commits from a failed race never appear on Dev. Other existing files are retained by the base tree; no delete operation is provided.

Duplicate type/date (type/month for magazines), ID, destination or existing PDF is a conflict. Old records/files are retained; there is no overwrite or PDF replacement endpoint. A publish in any content area or a build-generated commit can change the head revision; reload shared content after a 409.

## Validation

PDF maximum: 15 MiB decoded; bounded streaming JSON upload permits its base64 representation plus 8 KiB of metadata. MIME must be `application/pdf`, the original filename must have `.pdf`, be at most 180 characters, and contain no separators/traversal. It is never used as the storage path. Base64 must be canonical. Structural checks require a supported PDF header, indirect object, final `startxref`/`%%EOF`, and an in-range xref-table or xref-stream offset. These checks validate the file structure; they are not a complete PDF renderer or malware scanner. A supplied real file is required for the first live test.

Metadata is bounded to 512 KiB. Title (180), description (500), article summary (1,000), category (80), body (100,000 characters / 100 paragraphs) and ISO dates are validated. Articles use plain-text paragraphs; markup/control characters and unknown properties are rejected. Slugs are lowercase words/numbers separated by hyphens (maximum 120); existing slugs are permanent. Duplicate new slugs conflict. Optional images are restricted to existing site-relative JPG/PNG/WebP assets; no image uploading is introduced. Draft articles are committed to the shared source, excluded by the existing public build. Optional expiry removes a story from the current listing while retaining its article page.

## Admin and manual verification

Sign in; confirm Admin API and GitHub are Connected. Open News & Magazine and reload shared news/editions if needed. Select a real PDF, complete metadata, preview locally, then Publish and confirm. During publishing duplicate requests/closing are blocked. Success means committed and rebuilding, not already deployed. After a failed/uncertain result, reload shared content before trying again; do not blindly retry an upload. Website stories retain Preview and local-save options plus Publish / Save draft, determined by the selected status.

No real publication is made by automated tests. Browser tests suppress auth only in their isolated page and inject mock scoped operations; they cannot reach real write endpoints. Server tests mock GitHub. First live tests are deliberately manual:

1. Pews News: select the real Sunday 27 September 2026 PDF, date `2026-09-27`, title `Pews News`; preview, publish and confirm. After Pages finishes, check the latest card and both PDF actions.
2. Reload editions (the branch version changed). Magazine: select the real October 2026 PDF, month `2026-10`, title `Parish Magazine`; preview and publish. Check the magazine card, PDF actions, and that Pews News remains accessible.
3. Reload shared news. Add a real approved story with date, summary and paragraphs. Save as draft first, verify it is absent publicly; reopen, select Published and publish. Check the public card, full article and search after Pages finishes. Repeating a PDF edition must return a conflict and preserve the original.

Contacts, Pages and Media publishing remain out of scope. Calendar operations, automatic refresh, health and identity diagnostics are preserved.
