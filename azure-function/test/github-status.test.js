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

test('validates the fixed target and accepts both real and escaped PEM newlines', () => {
  const privateKey = generateTestKey();
  const escaped = privateKey.replace(/\n/g, '\\n');
  assert.equal(normalizePrivateKey(escaped), privateKey.trim());
  assert.equal(normalizePrivateKey(privateKey), privateKey.trim());
  const configuration = readGithubConfiguration(testEnvironment(escaped));
  assert.equal(configuration.appId, 5153326);
  assert.equal(configuration.installationId, 166969054);
  assert.equal(configuration.owner, 'micklehamchurch');
  assert.equal(configuration.repository, 'website');
  assert.equal(configuration.branch, 'Dev');
  assert.equal(configuration.privateKey, privateKey.trim());

  for (const [key, value] of Object.entries({ GITHUB_OWNER: 'another-owner', GITHUB_REPO: 'another-repo', GITHUB_BRANCH: 'main' })) {
    assert.throws(() => readGithubConfiguration({ ...testEnvironment(), [key]: value }), { code: 'github-config-invalid' });
  }
  assert.throws(() => readGithubConfiguration({ ...testEnvironment(), GITHUB_INSTALLATION_ID: '' }), { code: 'github-config-invalid' });
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

test('repository and branch failures have distinct safe categories and logs', async () => {
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
  assert.deepEqual(repoFailure, { status: 502, jsonBody: { ok: false, error: 'github-repository-unavailable' } });
  assert.deepEqual(logger.warnings, ['[GitHub status] github-repository-unavailable']);

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
  assert.deepEqual(await branchMissing(), { status: 502, jsonBody: { ok: false, error: 'github-branch-unavailable' } });
});

test('invalid configuration and invalid PEM are safely distinguished', async () => {
  const logger = loggerStub();
  const sensitiveValue = 'PRIVATE-KEY-AND-TOKEN-DO-NOT-RETURN';
  const getStatus = createGithubStatusService({
    env: { ...testEnvironment(), GITHUB_APP_PRIVATE_KEY: sensitiveValue },
    logger,
    createClient() { throw new Error('must not create a client'); }
  });
  const result = await getStatus();
  assert.deepEqual(result, { status: 503, jsonBody: { ok: false, error: 'github-private-key-invalid' } });
  assert.deepEqual(logger.warnings, ['[GitHub status] github-private-key-invalid']);
  assert.equal(JSON.stringify(result).includes(sensitiveValue), false);
  assert.equal(logger.warnings.join(' ').includes(sensitiveValue), false);

  const badSettings = createGithubStatusService({
    env: { ...testEnvironment(), GITHUB_INSTALLATION_ID: 'wrong' },
    logger: loggerStub()
  });
  assert.deepEqual(await badSettings(), { status: 503, jsonBody: { ok: false, error: 'github-config-invalid' } });
});

test('App JWT signing and installation token exchange failures are separate and sanitized', async () => {
  const configuration = readGithubConfiguration(testEnvironment());
  const createAuthWith = (authHandler) => () => authHandler;

  await assert.rejects(
    createInstallationClient(configuration, createAuthWith(async () => { throw new Error(configuration.privateKey); })),
    { code: 'github-app-auth-failed' }
  );

  let calls = 0;
  await assert.rejects(
    createInstallationClient(configuration, createAuthWith(async () => {
      calls += 1;
      if (calls === 1) return { token: 'app-jwt-secret' };
      throw new Error('installation-token-secret');
    })),
    { code: 'github-installation-token-failed' }
  );

  const logger = loggerStub();
  const status = createGithubStatusService({
    env: testEnvironment(), logger,
    createClient: async () => { throw Object.assign(new Error('secret-bearing detail'), { code: 'github-installation-token-failed' }); }
  });
  const response = await status();
  assert.deepEqual(response, { status: 502, jsonBody: { ok: false, error: 'github-installation-token-failed' } });
  assert.deepEqual(logger.warnings, ['[GitHub status] github-installation-token-failed']);
  assert.equal(JSON.stringify(response).includes('secret-bearing'), false);
  assert.equal(logger.warnings.join(' ').includes('secret-bearing'), false);
});

test('unexpected GitHub client failures use a safe API category', async () => {
  const status = createGithubStatusService({
    env: testEnvironment(), logger: loggerStub(),
    createClient: async () => { throw new Error('sensitive provider response'); }
  });
  assert.deepEqual(await status(), { status: 502, jsonBody: { ok: false, error: 'github-api-unavailable' } });
});
