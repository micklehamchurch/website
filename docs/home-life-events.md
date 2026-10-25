# Home life-event cards

Starting current Dev b14dd04f3caa684909b668715136a6dc4eca17ba (includes the latest Admin contact update). Replaces only the right-hand About section with Baptisms, weddings and funerals; left News markup, renderer, feed/model and styling are untouched. Existing two-column widths are retained.

Destinations verified in repository: baptisms.html, weddings.html, funerals.html. Supporting copy follows the approved task wording. Cards use existing typography, a thin warm border, minimal shadow and small inline shell/rings/cross icons, without libraries or new JavaScript. Whole-card links are labelled by their title and Find out more text; icons and supporting images are decorative.

Existing real parish photography and the earlier image audit were reviewed alongside the life-event page assets. The existing atmospheric font, aisle flowers and white-lily illustrations already provide a coherent visual family; no new generation was needed. Sources and provenance remain documented in their original assets/images/baptisms,weddings,funerals READMEs. No real event, parish interior or people is claimed. No person appears in the chosen images.

Small thumbnails under assets/images/home/life-events use320x214 WebP quality81: baptisms-320.webp10568B; weddings-320.webp17490B; funerals-320.webp14420B. They only resize/compress the existing640w assets, no retouching. Existing640x427 sources remain for density: assets/images/baptisms/font-640.webp32986B; assets/images/weddings/interior-640.webp57636B; assets/images/funerals/flowers-640.webp54664B. Total320w payload42478B,640w145286B. No1536px source is loaded for a small card. Explicit media geometry and lazy loading prevent image-driven layout movement.

At column widths560px+ three equal grid columns align their bottom actions via flex. Narrower columns use three horizontal cards with96–110px image strips and readable copy. Short landscape explicitly retains horizontal previews. Existing main Home stacking breakpoint is unchanged. Images have individual focal positions. The old unloaded home-about.css and superseded About-specific test are removed; scoped home-life-events.css replaces them. The existing scoped build workflow recognises the new CSS and thumbnail directory, without rebuilding unrelated date-sensitive service data for this change.

Focused tests prove all Home bytes outside the replaced section and its stylesheet reference are preserved against b14dd04, including News. They also verify canonical feed/model and dedicated destination bodies unchanged, three links/labels, safe illustration handling, small assets, reserved dimensions and no gradients.

Responsive sizes account for the painted width of the landscape image when cropped into a narrow horizontal-card strip (260px on tablet/phone), so high-density displays choose640w rather than undersampling the crop. Desktop cards use220px sizes. No larger originals are introduced.
