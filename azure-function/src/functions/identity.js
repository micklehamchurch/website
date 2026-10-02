const { app } = require('@azure/functions');
const { identityDiagnostic, authorizationStatus } = require('../identity');

app.http('identity', {
  methods: ['GET'], authLevel: 'anonymous', route: 'auth/identity',
  handler: async request => identityDiagnostic(request)
});
app.http('authorization-status', {
  methods: ['GET'], authLevel: 'anonymous', route: 'auth/status',
  handler: async request => authorizationStatus(request)
});
