const test = require('node:test');
const assert = require('node:assert/strict');
const { createHealthResponse } = require('../src/health');

test('health response is minimal and contains no identity or configuration data', () => {
  assert.deepEqual(createHealthResponse(), {
    status: 200,
    jsonBody: {
      ok: true,
      service: 'stmichael-church-admin-api'
    }
  });
});
