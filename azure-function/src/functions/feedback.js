const {app}=require('@azure/functions');
const {createFeedbackHandlers}=require('../feedback');
const handlers=createFeedbackHandlers();
// Only website-feedback may ever be excluded from Easy Auth. It never trusts
// x-ms identity headers and contains no Admin actions. admin-feedback stays protected.
app.http('website-feedback',{methods:['GET','POST'],authLevel:'anonymous',route:'website-feedback',handler:handlers.publicHandler});
app.http('admin-feedback',{methods:['GET','POST'],authLevel:'anonymous',route:'admin-feedback',handler:handlers.adminHandler});
