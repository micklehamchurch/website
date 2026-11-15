'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const baseline = '7392b46fa895addf972a90a4cda012811744846f';
const oldSite = execFileSync('git', ['show', baseline + ':site.js'], { cwd: root, encoding: 'utf8' });
const [previewSection] = oldSite.match(/^  <!-- TEMPORARY TYPOGRAPHY PREVIEW:[\s\S]*?^  <\/section>\n/m);
const [compactPreview] = oldSite.match(/^  const preview = compactFooter\.querySelector\('\.typography-preview'\);[\s\S]*?^  }\n/m);
const previewEvent = "document.dispatchEvent(new Event('typography-preview-ready'));\n";
const oldFooter = execFileSync('git', ['show', baseline + ':footer-standard.css'], { cwd: root, encoding: 'utf8' });
const [previewStyles] = oldFooter.match(/^(?:\.footer\[data-site-footer\] \.footer-typography-options[^\n]*\n){3}/m);
const modernFonts = 'family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&display=swap';
const legacyFonts = 'family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap';

// Reverse the approved typography hunks before older, exact snapshot comparisons.
function prior(value) {
  const binary = Buffer.isBuffer(value);
  const source = binary ? value.toString('utf8') : value;
  if (typeof source !== 'string' || (binary && !Buffer.from(source).equals(value))) return value;
  if (!source.includes('modern-classic-1') && !source.includes("--serif: 'Lora'") &&
      !source.startsWith('/* Canonical public footer')) return value;
  let text = source.replace(/\r\n/g, '\n');
  if (text.includes("footer-standard.css?v=modern-classic-1', siteScript.src")) {
    text = text
      .replace('  <div class="container footer-development"', previewSection + '  <div class="container footer-development"')
      .replace('  identity?.append(relationship);\n}\n', '  identity?.append(relationship);\n' + compactPreview + '}\n' + previewEvent)
      .replace('footer-standard.css?v=modern-classic-1', 'footer-standard.css?v=20261027-layout-1');
  }
  if (text.startsWith('/* Canonical public footer')) {
    text = text.replace('.footer[data-site-footer] .footer-grid .footer-diocese-note', previewStyles + '.footer[data-site-footer] .footer-grid .footer-diocese-note');
  }
  text = text
    .replace("--serif: 'Lora', Georgia, serif;", "--serif: 'Playfair Display', Georgia, serif;")
    .replace("--sans: 'Inter', Arial, sans-serif;", "--sans: 'DM Sans', Arial, sans-serif;")
    .replace('html:root :is(h1, h2, h3) { font-family: var(--serif); }\nhtml:root :is(button, input, select, textarea) { font-family: var(--sans); }\n', '')
    .replace(modernFonts, legacyFonts)
    .replace('styles.css?v=modern-classic-1"', 'styles.css"')
    .replace('typography=modern-classic-1', 'typography=20261007-v1');
  if (source.includes('typography=modern-classic-1') && source.includes('</title>')) {
    text = text.replace('</title>', '</title>\n  <script src="typography-preview.js"></script>');
  }
  return binary ? Buffer.from(text) : text;
}

module.exports = { prior };
