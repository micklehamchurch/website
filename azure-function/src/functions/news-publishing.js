const { app } = require('@azure/functions');
const { createNewsPublishingHandler } = require('../news-publishing');
app.http('publications', { methods: ['GET', 'POST'], authLevel: 'anonymous', route: 'publications', handler: createNewsPublishingHandler('publications') });
app.http('news', { methods: ['GET', 'POST'], authLevel: 'anonymous', route: 'news', handler: createNewsPublishingHandler('news') });
