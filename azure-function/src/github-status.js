const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const { createPrivateKey } = require('node:crypto');

const SAFE_DIAGNOSTICS = new Set([
  'github-config-invalid',
  'github-private-key-invalid',
  'github-app-auth-failed',
  'github-installation-token-failed',
  'github-repository-unavailable',
  'github-branch-unavailable',
  'github-api-unavailable'
]);

const EXPECTED_TARGET = Object.freeze({
  appId: '5153326',
  installationId: '166969054',
  owner: 'micklehamchurch',
  repository: 'website',
  branch: 'Dev'
});

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n').replace(/\r\n?/g, '\n').trim();
}

function categorizedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function readGithubConfiguration(env = process.env) {
  const appId = String(env.GITHUB_APP_ID || '').trim();
  const installationId = String(env.GITHUB_INSTALLATION_ID || '').trim();
  const owner = String(env.GITHUB_OWNER || '').trim();
  const repository = String(env.GITHUB_REPO || '').trim();
  const branch = String(env.GITHUB_BRANCH || '').trim();
  if (
    appId !== EXPECTED_TARGET.appId ||
    installationId !== EXPECTED_TARGET.installationId ||
    owner !== EXPECTED_TARGET.owner ||
    repository !== EXPECTED_TARGET.repository ||
    branch !== EXPECTED_TARGET.branch ||
    !env.GITHUB_APP_PRIVATE_KEY
  ) {
    throw categorizedError('github-config-invalid');
  }

  const privateKey = normalizePrivateKey(env.GITHUB_APP_PRIVATE_KEY);
  if (
    !/^-----BEGIN (?:RSA )?PRIVATE KEY-----\n[\s\S]+\n-----END (?:RSA )?PRIVATE KEY-----$/.test(privateKey)
  ) throw categorizedError('github-private-key-invalid');
  try {
    // Parse locally before calling Octokit. Never include the PEM or parser
    // exception in a response or log.
    createPrivateKey({ key: privateKey, format: 'pem' });
  } catch {
    throw categorizedError('github-private-key-invalid');
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

async function createInstallationClient(configuration, createAppAuthImplementation = createAppAuth) {
  let appAuth;
  try {
    appAuth = createAppAuthImplementation({
      appId: configuration.appId,
      installationId: configuration.installationId,
      privateKey: configuration.privateKey,
      log: { warn() {} }
    });
    // Force local App JWT signing as a distinct stage. The token remains
    // server-side and is neither persisted nor logged.
    const appToken = await appAuth({ type: 'app' });
    if (!appToken?.token) throw new Error('missing-app-token');
  } catch {
    throw categorizedError('github-app-auth-failed');
  }

  let installation;
  try {
    installation = await appAuth({
      type: 'installation',
      installationId: configuration.installationId,
      repositoryNames: [configuration.repository],
      permissions: { contents: 'read' }
    });
  } catch {
    throw categorizedError('github-installation-token-failed');
  }
  if (!installation?.token) throw categorizedError('github-installation-token-failed');
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
    } catch (error) {
      const category = SAFE_DIAGNOSTICS.has(error?.code) ? error.code : 'github-config-invalid';
      logger.warn?.(`[GitHub status] ${category}`);
      return {
        status: 503,
        jsonBody: { ok: false, error: category }
      };
    }

    let octokit;
    try {
      // Create one short-lived Octokit client per request. Its installation token
      // stays inside the server-side auth strategy and is never returned or logged.
      octokit = await createClient(configuration);
    } catch (error) {
      const category = SAFE_DIAGNOSTICS.has(error?.code) ? error.code : 'github-api-unavailable';
      logger.warn?.(`[GitHub status] ${category}`);
      return { status: 502, jsonBody: { ok: false, error: category } };
    }

    try {
      const repository = await octokit.rest.repos.get({
        owner: configuration.owner,
        repo: configuration.repository
      });
      if (String(repository.data?.full_name || '').toLowerCase() !== `${configuration.owner}/${configuration.repository}`.toLowerCase()) {
        throw categorizedError('github-repository-unavailable');
      }
    } catch (error) {
      const category = SAFE_DIAGNOSTICS.has(error?.code) ? error.code : 'github-repository-unavailable';
      logger.warn?.(`[GitHub status] ${category}`);
      return { status: 502, jsonBody: { ok: false, error: category } };
    }

    try {
      const branch = await octokit.rest.repos.getBranch({
        owner: configuration.owner,
        repo: configuration.repository,
        branch: configuration.branch
      });
      if (branch.data?.name !== configuration.branch) {
        throw categorizedError('github-branch-unavailable');
      }
    } catch (error) {
      const category = SAFE_DIAGNOSTICS.has(error?.code) ? error.code : 'github-branch-unavailable';
      logger.warn?.(`[GitHub status] ${category}`);
      return {
        status: 502,
        jsonBody: { ok: false, error: category }
      };
    }

    return {
      status: 200,
      jsonBody: {
        ok: true,
        repository: `${configuration.owner}/${configuration.repository}`,
        branch: configuration.branch
      }
    };
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
  SAFE_DIAGNOSTICS,
  normalizePrivateKey,
  readGithubConfiguration,
  createInstallationClient,
  createGithubStatusService,
  createGithubStatusHandler
};
