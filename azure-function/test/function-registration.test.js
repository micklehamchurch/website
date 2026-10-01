const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const projectRoot = path.join(__dirname, '..');
const packageJson = require(path.join(projectRoot, 'package.json'));

test('configured package entry point registers only the health and GitHub status HTTP functions', async () => {
  const entryPoint = path.join(projectRoot, packageJson.main);
  assert.equal(fs.existsSync(entryPoint), true, 'package main entry must exist');

  const registrations = [];
  const mockApp = {
    http(name, options) {
      registrations.push({ name, options });
    }
  };

  const originalLoad = Module._load;
  const entryPointModule = require.resolve(entryPoint);
  const healthFunctionModule = require.resolve(path.join(projectRoot, 'src/functions/health.js'));
  const githubFunctionModule = require.resolve(path.join(projectRoot, 'src/functions/github-status.js'));
  const githubStatusModule = require.resolve(path.join(projectRoot, 'src/github-status.js'));

  try {
    Module._load = function (request, parent, isMain) {
      if (request === '@azure/functions') return { app: mockApp };
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[entryPointModule];
    delete require.cache[healthFunctionModule];
    delete require.cache[githubFunctionModule];
    delete require.cache[githubStatusModule];
    require(entryPointModule);
  } finally {
    Module._load = originalLoad;
    delete require.cache[entryPointModule];
    delete require.cache[healthFunctionModule];
    delete require.cache[githubFunctionModule];
    delete require.cache[githubStatusModule];
  }

  assert.equal(registrations.length, 2, 'the entry point should register exactly two HTTP functions');
  const health = registrations.find(item => item.name === 'health');
  const githubStatus = registrations.find(item => item.name === 'github-status');
  assert.ok(health);
  assert.ok(githubStatus);
  assert.equal(health.name, 'health');
  assert.deepEqual(health.options.methods, ['GET']);
  assert.equal(health.options.route, 'health');
  assert.equal(health.options.authLevel, 'anonymous');
  assert.deepEqual(await health.options.handler(), {
    status: 200,
    jsonBody: {
      ok: true,
      service: 'stmichael-church-admin-api'
    }
  });

  assert.deepEqual(githubStatus.options.methods, ['GET']);
  assert.equal(githubStatus.options.route, 'github/status');
  assert.equal(githubStatus.options.authLevel, 'anonymous');
  assert.equal(githubStatus.options.handler.length, 0, 'the endpoint does not accept request parameters');

  const host = require(path.join(projectRoot, 'host.json'));
  assert.equal(host.extensions.http.routePrefix, 'api');
});

test('@azure/functions is a production dependency for deployment', () => {
  assert.ok(packageJson.dependencies['@azure/functions']);
  assert.equal(packageJson.devDependencies?.['@azure/functions'], undefined);
});
