# Master Plan #17B: Bible proxy

The Dev website is static GitHub Pages. The existing Node 24 Azure Functions v4
app `stmichael-church-admin-api` in `rg-stmichael-church-admin` handles authenticated
publishing and a calendar timer. Bible requests use a separate handler and private
Blob container `church-bible-cache`, with the existing host storage connection or
managed identity. No calendar blob, GitHub writer, identity policy, timer, or
existing endpoint is changed. No new dependency or hosting service is needed.

## Activation (not automatic)

The new handler returns 503 until explicitly enabled. Deployment does not modify
Azure settings, CORS or Easy Auth. The existing app has Require authentication /
HTTP 401 enabled (confirmed in Portal on 17 October 2026). Public reading therefore
needs a narrowly scoped Easy Auth exclusion, in addition to the private key.
Never switch the entire app to Allow unauthenticated access.

1. Azure Portal → Function App **stmichael-church-admin-api** → Settings →
   **Environment variables** → App settings → **Add**. Name: `API_BIBLE_KEY`.
   Enter the rotated key privately in Value, accept, then **Apply** / confirm.
   Do not reveal, copy into chat, photograph or put the value in Cloud Shell.
2. Add non-secret settings `API_BIBLE_NIV_ID` and optionally
   `API_BIBLE_NIRV_ID`: the exact licensed **Anglicised** Bible IDs from the
   API.Bible account (not guessed or standard US editions). IDs are public
   identifiers with shape `0123456789abcdef-01`. NIV is the reader default;
   leave NIrV unset if its ID is not yet verified.
3. Keep disabled until the configuration review is complete. Before enabling,
   append only `/api/bible/*` to `authsettingsV2.globalValidation.excludedPaths`,
   retaining `platform.enabled=true`, `requireAuthentication=true`,
   `unauthenticatedClientAction=Return401`, the existing audience validation,
   identity providers and all other settings. Use an authenticated Azure management
   session; the Portal Edit authentication form does not expose excluded paths.
   Read the existing configuration, change only the excludedPaths array, then
   verify the resulting configuration. Do not replace it with a partial template.
   No automated authentication mutation is included in this change.
4. `API_BIBLE_ALLOWED_ORIGINS` is a comma-separated list of exact HTTPS origins.
   The default is `https://micklehamchurch.github.io` (paths such as `/website`
   are not part of an origin). Add the verified production origin when one is
   established. Preserve the existing platform CORS allowlist for Admin; add only
   required exact church origins if missing, never `*`. The Bible handler adds
   its own exact origin check without credentials. CORS is a browser restriction,
   not authentication or a quota defence.
5. Set `API_BIBLE_ENABLED=true` once steps 1–4 are verified. Privately test a
   metadata request then a chapter. Confirm anonymous `/api/auth/status`,
   `/api/calendar` and `/api/health` still return 401, and verify signed-in Admin
   status/calendar reads and automatic sync status in the existing dashboard.
   Do not publish test calendar data. If anything fails, disable Bible with
   `API_BIBLE_ENABLED=false` and remove only the new excluded path.

## Read-only endpoints

All paths are under `/api/bible/`, with GET and OPTIONS only:

| Path | Purpose |
| --- | --- |
| `translations` | Metadata for the configured licensed translations only |
| `niv/metadata` | NIV Anglicised metadata and copyright |
| `niv/books` | Books |
| `niv/books/JHN/chapters` | Chapter list |
| `niv/chapters/JHN.3` | One chapter, plain text |
| `niv/passages/JHN.3.16-JHN.3.18` | At most 100 verses within one chapter |

Replace `niv` with `nirv` for its configured optional translation. No arbitrary
Bible IDs, upstream URLs, headers, query selectors, search, downloads or bulk
Bible endpoint are exposed. Invalid IDs/ranges/queries fail before upstream access.
Success retains provider `data`, copyright, `meta` (including view-tracking data),
and API.Bible attribution. A future reader must render content as text, display
copyright and attribution, and implement the provider's fair-use tracking for
each displayed passage, including cache hits; do not execute provider-supplied
script strings or insert untrusted HTML. #17C is conditional on live activation.

## Caching and quota

The cache expires after 14 days, never serves stale content, holds at most 256
responses / about 6 MiB, and evicts oldest entries. Responses to browsers use
no-store, keeping content expiry under server control. The separate Bible state
blob is private; it never contains the key. Its lease serializes requests across
workers and suppresses concurrent duplicate misses. Busy requests return 503 and
should be retried with backoff. The shared container and bounded blob follow the
existing calendar store pattern, without touching that store's state or lease.

A persistent daily counter reserves every upstream attempt *before* fetching,
including unsuccessful attempts, and stops after 4,500 calls over the current
day plus the previous 31 days. This conservatively leaves at least 500 calls of
the 5,000-call plan for private setup/other usage; the provider dashboard remains
authoritative. Other applications using this key are not counted here. Do not
delete/reset the Bible state blob to clear cache: that also resets the quota.
Storage/lease/configuration failures fail closed, never fall back to unbounded
in-memory requests. Requests time out after 10 seconds, redirects are rejected,
responses are bounded to 512 KiB, and provider failures trigger a short worker
cooldown. Errors are fixed categories with no provider bodies, SDK text or logs.
Storage and quota exhaustion can make reading temporarily unavailable.

Expired records are pruned on access; no expired record is served. Storage retains
the last state between requests, so operators should use normal retention controls
when retiring the integration. The 14-day serving TTL follows
[API.Bible caching guidance](https://care.api.bible/article/401-caching-content).
See also [chapter response fields](https://docs.api.bible/guides/chapters/) and
[Azure excluded paths](https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/get-auth-settings-v-2-without-secrets?view=rest-appservice-2025-03-01).

## Verification and deployment

Run `npm ci` and `npm test` in `azure-function` with no real credentials. Tests
use synthetic text, an ephemeral random in-memory credential and mocked transports.
They cover validation, copyright/tracking retention, TTL, origin restrictions,
preflight, method/configuration failures, quota persistence, provider redaction,
private storage leases, busy/corrupt states and existing route authorization.
The package verifier and Dev-only deployment inventory require the new `bible`
function alongside all 14 existing registrations, including the unchanged
15-minute calendar timer. No changes are made to main.
