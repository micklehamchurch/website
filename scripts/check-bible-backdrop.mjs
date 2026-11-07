/** Real-browser acceptance check. Run in CUA REPL with an existing site tab:
 * const { checkBibleBackdrop } = await import('file:///.../scripts/check-bible-backdrop.mjs');
 * await checkBibleBackdrop(tab);
 * Uses actual browser pointer clicks and rendered geometry, never dispatchEvent.
 * Run at desktop, tablet/landscape and mobile viewport sizes; mobile intentionally
 * fills the viewport, so only test outside clicks when a backdrop is visible.
 */
export async function checkBibleBackdrop(tab) {
  const results=[];
  const state=()=>tab.playwright.evaluate(()=>({open:!!document.querySelector('.home-bible-dialog')?.open,focus:document.activeElement?.id}));
  async function open() {
    const trigger=tab.playwright.getByRole('link',{name:'Open the Bible',exact:true});
    if(!await trigger.isVisible()) {
      await tab.playwright.locator('.menu-toggle').click();
      await tab.getAXState({emit:false});
    }
    await trigger.click();
    await tab.getAXState({emit:false});
    await tab.playwright.frameLocator('iframe[title="Mickleham Church Bible reader"]').locator('#bible-close').waitFor({state:'visible'});
  }
  async function geometry() {
    // Also capture the rendered view before sending native coordinate input.
    await tab.getScreenshot({emit:false});
    return tab.playwright.evaluate(()=>{
      const panel=document.querySelector('.home-bible-panel')||document.querySelector('.home-bible-dialog');
      const r=panel.getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,radius:getComputedStyle(panel).borderTopLeftRadius.replace('px','')};
    });
  }
  await open();
  let r=await geometry();
  const points=[];
  // This is visibly dark, yet lies INSIDE the old rectangular bounds: the regression.
  if(r.radius>4) points.push(['rounded corner',[r.left+1,r.top+1]]);
  if(r.left>=4) points.push(['left',[r.left/2,r.height/2]]);
  if(r.width-r.right>=4) points.push(['right',[(r.width+r.right)/2,r.height/2]]);
  if(r.top>=4) points.push(['top',[r.width/2,r.top/2]]);
  if(r.height-r.bottom>=4) points.push(['bottom',[r.width/2,(r.height+r.bottom)/2]]);
  for(const [name,point] of points) {
    if(!(await state()).open) await open();
    await geometry();
    const hit=await tab.playwright.evaluate(([x,y])=>({tag:document.elementFromPoint(x,y)?.tagName,cls:document.elementFromPoint(x,y)?.className}),point);
    await tab.click(point);
    const after=await state();
    if(after.open) throw Error(`${name} visible backdrop did not close at ${point}; hit=${JSON.stringify(hit)}`);
    if(!['header-bible-open',''].includes(after.focus) && after.focus!=='menu-toggle') {
      // Mobile menu toggle can have no id; inspect focus separately in manual QA.
      throw Error(`Unexpected restored focus: ${after.focus}`);
    }
    results.push({name,point,hit,closed:true});
  }
  if(!(await state()).open) await open();
  r=await geometry();
  await tab.click([(r.left+r.right)/2,r.top+Math.min(120,(r.bottom-r.top)/2)]);
  if(!(await state()).open) throw Error('Inside click closed the reader');
  results.push({name:'inside',stayedOpen:true});
  const reader=tab.playwright.frameLocator('iframe[title="Mickleham Church Bible reader"]');
  await reader.locator('#bible-browse').click();
  await tab.getAXState({emit:false});
  await reader.locator('#bible-translation').click();
  await tab.pressKey(null,'Escape');
  if(!(await state()).open) throw Error('Selector interaction closed the reader');
  for(const selector of ['#bible-book','#bible-chapter']) {
    await reader.locator(selector).click();
    await tab.pressKey(null,'Escape');
    if(!(await state()).open) throw Error('Book/chapter selector closed the reader');
  }
  await reader.locator('#bible-drawer-close').click();
  await tab.getAXState({emit:false});
  if(!(await state()).open) throw Error('Closing Books closed the reader');
  results.push({name:'nested books/selectors',stayedOpen:true});
  await reader.locator('#bible-about').click();
  await tab.getAXState({emit:false});
  await reader.locator('#bible-information-close').click();
  await tab.getAXState({emit:false});
  if(!(await state()).open) throw Error('Closing About closed the reader');
  results.push({name:'nested information',stayedOpen:true});
  if(await reader.locator('.bible-page-text').count()) {
    await reader.locator('.bible-page-text').first().click();
    for(const selector of ['#bible-page-next','#bible-page-previous']) {
      if(await reader.locator(selector).isEnabled()) await reader.locator(selector).click();
    }
    await reader.locator('#bible-bookmark').click();
    await reader.locator('#bible-bookmark').click();
    await tab.getAXState({emit:false});
    if(!(await state()).open) throw Error('Reading controls closed the reader');
    results.push({name:'Scripture/pages/bookmark',stayedOpen:true});
  }
  await reader.locator('#bible-browse').click();
  await tab.getAXState({emit:false});
  await tab.pressKey(null,'Escape');
  await tab.getAXState({emit:false});
  if(!(await state()).open) throw Error('Nested Escape closed the outer reader');
  results.push({name:'nested Escape',stayedOpen:true});
  await reader.locator('#bible-close').click();
  await tab.getAXState({emit:false});
  if((await state()).open) throw Error('Close Bible failed');
  results.push({name:'Close Bible',closed:true});
  await open();
  await tab.pressKey(null,'Escape');
  await tab.getAXState({emit:false});
  if((await state()).open) throw Error('Outer Escape failed');
  results.push({name:'outer Escape',closed:true});
  return results;
}

