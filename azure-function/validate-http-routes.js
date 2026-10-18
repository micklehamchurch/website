const assert = require('node:assert/strict');
// Match Azure Functions ScriptHost.ValidateHttpFunction: check the raw route,
// before host.json's routePrefix is added, using a case-insensitive prefix match.
function validateHttpRoutes(registrations) {
  for (const {name, options, timer} of registrations) {
    if (timer) continue;
    const route = (options.route || name).replace(/^\/+|\/+$/g, '');
    assert(!/^(admin|runtime)/i.test(route), `Reserved Azure Functions route prefix: ${name} (${route})`);
  }
}
module.exports = {validateHttpRoutes};
