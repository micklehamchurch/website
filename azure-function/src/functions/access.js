const {app}=require('@azure/functions');
const handlers=require('../access-management').createAccessHandlers();
// These routes remain behind Microsoft Easy Auth. No bootstrap HTTP endpoint exists.
for(const [name,methods] of [['session',['GET']],['enrolment',['POST']],['users',['GET','POST']],['verify',['GET']]]){
  app.http(`access-${name}`,{methods,authLevel:'anonymous',route:`access/${name}`,handler:handlers[name]});
}
