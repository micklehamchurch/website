# Phase 3: staged permission rollout (Dev only)

## This release is a prerequisite, not the completed Admin redesign

The existing Microsoft frontend admission remains in place. In the absence of
`ADMIN_ACCESS_MODE`, content handlers retain the existing immutable owner policy.
Only an operator may select `ADMIN_ACCESS_MODE=capabilities`, AFTER the private
owner has been bootstrapped, read back, and verified from the signed-in browser.
Do not enable that setting with the old frontend admission still installed: the
new editor-facing shell must be integrated in the next release first.

No application setting, Easy Auth exclusion, Azure role or storage resource is
changed by pushing this release. The operator bootstrap is separate and explicit.

## Approved onboarding

Owner adds a pending account and intended section permissions. A Microsoft-signed-in
person presents their immutable identity against that pending account label. This
records an approval candidate, NOT access. The owner independently reviews the
account (and, if needed, checks with the intended person), then approves once.
No invitation link and no automatic email-based authorisation are implemented.

Claimed Microsoft email/name fields are display hints only, not proof that the
candidate is the intended person. Owners can reset a wrong candidate. Reinstating
a revoked account returns it to approval, never silently back to active.

Capability identifiers: `news`, `publications`, `events`, `contacts`,
`weekly_quotation`, `historical_people`, `photo_albums`, `feedback`.
Roles: `editor`, `owner`. Owner implies all registered sections and permission
management. Unknown capabilities deny access. Pending candidates have zero access.

## Private storage

Verified Dev account: `rgstmichaelchurchad85df`; anonymous Blob access disabled.
Container: `church-website-access`; blob: `permissions-v1.json`.
No permission state, account roster, credentials or bootstrap output belongs in
GitHub. Both reads and writes verify container privacy. Reads never initialize
state. Initial creation uses `If-None-Match: *`; updates require the current ETag.
Missing/corrupt/unavailable state denies access in capabilities mode. It never
falls back to the legacy owner policy. Permission updates preserve an active owner
and commit their audit entry in the same blob transaction. No request grant cache.
The audit is bounded and owner-visible, not tamper-proof against infrastructure
operators. Private archival is required before its 5,000-entry limit is reached;
the API refuses further permission mutations rather than dropping audit records.

## Owner bootstrap and read-back

1. Deploy this foundation through the existing Dev API workflow; verify all four
   `access-*` functions register without runtime errors and unsigned requests fail.
2. In the current signed-in Admin, expand **Administrator access setup**. Choose
   **Copy verified owner setup**. It checks the current identity and copies one
   JSON line, without a token. It requires administrator true and
   `authorizationStatus: http-200` for the exact API release revision.
3. In PowerShell Cloud Shell check out that exact release, sparse path
   `azure-function`, and run `npm ci --ignore-scripts --omit=dev` there.
4. Run `./scripts/bootstrap-access.ps1 -ExpectedRevision <exact-API-release-SHA>`.
   It asks for the just-verified JSON in a hidden prompt and an account display
   label. Do NOT paste a bearer token. Do NOT share that JSON in chat.
5. The script checks the live verification against the unchanged legacy owner
   policy BEFORE any Azure write. It verifies the named account still blocks
   public Blob access, creates only the private access container, then writes and
   reads back the initial owner. Credentials stay in process memory, never files
   or command-line arguments. No RBAC expansion or enforcement switch is attempted.
6. A repeated bootstrap refuses to overwrite an existing permission blob. A failure
   must be investigated; do not delete the blob and retry to bypass safeguards.
7. Reload the signed-in Admin and choose **Verify private owner setup**. This is a
   read-only API check, confirms the CURRENT signed-in identity is an active owner,
   and prints no token or identity identifiers.
8. Report only the boolean bootstrap receipt and the browser verification message.
   Keep enforcement unchanged until the next implementation stage is ready.

Bootstrap is an operator script, not a remotely callable bootstrap endpoint.
Normal requests cannot recreate state; no reset/destroy-store API exists.

## API map and boundaries

`access/session` reveals only the caller's access, without immutable IDs.
`access/enrolment` accepts only the pending account label from an authenticated
caller; all identity information comes from trusted Easy Auth claims.
`access/users` is private-store-owner-only, with version-checked changes.
`access/verify` is a read-only owner read-back check.
These routes are NOT added to Easy Auth exclusions. Public Bible and public
Feedback requests retain their current application controls.

When capabilities mode is eventually enabled, every content handler checks its
own section before protected backend work, and diagnostics/manual Google sync
require owner. Automatic timer jobs retain their trusted server workflow.
Revocation denies the next API request even with a still-valid Microsoft token;
it cannot undo already committed operations. Users & Permissions UI, the new
editor shell and permission refresh are subsequent work, not activated here.

## Recovery and rollback

Do not switch enforcement until verified owner read-back and the next frontend
release are ready. Keep a private backup before future permission changes.
If storage becomes unavailable after activation, fail closed; never reset it.
Frontend rollback must retain server capability checks. Restoring an older access
snapshot requires reconciling newer revocations and checking the last-owner rule.
An emergency legacy rollback must exclude new editors and be an explicit owner
operation, not automatic error recovery.

## Migration

The identity records preserve exact issuer/subject and tenant/object pins. Email
labels never transfer grants to a different Microsoft identity. Future tenant/app
migration requires explicit owner rebinding where identifiers change. Storage,
API environment and owner bootstrap must be verified independently at destination.
