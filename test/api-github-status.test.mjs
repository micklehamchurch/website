import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_API_GITHUB_STATUS_URL } from '../admin/auth-config.mjs';
import { checkGithubRepositoryStatus } from '../admin/api-github-status.mjs';

test('GitHub status request uses the Church Admin API Bearer token and recognizes the fixed target', async () => {
  const result = await checkGithubRepositoryStatus('test-church-api-token', async (url, options) => {
    assert.equal(url, ADMIN_API_GITHUB_STATUS_URL);
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer test-church-api-token');
    return new Response(JSON.stringify({ ok: true, repository: 'micklehamchurch/website', branch: 'Dev' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  assert.deepEqual(result, { state: 'connected', diagnostic: null });
  assert.equal(JSON.stringify(result).includes('test-church-api-token'), false);
});

test('GitHub status failure categories never expose response bodies or credentials', async () => {
  const token = 'test-church-api-token';
  assert.deepEqual(await checkGithubRepositoryStatus(null), {
    state: 'connection-failed', diagnostic: 'missing-api-token'
  });
  assert.deepEqual(await checkGithubRepositoryStatus(token, async (_url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    return new Response(JSON.stringify({ error: token, privateKey: token }), { status: 502 });
  }), { state: 'connection-failed', diagnostic: 'http-502' });
  assert.deepEqual(await checkGithubRepositoryStatus(token, async () => new Response(JSON.stringify({
    ok: false, error: 'github-installation-token-failed'
  }), { status: 502 })), {
    state: 'connection-failed', diagnostic: 'github-installation-token-failed'
  });
  assert.deepEqual(await checkGithubRepositoryStatus(token, async () => new Response(JSON.stringify({
    ok: false, error: 'github-private-key-invalid', detail: 'must never surface'
  }), { status: 502 })), {
    state: 'connection-failed', diagnostic: 'github-private-key-invalid'
  });
  assert.deepEqual(await checkGithubRepositoryStatus(token, async () => new Response(JSON.stringify({
    error: 'private key value: secret'
  }), { status: 502 })), { state: 'connection-failed', diagnostic: 'http-502' });
  assert.deepEqual(await checkGithubRepositoryStatus(token, async () => {
    throw new Error(token);
  }), { state: 'connection-failed', diagnostic: 'network' });
});
