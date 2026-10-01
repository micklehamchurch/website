# St Michael & All Angels Admin API

This is a separate Azure Functions Node.js v4 application. The public website remains a static GitHub Pages site. The API exposes the authenticated health endpoint at `GET /api/health` and a read-only GitHub connectivity check at `GET /api/github/status`. It has no content-write routes.

## Authentication boundary

The Function App's existing Azure App Service Authentication (Easy Auth) configuration is the authentication boundary. It must continue requiring an authenticated Microsoft Entra access token for every API request. The Functions `authLevel: "anonymous"` setting only disables Azure Functions key authentication; it does not make the endpoint publicly accessible when Easy Auth is correctly configured. Easy Auth should reject unauthenticated requests before the handler runs.

The API registration uses audience `api://3262101f-94ec-494a-8aa2-42b3e43c43fe` and delegated scope `api://3262101f-94ec-494a-8aa2-42b3e43c43fe/user_impersonation`. Keep token validation at the server boundary; frontend sign-in or a browser-supplied identity is not server authorization.

## Read-only GitHub status check

`GET /api/github/status` reads only the fixed target `micklehamchurch/website` and its `Dev` branch from server configuration. It accepts no repository, branch, file path, or other selector from the request. The Function App settings must provide `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, and `GITHUB_APP_PRIVATE_KEY`. Keep the private key exclusively in Azure configuration.

The Octokit GitHub App authentication library creates a short-lived App JWT and exchanges it for an installation token in memory. The token request is restricted to the `website` repository and the `contents: read` permission, despite the GitHub App's broader permission for future stages. The endpoint makes only repository and branch read requests and returns only the repository name and branch on success. It does not return or persist credentials and does not modify GitHub.

## Easy Auth identity context for a future write stage

After Easy Auth authenticates a request, Azure App Service exposes identity headers to the Function, including `x-ms-client-principal` (Base64-encoded JSON claims), `x-ms-client-principal-id`, `x-ms-client-principal-name`, and `x-ms-client-principal-idp`. Entra claims can be mapped, so the claim names in the principal object may differ from their original token names. The current read-only status endpoint does not make per-user authorization decisions beyond Easy Auth. Before any write endpoint is added, implement a server-side administrator allow-list using verified tenant and immutable user object identifiers from the Easy Auth principal; do not authorize by an email or identity supplied by the browser. Keep Easy Auth required and ensure no alternate route bypasses it.

## Local development

Use Node.js 24 and Azure Functions Core Tools v4. Install dependencies with `npm ci`, run unit tests with `npm test`, then start the Functions host with `npm start`. Local Functions Core Tools do not reproduce Azure Easy Auth; a local request must not be treated as evidence of production authentication. Do not place credentials in source control. Local `local.settings.json`, `.env*`, private keys, and publish settings are ignored by the repository.

## Deployment

The dedicated workflow `.github/workflows/deploy-azure-function.yml` runs only for the `Dev` branch and packages only this directory. It uses GitHub Actions OIDC and skips deployment with a warning until these repository variables are configured:

- `AZURE_CLIENT_ID`: client ID of a user-assigned managed identity with a federated credential for `repo:micklehamchurch/website:ref:refs/heads/Dev` and the `api://AzureADTokenExchange` audience.
- `AZURE_TENANT_ID`: Entra tenant ID for that identity.
- `AZURE_SUBSCRIPTION_ID`: subscription containing the Function App.

Grant the managed identity the **Website Contributor** role scoped to the Function App. The workflow deploys to the existing app `stmichael-church-admin-api-dmcebvc9dpa4gthd.uksouth-01.azurewebsites.net`. Configure the repository variables and Azure federation before expecting a deployment. No Azure credential or GitHub App private key belongs in this repository.

Keep application settings and credentials inside Azure's server-side configuration. The health handler does not read or return them. Do not copy credentials into repository files, GitHub workflow YAML, or browser code.
