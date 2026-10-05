# Parish clergy archive

Edit `_content/clergy.json`, then run `npm run build`. The build produces the static archive page, a small public image manifest, and marked teasers in the homepage and Our History page before the existing search index is generated. It leaves the homepage hero and navigation markup unchanged. The Dev content workflow regenerates and commits these outputs.

Each published record supports service periods, an optional primary image, any number of archive images, and optional biography, parish context and interesting facts. John Harkin has one record and two service periods. Sort records by first service period; do not split returning clergy into separate people. Empty narrative sections are omitted. Native details provide a readable fallback; JavaScript enhances profile links into native modal dialogs and image thumbnails into a nested viewer.

## Sources and accuracy

The initial text follows the parish's supplied working brief. Historical claims were **not independently source-verified during development**. The brief supplies biographical material for twelve records; Ffowke, Langdale-Smith and Douglas are intentionally sparse. Langdale-Smith's provisional Indian service and birth details are omitted. No full name is invented for Douglas. Cornell's initials and full background require confirmation. Sandra Faccini has no inferred end date or statement of current tenure.

Original uploaded photographs 1–17 are preserved byte-for-byte in `_archive-sources/clergy`, excluded from Pages by `_config.yml`. Photograph 1 is the 1513 brass and is not used in the clergy archive. Photograph 3 bears the label George Lock, 1796–1800, conflicting with the supplied working sequence; it is preserved but unassigned pending parish confirmation. Ffowke has no portrait. All other supplied photographs are used. Photographs 12 and 16 belong to the same John Harkin record.

Derivatives in `assets/images/clergy` apply only EXIF orientation, rectangular cropping, proportional scaling and JPEG compression. No reconstruction, restoration, colourisation or artificial facial detail is applied. `360` files are card/thumbnails, `960` files are cropped profile portraits; `display` files preserve the photographed display and labels at a web viewing size. The metadata identifies original filenames and derivative creation; unknown dates, credits and permission status remain null. The original display photographs are not initial-load public assets.

`internalNotes`, `sources`, original filenames and permission metadata stay in the excluded structured source. The generated `clergy-data.json` allows only id and public image src/alt/caption fields. Search indexes the visible generated profiles; it never reads research metadata. Future editing tools should write the source and rebuild, and should retain publication filtering and this public allowlist.

## Checks before future changes

Run `npm test` and `npm run build`, inspect the generated diff, and check Dev HEAD for concurrent publishing updates before committing. The hero CSS must not change as a side effect. Test native keyboard focus, Escape, outside dismissal, nested focus return, browser Back/Forward, and archive viewer navigation. Confirm new images have parish permission before marking them published.
