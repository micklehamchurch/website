import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../site.js',import.meta.url),'utf8');
const shared=source.slice(source.indexOf('// Only the two read-only public dialogs'),source.indexOf('const currentPage'));
function fixture(){
 const listeners={};const opener={isConnected:true,focus(){this.focused=true;}};
 const document={activeElement:opener,addEventListener(name,fn){listeners[name]=fn;},querySelectorAll(){return[];}};
 const ctx={document,nav:null,menuButton:null,dropdownButtons:[],closeDropdowns(){},syncNavigationBackdrop(){}};vm.runInNewContext(shared,ctx);
 const dialog=id=>({id,open:false,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();},getBoundingClientRect(){return{left:50,right:250,top:50,bottom:250};}});
 const press=(x,y)=>listeners.pointerdown({isPrimary:true,button:0,clientX:x,clientY:y});
 const click=(x,y)=>{const event={clientX:x,clientY:y,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};listeners.click(event);return event;};
 return{ctx,dialog,opener,press,click};
}
test('read-only dialog outside press/click dismisses, consumes click and restores opener',()=>{const h=fixture(),d=h.dialog('event-detail-dialog');h.ctx.openPublicDialog(d,h.opener);h.press(5,100);const e=h.click(5,100);assert.equal(d.open,false);assert(e.prevented&&e.stopped&&h.opener.focused);});
test('inside content/padding and a drag beginning inside do not dismiss',()=>{const h=fixture(),d=h.dialog('event-detail-dialog');h.ctx.openPublicDialog(d);h.press(100,100);assert(!h.click(100,100).prevented);assert(d.open);h.press(100,100);h.click(5,100);assert(d.open);h.press(5,100);h.click(100,100);assert(d.open);});
test('unregistered editing/confirmation dialogs cannot opt in accidentally',()=>{const h=fixture(),d=h.dialog('admin-publish');h.ctx.openPublicDialog(d);assert(!d.open);});
test('nested subscription dismissal closes only the top public dialog and returns inside parent',()=>{const h=fixture(),parent=h.dialog('event-detail-dialog'),child=h.dialog('calendar-subscription-dialog'),inside={isConnected:true,focus(){this.focused=true;}};h.ctx.openPublicDialog(parent,h.opener);h.ctx.openPublicDialog(child,inside);h.press(5,100);h.click(5,100);assert(parent.open);assert(!child.open);assert(inside.focused);h.press(5,100);h.click(5,100);assert(!parent.open);});
test('reopening uses the new opener without duplicating close registration',()=>{const h=fixture(),d=h.dialog('event-detail-dialog');h.ctx.openPublicDialog(d,h.opener);const close=d.handlers.close;d.close();const second={isConnected:true,focus(){this.focused=true;}};h.ctx.openPublicDialog(d,second);assert.equal(d.handlers.close,close);d.close();assert(second.focused);});
