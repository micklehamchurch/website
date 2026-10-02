const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifyPackage } = require('../verify-package');

test('isolated deployment loads the exact live-identity allowlist from its own Linux-cased path', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'church-package-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'src'));
  for (const file of ['identity.js', 'admin-identities.json']) {
    fs.copyFileSync(path.join(__dirname, '../src', file), path.join(root, 'src', file));
  }
  const revision = '1234567890123456789012345678901234567890';
  fs.writeFileSync(path.join(root, 'src/deployment.json'), JSON.stringify({ revision }));
  const build = verifyPackage(root, revision);
  assert.match(build.allowlistSha256, /^[0-9a-f]{64}$/);
  assert.match(build.policySha256, /^[0-9a-f]{64}$/);
  assert.throws(() => verifyPackage(root, 'wrong-revision'));
});

test('deployment without its allowlist fails to load rather than defaulting to another path', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'church-package-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'src'));
  fs.copyFileSync(path.join(__dirname, '../src/identity.js'), path.join(root, 'src/identity.js'));
  assert.throws(() => require(path.join(root, 'src/identity.js')), { code: 'MODULE_NOT_FOUND' });
});
