# Bible reader Phase A

This is a Dev-only UI/navigation change. Azure, authentication, provider credentials,
licensed translation IDs, quota accounting and server caching are unchanged.

## Copyright and reporting decision (18 October 2026)

Reviewed `azure-function/BIBLE.md`, the existing proxy/reader and these primary sources:

- [API.Bible copyright display policy](https://care.api.bible/article/396-licensing-policies-quick-reference)
- [API.Bible attribution and exact copyright text](https://care.api.bible/article/388-how-to-find-copyright-and-public-domain-status-of-bibles)
- [API.Bible FUMS implementation](https://docs.api.bible/guides/fair-use/)
- [API.Bible terms](https://api.bible/terms-and-conditions)
- [Biblica terms](https://www.biblica.com/terms-of-use/)

The public provider policy requires copyright alongside copyrighted Scripture.
The exact publisher notice returned by the existing chapter response therefore
stays fully visible below the page controls, at 12px with wrapping and text resizing.
It is not shortened, clipped or moved behind a disclosure. The visible API.Bible
citation and hyperlink are retained on the same compact paragraph, conservatively
preserving the Starter-plan attribution requirement without assuming account terms.

The supplied publisher notice is displayed as inert text, using the existing
sanitisation. NIV and NIrV notices remain translation-specific; no generic notice
is substituted. Missing copyright or tracking metadata still prevents display.

The promotional Bible-study link is removed from the reader. The anonymous-view
reporting explanation and its documentation link remain available in the native
“About this Bible” dialog. FUMS is unchanged and receives the supplied token for
each chapter display, including chapters returned by the existing proxy cache.
There is no prefetch, bulk fetch or new content cache.

Public guidance does not establish that this church's account permits moving the
full copyright notice into a closed information dialog. This implementation does
not assume that permission. Account-specific agreements were not accessed or
changed. Keeping the complete notice visible is the conservative decision; this
is not an assertion that every possible custom licence was independently audited.

## Continuous navigation

`BiblePagesModel.adjacentChapter` uses the existing canonical book/chapter counts,
intersected with the current translation's available books. A page-boundary event
uses the same busy-guarded reader loader. Same-book moves fetch one chapter;
cross-book moves fetch the required chapter catalogue and then one chapter.
The page layer enters the first spread on forward moves and the final spread on
reverse moves, and saves the resulting semantic content offset. Explicit bookmarks
are independent. Genesis 1 and Revelation 22 stop in the unavailable direction.
The existing page turn, reduced-motion, keyboard and swipe paths use the same move
function. Requests are not duplicated and no speculative calls are introduced.

## Dismissal

A primary pointer must start and finish on the real outer backdrop, outside the
modal's bounding rectangle. Children, iframe content, modal padding and drags from
inside cannot dismiss the reader. The native modal retains Escape and focus
containment. Inner Books/About dialogs consume Escape first; their interactions
remain in their own document. Close and outer Escape/backdrop dismissal retain the
existing unload/save and focus-return path.

No Phase B, C, D or E features are included.
