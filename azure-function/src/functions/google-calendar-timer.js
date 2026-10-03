const { app } = require('@azure/functions');
const { createGoogleSyncService, SCHEDULE } = require('../google-sync-service');
const { createGoogleSyncStatusHandler } = require('../google-calendar-sync');
const service = createGoogleSyncService();
app.timer('google-calendar-hourly', {
  schedule: SCHEDULE, runOnStartup: false, useMonitor: true,
  handler: async (_timer, context) => {
    try {
      const result = await service.automatic();
      context.log('Google Calendar automatic check:', result?.busy ? 'busy — deferred' : result.lastAutomatic?.result || 'failed');
    } catch { context.error('Google Calendar automatic check: status storage unavailable; no synchronization attempted.'); }
  }
});
app.http('google-calendar-sync-status', {methods:['GET'],authLevel:'anonymous',route:'google-calendar-sync/status',handler:createGoogleSyncStatusHandler()});
