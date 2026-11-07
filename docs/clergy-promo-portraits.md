# Corrected history promotional portraits

Starting Dev: `c06054f38960bad70adce52af770d49ac3f0935c`.

The Our History feature retained `assets/images/clergy/2-360.jpg`, `7-360.jpg`
and `13-360.jpg`. These are the original photographed parish-display versions of
Alfred Burmester, Arthur W. Bedford and Barbara Steadman-Allen. The current archive
records instead select the approved uploads listed in
`test/fixtures/clergy-promo-approved.json`. Visual comparison confirms the same
three subjects/poses. The source uploads were committed through authorised Admin
on 16 October 2026 and remain the primary images in the current clergy records.

Root cause: `_content/history.json.feature.portraits` is a separate static list;
the archive builder uses each record's current primary image but leaves an existing
`history-feature` alone. The old originals remained valid files and were therefore
still displayed. This is not a browser/Pages cache or stale srcset issue: the
feature has single lazy/async JPEG sources, with no picture/srcset or runtime loader.

Only the feature's source/small paths change. Existing CSS, HTML attributes, alt
text, loading/decoding, button, content and arrangement remain unchanged. The source
photographs have slightly different proportions, so three JPEG derivatives retain
the old exact pixel dimensions (360×584, 360×520, 360×465). They fit each complete
approved photograph within that canvas with a small ivory margin as necessary;
no cropping, restoration, recolouring, sharpening or alteration of historical
details was applied. Total derivative size is 136,110 bytes. Source and derivative
SHA-256 evidence is in the fixture. Original archive uploads/page are untouched.

`scripts/update-history-portraits.cjs` renders only the marked promotional feature
using the existing validated History renderer. The content workflow uses a bounded
path/data guard for this release so unrelated history pages, current header keys
and date-sensitive calendar projections are not regenerated. Other metadata changes
fall through to the normal build. No cache-busting query strings are needed because
the new derivatives have distinct URLs.

Before/after Edge and WebKit checks cover 1600×900, 834×1194, 393×852 and 852×393.
Exact section, text, button and rotated image bounding boxes match the original
measurements. All three images decode; no overflow or section accessibility scan
violations occur. The button destination is preserved. Focused checks validate the
approved sources/hashes, exact scoped HTML/data changes and untouched clergy archive,
CSS and unrelated systems. Historical snapshot tests reverse only these exact three
approved URL replacements; the new tests inspect native current files.

Full regression, live checks, final commit/deployment and before/after screenshots
are recorded in the workspace delivery report.
