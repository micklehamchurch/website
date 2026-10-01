# St Michael & All Angels Admin API

This is a separate Azure Functions Node.js v4 application. The public website remains a static GitHub Pages site. The current API intentionally exposes only an authenticated health endpoint at `GET /api/health`; it does not call GitHub or provide content-write routes.

## Authentication boundary

The Function App's existing Azure App Service Authentication (Easy Auth) configuration is the authentication boundary. It must continue requiring an authenticated Microsoft Entra access token for every API request. The Functions `authLevel: "anonymous"` setting only disables Azure Functions key authentication; it does not make the endpoint publicly accessible when Easy Auth is correctly configured. Easy Auth should reject unauthenticated requests before the handler runs.

The API registration uses audience `api://3262101f-94ec-494a-8aa2-42b3e43c43fe` and delegated scope `api://3262101f-94ec-494a-8aa2-42b3e43c43fe/user_impersonation`. Keep token validation at the server boundary; frontend sign-in or a browser-supplied identity is not server authorization.

## Local development

Use Node.js 24 and Azure Functions Core Tools v4. Install dependencies with `npm ci`, run unit tests with `npm test`, then start the Functions host with `npm start`. Local Functions Core Tools do not reproduce Azure Easy Auth; a local request must not be treated as evidence of production authentication. Do not place credentials in source control. Local `local.settings.json`, `.env*`, private keys, and publish settings are ignored by the repository.

## Deployment

The dedicated workflow `.github/workflows/deploy-azure-function.yml` runs only for the `Dev` branch and packages only this directory. It uses GitHub Actions OIDC and skips deployment with a warning until these repository variables are configured:

- `AZURE_CLIENT_ID`: client ID of a user-assigned managed identity with a federated credential for `repo:micklehamchurch/website:ref:refs/heads/Dev` and the `api://AzureADTokenExchange` audience.
- `AZURE_TENANT_ID`: Entra tenant ID for that identity.
- `AZURE_SUBSCRIPTION_ID`: subscription containing the Function App.

Grant the managed identity the **Website Contributor** role scoped to the Function App. The workflow deploys to the existing app `stmichael-church-admin-api-dmcebvc9dpa4gthd.uksouth-01.azurewebsites.net`. Configure the repository variables and Azure federation before expecting a deployment. No Azure credential or GitHub App private key belongs in this repository.

Keep existing application settings and credentials inside Azure's server-side configuration. The health handler does not read or return them. Do not copy credentials into repository files, GitHub workflow YAML, or browser code.
