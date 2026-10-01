const { app } = require('@azure/functions');
const { createHealthResponse } = require('../health');

// Azure Easy Auth is required at the Function App boundary. Anonymous here
// means only that Functions keys are not used as a second authentication layer.
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async () => createHealthResponse()
});
