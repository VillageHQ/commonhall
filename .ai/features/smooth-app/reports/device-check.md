# Device check for parts B and C (by hand, on TestFlight build 4 and the Android test APK)

TestFlight build 4 and the Android test APK are ready (21 Nov 2026, `../../mobile-app/reports/store-builds.md`). These
need a phone. Fill in each line with the
phone, the build and what was seen.

| # | Check | iPhone (TestFlight 4) | Android (APK) |
|---|---|---|---|
| 1 | Pull down at the top of Today, Rooms, People: nothing moves, nothing reloads | | |
| 2 | Pull up past the bottom: the page stops, no bounce (iOS), no stretch or glow (Android) | | |
| 3 | A fling on People glides and slows like the phone's own lists | | |
| 4 | Long-press a member's name: no link preview pop-up | | |
| 5 | The top bar's colour reaches the top edge under the status bar, light and dark; the bar's content sits below the clock | | |
| 6 | Sign-in and the welcome steps start below the status bar | | |
| 7 | Avatar menu → This app: Reload, Open in the browser, Switch community each work | | |
| 8 | The iOS back swipe still goes back a page | | n/a |
| 9 | The app opens on Today | | |
| 10 | Tab taps light the tab and show the outline at once (the kill criterion: if taps still feel slow, Part D) | | |

Seen in the web preview (21 Nov 2026, `../../mobile-app/reports/build4/`), not a substitute for the phone: 7 (Reload,
Open in the browser and Switch community each work), 9 (the app opens on Today) and the tab bar matching the web app's.
1–5 and 8 depend on the native web view's settings, which are in `mobile/src/components/PortalView.native.tsx`.
