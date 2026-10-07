# Temporary public typography preview

Remove after the parish typography decision. No winner is selected.

Heritage is the unchanged `styles.css` system: `--serif: 'Playfair Display', Georgia, serif` and `--sans: 'DM Sans', Arial, sans-serif`. Existing weights, sizes and spacing are untouched. Existing specialist public styles use these same variables.

Modern Classic overrides those variables with Lora / Georgia / serif and Inter / Arial / sans-serif. Contemporary uses Manrope / Arial / sans-serif for both and 700 headings. Body is 400; existing navigation/buttons use 600 and labels use their existing weights. Alternative Google Fonts CSS2 requests specify 400, 500, 600, 700 and `display=swap`; only the selected alternative is requested, and a family is loaded at most once per page. Browser unicode subsets and existing public preconnections apply. Failed requests leave readable fallbacks. No font binaries are committed.

`typography-preview.js` runs synchronously in public heads before styles/body parsing, validates the browser-local `mickleham-typography-preview` preference and sets `data-typography`. It inserts the isolated preview stylesheet and selected font request immediately. This reduces wrong-mode flashes; a fallback-to-webfont swap can still occur on first font load. Invalid/missing preferences default to Heritage; unavailable localStorage still allows current-page switching. No cookies, account data or API calls.

`site.js` adds the small shared footer button group and notifies the preview script after rendering. `aria-pressed` reflects selection; native buttons support keyboard operation, 44px targets and visible focus. It changes typography immediately without reloading.

`build-typography-preview.js` is the centralized post-build public-head hook, invoked in `package.json` before search indexing. It processes only root/news HTML with shared public footers; it does not touch Admin or redirect pages. This avoids hand-maintained typography logic in individual page templates and ensures future generated pages receive the early script. Admin neither loads the script nor stylesheet, so its shared styles retain Heritage regardless of public preference.

Removal: remove the footer section and ready event in `site.js`, the build step in `package.json`, `typography-preview.js`, `typography-preview.css`, `build-typography-preview.js` and related tests/documentation. Remove the single `typography-preview.js` head tag from public HTML (including rebuilt generated pages), then rebuild. The localStorage key can be removed locally; it is otherwise inert. No original font definitions or content need restoring.
