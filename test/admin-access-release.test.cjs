const test=require('node:test'),assert=require('node:assert/strict');
const {isAdminAccessRelease}=require('../scripts/is-admin-access-release.cjs');
test('staged Admin access deployment builds only Admin and preserves public projections',()=>{
 assert.equal(isAdminAccessRelease(['admin/index.html','azure-function/src/access-store.js','azure-function/src/calendar.js','.github/workflows/build-content.yml']),true);
 for(const path of ['index.html','_content/calendar.json','azure-function/src/calendar-model.js','news-feed.json','permissions-v1.json'])assert.equal(isAdminAccessRelease(['admin/index.html',path]),false);
 assert.equal(isAdminAccessRelease([]),false);
});
