// Two explicitly approved states: before and after the first manual reconciliation.
const fs=require('node:fs'),path=require('node:path');
const registry=require('../../_sync/google-calendar.json');
const applied=!!registry.lastSuccessfulSync && registry.entries.every(e=>!e.approvedAddition&&!e.initialUpdate);
const before=structuredClone(require('./calendar-before-retirement.json'));
if(applied){const {reconcile}=require('../../azure-function/src/google-calendar-sync-model');const {parseGoogleCalendar}=require('../../azure-function/src/google-calendar-adapter');const p=reconcile(require('../../_sync/fixtures/website-before-stage1.json'),require('../../_sync/fixtures/registry-before-stage1.json'),parseGoogleCalendar(fs.readFileSync(path.join(__dirname,'../../_sync/fixtures/google-stage1.ics'),'utf8')));Object.assign(before,p.calendar);before.items=require('../../azure-function/src/calendar-model').buildCalendar(null,p.calendar).items;}
module.exports={applied,before};
