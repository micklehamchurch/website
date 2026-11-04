# Homepage hero photo replacement

Starting Dev: f12b7e996adf5af780427b402dc88eaf946d3bf4. Supplied originals remain unchanged in the user photo directory. No AI, colour edits, retouching or object removal. All previous hero sources/derivatives remain for rollback.

Order and source files:

1. Sunlit Flintstone Churchyard with Red Door.png (1672×941, 3115980 bytes), id sunlit-exterior
   - assets/images/home/hero-sunlit-exterior-480.webp: 480×270, 37578 bytes
   - assets/images/home/hero-sunlit-exterior-720.webp: 720×405, 79384 bytes
   - assets/images/home/hero-sunlit-exterior-960.webp: 960×540, 133062 bytes
   - assets/images/home/hero-sunlit-exterior-1280.webp: 1280×720, 218592 bytes
   - assets/images/home/hero-sunlit-exterior-1600.webp: 1600×900, 312518 bytes

2. Golden-Hour Church and Graveyard.png (1671×941, 3134449 bytes), id golden-church
   - assets/images/home/hero-golden-church-480.webp: 480×270, 36926 bytes
   - assets/images/home/hero-golden-church-720.webp: 720×405, 76134 bytes
   - assets/images/home/hero-golden-church-960.webp: 960×541, 128984 bytes
   - assets/images/home/hero-golden-church-1280.webp: 1280×721, 213540 bytes
   - assets/images/home/hero-golden-church-1600.webp: 1600×901, 298824 bytes

3. Vibrant Church Interior and Congregation.png (1672×941, 3029025 bytes), id congregation
   - assets/images/home/hero-congregation-480.webp: 480×270, 36136 bytes
   - assets/images/home/hero-congregation-720.webp: 720×405, 74070 bytes
   - assets/images/home/hero-congregation-960.webp: 960×540, 120246 bytes
   - assets/images/home/hero-congregation-1280.webp: 1280×720, 187386 bytes
   - assets/images/home/hero-congregation-1600.webp: 1600×900, 258094 bytes

4. Sunlit Autumn Churchyard Graveyard.png (1672×941, 3761405 bytes), id autumn-yard
   - assets/images/home/hero-autumn-yard-480.webp: 480×270, 47382 bytes
   - assets/images/home/hero-autumn-yard-720.webp: 720×405, 102520 bytes
   - assets/images/home/hero-autumn-yard-960.webp: 960×540, 178498 bytes
   - assets/images/home/hero-autumn-yard-1280.webp: 1280×720, 297792 bytes
   - assets/images/home/hero-autumn-yard-1600.webp: 1600×900, 422472 bytes

5. Golden Hour Churchyard and Autumn Gravestones.png (1672×941, 3540958 bytes), id sunset-yard
   - assets/images/home/hero-sunset-yard-480.webp: 480×270, 42308 bytes
   - assets/images/home/hero-sunset-yard-720.webp: 720×405, 94362 bytes
   - assets/images/home/hero-sunset-yard-960.webp: 960×540, 161498 bytes
   - assets/images/home/hero-sunset-yard-1280.webp: 1280×720, 266754 bytes
   - assets/images/home/hero-sunset-yard-1600.webp: 1600×900, 376574 bytes

Sharp quality 80, effort 6; full original aspect ratio, resized without enlargement. Maximum 1600px matches the site shell and avoids inventing high-DPI detail beyond supplied ~1672px sources. Mobile candidates 480/720/960; wide adds1280/1600. First-only mutually exclusive responsive preloads match the first picture. Other images remain low priority, sequentially warmed and decoded before display. PNGs are not deployed.

Individual wide/phone/short positions are centralized in home-hero-photos.js. Exterior prioritises the tower top; golden church uses right-of-centre framing in narrow landscape; interior centres aisle/altar; autumn prioritises left church; sunset centres church and spire. Existing geometry unchanged. Existing edge shading is modestly stronger and extends to tablet for readable interior text. Five dots retain44px targets; narrow landscape controls wrap as needed with existing detached pause placement.

8-second interval,1400ms fade, previous/next, dots, pause/hover/focus/visibility behaviour, swipe filtering and reduced motion preserved. Only source sizes were added to the existing dynamic sources. No API/header/footer/navigation or later Home sections changed.

Verification scripts: node --test test/home-hero-carousel.test.cjs test/home-hero-autumn.test.cjs; scripts/check-home-hero-carousel.cjs (PLAYWRIGHT_MODULE; optional HERO_BASE_URL). Browser script covers five images at 320,375,390,430,568landscape,874landscape,768,1024,1280,1366,1440,1535,1536,1600,1920,2560; real natural rotation, manual keyboard,44px targets,fixed geometry,no overflow,pause/hover/focus,touch,failed-image retry and no-JS. Historical snapshot helper ignores the explicitly approved first picture only; separate test verifies every byte from hero-overlay onward against starting Dev.
