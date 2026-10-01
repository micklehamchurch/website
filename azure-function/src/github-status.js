const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');

const EXPECTED_TARGET = Object.freeze({
  appId: '5153326',
  installationId: '166969054',
  owner: 'micklehamchurch',
  repository: 'website',
  branch: 'Dev'
});

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n').trim();
}

function readGithubConfiguration(env = process.env) {
  const appId = String(env.GITHUB_APP_ID || '').trim();
  const installationId = String(env.GITHUB_INSTALLATION_ID || '').trim();
  const owner = String(env.GITHUB_OWNER || '').trim();
  const repository = String(env.GITHUB_REPO || '').trim();
  const branch = String(env.GITHUB_BRANCH || '').trim();
  const privateKey = normalizePrivateKey(env.GITHUB_APP_PRIVATE_KEY);

  if (
    appId !== EXPECTED_TARGET.appId ||
    installationId !== EXPECTED_TARGET.installationId ||
    owner !== EXPECTED_TARGET.owner ||
    repository !== EXPECTED_TARGET.repository ||
    branch !== EXPECTED_TARGET.branch ||
    !/^-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(privateKey) ||
    !/-----END (?:RSA )?PRIVATE KEY-----$/.test(privateKey)
  ) {
    const error = new Error('GitHub App configuration is unavailable.');
    error.code = 'invalid_configuration';
    throw error;
  }

  return Object.freeze({
    appId: Number(appId),
    installationId: Number(installationId),
    owner,
    repository,
    branch,
    privateKey
  });
}

async function createInstallationClient(configuration) {
  const appAuth = createAppAuth({
    appId: configuration.appId,
    installationId: configuration.installationId,
    privateKey: configuration.privateKey,
    log: { warn() {} }
  });
  const installation = await appAuth({
    type: 'installation',
    installationId: configuration.installationId,
    repositoryNames: [configuration.repository],
    permissions: { contents: 'read' }
  });
  return new Octokit({ auth: installation.token, userAgent: 'stmichael-church-admin-api' });
}

function createGithubStatusService({
  env = process.env,
  createClient = createInstallationClient,
  logger = console
} = {}) {
  return async function getGithubStatus() {
    let configuration;
    try {
      configuration = readGithubConfiguration(env);
    } catch {
      logger.warn?.('[GitHub status] configuration-invalid');
      return {
        status: 503,
        jsonBody: { ok: false, error: 'configuration_unavailable' }
      };
    }

    try {
      // Create one short-lived Octokit client per request. Its installation token
      // stays inside the server-side auth strategy and is never returned or logged.
      const octokit = await createClient(configuration);
      const repository = await octokit.rest.repos.get({
        owner: configuration.owner,
        repo: configuration.repository
      });
      if (String(repository.data?.full_name || '').toLowerCase() !== `${configuration.owner}/${configuration.repository}`.toLowerCase()) {
        throw new Error('Configured repository could not be verified.');
      }

      const branch = await octokit.rest.repos.getBranch({
        owner: configuration.owner,
        repo: configuration.repository,
        branch: configuration.branch
      });
      if (branch.data?.name !== configuration.branch) {
        throw new Error('Configured branch could not be verified.');
      }

      return {
        status: 200,
        jsonBody: {
          ok: true,
          repository: `${configuration.owner}/${configuration.repository}`,
          branch: configuration.branch
        }
      };
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : null;
      logger.warn?.(`[GitHub status] repository-check-failed${status ? ` http-${status}` : ''}`);
      return {
        status: 502,
        jsonBody: { ok: false, error: 'repository_unavailable' }
      };
    }
  };
}

function createGithubStatusHandler(options) {
  const getStatus = createGithubStatusService(options);
  // Intentionally ignore the request object: callers cannot select a repository,
  // branch, or path through query parameters, headers, or a request body.
  return async function githubStatusHandler() {
    return getStatus();
  };
}

module.exports = {
  EXPECTED_TARGET,
  normalizePrivateKey,
  readGithubConfiguration,
  createInstallationClient,
  createGithubStatusService,
  createGithubStatusHandler
};
