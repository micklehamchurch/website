const {app}=require('@azure/functions');
const {createPhotoAlbumsHandler}=require('../photo-albums');
app.http('photo-albums',{methods:['GET','POST'],authLevel:'anonymous',route:'photo-albums',handler:createPhotoAlbumsHandler()});
