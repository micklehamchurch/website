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

Copy the exact normalized diagnostic values, never infer them from the email or SPA client ID. Do not add an entry if the required scope identifier is absent. Recheck status after deployment: Ed should receive 200 with `administrator: true`; another authenticated user should receive 403. The temporary diagnostic and dashboard setup control remain available for this live enrollment test. No write endpoint or Calendar publishing is enabled at this stage.

Claim structure and the Azure-injected header trust boundary follow [Microsoft's Easy Auth identity documentation](https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-user-identities).

### Deployment verification

The reported live identity matches the configured entry character-for-character and authorizes under this source. The previous workflow's successful deployment did not prove the running worker loaded that revision; stale package/worker state is the suspected cause, not a demonstrated claim mismatch. Authorization comparisons remain unchanged.

The workflow pins both checkouts to the triggering commit and serializes API deployments. It verifies a source/dependency ZIP on Linux, including the exact live-identity regression, all four HTTP registrations, and production dependency loading. The actual deployment uses the previously working `package: azure-function` and `remote-build: true` Flex Consumption path so Azure prepares dependencies for its runtime. A public commit manifest is included and the authorization fingerprints remain available. No application settings, secrets, or GitHub App configuration are changed. After deployment, the workflow checks that the Azure host indexes all four HTTP functions; a successful package upload alone is insufficient.

The frontend API scope and token acquisition remain unchanged. The dashboard now shows only a safe health-request category, and the identity check distinguishes API-token acquisition, missing token, network/CORS failure, HTTP status, and invalid response without showing raw provider errors or response bodies. Successful identity output continues to contain only the allowlisted identity fields and public authorization build data.

The authenticated identity diagnostic additionally returns `authorizationBuild`: the deployed commit revision and SHA-256 fingerprints of the actual in-memory allowlist and comparison function. The dashboard displays only these public build fields alongside the existing minimal identity. Compare them with the verified-package step's output. Matching fingerprints confirm the live worker loaded the intended allowlist/comparator; a missing or different revision identifies stale code. No token or environment configuration is returned. Live authenticated verification still requires Ed's sign-in; a workflow success alone does not replace this check.

## Local development

Use Node.js 24 and Azure Functions Core Tools v4. Install dependencies with `npm ci`, run unit tests with `npm test`, then start the Functions host with `npm start`. Local Functions Core Tools do not reproduce Azure Easy Auth; a local request must not be treated as evidence of production authentication. Do not place credentials in source control. Local `local.settings.json`, `.env*`, private keys, and publish settings are ignored by the repository.

## Deployment

The dedicated workflow `.github/workflows/deploy-azure-function.yml` runs only for the `Dev` branch and packages only this directory. It uses GitHub Actions OIDC and skips deployment with a warning until these repository variables are configured:

- `AZURE_CLIENT_ID`: client ID of a user-assigned managed identity with a federated credential for `repo:micklehamchurch/website:ref:refs/heads/Dev` and the `api://AzureADTokenExchange` audience.
- `AZURE_TENANT_ID`: Entra tenant ID for that identity.
- `AZURE_SUBSCRIPTION_ID`: subscription containing the Function App.

Grant the managed identity the **Website Contributor** role scoped to the Function App. The workflow deploys to the existing app `stmichael-church-admin-api-dmcebvc9dpa4gthd.uksouth-01.azurewebsites.net`. Configure the repository variables and Azure federation before expecting a deployment. No Azure credential or GitHub App private key belongs in this repository.

Keep application settings and credentials inside Azure's server-side configuration. The health handler does not read or return them. Do not copy credentials into repository files, GitHub workflow YAML, or browser code.
