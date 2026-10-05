# Historical Archive administration (Dev)

Open **Historical Archive** in the existing signed-in Admin dashboard. Authorise the Church Admin API connection if prompted. The shared source is `_content/clergy.json`; there is no browser copy of the private research source.

## Editing and publishing

The chronological list shows display name, role, service periods, portrait and Published/Draft status. Display name already includes titles and qualifications; there are no duplicate identity fields.

1. **Edit** or **Add clergy record**. A new record starts as a draft. A photograph and biography are optional; enter a name, role and at least one known start year.
2. Add any number of service periods up to the practical limit of 20. Leave an unknown/open end year blank. Returning clergy remain one record.
3. Enter narrative paragraphs separated by a blank line. Research notes and source references are internal. Verify historical facts; do not guess missing details.
4. **Save changes** stages the record in memory in this tab. **Save draft** stages the record with public visibility turned off. These actions do not write the repository. Reloading/closing the tab can discard staged work; the browser warns about unsaved changes.
5. **Preview** uses the same public profile renderer as the static build, with pending photographs. Internal research notes, sources and permission metadata are excluded.
6. **Save drafts to Dev** explicitly stores changes to hidden draft records while retaining the loaded published profiles exactly. Staged edits to published profiles remain in this tab. To unpublish a currently public profile use **Unpublish**, then **Publish changes to Dev**.
7. **Publish changes to Dev** explicitly commits all staged edits. Drafts remain excluded from the public build and search. Mark a draft for publication, then publish, to make it visible.

Successful saving reports the commit prefix and that the site is rebuilding. It does not claim the Pages deployment is complete. Check GitHub Actions and the public Dev site after the build. Git history provides recovery and an audit trail. A server-generated `updatedAt` timestamp is returned only in the protected source response; no account identifiers are added.

## Photographs

Upload a replacement portrait or an additional archive photograph. Review its preview, alt text and caption. Date/approximate date, source, credit and permission notes may remain blank when unknown. Use **Move up / Move down** to reorder the gallery; dragging is not required. **Use as primary portrait** copies the selected gallery image into the portrait field without removing the gallery version. **Remove from gallery** and **Remove portrait from display** remove references, not stored files.

JPEG, PNG and WebP are accepted, with a 10 MiB per-image limit, six new uploads and 20 MiB total per save. HEIC, GIF, SVG, HTML and executable files are unsupported; export an iPhone HEIC photograph as JPEG first. The server validates MIME type, extension, binary signature, full decoder output, nonanimated single-page content and a 40 million pixel limit. Browser validation is a convenience; server validation is authoritative.

The server assigns filenames independently of the browser:

- Byte-identical originals: `_archive-sources/clergy/uploads/<server-uuid>.<jpg|png|webp>`.
- Public web image: `assets/images/clergy/uploads/<server-uuid>-1600.jpg`.
- Thumbnail: `assets/images/clergy/uploads/<server-uuid>-360.jpg`.

Public derivatives are auto-oriented, bounded in dimensions and stripped of EXIF/device metadata. No AI restoration or alteration is performed. Original uploads and previous assets remain in Git; replacements do not destructively delete them. Existing original photographs keep their current filenames and paths. `_archive-sources` and `_content` remain excluded from Pages; a public Git repository is not confidential storage, so research notes must contain no secrets or sensitive personal information.

## Protected API

`GET /api/historical-archive` returns `{ok, sha, headSha, archive}`. `PUT /api/historical-archive` accepts only `{sha, headSha, archive, uploads}`. Each upload has `{id, fileName, mimeType, base64}`; new image references use `upload:<id>` temporarily and are replaced with server-assigned paths before committing. No query parameters are accepted.

The existing Microsoft Entra/EasyAuth perimeter verifies identity. The existing immutable authorised-user allowlist is enforced before any repository operation. Function `authLevel: anonymous` follows the other existing routes because EasyAuth performs authentication; it does not grant anonymous writes. Tokens are acquired privately by the existing MSAL API-scope helper and sent as Bearer tokens. No GitHub credential or Azure secret is sent to the browser. EasyAuth must remain required on the deployed API.

The GitHub App target is hard-coded to `micklehamchurch/website`, `heads/Dev`. Browser-provided branch, repository, path or authorization claims are rejected. Only `_content/clergy.json` and server-generated paths in the two dedicated uploads directories can be written. Existing image references must match a previously stored source/thumbnail pair. Existing record IDs cannot be removed: use unpublish. Unassigned original research sources are preserved unchanged.

Every request is bounded while reading its stream, even without Content-Length. All source records and image metadata have strict field and text limits. HTML is not accepted as biography content; the shared public renderer escapes plain text. Error messages are fixed categories and never relay SDK errors or secret settings.

Before saving the API reads the current Dev head and source blob at that immutable commit. Both must match the loaded versions. It creates only the required archive blobs on the current base tree, with that exact head as parent, and advances Dev with `force:false`. A competing calendar/news/archive update becomes a conflict instead of being overwritten. Staged edits remain visible on conflict; copy needed changes and explicitly reload before reapplying them. An ambiguous network error also requires checking the shared state before retrying.

## Build and deployment

`build-clergy-archive.js` reads the same structured source and uses `clergy-render.js` for static cards/profiles. Only `published:true` records are sorted into the chronology and projected to `clergy-data.json`. Internal notes, sources, originals and permission fields never enter public HTML, gallery data or search. The existing search build reads regenerated public HTML. The homepage teaser retains its selected people and skips unpublished/missing portraits safely; portrait replacements update it automatically.

The existing Dev content workflow rebuilds and requests Pages only after confirming its configured source branch is Dev. The existing Azure Function workflow deploys the protected route and image decoder. No main branch, custom domain or authentication architecture is changed.

Run `npm test`, `npm run build`, `npm --prefix azure-function test` and the deployment package verification. Browser checks should cover 390, 430, 768, 1024 and 1440 px, labelled fields, focus, Escape, image previews, staged save, draft save, publication and conflicts. An authenticated live test must use a real authorised session; test principals are for isolated unit fixtures only.
