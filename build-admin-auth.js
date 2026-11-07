const esbuild = require('esbuild');

const root = __dirname;
esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ['admin/msal-auth.js'],
  bundle: true,
  minify: true,
  platform: 'browser',
  target: ['es2020'],
  format: 'iife',
  legalComments: 'eof',
  outfile: 'admin/msal-auth.bundle.js'
});
console.log('Built local MSAL Browser dashboard bundle.');
