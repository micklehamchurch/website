# Whole-card involvement links

Each card is one native anchor. Its former CTA is an identically styled span, with no nested links, duplicate keyboard stops or JavaScript. Heading IDs provide concise accessible names. Images, text, arrows and destination attributes are preserved:

- eco-church.html, same tab.
- give.html, same tab.
- https://www.cofeguildford.org.uk/, new tab with noopener noreferrer.

The original visual CSS declarations are unchanged. Only CTA selectors target spans, retaining their original specificity. Existing gold keyboard-focus styling outlines the full anchor. No hover styling, animation, typography, spacing, image or responsive changes are introduced. The existing CSS bundle is rebuilt through its manifest.

Focused tests round-trip the markup to the original HTML and selectors to the original CSS at starting Dev 1d40b78d66497830630882cda08b8c63187d9c0d. They protect unrelated homepage systems and deterministic bundling. Historical preservation tests use narrowly scoped markup normalisation.

Browser verification compares original and current structures in the same settled page, reusing loaded image nodes. This avoids independent image sampling differences also observed in an original-versus-original control. The original stylesheet comes directly from Git; the test permits inline injection and waits for rendering. Unrelated fixed overlays are hidden equally in both card-only captures.

Edge and WebKit cover 1600x1000, 1280x800, 1024x768, 834x1112, 768x1024, 430x932, 393x852, 375x667, 320x568, 852x393 and 568x320. Checks compare PNG pixels and computed styles/geometry, normal and hover appearance, image/heading/description/CTA/padding clicks, keyboard focus and activation, exact destinations, popup safety and overflow. The external destination is intercepted only during automated activation checks.

The scoped Dev workflow rebuilds the homepage CSS bundle without regenerating unrelated public content. Main remains unchanged at 804a189ae8b09e8a88f4bb98947af0e9fcb34c30.
