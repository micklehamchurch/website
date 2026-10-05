const { app } = require('@azure/functions');
const { createClergyHandler } = require('../clergy-publishing');
// Platform EasyAuth authenticates; requireAdministrator enforces the immutable allowlist.
app.http('historical-archive',{methods:['GET','PUT'],authLevel:'anonymous',route:'historical-archive',handler:createClergyHandler()});
