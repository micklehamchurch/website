> The outer shell is now shared site-wide; see [shared shell architecture](site-shell.md). The approved homepage geometry is retained.

# Contained homepage (Task 20 revision)

Replaces the virtual full-bleed hero frame from Task 19. The homepage body is the actual centred shell: maximum 1600px, available width below that. The fixed header, entire hero image, lower section backgrounds and footer share this boundary. The viewport surround is warm neutral #eeebe5. No transform or containment changes fixed positioning.

Compared 1440, 1500 and 1600px shells at 2560 and 3432px. Selected 1600px after visual comparison: the photograph and welcome remain spacious, normal desktop proportions remain familiar, and the lower reading grid remains 1440px maximum. The header retains its compact 1280px inner navigation. At 1920px there are 160px outer margins; at 2560px 480px; at 3432px 916px.

Removed home-wide.css and its virtual-frame offsets. home-shell.css now owns the outer boundary and freezes hero foreground offsets above 1600px. Feedback remains inside the shell on wide screens. Interior pages do not opt in. No content, images, typography, API or interaction code changed.

Verification: npm run build; npm test; scripts/check-home-shell.cjs; scripts/check-home-grid.cjs. Browser checks cover 320,390,768,874x402,1024,1280,1440,1600,1920,2560,3432; overflow, header scrolling, image aspect ratio/loading stability, overlay placement, navigation, keyboard focus, mobile menu and Feedback. The grid check verifies common reading edges and stacking. Full suite: 473 tests,460 passed,13 existing failures (calendar/content frozen expectations and historical comparison fixtures); no new failure category.

Screenshots are saved beside the checkout in homepage-shell-verification/: candidate-{1440,1500,1600}-at-{2560,3432}.png, local-{1440,1920,2560,3432}.png and live equivalents. Run with HOME_SHELL_CANDIDATES=1 for candidates or HOME_SHELL_BASE_URL for deployed checks. check-home-wide.cjs delegates to the replacement shell verification.
