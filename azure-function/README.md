# St Michael & All Angels Admin API

This is a separate Azure Functions Node.js v4 application. The public website remains a static GitHub Pages site. The API exposes the authenticated health endpoint at `GET /api/health` and a read-only GitHub connectivity check at `GET /api/github/status`. It has no content-write routes.

## Authentication boundary

The Function App's existing Azure App Service Authentication (Easy Auth) configuration is the authentication boundary. It must continue requiring an authenticated Microsoft Entra access token for every API request. The Functions `authLevel: "anonymous"` setting only disables Azure Functions key authentication; it does not make the endpoint publicly accessible when Easy Auth is correctly configured. Easy Auth should reject unauthenticated requests before the handler runs.

The API registration uses audience `api://3262101f-94ec-494a-8aa2-42b3e43c43fe` and delegated scope `api://3262101f-94ec-494a-8aa2-42b3e43c43fe/user_impersonation`. Keep token validation at the server boundary; frontend sign-in or a browser-supplied identity is not server authorization.

## Read-only GitHub status check

`GET /api/github/status` reads only the fixed target `micklehamchurch/website` and its `Dev` branch from server configuration. It accepts no repository, branch, file path, or other selector from the request. The Function App settings must provide `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, and `GITHUB_APP_PRIVATE_KEY`. Keep the private key exclusively in Azure configuration.

The Octokit GitHub App authentication library creates a short-lived App JWT and exchanges it for an installation token in memory. The token request is restricted to the `website` repository and the `contents: read` permission, despite the GitHub App's broader permission for future stages. The endpoint makes only repository and branch read requests and returns only the repository name and branch on success. It does not return or persist credentials and does not modify GitHub.

## Stage 2C server-side administrator authorization

`src/identity.js` reads only the Azure-injected `x-ms-client-principal` payload. It accepts the `aad` provider, handles original and mapped tenant/object/subject claims, rejects malformed or conflicting identifiers, and ignores emails, names, standalone identity headers, request bodies and query parameters. Easy Auth must remain required on ALL routes, with the API audience validated and no alternate ingress bypass. These headers are trusted only because Azure strips external copies and supplies authenticated claims; local simulated headers do not prove authentication.

`GET /api/auth/identity` is a temporary, authenticated self-only diagnostic. It returns only provider, available tenant/object/subject/issuer identifiers, and administrator status. It never returns the full principal, email, names, tokens or settings, and does not log identities. Responses use `Cache-Control: no-store`. The dashboard's **Administrator access setup > Check administrator identity** button uses its existing API token and displays only those fields. No token copying is needed.

`GET /api/auth/status` exercises the administrator gate: missing/invalid identity returns 401, a non-allowlisted identity returns 403, and an approved identity returns 200. `requireAdministrator` provides the same reusable gate for future explicitly scoped operations. The existing health and read-only GitHub status routes retain their current Easy Auth protection and responses; they do not imply administrator approval.

The checked-in `src/admin-identities.json` contains Ed's live verified Microsoft personal-account identity. This entry requires the exact `aad` provider, tenant ID, object ID, subject and issuer returned by Easy Auth. It uses `kind: "subject"` with additional tenant/object bindings; ALL four claims must be present and match. There is no fallback to a partial match. The browser's existing Graph email check remains a dashboard display gate only; it cannot grant server authorization. For future enrollment, verify the identifiers before adding an entry through a reviewed Dev-only change:

- Prefer `{ "provider": "aad", "kind": "object", "tenantId": "<verified tid>", "objectId": "<verified oid>" }` if both IDs exist.
- Otherwise use `{ "provider": "aad", "kind": "subject", "issuer": "<verified iss>", "subject": "<verified sub>" }`. A subject is scoped to the issuer and this fixed API application; never match a bare subject globally.

Copy the exact normalized diagnostic values, never infer them from the email or SPA client ID. Do not add an entry if the required scope identifier is absent. Recheck status after deployment: Ed should receive 200 with `administrator: true`; another authenticated user should receive 403. The temporary diagnostic and dashboard setup control remain available for this live enrollment test. Stage 2C was verified before the constrained Stage 2D Calendar operation below was enabled.

Claim structure and the Azure-injected header trust boundary follow [Microsoft's Easy Auth identity documentation](https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-user-identities).

### Deployment verification

The final live field diagnostics identified a subject transcription error: the verified subject is `AAAAAAAAAAAAAAAAAAAAACmKQtkQPpxJMB93l8aduYc` (lowercase letter l after 93), whereas the original allowlist and transcribed fixture used digit 1. The allowlist and regression fixtures now use the verified lowercase-l subject. All other bindings and comparison logic are unchanged. `test/fixtures/ed-live-identity.json` retains the pre-correction false result and build fingerprints as historical metadata; the corrected allowlist fingerprint must differ. Tests authorize the corrected identity through the parser, registered handler, JSON serialization and frontend, and explicitly deny the old digit-1 transcription with only the subject match failing.

The workflow pins both checkouts to the triggering commit and serializes API deployments. It verifies a source/dependency ZIP on Linux, including the exact live-identity regression, all five HTTP registrations, and production dependency loading. The actual deployment uses the previously working `package: azure-function` and `remote-build: true` Flex Consumption path so Azure prepares dependencies for its runtime. A public commit manifest is included and the authorization fingerprints remain available. No application settings, secrets, or GitHub App configuration are changed. After deployment, the workflow checks that the Azure host indexes all five HTTP functions; a successful package upload alone is insufficient.

The frontend API scope and token acquisition remain unchanged. The dashboard now shows only a safe health-request category, and the identity check distinguishes API-token acquisition, missing token, network/CORS failure, HTTP status, and invalid response without showing raw provider errors or response bodies. Successful identity output continues to contain only the allowlisted identity fields and public authorization build data.

The authenticated identity diagnostic additionally returns `authorizationBuild`: the deployed commit revision and SHA-256 fingerprints of the actual in-memory allowlist and comparison function. The dashboard displays only these public build fields alongside the existing minimal identity. Compare them with the verified-package step's output. Matching fingerprints confirm the live worker loaded the intended allowlist/comparator; a missing or different revision identifies stale code. No token or environment configuration is returned. Live authenticated verification still requires Ed's sign-in; a workflow success alone does not replace this check.

The diagnostic now also includes `authorizationPolicy`: whether the allowlist is an array, the required policy field names, exact field-match booleans, failed field names, supported policy kind, and the authorizer's decision for each entry. It does not expose any configured claim values, tokens, names, emails or settings. The dashboard reports `serverAdministratorType` and independently calls the existing `/api/auth/status` with the same API token, showing only its HTTP status. For Ed, expect all match flags true, `failedFields: []`, `serverAdministratorType: "boolean"`, `authorizationStatus: "http-200"`, and `administrator: true`. A failing live flag identifies the actual binding; a non-boolean response or conflicting status identifies a response-path problem. Return the complete displayed diagnostic if the result remains false; do not guess or relax policy bindings.

## Local development

Use Node.js 24 and Azure Functions Core Tools v4. Install dependencies with `npm ci`, run unit tests with `npm test`, then start the Functions host with `npm start`. Local Functions Core Tools do not reproduce Azure Easy Auth; a local request must not be treated as evidence of production authentication. Do not place credentials in source control. Local `local.settings.json`, `.env*`, private keys, and publish settings are ignored by the repository.

## Deployment

The dedicated workflow `.github/workflows/deploy-azure-function.yml` runs only for the `Dev` branch and packages only this directory. It uses GitHub Actions OIDC and skips deployment with a warning until these repository variables are configured:

- `AZURE_CLIENT_ID`: client ID of a user-assigned managed identity with a federated credential for `repo:micklehamchurch/website:ref:refs/heads/Dev` and the `api://AzureADTokenExchange` audience.
- `AZURE_TENANT_ID`: Entra tenant ID for that identity.
- `AZURE_SUBSCRIPTION_ID`: subscription containing the Function App.

