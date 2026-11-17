# Charter: an uploaded logo on the dark tile showed as an empty black square

Approved direction: Absi's brief for the Commonhall onboarding topic (17 Nov 2026): "Crashes and small bugs first
(they need no design)." The look stays as designed; only the broken inset changes.

- **Cause:** `LOGO_BACKDROP_CLASSES.dark` used `p-[10%]`. A percentage padding resolves against the parent's width
  (the sidebar), so a 34 px tile got about 22 px on each side and the logo shrank to 0 x 0.
- **Fix:** the inset is a tenth of the tile in pixels (3 px at 30–34 px, 4 px at 44 px), set as an inline style.
- **Tests:** `src/components/logo-tile.test.ts` (red before, green after); the real sidebar on a test copy with a
  made-up white logo: `reports/logo-compare.png`.
