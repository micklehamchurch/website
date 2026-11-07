# Photo upload queue — 28 October 2026

## Diagnosis

The editor confirmed four photographs totalled approximately 12 MB, that the same
files worked individually or in groups of three, and that the failure said
“Someone changed the shared Dev version”. This identifies the save/version-conflict
path, not the file-count or size-cap validation. The original HTTP trace and exact
intervening commit are unavailable, so no claim about that request's timing is made.

The old handler required both `parish-albums.json`'s SHA and the whole Dev HEAD to
equal the values loaded by the editor. Automatic gallery/search builds advance HEAD
without changing album metadata. This incorrectly returned 409 for a valid album
save after an unrelated rebuild. A larger batch gives this race more time to occur;
four was not an encoded count boundary.

A retained old-handler fixture demonstrates the failure with four real, valid PNGs
totalling **12,607,656 bytes**: 200 with unchanged HEAD, 409 `album-version-conflict`
after an unrelated HEAD change, and 200 through the fixed handler. Metadata changes
and competing ref updates still reject safely. Actual overwritten files or a 200 MB
request are not used to solve the problem.

## Audit / limits

- Old UI: 6 new photos, 10 MiB/file, 20 MiB combined; eagerly held all originals in
  base64 and sent one JSON request. JPEG/PNG/WebP, HEIC unsupported.
- Existing API streaming body reader caps JSON at 29,010,604 bytes. Shared image
  validation retains 10 MiB/file, 20 MiB/request, 6 images/request for compatible
  older clients and contact-photo callers. These limits are not raised.
- Existing Sharp decoder: 40 million pixels, static images, strict file framing,
  MIME/signature/extension validation and malformed/polyglot rejection.
- Existing API timeout: 120 seconds; no queue/retry/reconciliation before this work.
  Azure HTTP has a 230-second response boundary; no larger host request setting is
  introduced. Actual deployed plan memory settings were not available locally.
- Existing Git publishing creates derivative blobs and album metadata in one tree /
  commit, then updates only Dev with `force:false`. GitHub's blob interface supports
  up to 100 MB, but this workflow publishes much smaller derivatives. The API never
  publishes the camera original.

References: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
and https://docs.github.com/en/rest/git/blobs . No Azure/GitHub limit is increased.

## New workflow

Selection limit: **20 files / 200,000,000 original bytes**, displayed as MB. Each
file is held as a File reference, not one combined base64 payload. One bitmap and
one request at a time: **concurrency 1**. The editor clicks Save Draft or Publish
once, sees Waiting / Optimising / Uploading / Complete / Failed, and keeps the tab
open until completion. This is an in-tab queue, not a persistent background service;
closing the tab loses unsent selections but cannot undo already committed photos.

Browser preparation normalises orientation, draws at most 2560 pixels on the long
edge and encodes WebP quality .9 without metadata. Only that bounded derivative is
base64-encoded. The server independently validates actual received bytes and creates
480/960/1600 long-edge WebP variants at qualities 78/82/84, without upscaling or
EXIF/GPS. Profiles keep their existing independent behaviour.

Each successful photo and valid metadata are committed atomically before proceeding.
New albums remain draft until the final publication; existing published albums can
gain successful photos incrementally when Publish is chosen. Failed photos remain
selected for retry, while completed photos are skipped. Invalid format/content errors
do not discard other successes. Uncertain network/auth/conflict results pause the
remaining queue rather than risk creating extra albums.

Stable server-generated paths incorporate the validated upload UUID as a receipt.
After an ambiguous response, the client reloads before retrying. It recognises an
already committed receipt, verifies the intended metadata and avoids duplicate saves.
Other-album changes are preserved; changes to this album stop for editor review.
Retry budget is three attempts with bounded backoff. Genuine backend errors remain
friendly categories, not raw Azure/GitHub details.

The backend accepts an old HEAD only when album metadata SHA still matches and bases
the commit on the latest HEAD. The final non-forced ref update still protects races
that occur during image processing. Microsoft authentication, principal validation,
allowlist, consent checks, file-path construction and storage protections are unchanged.

The API advertises `serial-receipt-v1`; the new UI refuses uploads until the matching
backend is installed, making independent Pages/Azure rollout ordering safe.

## Verification

- Focused queue/API/image/security/profile/gallery tests: 35 passed.
- Complete Azure suite: 210 passed.
- Browser tests use the actual form, queue and Sharp processor with an isolated
  in-memory repository; they publish nothing. 1/4/10/20, 21 rejection, 199.8 MB
  original selection, over-200 MB rejection, unsupported HEIC among valid inputs,
  photo 17 failure and failed-only retry, lost response reconciliation, delayed
  responses, camera JPEG orientation, WebP dimensions/metadata, keyboard and
  834/390/320px layouts all passed.
- Full regression: starting resumed Dev baseline 600 tests / 582 pass / 18 fail;
  changed tree 609 / 592 pass / 17 fail. No final-only failure names. An old test
  that hard-coded 37 photos was corrected to verify the current collection exactly;
  the editor's newer uploads increased it to 49. Other existing snapshot/calendar/
  contacts/content failures remain separate and are not hidden or bundled into this fix.
- Production build passed. Deployment verification is recorded in the delivery report.

Initial work started from Dev `b153f777c22b3112bed9a2b8eb2be437d83a74bd`; on resume
the editor's successful uploads and builds had advanced Dev to
`c885acd83051165e1249e8feb897a47693e7445d`. They were fast-forwarded and preserved.
Main was `804a189ae8b09e8a88f4bb98947af0e9fcb34c30` throughout.
