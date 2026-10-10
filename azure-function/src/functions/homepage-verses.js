const {app}=require('@azure/functions');
const {createHomepageVersesHandler}=require('../homepage-verses');
app.http('homepage-verses',{methods:['GET','PUT'],authLevel:'anonymous',route:'homepage-verses',handler:createHomepageVersesHandler()});
