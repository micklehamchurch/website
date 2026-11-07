const test=require('node:test'),assert=require('node:assert/strict');
const imageURL=require('../clergy-image-url');
const src='assets/images/clergy/uploads/be320caa-72a8-4b2c-9f57-cd99fffc1b00-1600.jpg',sha='a'.repeat(40);
test('saved uploaded portraits and thumbnails use the committed version before Pages deployment',()=>{
  assert.equal(imageURL(src,sha),`https://raw.githubusercontent.com/micklehamchurch/website/${sha}/${src}`);
  assert.equal(imageURL(src.replace('-1600','-360'),sha),`https://raw.githubusercontent.com/micklehamchurch/website/${sha}/${src.replace('-1600','-360')}`);
  assert.notEqual(imageURL(src,sha),imageURL(src,'b'.repeat(40)));
});
test('existing parish photographs retain their Pages paths; no untrusted revision enters a raw URL',()=>{
  assert.equal(imageURL('assets/images/clergy/16-960.jpg',sha),'../assets/images/clergy/16-960.jpg');
  for(const revision of [undefined,'Dev','main','../main',sha+'/other'])assert.equal(imageURL(src,revision),'../'+src);
});
test('private originals, traversal, remote URLs, encoded paths and unsaved upload tokens are not emitted',()=>{
  for(const path of ['_archive-sources/clergy/uploads/private.png','assets/images/clergy/../private.jpg','assets/images/clergy/%2e%2e/private.jpg','https://example.org/photo.jpg','upload:fixture',src+'?x=1'])assert.equal(imageURL(path,sha),'');
});
