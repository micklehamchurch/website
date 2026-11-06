# Phone hero controls

Only a trailing phone media override in home-hero-carousel.css changes product behaviour. The existing controller, timing, image model, WebP files, cropping, preload and loading priorities remain unchanged. home-critical.css and its index.html hash are rebuilt through build-home-performance.js. No new JavaScript/network dependency.

Phone scope: width<=600px, or existing short-landscape layout width<=999px and height<=460px. Tablet portrait and desktop retain their prior rules and computed controls geometry. Five8px outlined dark-green dots, active10pxfilled; each button keeps44×44 transparent target. No container background/border, no phone arrows. The old narrow-landscape wrapping/pill is overridden only in this scope.

Sighted touch users retain a separate visible44×44 pause/resume button above/right of the dots, with a restrained dark-green circle. It has the existing meaningful label, aria-pressed and pause/resume behaviour. Under reduced motion autoplay and pause remain disabled/hidden as before, with allfive manualdots usable. Hidden arrows use display:none, so they do not enter keyboard focus order. Visible focus outline remains distinguishable.

scripts/check-home-mobile-controls.cjs tests320,360,375,390,430,568×320,844×390,768,1024,1440. It verifies allfivephotos/dots,manualkeyboard,swipe,targets/nonoverlap,AAaxe,unchangedheroheight/nooverflow and real8-secondpause/resume. Tablet/desktop computedcontrols compared against starting39deb5f stylesheet. Set CONTROLS_LIVE=1 for actualDev. Browseremulation only; nophysicaliPhone claim.

Focused preservation tests verify controller/photo bytes, every other bundled CSS input, previous source CSS retained in full and Home unchanged except stylesheet hash. Historical whole-page snapshots now allow only that hash change; bundle-freeze tests defer to deterministic current bundle generation and source preservation tests. No unrelated content changes.