Grant the managed identity the **Website Contributor** role scoped to the Function App. The workflow deploys to the existing app `stmichael-church-admin-api-dmcebvc9dpa4gthd.uksouth-01.azurewebsites.net`. Configure the repository variables and Azure federation before expecting a deployment. No Azure credential or GitHub App private key belongs in this repository.

Keep application settings and credentials inside Azure's server-side configuration. The health handler does not read or return them. Do not copy credentials into repository files, GitHub workflow YAML, or browser code.

## Stage 2D: Calendar publishing on Dev

GET /api/calendar and PUT /api/calendar both require the unchanged Stage 2C administrator gate behind Azure Easy Auth. GET reads the current editorial file and ICS feed directly from Dev and returns editorial data, feed items, and both Git blob SHAs. No credentials are returned.

PUT accepts exactly { sha, sourceSha, calendar }. It validates a bounded UTF-8 JSON stream (256 KiB maximum), the existing hiddenEventIds/overrides/events schema, allowed fields and types, identifiers, duplicates, required event details, real local dates, end-after-start, IANA time zones, plain text, HTTP(S) links, existing asset image paths and geographic ranges. Validation and public generation share src/calendar-model.js; feed content is preserved using overrides and hidden IDs. Drafts are stored but excluded from public generation.

Only _content/calendar.json in micklehamchurch/website on Dev can be written. Browser repository/branch/path selectors are rejected. Reads use repository-restricted contents:read installation tokens. Only a validated, changed payload that matches both loaded versions requests a repository-restricted contents:write token. GitHub's atomic current-file SHA check protects competing editorial writes; stale files or feed versions return 409 without committing. Unchanged data causes no formatting commit. This does not provide an atomic multi-file transaction with simultaneous external ICS updates.

A successful publish returns only the new file and commit SHAs. Fixed error categories never include SDK error text, tokens or settings. The dashboard loads shared Calendar state on entry, stages Add/Edit/Delete in memory, asks for publication confirmation, blocks duplicate publication and requires a reload after a conflict or uncertain result. Refresh reloads committed data and discards unpublished edits. Other dashboard areas retain demo storage and have no publishing API. The existing content-build workflow watches calendar.json and rebuilds the public events and search; The same workflow explicitly requests the existing Pages build after generation, because generated commits made with GITHUB_TOKEN do not trigger Pages automatically. It checks the configured Pages source is Dev before requesting the build; it does not change Pages settings or introduce another build architecture. No shared Calendar content was changed during implementation.

The existing four health/auth/status routes and safe authorizationBuild/authorizationPolicy diagnostics remain available. Package verification and the post-deployment host inventory now require all five function registrations, with GET/PUT only on the Calendar route. All deployment and content builds remain Dev-only. No Azure settings, credentials or GitHub App configuration are changed.
