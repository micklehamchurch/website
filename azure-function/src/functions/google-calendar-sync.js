const { app } = require('@azure/functions');
const { createGoogleSyncHandler } = require('../google-calendar-sync');
app.http('google-calendar-sync',{methods:['GET','POST'],authLevel:'anonymous',route:'google-calendar-sync',handler:createGoogleSyncHandler()});
