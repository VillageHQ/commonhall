# mobile

The Commonhall store app (iOS and Android): Expo SDK 58, React Native, TypeScript. Its own npm project, outside the
web app's lint, typecheck, tests and build. How it works today: `.ai/features/mobile-app/NOTES.md`.

- `App.tsx`: picks the community (remembered), routes alert taps and `commonhall://join` links.
- `src/screens/`: `JoinScreen` (address check), `PortalScreen` (the portal up to the top edge, alert registration, the
  room's mini bar).
- `src/components/PortalTabs.tsx`: the native tab bar (`NativeTabBar.tsx`, drawn from the site's own bar) over one web
  view per tab, kept alive; the slot above the bar for the mini bar. `PortalView.native.tsx`: one tab's web view and the
  bridge; `PortalView.tsx` is the web preview's iframe.
- `src/lib/`: pure logic with unit tests (`community.ts`, `links.ts`, `bridge.ts`, `tabs.ts`: the page's tab script);
  `storage.ts` (AsyncStorage).
- `src/voice/`: `RoomDock` (the sheet `RoomScreen`, LiveKit on native WebRTC; `MiniPlayer`), `rules.ts`, `audio*.ts`.
- `src/push/`: Expo push (`push.native.ts`); the web preview's stand-in (`push.ts`).
- `modules/voice-service/`: a local Expo module, Android only: the foreground service that keeps a room playing
  with the screen locked, with Mute and Leave on the lock screen.
- `scripts/web-preview.mjs`: the app and a running portal on one address, with stand-ins for Expo push and email.

Rules:
- The app never holds a session or an API token: every server call runs in the portal page (`src/lib/bridge.ts`),
  with the page's cookie and origin, and only to the paths `isAllowedCall` lists.
- Only the community's own pages open in the web view; other sites open in the phone's browser.
- An address is opened only after `/api/health` answers `app: "commonhall"`.
- Never record a room; never upload to a store or submit a build without the owner's yes.
- `npx expo install <package>` for dependencies. Check with `npm run typecheck`, `npm test`, `npx expo-doctor`.
