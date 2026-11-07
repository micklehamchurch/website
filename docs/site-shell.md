# Shared public website shell

The standard maximum outer website width is 1600px, centred in a warm-neutral #eeebe5 surround. Below 1600px public pages use the available width. Reading containers remain narrower as appropriate.

styles.css owns the shell. It selects body:has(> [data-site-header]), the existing standard public structure, rather than a page class or a JavaScript opt-in. New public pages must use styles.css, the shared header marker and shared footer; no extra shell class or stylesheet is required. Avoid viewport-width outer sections; size page backgrounds and images relative to the containing page. Native top-layer dialogs/backdrops intentionally remain viewport-based. No transform or containment is applied to the body, preserving fixed headers and modal behaviour.

home-shell.css is reduced to homepage-specific hero foreground positioning. It uses the shared --site-shell-width variable. The generic Feedback launcher offset is also shared. History's scroll-lock width respects the common shell; War Memorial's original viewport-based text inset now follows the shell width, preserving its values below 1600px.

Audit inventory is discovered recursively from public HTML, excluding dependency/build template directories. Current inventory: 54 standard public pages. Admin Dashboard is an independent application and is excluded. news-stories.html and parish-contact-directory.html are legacy redirects to News and Our Team; their destinations use the shell. Two _templates sources are not separately served pages but retain the standard shared structure. There are no separate auth callback/error HTML pages. The standalone Bible reader inherits the public shell; its embedded overlay still fits its iframe naturally below the cap and retains its app controls.

Regression checks:
- node --test test/site-shell.test.cjs checks every discovered page's shared structure and shared-rule ownership.
- PLAYWRIGHT_MODULE=... node scripts/check-site-shell.cjs discovers future pages automatically and checks each at 390,768,1024,1440,1600,1920,2560,3432px. It verifies shell/header/footer geometry, section boundaries, overflow, loaded image proportions and navigation. It compares approved homepage geometry/screenshots at 1920/2560/3432, tests History modal scroll-lock and a synthetic future standard page.
- SITE_SHELL_BASE_URL selects the deployed site for the same audit. Artifacts are saved beside the checkout under site-shell-verification/ including inventory/results JSON, homepage before/after and representative 3432px screenshots.

Work starts from Dev 4ef6ee099b700dc411d02f73552a2c23fe96af0c, preserving the newer Bible fixes. Main is not part of this change.
