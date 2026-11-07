const { app } = require('@azure/functions');
const { identityDiagnostic, authorizationStatus } = require('../identity');
const {requireAccess}=require('../access-policy');

app.http('identity', {
  methods: ['GET'], authLevel: 'anonymous', route: 'auth/identity',
  handler: async request => {
    const denied=await requireAccess(request,'owner');if(denied)return denied;
    const diagnostic=identityDiagnostic(request);
    if(process.env.ADMIN_ACCESS_MODE==='capabilities')diagnostic.jsonBody={...diagnostic.jsonBody,legacyAdministrator:diagnostic.jsonBody.administrator,administrator:true,authorizationSource:'private-owner-policy'};
    return diagnostic;
  }
});
app.http('authorization-status', {
  methods: ['GET'], authLevel: 'anonymous', route: 'auth/status',
  handler: async request => {
    const denied=await requireAccess(request,'session');if(denied)return denied;
    return process.env.ADMIN_ACCESS_MODE==='capabilities'
      ? {status:200,headers:{'Cache-Control':'no-store'},jsonBody:{ok:true,access:true}}
      : authorizationStatus(request);
  }
});
