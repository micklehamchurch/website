# Single-row landscape navigation

Starting Dev: `39deb5ff8ac45adc0ff9a7c1a8da29817cfe664e`.

Landscape viewports from 780px through 1535px expose the existing Services,
Life Events and Community triggers between the existing church branding and
Search/Calendar/Bible/hamburger controls. CSS flexbox distributes spare space;
no duplicate navigation, second row or new JavaScript behaviour is introduced.
The same real dropdown sections and destinations remain in use. The hamburger
continues to expose all five categories and parish information.

First reduce gaps and utility spacing; below 1000px use 15px brand/shortcut text
and a compact subtitle. All interactive targets retain at least 44px height;
all four utility controls remain 44×44px. The phone church illustration remains
36px and tablet illustration 52px. Header heights remain 57px on the short phone
landscape layout and 79px on tablet. Existing heights at other tested sizes are
preserved. No portrait rule is modified. Below 780px the existing drawer layout
remains in use; the full shortcut row is not claimed at those narrower widths.

The added CSS is appended to the existing header stylesheet. Only its cache key
and the generated Home CSS bundle/hash change. Source pages, navigation content,
header logo and unrelated styles/scripts remain intact. The bounded Dev release
guard rebuilds only that CSS bundle, preserving date-sensitive projections.

Verification covers Edge and mobile WebKit at 1194×834 and 1210×834 (11-inch iPad
landscape variants), 852×393 (iPhone 15 Pro landscape), 844×390, 812×320, 780×360,
779×360, 1000×700, 1024×768, 1180×820, portrait 834×1194 and 393×852, and desktop
1600×1000. Checks include one-row bounds, no overlap/overflow, unchanged heights,
44px targets, original destinations, touch toggling, ArrowDown/Up keyboard entry,
Escape/focus return and the existing hamburger. Simulated 59px phone safe areas
on each side also fit. Four portrait screenshot comparisons are pixel-identical.
These are browser-emulated tests; physical Apple devices were not available.

Historical preservation tests discount only the exact appended CSS and its
delivery keys. Independent tests verify the original stylesheet prefix, original
navigation/script contents and the actual delivered Home bundle.
