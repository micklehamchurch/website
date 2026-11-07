# Full navigation in larger and portrait windows

Starting Dev: `28919b048c80b0c474df90ade220033e3abe3c24`.

The former 1536px width-only mode switch hid full navigation in tall desktop
windows. A coordinated mode query now selects full navigation at width ≥1280px,
or width ≥1000px with height ≥1000px. The complementary compact query is shared
by the header state, real navigation drawer, main hub and Policies disclosure.
No user-agent or physical-device detection is used.

The existing full design is unchanged at 1536px and above. Below that width, a
compact full variant uses the existing desktop information/navigation structure:
branding and information above, Home/all five dropdowns and desktop utilities
below. The normal height is 109px, matching the existing full header; scrolling
condenses it to 97px while keeping all information and destinations available.
Labels are 16px; icon targets remain at least 44×44px. Gaps/padding are reduced
first. Browser measurement found collision around 960px and a fit around 980px;
1000px provides a safer lower limit.

Approved iPad 11-inch landscape (1194×834), portrait (834×1194), and phone layouts
retain their existing mode and CSS. A 1020px-wide window shorter than 1000px
retains compact navigation: that viewport cannot be reliably distinguished from
an approved smaller-device layout using physical screen size. Tall desktop
portrait windows and larger tablets with sufficient CSS space receive full nav.

Only shared-header styles, mode queries and cache-delivery metadata change.
All public page bodies, hero/carousel source, image assets, service data, footer,
logo and favicon remain intact. Search retains its existing implementation; in
the compact full variant its existing below-header panel is used. The same real
menu sections move between desktop hub and native drawer; nothing is duplicated.

Verification includes Edge/WebKit at requested portrait/landscape dimensions,
width/height boundaries, normal/scrolled states, all five dropdowns, Policies,
Search, keyboard entry/Escape/focus return, touch/mouse operation, drawer resize
transitions and unchanged Home hero geometry/cropping. Forty preserved-layout
image comparisons are pixel-identical. Historical snapshot adapters accept only
the exact reviewed source hunks and an exact current bundle fingerprint; current
source/content and delivered CSS are checked independently.

One pre-existing boundary issue was recorded: at exactly 1536px, the original
branding hitbox extends about 5px into the adjacent information/navigation
column. Original and revised screenshots/geometry are identical there. It is
left unchanged to preserve the existing wide header; the new compact full
layouts have no such overlap. Browser tests are emulated, not physical-device QA.
