const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const projectRoot = path.join(__dirname, '..');
const packageJson = require(path.join(projectRoot, 'package.json'));

test('configured package entry point registers diagnostics and scoped Calendar, Contacts and News publishing routes', async () => {
  const entryPoint = path.join(projectRoot, packageJson.main);
  assert.equal(fs.existsSync(entryPoint), true, 'package main entry must exist');

  const registrations = [];
  const mockApp = {
    http(name, options) {
      registrations.push({ name, options });
    },
    timer(name, options) { registrations.push({name,options,timer:true}); }
  };

  const originalLoad = Module._load;
  const entryPointModule = require.resolve(entryPoint);
  const healthFunctionModule = require.resolve(path.join(projectRoot, 'src/functions/health.js'));
  const githubFunctionModule = require.resolve(path.join(projectRoot, 'src/functions/github-status.js'));
  const identityFunctionModule = require.resolve(path.join(projectRoot, 'src/functions/identity.js'));
  const githubStatusModule = require.resolve(path.join(projectRoot, 'src/github-status.js'));

  try {
    Module._load = function (request, parent, isMain) {
      if (request === '@azure/functions') return { app: mockApp };
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[entryPointModule];
    delete require.cache[healthFunctionModule];
    delete require.cache[githubFunctionModule];
    delete require.cache[identityFunctionModule];
    delete require.cache[githubStatusModule];
    require(entryPointModule);
  } finally {
    Module._load = originalLoad;
    delete require.cache[entryPointModule];
    delete require.cache[healthFunctionModule];
    delete require.cache[githubFunctionModule];
    delete require.cache[identityFunctionModule];
    delete require.cache[githubStatusModule];
  }

  assert.equal(registrations.length, 12);
  for (const registration of registrations) if (!registration.timer) assert.deepEqual(registration.options.methods, ['calendar', 'contacts', 'historical-archive'].includes(registration.name) ? ['GET', 'PUT'] : ['news', 'publications', 'google-calendar-sync'].includes(registration.name) ? ['GET', 'POST'] : ['GET']);
  const timer=registrations.find(r=>r.timer);
  assert.equal(timer.name,'google-calendar-hourly');
  assert.equal(timer.options.schedule,'0 */15 * * * *');
  assert.equal(timer.options.runOnStartup,false);assert.equal(timer.options.useMonitor,true);
  assert.equal((await registrations.find(r=>r.name==='google-calendar-sync-status').options.handler({method:'GET'})).status,401);
  const calendar = registrations.find(r => r.name === 'calendar');
  assert.equal(calendar.options.route, 'calendar');
  assert.equal((await calendar.options.handler({ method: 'PUT' })).status, 401);
  for (const name of ['news', 'publications','google-calendar-sync']) { const route = registrations.find(item => item.name === name); assert.equal(route.options.route, name); assert.equal((await route.options.handler({ method: 'POST' })).status, 401); }
  const contacts = registrations.find(r => r.name === 'contacts');
  assert.equal(contacts.options.route, 'contacts');
  assert.equal((await contacts.options.handler({ method: 'PUT' })).status, 401);
  const archive = registrations.find(r => r.name === 'historical-archive');
  assert.equal(archive.options.route, 'historical-archive');
  assert.equal((await archive.options.handler({ method: 'PUT' })).status, 401);
  const identity = registrations.find(item => item.name === 'identity');
  assert.equal(identity.options.route, 'auth/identity');
  assert.equal((await identity.options.handler({})).status, 401);
  const authorization = registrations.find(item => item.name === 'authorization-status');
  assert.equal(authorization.options.route, 'auth/status');
  assert.equal((await authorization.options.handler({})).status, 401);
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
