const { app } = require('@azure/functions');
const { identityDiagnostic, authorizationStatus } = require('../identity');
const {requireAccess}=require('../access-policy');

app.http('identity', {
  methods: ['GET'], authLevel: 'anonymous', route: 'auth/identity',
  handler: async request => (await requireAccess(request,'owner')) || identityDiagnostic(request)
});
app.http('authorization-status', {
  methods: ['GET'], authLevel: 'anonymous', route: 'auth/status',
  handler: async request => process.env.ADMIN_ACCESS_MODE==='capabilities'
    ? (await requireAccess(request,'session')) || {status:200,headers:{'Cache-Control':'no-store'},jsonBody:{ok:true,access:true}}
    : authorizationStatus(request)
});
