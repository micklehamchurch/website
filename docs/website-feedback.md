# Website feedback and PCC discussion review

Starting Dev: `70295fb6fe467dd3576de55c8cd16adac323f438`.
Main must remain `804a189ae8b09e8a88f4bb98947af0e9fcb34c30`.

## Architecture and current activation boundary

This is an additive static frontend plus two Azure Functions in the existing Dev
Admin API. It reuses the installed Azure Blob and Managed Identity libraries and
the host-storage connection strategy used by Calendar sync. It never calls
GitHub or commits messages. No feedback submission triggers a site build.

Default mode is **Off**, with no live code or placeholder credential configured.
Code deployment does not enable feedback or change Azure Authentication.
PCC/public use requires the narrowly scoped Azure action below. Stop there until
the website owner performs it. Do not disable authentication across the app.

The newer public Bible route is independent. Preserve its existing exception,
configuration, storage and rate budget. Preserve all existing Admin protections.

## Private data

Dedicated private container: `church-website-feedback`.
Blob: `discussion-state-v1.json`, version 1, maximum 8 MiB.
The application refuses a container with public blob access. Blob leases guard
read/modify/write operations; writes carry the lease ID and `Cache-Control:
no-store`. This small PCC review does not require a database or third-party chat
service. Capacity errors preserve existing data instead of silently truncating it.

State contains:

- mode (`off`, `pcc`, `public`), code epoch and salted scrypt code verifier;
- reviewer sessions: token digest, chosen name, expiry and code epoch;
- topics: server UUID, author name/role, server creation/activity timestamps,
  page title/path/canonical path, plain-text body, audience, status, reviewed and
  removed flags, replies and status-change history;
- short-lived, durable rate counters.

The raw review code is never persisted in the blob, logs, source, localStorage
or feedback records. Raw session tokens are not stored server-side or in source;
only their digests are stored there. The reviewer bearer token is returned once
and remembered on that browser in localStorage for up to 14 days; it is removed locally by Leave review. The raw code is used only for the
HTTPS validation request and cleared from the form after success. Code rotation
invalidates all previous reviewer sessions immediately. Individual names are
self-declared; approval is possession of the privately distributed shared code.
This is not a verified individual-account system. Admin badges/status rights
derive only from the protected Admin route, never a submitted name or role.

No email, phone, IP, user-agent, browser fingerprint, query string or URL fragment
is collected in feedback state. Page context excludes query/hash values. Reviewers
see PCC names/comments/replies; public submissions are visible only to Admin.
Azure/App Service/Application Insights/network infrastructure can inherently
retain IP/request metadata; its existing retention settings were not changed.
Decide a parish retention period before broad public use. Soft removal hides a
topic but retains it for Admin and restoration. Off never deletes anything.

## Modes and controls

Admin → Feedback shows new/unreviewed count, latest activity, page and audience,
topics, replies, status, review controls, removal/restoration and settings.
PCC Review requires a code before it can be enabled. The owner chooses the code
in the Admin password field; no chat message or repository edit is needed.
Only a salted verifier is stored in private Azure configuration data, avoiding a
plaintext shared-code setting and any new Key Vault credential/permission.

PCC reviewers can list/read PCC topics, filter/search them and post/reply. They
cannot see public submissions, change statuses, moderate or manage settings.
Status values: New, In discussion, Planned, In development, Done. Admin status
changes are recorded in the conversation. Messages use escaped plain text.

Public Feedback provides optional-name private submissions only. It exposes no
topic/read/reply API to ordinary visitors, including former PCC sessions while
public mode is active. Admin replies to public submissions remain internal; no
email address or external reply delivery is collected or promised.

The mode is checked on every API operation. Frontend config is read on page load,
opening feedback and explicit Refresh; this is not real-time chat. Existing pages
may need a reload/Refresh to update the launcher after a mode switch, while API
privacy/restrictions apply immediately. Entered message drafts survive failed
requests and normal in-panel rendering; they are not a durable offline backup.

## API

`/api/website-feedback` — reviewer/public operations only; never trusts Azure
identity headers and never grants Admin rights:

| Method/action | Access and result |
| --- | --- |
| GET config | Public mode only, no counts/secrets/topics |
| POST access | PCC name/code validation; returns opaque session token/expiry |
| GET topics | PCC bearer session; page/status/search filters, 30-item pagination |
| GET topic&id=UUID | PCC session, PCC audience only |
| POST create | PCC session or public submission, depending on mode |
| POST reply&id=UUID | PCC session, PCC topic only |

`/api/feedback-admin` — ALL actions require the existing immutable Admin allowlist
behind Azure Easy Auth:

- GET config, topics, topic — including Off/public/removed records and counts;
- POST reply; POST moderate (status/reviewed/removed);
- POST settings (`mode`); POST rotate-code (`code`).

POST JSON is bounded to 32 KiB, topics to 5,000 UTF-16 code units, replies to 3,000,
names to 80, page titles to 200 and each path to 300. Names/page/body are plain
text. Paths are constrained to the Dev website; arbitrary external links and
traversal are rejected. IDs/times/roles/status/audience are server-owned, and
unknown body fields are rejected. Capacity is 1,000 topics, 200 replies and 200
status events per topic, with 200 active reviewer sessions.

