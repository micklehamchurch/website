const fs = require('node:fs');

try {
  const files = fs.readFileSync(process.argv[2], 'utf8').trim().split(/\r?\n/);
  const publicPage = /^(?:[^/]+|(?:news|pews-news|_templates)\/[^/]+)\.html$/;
  const scriptOnlyFiles = ['site.js', 'public-header.js', 'build-typography-preview.js'];
  const scriptOnly = scriptOnlyFiles.every(file => files.includes(file)) &&
    files.every(file => scriptOnlyFiles.includes(file) || publicPage.test(file) ||
      file.startsWith('test/') || file === 'scripts/is-full-desktop-release.cjs');

  const allowed = /^(?:[^/]+\.html|(?:news|pews-news|_templates)\/[^/]+\.html|(?:site|public-header|responsive-navigation|policies-navigation|header-search)\.js|(?:header-navigation|policies-navigation|home-critical|home-performance)\.css|home-style-sources\.json|build-typography-preview\.js|test\/.*|docs\/full-desktop-header\.md|scripts\/is-full-desktop-release\.cjs|\.github\/workflows\/build-content\.yml)$/;
  const stylesheetRelease = files.includes('header-navigation.css') &&
    (files.includes('responsive-navigation.js') || (files.includes('site.js') &&
      (files.includes('public-header.js') || (files.includes('home-critical.css') &&
        files.includes('build-typography-preview.js'))))) && files.every(file => allowed.test(file));

  process.exitCode = scriptOnly || stylesheetRelease ? 0 : 1;
} catch {
  process.exitCode = 1;
}
