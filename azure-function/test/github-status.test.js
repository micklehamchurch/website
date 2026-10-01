const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  EXPECTED_TARGET,
  normalizePrivateKey,
  readGithubConfiguration,
  createInstallationClient,
  createGithubStatusService,
  createGithubStatusHandler
} = require('../src/github-status');

const loggerStub = () => ({ warnings: [], warn(message) { this.warnings.push(message); } });

function generateTestKey() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
  }).privateKey;
}

function testEnvironment(privateKey = generateTestKey()) {
  return {
    GITHUB_APP_ID: EXPECTED_TARGET.appId,
    GITHUB_INSTALLATION_ID: EXPECTED_TARGET.installationId,
    GITHUB_OWNER: EXPECTED_TARGET.owner,
    GITHUB_REPO: EXPECTED_TARGET.repository,
    GITHUB_BRANCH: EXPECTED_TARGET.branch,
    GITHUB_APP_PRIVATE_KEY: privateKey
  };
}

test('validates the fixed GitHub App target and normalizes escaped PEM newlines', () => {
  const privateKey = generateTestKey();
  const escaped = privateKey.replace(/\n/g, '\\n');
  assert.equal(normalizePrivateKey(escaped), privateKey.trim());
  const configuration = readGithubConfiguration(testEnvironment(escaped));
  assert.equal(configuration.appId, 5153326);
  assert.equal(configuration.installationId, 166969054);
  assert.equal(configuration.owner, 'micklehamchurch');
  assert.equal(configuration.repository, 'website');
  assert.equal(configuration.branch, 'Dev');
  assert.equal(configuration.privateKey, privateKey.trim());

  for (const [key, value] of Object.entries({ GITHUB_OWNER: 'another-owner', GITHUB_REPO: 'another-repo', GITHUB_BRANCH: 'main' })) {
    assert.throws(() => readGithubConfiguration({ ...testEnvironment(), [key]: value }), { code: 'invalid_configuration' });
  }
  assert.throws(() => readGithubConfiguration({ ...testEnvironment(), GITHUB_INSTALLATION_ID: '' }), { code: 'invalid_configuration' });
});

test('Octokit exchanges a mocked App JWT for a repo-scoped installation token, then reads only repository and Dev branch', async () => {
  const env = testEnvironment();
  const configuration = readGithubConfiguration(env);
  const requests = [];
  const installationToken = 'mock-installation-token-never-returned';

  const fetchImpl = async (input, init = {}) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request?.url || String(input));
    const method = String(init.method || request?.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers || request?.headers);
    const authorization = headers.get('authorization') || '';
    const requestBody = init.body ?? (request ? await request.clone().text() : '');
    requests.push({ url, method, headers, authorization, body: requestBody });

    if (method === 'POST' && url.pathname === `/app/installations/${EXPECTED_TARGET.installationId}/access_tokens`) {
      assert.match(authorization, /^Bearer [^.]+\.[^.]+\.[^.]+$/i);
      const body = JSON.parse(String(requestBody));
      assert.deepEqual(body.repositories, ['website']);
      assert.deepEqual(body.permissions, { contents: 'read' });
      return Response.json({ token: installationToken, expires_at: '2026-10-01T22:00:00Z' }, { status: 201 });
    }
    if (method === 'GET' && url.pathname === '/repos/micklehamchurch/website') {
      assert.equal(authorization, `token ${installationToken}`);
      return Response.json({ full_name: 'micklehamchurch/website' });
    }
    if (method === 'GET' && url.pathname === '/repos/micklehamchurch/website/branches/Dev') {
      assert.equal(authorization, `token ${installationToken}`);
      return Response.json({ name: 'Dev' });
    }
    throw new Error('Unexpected mocked GitHub request.');
  };

  const logger = loggerStub();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  let result;
  try {
    const handler = createGithubStatusHandler({ env, createClient: createInstallationClient, logger });
    result = await handler({
      query: { owner: 'attacker', repo: 'private-repo', branch: 'main', path: 'secrets' },
      body: { owner: 'attacker', repo: 'private-repo', branch: 'main' }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(result, {
    status: 200,
    jsonBody: { ok: true, repository: 'micklehamchurch/website', branch: 'Dev' }
  });
  assert.deepEqual(requests.map(({ method, url }) => `${method} ${url.pathname}`), [
    'POST /app/installations/166969054/access_tokens',
    'GET /repos/micklehamchurch/website',
    'GET /repos/micklehamchurch/website/branches/Dev'
  ]);
  assert.deepEqual(logger.warnings, []);
  const responseText = JSON.stringify(result);
  assert.equal(responseText.includes(installationToken), false);
  assert.equal(responseText.includes(configuration.privateKey), false);
  assert.equal(responseText.includes('Authorization'), false);
});

test('rejects a missing repository or Dev ref with safe responses and logs only categories', async () => {
  const env = testEnvironment();
  const logger = loggerStub();
  const repositoryMissing = createGithubStatusService({
    env,
    logger,
    createClient: () => ({ rest: { repos: {
      async get() { throw Object.assign(new Error('sensitive token and PEM'), { status: 404 }); },
      async getBranch() { throw new Error('should not run'); }
    } } })
  });
  const repoFailure = await repositoryMissing();
  assert.deepEqual(repoFailure, { status: 502, jsonBody: { ok: false, error: 'repository_unavailable' } });
  assert.deepEqual(logger.warnings, ['[GitHub status] repository-check-failed http-404']);

  const branchMissing = createGithubStatusService({
    env,
    logger: loggerStub(),
    createClient: () => ({ rest: { repos: {
      async get() { return { data: { full_name: 'micklehamchurch/website' } }; },
      async getBranch(args) {
        assert.deepEqual(args, { owner: 'micklehamchurch', repo: 'website', branch: 'Dev' });
        throw Object.assign(new Error('sensitive token and PEM'), { status: 404 });
      }
    } } })
  });
  assert.deepEqual(await branchMissing(), { status: 502, jsonBody: { ok: false, error: 'repository_unavailable' } });
});

test('configuration errors produce a safe response without disclosing credential material', async () => {
  const logger = loggerStub();
  const sensitiveValue = 'PRIVATE-KEY-AND-TOKEN-DO-NOT-RETURN';
  const getStatus = createGithubStatusService({
    env: { ...testEnvironment(), GITHUB_APP_PRIVATE_KEY: sensitiveValue },
    logger,
    createClient() { throw new Error('must not create a client'); }
  });
  const result = await getStatus();
  assert.deepEqual(result, { status: 503, jsonBody: { ok: false, error: 'configuration_unavailable' } });
  assert.deepEqual(logger.warnings, ['[GitHub status] configuration-invalid']);
  assert.equal(JSON.stringify(result).includes(sensitiveValue), false);
  assert.equal(logger.warnings.join(' ').includes(sensitiveValue), false);
});
