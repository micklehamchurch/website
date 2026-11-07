import { inspectPhysicalBible } from './check-bible-physical.mjs';
// Run through CUA with a real open reader in single-page mode, not dispatchEvent.
export async function checkNaturalPageTaps(tab, {controls=true}={}) {
 const f=tab.playwright.frameLocator('iframe[title="Mickleham Church Bible reader"]');
 const read=async()=>({reference:await f.locator('#bible-reference').innerText(),status:await f.locator('#bible-page-status').innerText(),offset:await f.locator('#bible-page-spread').getAttribute('data-reading-offset')});
 const index=s=>Number(s.status.match(/\d+/)[0]);
 async function coords(){await inspectPhysicalBible(tab);const frame=await tab.playwright.locator('.home-bible-dialog iframe').evaluate(el=>el.getBoundingClientRect().toJSON());const page=await f.locator('.bible-paper-page').first().evaluate(el=>({paper:el.getBoundingClientRect().toJSON(),text:el.querySelector('.bible-page-text').getBoundingClientRect().toJSON()}));return {frame,...page}}
 async function tap(fraction){const r=await coords();const point=[r.frame.left+r.paper.left+r.paper.width*fraction,r.frame.top+r.text.top+Math.min(60,r.text.height/2)];await tab.getScreenshot({emit:false});await tab.click(point);await tab.getAXState({emit:false});return point}
 const layout=await inspectPhysicalBible(tab);if(layout.columns!=='1')throw Error('Natural tap test requires one page');
 if(!await f.locator('#bible-page-next').isEnabled()){await f.locator('#bible-page-previous').click();await tab.getAXState({emit:false})}
 const before=await read(),right=await tap(.8),next=await read();if(next.reference!==before.reference||index(next)!==index(before)+1)throw Error('Natural right tap did not advance exactly one: '+JSON.stringify({right,before,next}));
 const left=await tap(.2),back=await read();if(back.status!==before.status||back.reference!==before.reference)throw Error('Natural left tap did not return exactly one');
 const centre=await tap(.5);if((await read()).status!==before.status)throw Error('Centre Scripture tap navigated');
 const r=await coords(),from=[r.frame.left+r.paper.left+r.paper.width*.8,r.frame.top+r.paper.top+8],to=[r.frame.left+r.paper.left+r.paper.width*.2,r.frame.top+r.paper.top+8];
 await tab.getScreenshot({emit:false});await tab.drag(from,to);await tab.getAXState({emit:false});const swiped=await read();if(index(swiped)!==index(before)+1||swiped.reference!==before.reference)throw Error('Pointer swipe did not turn exactly once: '+JSON.stringify({before,swiped,from,to}));
 await tab.getScreenshot({emit:false});const released=await read();if(released.status!==swiped.status)throw Error('Swipe release produced a second turn');
 await tap(.2);if((await read()).status!==before.status)throw Error('Fresh intentional tap after swipe did not work');
 const result={layout:{width:layout.width,columns:layout.columns},before,next,back,points:{right,left,centre,swipeFrom:from,swipeTo:to},swiped,releaseStayedOnSamePage:true,freshTapAfterSwipe:true};
 if(controls){
  // In live QA, go to the current bookmark first so toggling it off/on preserves it.
  for(const id of ['bible-bookmark','bible-bookmark']){await f.locator('#'+id).click();await tab.getAXState({emit:false});if((await read()).status!==before.status)throw Error('Bookmark turned the page')}
  await f.locator('#bible-browse').click();await tab.getAXState({emit:false});
  for(const id of ['bible-translation','bible-book','bible-chapter']){await f.locator('#'+id).click();await tab.pressKey(null,'Escape');await tab.getAXState({emit:false});const selected=await read();if(selected.offset!==before.offset||selected.reference!==before.reference)throw Error('Selector changed reading position')}
  if(await f.locator('#bible-continue').isVisible())await f.locator('#bible-continue').click();else await f.locator('#bible-drawer-close').click();await tab.getAXState({emit:false});if((await read()).status!==before.status)throw Error('Continue Reading added an unintended page turn');
  await f.locator('#bible-about').click();await tab.getAXState({emit:false});await f.locator('#bible-information-close').click();await tab.getAXState({emit:false});if((await read()).status!==before.status)throw Error('Dialog control turned page');
  const saved=await read();await f.locator('#bible-close').click();await tab.getAXState({emit:false});if(await tab.playwright.locator('.home-bible-dialog').evaluate(el=>el.open))throw Error('Close failed');
  await tab.playwright.getByRole('link',{name:'Open the Bible',exact:true}).click();await tab.getAXState({emit:false});await inspectPhysicalBible(tab);const reopened=await read();if(reopened.offset!==saved.offset||reopened.reference!==saved.reference)throw Error('Close unexpectedly navigated');
  result.controlsSafe=true;result.closeReopenedAtSamePosition=true;
 }
 return result;
}