No cookies are used; fetch uses `credentials: omit`. Reviewer bearer tokens are
256-bit random values, hashed server-side. Public/PCC POST requires the exact Dev
Origin; Azure CORS also retains its exact existing origin policy. The shared-code
budget is 10 attempts per five-minute window across all instances (valid attempts
count too). Reviewers create at most 20 topics and 30 replies per five minutes;
anonymous public submissions share a budget of 10 per five minutes. These are
durable under the storage lease, not per-process counters. A honeypot supplements
the public submission limit. No IP collection is needed for these controls.
Global budgets can temporarily throttle legitimate users during an attack; there
is deliberately no unrestricted anonymous discussion forum.

## Owner action required: exact public-path exception

**Do not run this automatically.** This is the sensitive Azure authentication
boundary identified in the request. The code can be deployed Off without it.
The current Admin API requires Microsoft sign-in except approved public paths;
PCC reviewers must be able to reach the feedback route without creating accounts.

Use Azure Portal → Cloud Shell → PowerShell, signed into the correct subscription.
Review the following targeted change. It preserves the complete existing settings
and adds only the exact feedback path; it does not add a wildcard or alter Bible.
The ARM settings GET does not retrieve application-setting secret values.

```powershell
$feedbackAppId = az functionapp list --query "[?name=='stmichael-church-admin-api'].id | [0]" -o tsv
if (-not $feedbackAppId) { throw 'Function App not found in this subscription.' }
$feedbackAuthUrl = "https://management.azure.com${feedbackAppId}/config/authsettingsV2?api-version=2024-11-01"
$feedbackAuth = az rest --method get --url $feedbackAuthUrl | ConvertFrom-Json
if ($feedbackAuth.properties.globalValidation.requireAuthentication -ne $true) {
  throw 'Stop: existing authentication settings need review; do not weaken them.'
}
$feedbackPaths = @($feedbackAuth.properties.globalValidation.excludedPaths) |
  Where-Object { $_ }
$feedbackPaths = @($feedbackPaths + '/api/website-feedback' | Select-Object -Unique)
$feedbackPaths # Review these paths; every existing exclusion must be preserved.
$feedbackAuth.properties.globalValidation |
  Add-Member -Force NoteProperty excludedPaths $feedbackPaths
$feedbackAuthFile = Join-Path ([IO.Path]::GetTempPath()) 'church-feedback-authsettings.json'
@{ properties = $feedbackAuth.properties } | ConvertTo-Json -Depth 100 |
  Set-Content -LiteralPath $feedbackAuthFile -Encoding utf8
# Only run the following final update after reviewing the exact path list above:
az rest --method put --url $feedbackAuthUrl --body "@$feedbackAuthFile" --output none
Remove-Item -LiteralPath $feedbackAuthFile
```

Keep Microsoft authentication required and existing audiences/providers unchanged.
Never exempt `/api/*`, `/api/feedback-admin`, Calendar, archive, or publishing paths.
Keep existing public Bible paths exactly as they were. Do not print/modify any
App Setting secret. This action needs an owner with permission to edit the
Function App's authentication settings, not new reviewer permissions.

Afterward, an unsigned GET of
`https://stmichael-church-admin-api-dmcebvc9dpa4gthd.uksouth-01.azurewebsites.net/api/website-feedback?action=config`
must return `200` and `mode: off`. Unsigned GETs of `/api/feedback-admin`,
`/api/calendar`, `/api/historical-archive` and `/api/auth/status` must still return
`401`. Check the existing Bible route remains unchanged. If any Admin endpoint
becomes public, restore the previous auth settings and stop.

Then sign in at `https://micklehamchurch.github.io/website/admin/#feedback`:

1. Open Feedback settings and PCC access.
2. Set a strong review code of at least 12 characters. Do not send it in this chat.
3. Keep mode Off until the storage/auth checks below succeed.
4. Select PCC Review, save mode, and privately share the code with approved PCC
   reviewers. Test using a separate/private browser at
   `https://micklehamchurch.github.io/website/feedback.html`.

The private container is created by the existing host-storage credentials on the
first settings write. If the app identity is container-scoped and cannot create
it, the Azure owner must create **private** `church-website-feedback` and grant
the app's existing managed identity Storage Blob Data Contributor at that
container only. Do not add a storage key to source or alter Calendar permissions.
Live storage writes and signed-in Admin checks cannot be certified by an
unauthenticated probe; confirm code save, a test topic/reply, Admin status change,
reviewer visibility, Off retention and code rotation before inviting PCC members.

## Tests and visual verification

Node tests execute actual feedback handlers, validation, roles, rate budgets,
mode changes, session expiry/revocation, moderation and private-store lease calls.
`scripts/check-feedback.cjs` starts a real local HTTP server using those handlers,
with isolated in-memory storage and simulated Azure claims (never live records).
Browser tests exercise the conversation, XSS-as-text, remembered access, Admin
status/review/code controls, public submission privacy and Off retention at
1440×1000, 768×1024, 390×844, 320×800 and 874×402, plus enlarged text. This does
not substitute for live Azure permissions/Easy Auth validation or physical Safari.

No feedback is embedded in static HTML or search. Static search contains only the
board's informational shell. No public assets contain a review credential.

## Reserved-route regression protection

The protected endpoint is `feedback-admin`. Azure Functions validates the raw
route before adding `/api`; routes starting with `admin` or `runtime` are
reserved. `validate-http-routes.js` checks every registered HTTP route during
package verification and tests. Deployment also reads the live function status
and verifies an empty runtime error list, the GET/POST binding, the unchanged
Easy Auth exclusions and unsigned rejection of protected endpoints. Registration
metadata alone is not sufficient evidence that a route can execute.
