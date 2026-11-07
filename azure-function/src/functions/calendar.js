const { app } = require('@azure/functions');
const { createCalendarHandler } = require('../calendar');
app.http('calendar', { methods: ['GET', 'PUT'], authLevel: 'anonymous', route: 'calendar', handler: createCalendarHandler() });
