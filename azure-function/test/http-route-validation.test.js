const test = require('node:test');
const assert = require('node:assert/strict');
const {validateHttpRoutes} = require('../validate-http-routes');
test('HTTP route validation rejects reserved prefixes before the api prefix is applied', () => {
  for (const route of ['admin-feedback', '/ADMIN/tools/', 'administrator', 'runtime', 'Runtime-status']) {
    assert.throws(() => validateHttpRoutes([{name:'test', options:{route}}]), /Reserved Azure Functions route/);
  }
  assert.throws(() => validateHttpRoutes([{name:'admin-default', options:{}}]), /Reserved/);
  assert.doesNotThrow(() => validateHttpRoutes(['feedback-admin','website-feedback','calendar','news'].map(route=>({name:route,options:{route}}))));
});
