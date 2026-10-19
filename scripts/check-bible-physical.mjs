/* Browser-level geometry and interaction check; run via CUA, not synthetic events. */
export async function inspectPhysicalBible(tab) {
 const frame=tab.playwright.frameLocator('iframe[title="Mickleham Church Bible reader"]');
 await tab.getAXState({emit:false});
 const viewport=await tab.playwright.locator('.home-bible-dialog iframe').evaluate(el=>({w:el.clientWidth,h:el.clientHeight}));
 await frame.locator('#bible-page-spread[data-layout-viewport="'+viewport.w+'"][data-layout-height="'+viewport.h+'"][aria-busy="false"]').waitFor({state:'attached'});
 await tab.getScreenshot({emit:false});
 const result=await frame.locator('body').evaluate(el=>{
   const doc=el.ownerDocument,root=doc.documentElement,spread=el.querySelector('#bible-page-spread');
   return {width:root.clientWidth,overflow:root.scrollWidth>root.clientWidth+1,columns:spread.style.getPropertyValue('--bible-columns'),offset:spread.getAttribute('data-reading-offset'),status:el.querySelector('#bible-page-status').textContent,book:el.querySelector('.bible-reader').getBoundingClientRect().toJSON(),text:[...el.querySelectorAll('.bible-page-text')].map(n=>({width:n.clientWidth,height:n.clientHeight,scrollHeight:n.scrollHeight,scrollWidth:n.scrollWidth,font:getComputedStyle(n).fontSize})),toolbar:[...el.querySelectorAll('.bible-toolbar button')].filter(n=>!n.hidden).map(n=>({id:n.id,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}))};
 });
 if(result.overflow)throw Error('Horizontal overflow at '+result.width);
 if(result.text.some(n=>n.scrollWidth>n.width+1||n.scrollHeight>n.height+2))throw Error('Scripture overflow: '+JSON.stringify(result));
 if(result.toolbar.some(n=>n.width<44||n.height<44))throw Error('Small toolbar target: '+JSON.stringify(result.toolbar));
 return result;
}
export async function checkEdgeTaps(tab) {
 const frame=tab.playwright.frameLocator('iframe[title="Mickleham Church Bible reader"]');
 async function status(){return frame.locator('#bible-page-status').innerText()}
 const parent=await tab.playwright.locator('.home-bible-dialog iframe').evaluate(el=>el.getBoundingClientRect().toJSON());
 const paper=await frame.locator('.bible-paper-page').first().evaluate(el=>el.getBoundingClientRect().toJSON());
 const point=(side)=>[parent.left+(side<0?paper.left+8:paper.right-8),parent.top+paper.top+Math.min(120,paper.height/2)];
 const before=await status();await tab.getScreenshot({emit:false});await tab.click(point(1));await tab.getAXState({emit:false});const next=await status();if(before===next)throw Error('Right margin did not turn');
 await tab.getScreenshot({emit:false});await tab.click(point(-1));await tab.getAXState({emit:false});if(await status()!==before)throw Error('Left margin did not return');
 await frame.locator('.bible-page-text').first().click();await tab.getAXState({emit:false});if(await status()!==before)throw Error('Scripture click turned page');
 for(const id of ['bible-bookmark','bible-bookmark']){await frame.locator('#'+id).click();await tab.getAXState({emit:false});if(await status()!==before)throw Error(id+' turned page')}
 for(const [open,close] of [['bible-browse','bible-drawer-close'],['bible-about','bible-information-close']]){await frame.locator('#'+open).click();await tab.getAXState({emit:false});await frame.locator('#'+close).click();await tab.getAXState({emit:false});if(await status()!==before)throw Error(open+' turned page')}
 return {before,next,leftReturned:true,textSafe:true,controlsSafe:true};
}
