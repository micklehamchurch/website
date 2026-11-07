const { app } = require('@azure/functions');
const { createBibleHandler } = require('../bible');
const { createBibleStore } = require('../bible-store');

app.http('bible', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'bible/{*path}',
  handler: createBibleHandler({ store: createBibleStore() })
});
