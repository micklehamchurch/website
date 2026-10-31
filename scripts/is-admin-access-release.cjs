// Restrict this staged release to Admin/authentication plumbing. Content models,
// public pages/assets and source data must still take the full content build path.
const allowed=[
 /^admin\/(?:index\.html|admin\.js|AUTH-ARCHITECTURE\.md|auth-config\.mjs|(?:calendar|contacts)-editor\.test\.mjs|contacts-api\.test\.mjs|msal-auth(?:\.bundle)?\.js|(?:access-setup|access-client|cms-shell)(?:\.test)?\.mjs|users-permissions\.mjs|church-mark\.svg|(?:calendar|contacts|homepage-verses|clergy|photo-albums|news)-api\.mjs|cms\.css|(?:publications|homepage-verses|clergy|photo-albums)-admin\.js|PHASE3-ACCESS-ROLLOUT\.md)$/,
 /^azure-function\/(?:package(?:-lock)?\.json|verify-package\.js)$/,
 /^azure-function\/scripts\/(?:bootstrap-access\.(?:cjs|ps1)|activate-access\.cjs)$/,
 /^azure-function\/src\/access-(?:model|store|policy|management)\.js$/,
 /^azure-function\/src\/functions\/(?:access|health|identity|github-status)\.js$/,
 /^azure-function\/src\/(?:calendar|clergy-publishing|contacts|feedback|google-calendar-sync|homepage-verses|index|news-publishing|photo-albums)\.js$/,
 /^azure-function\/test\/(?:access|access-activation|function-registration)\.test\.js$/,
 /^\.github\/workflows\/(?:build-content|deploy-azure-function)\.yml$/,
 /^scripts\/is-admin-access-release\.cjs$/,
 /^test\/(?:admin-access-release|feedback-auth-bootstrap)\.test\.cjs$/
];
function isAdminAccessRelease(paths){return paths.length>0&&paths.every(path=>allowed.some(rule=>rule.test(path)));}
if(require.main===module){const paths=require('node:fs').readFileSync(process.argv[2],'utf8').trim().split(/\r?\n/).filter(Boolean);process.exitCode=isAdminAccessRelease(paths)?0:1;}
module.exports={isAdminAccessRelease};
