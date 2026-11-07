# Historical Archive publication: accepted images and HTTP 413

## Diagnosis (17 October 2026)

The original tab reported PUT /api/historical-archive returning 413. Its request
body and Azure invocation trace were not available to this investigation, so its
exact byte count and originating check cannot be asserted from the screenshot.

A reproducible implementation defect was identified: the repeated-quartet
Base64 regular expression in clergy-model.js raises a V8 RangeError on valid
multi-megabyte strings. On the local Node 24 runtime, a valid PNG of roughly
6.76 MB reproduces it. The handler classified every RangeError as HTTP 413.
The threshold depends on runtime/stack; it is not an intentional request limit.
The former UI allowed 10 MiB/image and 20 MiB/batch, so accepted images could
reach this defect. This is independent of Azure transport limits.

Azure's documented default request-body limit is 104857600 bytes:
https://learn.microsoft.com/en-us/azure/azure-functions/node-http-stream
The deployment workflow reports the actual FUNCTIONS_REQUEST_BODY_SIZE_LIMIT
setting without dumping other settings or secrets. No Azure limit is changed.

Application limits remain 10485760 original bytes/image, six uploads and
20971520 original bytes/batch; 40 million decoded pixels and static JPEG/PNG/WebP.
Archive JSON is limited to 1048576 UTF-8 bytes. Legacy requests allow
29076140 bytes: Base64 expansion, metadata and 64 KiB bounded JSON overhead.
The extra framing allowance corrects separately padded images, filenames and
removal IDs; it does not raise the image limits. These bounds are below Azure's
documented default. GitHub blobs are sent separately, each below its 100 MB
Git blob limit; no single GitHub Contents API file update carries the batch.

## Compatible fix

Legacy PUT stays supported so a still-open tab can retry its pending File objects
after API deployment without refresh or re-upload. Base64 validation now uses a
flat character scan and canonical encode/decode check, without recursive regex
matching. Explicit ArchiveSizeError distinguishes size policy from generic
JavaScript RangeError. No archive data is changed by deployment.

New GET responses advertise imageUploadProtocol=git-blob-v1. Newly loaded Admin
code then prepares each image using authenticated POST /historical-archive with
id and fileName query parameters, the original binary File body and image MIME.
The API bounds the stream, validates/decodes the image, preserves original bytes,
and creates the same non-upscaled, metadata-stripped JPEG derivatives as before.

Preparation writes three unreferenced Git blobs only. It creates no tree, commit,
branch update, profile edit or deployment. An HMAC-SHA256 signed receipt covers
the upload ID, paths, blob SHAs, original byte count, filename and 24-hour expiry.
It uses the existing server-only GitHub App signing key with domain separation;
rotation invalidates outstanding receipts. Receipts are not persisted/logged and
all routes still require Azure authentication plus the immutable Admin allowlist.

Final PUT contains archive metadata and signed receipts, no image Base64. The
client bounds this request to 1114112 bytes (1 MiB plus 64 KiB). Server validation
enforces six images and 20 MiB across both receipts and any legacy uploads, rejects
forged/expired receipts and unreferenced uploads, and retains existing SHA/head
conflict protection. All files are attached in one non-forced Dev commit. Only
that commit triggers the existing content build and Dev Pages deployment.

Abandoned preparations do not alter any branch. Their unreferenced blobs are
subject to GitHub's object garbage collection, whose retention is not controlled
by this app. They are not private storage or a draft backup; treat all uploaded
archive photographs as intended for eventual public storage. Original browser
Files remain available for a retry; a retry prepares new receipts.

## Feedback and verification

HTTP 413 is retained even for a platform HTML response. The visible, focused alert
states that publication stopped, explains the limits, and tells the editor to
keep the tab open. Failure never clears pending records or File objects. Only a
confirmed successful PUT adopts the authoritative state and clears its uploads.

Tests cover a real multi-megabyte PNG through the legacy handler, exactly 10 MiB
PNG, six-image batches, binary preparation without a ref write, signed receipt
publication, corruption/tampering/expiry/size/auth failures, preserved originals,
Dev-only commits, and HTTP 413 responses including non-JSON platform responses.
The browser test exercises both protocols at desktop/mobile sizes, including
failure, retained thumbnail/edit, retry and successful status adoption, using
an isolated fixture and mocked API. It never opens the user's pending tab.

The existing pending replacement has not been submitted by this investigation.
The compatibility path is verified in tests; actual pending-image publication
requires the original signed-in tab's explicit retry. Do not refresh that tab.
