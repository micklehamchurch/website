const { app } = require('@azure/functions');
const { createGithubStatusHandler } = require('../github-status');
const {requireAccess}=require('../access-policy');
const statusHandler=createGithubStatusHandler();

// Azure Easy Auth remains the authentication boundary for this read-only endpoint.
app.http('github-status', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'github/status',
  handler: async request => (await requireAccess(request,'owner')) || statusHandler()
});
