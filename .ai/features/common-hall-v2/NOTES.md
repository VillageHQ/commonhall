# Commonhall landing page v2: how it works

Everything is in `site/assets/site.js` (plain script, no library) and `site.css`. The check is
`.ai/features/one-site/reports/check-site.mjs` (320/390/1280 px, both themes, outside requests, console errors,
overflow, anchors, text contrast 4.5:1) and the form test `.ai/features/common-hall-site/reports/form-test.mjs`.

## Theme boot
`boot.js` runs in `<head>` before paint: `?theme=` (not saved), then `localStorage["ch-theme"]`, then
`prefers-color-scheme`; it sets `data-theme` on `<html>`. CSS tokens (`--bg`, `--ink`, `--muted`, `--line`...) switch on
`[data-theme="dark"]`; with no script a `prefers-color-scheme` rule applies. The toggle saves the choice and fires a
`themechange` event so the canvas re-reads `--ink-rgb`. Cards, tooltips and the dialog are ink on paper in both themes.

## Hover field (the canvas behind the first screen, class `hero-field`): plan-view doors
Since 2026-11-15 (the owner's pick A of four prototypes) the field is a 72 px grid of doors drawn as on a floor plan: a wall
run with a 28 px opening and jamb ticks, the leaf closed across the opening, in one of four orientations. Moving the
pointer (mouse or touch) starts a circular wave at the pointer (560 px/s, a new wave every 110 ms and 36 px of travel,
up to 8 at once, each ends at 560 px wide). A door whose centre the wavefront passes swings its leaf open 90 degrees in
400 ms while its quarter-circle arc inks in, holds 900 ms, then swings shut in 400 ms; a later wave re-opens or extends
it. At rest the ink is 6.5% (light) / 9% (dark); an open leaf peaks at about 55%, its wall 22%, its arc 32%. Doors whose
footprint touches a button, the GitHub card or the plan (`data-skip`) or a line of the eyebrow, H1 or sub-line
(`data-skip-text`, measured with a Range, plus about 8 px) stay shut and never trigger, so nothing above the at-rest ink
ever lands under a letter (the proof counts open-door pixels inside those boxes: 0). The ink colour comes from
`--ink-rgb` and is re-read on `themechange`; the grid rebuilds on resize (debounced), on a hero size change and when
the motion preference changes; device pixel ratio is capped at 2; one cached hero rect (refreshed on scroll); the frame
loop runs only while a wave is alive and stops when idle. Reduced motion: the doors are drawn once, closed, with no
listeners (the site check moves the pointer and asserts the canvas does not change). No JavaScript: the canvas stays
hidden. `.field` belongs only to the form's field wrappers. Proof: `.ai/features/door-field/reports/` (stills, two clips,
`proof.mjs`).

## Faces, walks, deals, doors
- The plan is 360 by 300 units. `ROOMS` lists each room's spots, `NODES` and `EDGES` the doors and the corridor lanes
  inside the big rooms; a walk is the shortest route (breadth-first) spot, door, lanes, door, spot, at about 44 px a second.
- Eight `button.p` faces (resting places are CSS classes `pos-<name>`, so no script means still faces). Hover and focus
  show the tooltip by CSS; a tap toggles `.on`; Escape or a click elsewhere hides it. A face under the pointer or focus stands still.
- A deal: every 5.5 to 8.5 s two idle people go to the first two spots of a room (or are already there); when both
  stand there a card shows 3.8 s with an "Example moment" kicker, then fades. At most two other people walk at once.
- Doors: each leaf is drawn open in the markup; script rotates it (`transform` attribute) to about 82% shut and open
  when someone is within 24 units. Everything pauses off-screen and in hidden tabs. Reduced motion: `settle()` puts
  everyone back, clears the doors and shows the static card.

## Dialog and split button
The caret opens a `role=menu` (arrow keys, Home, End, Escape). Choosing an item sets the main button and opens the native
`<dialog>` (`showModal`: traps focus, Escape closes) and focus returns to the opener. The prompt tells the assistant to
clone the repo, read `docs/self-host-vps.md` and run the install line; nothing is sent anywhere.

## Real screens
Six crops of the app's demo shots (`site/assets/screens/*-1280.webp`, 1016 by 640, and `*-390.webp`, 780 by 1100).
The crops start below the demo banner and the app's own "Founder view" strip, and leave out the app's sidebar (its
"Founder view" label and "Commonhall by Village" footer); nothing inside the content is edited. One screen per row, up
to 880 px wide (two per row came out at 550 px with about 8 px text). Phones (600 px and less) load the 390 crops.

## No JavaScript
`boot.js` adds `html.js`. Without it (script off or blocked) the split button, caret and menu are hidden
(`html:not(.js) .split`) and a plain link "Set up on your own server" (`.nojs-only`, hidden when `.js` is set) points to
`docs/self-host-vps.md` in the repo. With script the split button shows as before.
