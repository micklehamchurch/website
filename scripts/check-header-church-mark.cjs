const assert=require('assert/strict');
globalThis.headerVerificationHook=async(p,{w,h,state})=>{
 const mark=p.locator('header .header-church-mark');await mark.waitFor({state:'visible'});await mark.evaluate(img=>img.decode());
 const d=await mark.evaluate(img=>({width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height,complete:img.complete,natural:img.naturalWidth,alt:img.alt,current:img.currentSrc}));
 const expected=w>=1536?(state==='compact'?52:80):(w<=999&&w>h&&h<=460?36:w<=767?44:52);
 assert.equal(d.width,expected);assert.equal(d.height,expected);assert(d.complete&&d.natural>0);assert.equal(d.alt,'');assert(d.current.endsWith('/assets/images/branding/church-illustration.svg'));
 const bounds=await p.locator('header.site-header').boundingBox();assert.equal(bounds.height,w>=1536?(state==='compact'?81:109):w<600&&h>w?113:w<=999&&h<=460?57:79,'Header height must not increase');
 const a=await mark.boundingBox(),text=await p.locator('header .brand strong').boundingBox();assert(a.x+a.width<=text.x+1,'Illustration must not overlap church name');assert(a.y>=bounds.y&&a.y+a.height<=bounds.y+bounds.height);
 console.log(JSON.stringify({logo:{w,h,state,...d}}));
};
require('./check-header-information.cjs');
