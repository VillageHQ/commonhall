# Common Hall landing page v2: how it works

Everything is in `site/assets/site.js` (plain script, no library) and `site.css`. The check is
`.ai/features/one-site/reports/check-site.mjs` (320/390/1280 px, both themes, outside requests, console errors,
overflow, anchors, text contrast 4.5:1) and the form test `.ai/features/common-hall-site/reports/form-test.mjs`.

## Theme boot
`boot.js` runs in `<head>` before paint: `?theme=` (not saved), then `localStorage["ch-theme"]`, then
`prefers-color-scheme`; it sets `data-theme` on `<html>`. CSS tokens (`--bg`, `--ink`, `--muted`, `--line`...) switch on
`[data-theme="dark"]`; with no script a `prefers-color-scheme` rule applies. The toggle saves the choice and fires a
`themechange` event so the canvas re-reads `--ink-rgb`. Cards, tooltips and the dialog are ink on paper in both themes.

## Hover field (the canvas behind the first screen)
A grid (56 px, a little jitter) of marks: plus, door arc, dimension tick, tiny room. Each has `heat` 0 to 1. A pointer
(mouse or touch) within 66 px sets heat to `1 - d/66` if higher; heat halves every second. Alpha goes faint, mid, strong
and size 13 to 23 px with heat. Elements marked `data-skip` (the buttons, the GitHub card, the plan) plus 14 px are
left empty. The loop runs only while something is warm or the pointer is near. Resize rebuilds the grid; device pixel
ratio is capped at 2; reduced motion hides the canvas.

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
