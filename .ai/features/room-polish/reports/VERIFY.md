# Room polish: independent check

Checked on 2026-11-21 against the throwaway demo at http://localhost:9716 (production build, demo mode, local LiveKit),
at 390x844, with a separate browser session for each person: Maya (admin) on the web, Sam (member) on the web, and
Sam in the store-app web preview (`/__app/`). Screenshots are in `reports/verify/`.

| # | Check | Result | What I saw | Screenshots |
|---|-------|--------|------------|-------------|
| 1a | App: Leave shows "You left the room." | PASS | Leave on the app's room screen closed it. The room page under it said "You left the room." with Join again and Back to Rooms. | V1-03-app-room-screen, V1-04-app-after-leave |
| 1b | App: This app › Reload after leaving | PASS | The menu's This app › Reload reloaded the iframe (the browser reported the load as a reload). The page still said "You left the room." with Join again, and the app's room screen did not open. | V1-05-app-menu-this-app, V1-06-app-reload-left |
| 1c | App: plain reload of the iframe after leaving (twice) | PASS | Two `location.reload()`s in a row. Each time it still said "You left the room.", and I checked every 0.5 s for 7 s that the room screen ("Minimise") never showed. | V1-09-app-plain-reload-left |
| 1d | App: Join again after a reload | PASS | The app's room screen opened (You're in, listening), and the page under it said "Playing in the app." | V1-10-app-join-again |
| 1e | App: new route (Back to Rooms, then the card's Join) | PASS | After a second Leave, Back to Rooms and then Join opened the room screen as before, with no "You left". | V1-11-app-fresh-join-after-back |
| 1f | App: "continues on another device" | PASS | With Sam in the room in the app, Sam joined the same room on the web. The app showed "You joined this room on another device, so it continues there." After Back to the portal, the page showed the same words with Join again. This app › Reload kept those words, and no room screen opened. | V1-12-app-elsewhere, V1-12b-web-took-over, V1-13-app-elsewhere-portal, V1-14-app-elsewhere-reload |
| 1g | App: a reload on /rooms, then the card's Join | PASS | After the reload, the page kept the reload load type. Join still opened the room, so the left message did not stick here. | (text only) |
| 1h | Web browser room page (not changed; report only) | PASS (unchanged) | On the web, Leave goes straight back to /rooms, so there is no "You left" page. Reloading shows /rooms, and the card no longer counts Sam (Priya + 4). | V1-07-web-after-leave, V1-08-web-after-leave-reload |
| 2a | Cards before anyone joins (Maya) | PASS | Rooms and Today's Live now both show 4 faces and "Priya + 4". | V2-01-maya-before-rooms, V2-01-maya-before-today |
| 2b | Sam joins on the web, then leaves | PASS | While Sam was in: "Priya + 5" on Rooms and Today. After Sam left and the page reloaded: "Priya + 4" on both. | V2-02-sam-web-in-room, V2-03-maya-sam-in-*, V2-04-maya-sam-left-* |
| 2c | Sam joins in the app, then leaves | PASS | While Sam was in through the app: "Priya + 5" on both, read from the page text. After Leave: "Priya + 4" on both. | (text only) |
| 2d | Sam on the web takes over from the app, then leaves | PASS | "Priya + 5" while in, back to "Priya + 4" after leaving, on both pages. | (text only) |
| 2e | Maya joins and leaves twice (Sam reads the cards) | PASS | Each round: "Priya + 5" while Maya was in, "Priya + 4" after she left, on both Rooms and Today. Nothing built up over the rounds. | V2-05-sam-sees-maya-in-*, V2-06-sam-sees-maya-left-twice-* |
| 2f | Sam's face appears on the card | PASS (with note) | On Sam's own new room, Maya saw Sam's face and "Sam is in". On the demo room, Sam's face never shows, because the card has room for 4 faces and the 4 seeded people fill them. The count still went up. | V2-08-maya-sees-sam-room-rooms |
| 2g | New room by Sam ("Start a room") | PASS | Start a room opened "Sam's room" with Sam as host. Maya's Rooms page listed it with Sam's face and "Sam is in". Today's Live now shows only one room, the busiest (one is the design: `LIVE_ROOMS_SHOWN = 1`), so it kept showing the demo room. | V2-07-sam-start-room-form, V2-08-maya-sees-sam-room-rooms, V2-08-maya-sees-sam-room-today |
| 2h | New room after Sam leaves | PASS (count) | Maya's card changed to "Nobody in yet". The host's face still shows beside it, which is how the cards already work ("the host and speakers stand in"). | V2-09-sam-after-leaving-own-room, V2-10-maya-after-sam-left-own-room |
| 2i | Empty new room ends after about 2 minutes | NOT SEEN | It was still listed, as "Nobody in yet", at 05:05:15Z, more than 6 minutes after Sam left at about 04:58:50Z. This is the voice-rooms job, which runs once a minute on the job runner. This change did not touch it, so the job runner is probably not running on this throwaway target. Worth a look only if it also happens on a real install. | V2-11-maya-after-wait |

## Other things I noticed

- **Back button after leaving reopens the room.** In the app, after Leave I went to Today and then pressed the iframe's back button (`history.back()`). That reopened the app's room screen. This matches the design, which says only a reload keeps "You left". Still, someone who taps back may not expect to rejoin. (V1-15-app-history-back)
- **Reload is below the fold in the avatar menu.** At 390x844, This app › Reload sits under Feed and needs a scroll inside the menu. The menu scrolls fine; this is not new. (V1-05-app-menu-this-app)
- **Nothing else looked broken** at 390 px on the screens I visited.

**Verdict: PASS.** Every check of the change passed. The one thing not seen, an empty new room ending on its own, depends on the job runner and is outside this change.
