# Discreet carousel pause control

Starting Dev: `934ebde31c972d0f95997e8deba12093047e4cb8`.

The prominent circle was the existing pause action, positioned absolutely above
the dot row by the phone/short-landscape CSS. It now participates in that row's
normal flex layout. Its visual disc is 28px, within the existing 44×44px target.
Desktop/tablet pause remains integrated in the existing control bar. No separate
floating pause control, replacement container or new JavaScript is introduced.

The phone row sizes to its contents: six 44px targets when rotation is enabled,
five when reduced motion disables rotation and hides the pause action. There is
no blank pause slot. Existing arrows retain their current responsive visibility.

The controller is byte-identical: 8000ms interval, 1400ms fade, previous/next,
pagination, swipe, focus/hover pause, background-tab handling, `aria-pressed` and
Pause/Resume accessible names are retained. Reduced motion still disables
automatic rotation and transitions. Manual navigation remains available.

Only an appended component CSS override and the generated Home CSS/hash change.
The Dev workflow uses a bounded CSS-only build path to avoid regenerating other
content. Historical snapshots discount only this exact reviewed CSS/hash change;
independent tests verify the actual delivered bundle and unchanged controller,
photograph model, header and Home markup.

Browser checks cover Edge and WebKit, normal and reduced motion, desktop/tablet/
phone portrait and short landscape, 44px targets, pause/resume names and state,
keyboard focus/Space, every pagination dot, existing arrows, touch swipes, stable
hero geometry and accessibility scans. A timed WebKit phone check confirms real
automatic advance, a full interval held while paused after focus leaves, and
advance after resuming. Browser verification is emulated, not physical-device QA.
