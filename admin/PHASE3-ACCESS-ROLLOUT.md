# Phase 3: staged permission rollout (Dev only)

## Redesigned CMS and guarded enforcement transition

The owner confirmed successful private storage write/read-back and signed-in
owner verification after foundation release `965cd9d`. The redesigned interface
now consumes `access/session`, displays capability-filtered cards/navigation,
and supplies owner-only Users & Permissions. News and PDF Publications are
separate sections. Technical diagnostics and references are owner-only.

The explicit Dev commit tag `[activate-admin-access]` requests the deployment
transition. After normal API tests/deployment, the workflow verifies the existing
owner against the ACTUAL private store and checks the served Admin HTML, bundle,
router and CMS stylesheet against the exact release. Only then does it set
`ADMIN_ACCESS_MODE=capabilities`. Failed prerequisites do not activate it. This
tag is not used on routine future deployments. No permission records are written
by activation; no missing store is recreated. Owner/browser verification should
be repeated after activation. Never infer successful activation from a push.

Ordinary editors do not call owner health/GitHub diagnostics. Access is refreshed
on tab return, periodically, and after permission-denial responses. Pending users
can request owner review and check approval but cannot enter the content UI.
All Microsoft claim labels remain hints; owner review is still mandatory.

Repository-backed drafts are not confidential. Draft and publish terminology
reflects persistence: local staging is not a saved draft, and successful content
commits stop at “Saved — website updating” unless deployment is actually verified.
No shared News deletion is invented. Existing non-catalogue images are retained
when editing stories. Public site content/build projections are preserved by
the scoped Admin release build.

## Foundation staging history

Before this redesigned interface was deployed, the existing Microsoft frontend
admission remained in place. In the absence of
`ADMIN_ACCESS_MODE`, content handlers retain the existing immutable owner policy.
Only an operator may select `ADMIN_ACCESS_MODE=capabilities`, AFTER the private
owner has been bootstrapped, read back, and verified from the signed-in browser.
Do not enable that setting with the old frontend admission still installed.

Ordinary deployments do not change enforcement. The explicitly tagged activation
changes only the mode setting after its checks. Easy Auth exclusions and Azure
roles are never changed. Operator bootstrap remains separate and explicit.

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
it cannot undo already committed operations. Users & Permissions, the editor
shell and permission refresh are implemented in the redesigned release above.

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
