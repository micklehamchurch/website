# Gallery image lifecycle fix

Starting Dev: 1723881c2a7e063168982ae087c5bffe1435b566.
Main: 804a189ae8b09e8a88f4bb98947af0e9fcb34c30.

## Confirmed cause

The lightbox reused its single img element, retaining it after close and album changes. show() assigned the next src and immediately opened the dialog. The browser continued painting the previous decoded bitmap while the new request was pending, even with src already changed and currentSrc temporarily empty. There was no image-ready/decode coordination or request-generation guard. There was no application preloader or photo-transition animation causing this bug.

Before editing, the reported Harvest-to-Eco sequence was reproduced by holding the Eco full-size request. The old photograph remained visible for all 35 sampled pending frames over roughly 350ms. An actual rendered-image screenshot was byte-identical to the last Harvest image while the Eco heading/caption was already displayed. DOM currentSrc alone is therefore not a sufficient stale-frame detector in the original code.

## Fix

Every selection, album route and completed close discards the displayed image node and substitutes a fresh hidden, source-free placeholder. It retains the existing CSS image-stage dimensions. A separate Image decodes the exact same full-resolution URL off-screen; it replaces the placeholder atomically only if its generation is still current and the dialog remains open. Late success/error callbacks cannot overwrite newer selections. A queued close event from an earlier opening cannot clear a fast reopening.

The existing live caption/status area shows a quiet Loading photograph message while pending, then returns to the original index/total/caption format. Errors keep the stage blank and offer a retry/navigation message. The dialog opens immediately; there is no timer, artificial delay, new dependency or polling in production.

No CSS, photos, data, ordering, captions, thumbnails, album layout, shared dialog controls or unrelated page behaviour is changed. gallery.html and the builder change only the script cache version. Historical source freezes normalise that exact version change; the independent preservation test verifies the rest of gallery.html and all relevant source/data files byte-for-byte, apart from the builder’s exact cache-version literal.

The existing carousel gesture code remains byte-identical. The starting lightbox itself has buttons and Arrow keys, with no separate swipe handler; this fix preserves that interaction model. Mobile touch buttons and native scrolling remain available.

## Validation

Controlled decode tests cover cold loading, cross-album invalidation, reversed completion, close/route cancellation, queued close events, errors/recovery and unchanged surrounding code. Browser automation covers delayed requests across multiple albums, reversed network completion, load failures, frame-by-frame visible-image identities, cached reopening, wraparound, native keyboard, focus trap/return and mobile touch buttons at desktop/tablet/phone/short-landscape widths in Edge and WebKit. Delivery evidence records exact results and baseline failures.

The narrow Dev workflow checks the controller without rebuilding gallery data, images or date-sensitive projections.
