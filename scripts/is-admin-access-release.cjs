// Restrict this staged release to Admin/authentication plumbing. Content models,
// public pages/assets and source data must still take the full content build path.
const allowed=[
 /^admin\/(?:index\.html|msal-auth(?:\.bundle)?\.js|access-setup(?:\.test)?\.mjs|PHASE3-ACCESS-ROLLOUT\.md)$/,
 /^azure-function\/(?:package(?:-lock)?\.json|verify-package\.js)$/,
 /^azure-function\/scripts\/bootstrap-access\.(?:cjs|ps1)$/,
 /^azure-function\/src\/access-(?:model|store|policy|management)\.js$/,
 /^azure-function\/src\/functions\/(?:access|health|identity|github-status)\.js$/,
 /^azure-function\/src\/(?:calendar|clergy-publishing|contacts|feedback|google-calendar-sync|homepage-verses|index|news-publishing|photo-albums)\.js$/,
 /^azure-function\/test\/(?:access|function-registration)\.test\.js$/,
 /^\.github\/workflows\/(?:build-content|deploy-azure-function)\.yml$/,
 /^scripts\/is-admin-access-release\.cjs$/,
 /^test\/admin-access-release\.test\.cjs$/
];
function isAdminAccessRelease(paths){return paths.length>0&&paths.every(path=>allowed.some(rule=>rule.test(path)));}
if(require.main===module){const paths=require('node:fs').readFileSync(process.argv[2],'utf8').trim().split(/\r?\n/).filter(Boolean);process.exitCode=isAdminAccessRelease(paths)?0:1;}
module.exports={isAdminAccessRelease};
