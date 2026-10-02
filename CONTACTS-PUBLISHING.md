# Parish Contacts publishing (Dev)

Authoritative source: `_content/contacts.json`. The existing six `sections` retain their IDs, titles and eyebrow text: Parish leadership; Parish office & PCC; Worship & life events; Pastoral care & safeguarding; Parish life & communications; PCC members.

The initial 31 published entries comprise 18 contact records and 13 PCC records. A contact has `id`, `section`, `role`, `name`, `status`, optional `phone`, `email` and `groupId`. PCC records have `id`, `name`, `status`; names only. Display order is array position. Adjacent matching group IDs preserve grouped contact cards. Genuine source data was not edited for this capability.

Authenticated administrators use GET and PUT `/api/contacts`. Both apply the existing verified Easy Auth administrator policy. The deployment's Easy Auth perimeter rejects unauthenticated or spoofed-header requests. The API uses server-side GitHub App credentials and hard-codes `micklehamchurch/website`, branch `Dev`, path `_content/contacts.json`. Request selectors and extra fields are rejected; no arbitrary writes exist.

Opening Contacts loads the shared source, including drafts, and its blob SHA. Old browser-session Contacts data is ignored. Add/edit, category changes, draft/restore, PCC order and confirmed permanent deletion remain staged in memory until Publish changes is confirmed. Refresh loses staged changes. Reload requires confirmation before discarding them. A clean editor disables Publish. Publishing blocks duplicate requests and updates the SHA on success. A stale SHA or GitHub race returns 409; staged data stays available for review/backup and a confirmed reload is required.

Server validation requires the existing root structure and six sections, immutable section metadata during publishing, unique safe IDs across both collections, published/draft status, plain text and bounded field lengths, valid optional email/phone, allowed categories, supported grouping, no unknown ordering fields, and a maximum 256 KiB directory. The JSON request is bounded incrementally, regardless of Content-Length.

Drafts stay in the authenticated shared editor but are excluded from the generated public directory, public Admin projection and search index. Delete stages permanent source removal and explicitly asks for confirmation. Move to draft is the normal temporary hiding action. The public directory retains its existing design. Search reads generated published directory text.

Successful publication says **Contacts published to Dev. The website is rebuilding.** It does not claim Contacts live. Existing content/Pages workflow generates and deploys the public directory/search. Download Contacts backup and the GitHub source link remain under Advanced backup and source; neither is required for ordinary publishing.

The schema reserves optional `photo` for an empty value or a safe `assets/images/contacts/*.jpg/jpeg/png/webp` reference. Editors retain this optional field. No photo upload, image rendering, fake portraits or photo assets are added.

## First live test

Sign into the Dev dashboard as Ed; open Parish Contacts. Confirm shared Dev loaded and the unchanged published counts. Make one approved genuine contact correction. Confirm staged changes and no public change yet. Choose Publish changes and accept confirmation. Expect published/rebuilding. Wait for the content/Pages workflow, then refresh the public Parish Contact Directory and verify the approved change and search. Make a second approved edit to prove the refreshed SHA works. Draft/restore and permanent deletion should only be tested on approved records; implementation tests use isolated fixtures only.

Validation: full `npm test`, full `npm run build`, API package verifier, and CI verification of the deployment ZIP plus all eight indexed HTTP functions. No actual contact publication is performed during implementation.
