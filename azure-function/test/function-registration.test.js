const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const projectRoot = path.join(__dirname, '..');
const packageJson = require(path.join(projectRoot, 'package.json'));

test('configured package entry point registers the expected health HTTP function', async () => {
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

  try {
    Module._load = function (request, parent, isMain) {
      if (request === '@azure/functions') return { app: mockApp };
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[entryPointModule];
    delete require.cache[healthFunctionModule];
    require(entryPointModule);
  } finally {
    Module._load = originalLoad;
    delete require.cache[entryPointModule];
    delete require.cache[healthFunctionModule];
  }

  assert.equal(registrations.length, 1, 'the entry point should register one HTTP function');
  const [health] = registrations;
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

  const host = require(path.join(projectRoot, 'host.json'));
  assert.equal(host.extensions.http.routePrefix, 'api');
});

test('@azure/functions is a production dependency for deployment', () => {
  assert.ok(packageJson.dependencies['@azure/functions']);
  assert.equal(packageJson.devDependencies?.['@azure/functions'], undefined);
});
