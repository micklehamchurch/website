const { app } = require('@azure/functions');
const { createContactsHandler } = require('../contacts');
app.http('contacts', { methods: ['GET', 'PUT'], authLevel: 'anonymous', route: 'contacts', handler: createContactsHandler() });
