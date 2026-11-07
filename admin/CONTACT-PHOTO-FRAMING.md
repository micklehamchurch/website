# Parish portrait framing

Contacts and PCC members optionally store `photoFraming: { zoom, x, y }`
alongside their existing `photo`. Zoom is 1–3 (Admin step 0.01); x and y
are percentages 0–100 (Admin step 1). All three must be finite numbers.
The API rejects extra keys, strings and out-of-range values.

Without this metadata, public rendering remains unchanged: optimized
portraits use cover and their existing top/centre/bottom position; legacy
string paths use contain. Admin defaults match these: zoom 1, x 50, y
0/50/100 for the existing preset, or 50 for legacy portraits. New uploads
default to top. Reset deletes the optional framing metadata, restoring
the existing photograph's default. Replacing a photo resets framing;
removing a photo removes its framing too.

Both preview and public framed portraits use an 88 × 132 bordered frame.
The image box is zoom × the frame's inner size, with left/top offsets
`(1 - zoom) × x/y` percent and object-position x/y percent. This lets
positioning move an image even when its source aspect ratio exactly
matches the frame. Overflow is clipped by the frame. Legacy images
retain contain; optimized images retain cover. Public srcset sizes
account for zoom. Responsive layouts retain the same portrait size.

Framing adjustments follow the existing Stage changes → Publish changes
workflow, including the current blob/head concurrency checks and Dev-only
atomic publishing. A framing-only publish writes contacts metadata and
does not generate, delete or alter image files. Upload decoding,
security, optimization and publication permissions are unchanged.

Local browser checks: `scripts/verify-contact-framing-browser.cjs` and
`scripts/verify-contact-photos-browser.cjs`. They use in-memory API mocks
and never publish test data to live Dev.
