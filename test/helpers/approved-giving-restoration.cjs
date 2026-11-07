// Discount only the reviewed content hunks in historical page-preservation tests.
// Giving financial/contact and actual rendered behaviour have independent tests.
const hunks=require('../fixtures/giving-restoration-approved.json');
module.exports=s=>{if(!s.includes('class="giving-page"'))return s;for(const[after,before]of hunks)s=s.replace(after,before);return s;};
