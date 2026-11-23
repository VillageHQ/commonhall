# Notes: the Commonhall store app (how it works today)

Built 19 Nov 2026 (round 5, part "mobile-app"). Spec: `SPEC.md`. Proof: `reports/`. Code: `mobile/` (its map:
`mobile/AGENTS.md`; how to run and build: `mobile/README.md`).

## The shape
- **Expo SDK 58, React Native 0.88, TypeScript**, its own npm project in `mobile/`. The root ignores it: `tsconfig.json`
  excludes `mobile`, `eslint.config.mjs` ignores `mobile/**`, Vitest only reads `src/**`, `next build` never sees it.
- **The portal runs in a web view** (`react-native-webview`), so every screen of the web app works in the app and the
  member's session lives in the web view's own cookie store. The app adds native chrome: no top bar of its own (the
  site's bar reaches under the status bar; Reload, Open in the browser and Switch community are the avatar menu's
  "This app" group, smooth-app), its own error screen with Try again (a failed load or a 5xx never
  leaves a blank view), Android's back button going back in the portal, and other sites opening in the phone's browser.
- **The bridge** (`mobile/src/lib/bridge.ts`, the page side in `src/platform/native-app/bridge.ts`): before each page
  loads, the app puts `window.CommonhallApp` (`version`, `platform`, `pushToken`, `openRoom()`) and
  `__commonhallBridge.call()` in the page. The app's server calls run as the page's own `fetch`, so they carry the
  member's cookie and the site's origin and pass the route kit's checks unchanged: **no app token, no origin
  exception, no second sign-in.** The bootstrap runs again when each page finishes loading (Android may miss the
  before-load run); frames inside a page load in place, only page navigations to other sites open the browser. Only `POST /api/voice/*`, `POST|DELETE /api/notifications/devices` may be called, and
  only from a page on the community's own origin.

## Joining a community
- `JoinScreen`: the member types an address or pastes an invite link (its page opens after sign-in). `readAddress` adds
  `https://`, allows plain http only for a local test copy, and refuses anything that isn't an address.
- `checkCommunity` asks `<address>/api/health`: a Commonhall server answers `{ status, app: "commonhall" }` (added to
  the health route by this part). Anything else gets a plain error ("… isn't a Commonhall community", "We couldn't reach
  …", "… isn't answering right now"). The name comes from `/manifest.webmanifest`.
- Communities are remembered (AsyncStorage, addresses and names only), newest first; the last one opens at launch.
- `commonhall://join?server=<address>&path=<page>` prefills the join screen.

## Signing in: the 6-digit code
The emailed link opens the phone's browser, so the sign-in email now also carries a 6-digit code
(`src/platform/auth/sign-in-code.ts`), typed on the "Check your email" page (`src/app/signin/sign-in-code-form.tsx`),
in the app or any browser. `POST /api/sign-in-code { email, code }` signs in like the link (`signInWithServerLink`),
with the same answers for a wrong code, an expired one and an unknown address.
- One live code per address, stored as an HMAC (the auth secret) in `verification` (`sign-in-code:<email>`), 15 minutes.
- Using the code deletes the address's live links; using a link deletes the code (`verifySignInLink`).
- A code dies after 5 wrong tries; an address takes 10 wrong tries a day (`sign-in-code-misses:<email>`), counted in
  the database so parallel guesses all count. Per-IP limits as for links when the host names a trusted IP header.

## Alerts
- After the first signed-in page loads, `PortalScreen` asks for permission once, gets the Expo push token
  (`getExpoPushTokenAsync`, which needs the build's EAS project id, `EAS_PROJECT_ID`), and registers it through the
  bridge: `POST /api/notifications/devices { type: "expo", token }`. A 401 (signed out) tries again on the next page;
  landing on a sign-in page re-arms it, so whoever signs in next gets this phone.
- Each Expo message now carries `data.origin` (the server's address) besides `url` and `kind`. A tap opens `url` in
  the community that sent it (switching if the phone knows several; the join screen, prefilled, if it no longer lists
  it), cold start included.
- Sign-out in the app removes the app's token on the server (`forgetThisBrowser` reads `CommonhallApp.pushToken`).
- Settings › Alerts in the app says the app handles this phone's alerts and keeps "Send a test alert".

## Voice rooms, native
- The room page (`src/modules/voice/components/live-room.tsx`) asks `readNativeApp()`: in the app it calls
  `openRoom(roomId, title, { hasNotified })` and shows "Playing in the app." with Open the room; in a browser it plays
  there as before. Nothing connects until the page knows which. `hasNotified` (the member already told people about
  this room, or started it with Notify) reaches the room screen in the `voice.open` message, so it hides Tell people.
- When the room screen closes (Leave, the lock screen's Leave, or Back to the portal from an ended, failed or
  elsewhere room), the app sends the page `commonhall-room-closed` `{ roomId, reason }` (`buildRoomClosedScript`;
  reasons `left` · `ended` · `elsewhere` · `failed`). That room's page then says why ("You left the room."), re-reads
  itself from the server (a fresh `hasNotified`) and offers Join again, except for an ended room (room-handoff, 20 Nov
  2026). An app build before this sends nothing, and the page keeps saying "Playing in the app."
- `RoomScreen` (`mobile/src/voice/`): `/api/voice/join` through the bridge, then `livekit-client` on the phone's WebRTC
  (`@livekit/react-native` `registerGlobals()`, its Expo plugin and `@config-plugins/react-native-webrtc`). Stage and
  audience with faces, talking rings, raised hands, invite up / move down / co-hosts for moderators, reactions, mute,
  End room for the host, Leave quietly. Every role change still goes through the server's voice API.
- **Tell people I'm here** (round 6): picks up to 10 people and posts `/api/voice/notify`. The app learns that the
  member already told people about this room (once per room, a Notify when starting it included) from the page's
  `hasNotified` when the room is handed over, and otherwise from the server's `voice_notified_already` answer, which
  closes the button like a send. Confirmations read in ink,
  problems in rust. "Start a room" with Notify others is the portal's own sheet, so the app needs nothing for it.
- **Minimise** keeps the room connected under the portal with a bar ("Pricing AMA · On stage, talking"; the dot greys
  when the room closes). One room at a time: opening another leaves the first (`/api/voice/leave`). No room chat yet.
- **Locked screen:** Android: `modules/voice-service`, a local Expo module (Kotlin) running a foreground service
  (`mediaPlayback`, plus `microphone` while on stage and allowed) with a notification showing the room, Mute/Unmute and
  Leave on the lock screen. A running service updates in place (Android refuses a new foreground service from the
  background); if the microphone type is refused it keeps playing as media. iOS: `UIBackgroundModes: ["audio"]` keeps the WebRTC audio session (and a speaker's
  microphone) going; iOS lock-screen controls would need CallKit (not built).

## Builds
`mobile/eas.json`: `development` (dev client, APK, iOS simulator), `preview` (APK, simulator), `production` (store,
EAS-managed signing), `testflight` (production signed with local files; submit profile with the App Store Connect app id).
Bundle id and package `ai.commonhall.app`, scheme `commonhall`. Icons are drawn from the door-gap mark
(`mobile/scripts/make-icons.py`).

## Where Commonhall's own app is published (19 Nov 2026, the owner's choice)
TestFlight internal testing and Android test APKs only: never a public release, never an App Store review submission.
- **Apple:** Absi's team `TA6D5Y2M2U`. App ID `ai.commonhall.app` ("Commonhall", Push Notifications on; background
  audio is only an Info.plist mode). App Store Connect app "Commonhall" (`6836913644`, SKU `commonhall`). Profile
  "Commonhall App Store" (App Store, the team's distribution certificate, valid to 21 Jul 2027). TestFlight internal
  group "Absi".
- **Expo:** account `tinyring`, project `@tinyring/commonhall` (id `963d0817-…`, the default in `app.config.ts`;
  a fund's own copy overrides it with `EAS_PROJECT_ID` and `EAS_OWNER`). The Android signing key was made by EAS in the
  cloud on the first build and lives there.
- **Push (APNs):** its own key "Commonhall push" (`633797XK4M`), Production, limited to `ai.commonhall.app`, uploaded to
  the Expo project's iOS credentials. Production-only means TestFlight and store builds get alerts; a development build
  (APNs sandbox) does not. Other apps' push keys on the team were not touched.
- **Signing files** sit beside the app, git-ignored: `mobile/credentials.json` (profile + distribution certificate and
  its password) and `mobile/ios-certs/` (the `.p12`, the profile, the push key, the App Store Connect API key). Copies
  are kept with the team's other signing files on the owner's PC, never in the repo.
- **Submitting:** `eas submit -p ios --profile testflight --latest` needs `ascApiKeyPath`, `ascApiKeyId` and
  `ascApiKeyIssuerId` in the submit profile; they are added for the run and not committed, so the public repo holds no
  key ids. Build numbers count up on EAS (`appVersionSource: remote`, `autoIncrement`).
- The project archive EAS uploads is the whole repo (about 330 MB), because `mobile/` sits inside it.

- **Builds so far:** iOS build 1 and an APK (19 Nov 2026, round 5); iOS build 2 and an APK (20 Nov 2026, round 6:
  the five tabs, Notify others, quiet times); iOS build 3 and an APK (20 Nov 2026: the room hand-off, so the room page
  learns you left and the app learns you already told people; check in `reports/build3/`); iOS build 4 and an APK (21 Nov 2026, round 7: Rooms first, one-tap start with
  Rename and the quiet-start line, quiet times and pause, the smooth web view; check in `reports/build4/`); an APK of build 5 (23 Nov 2026, round 8: the native tab bar, the room sheet and mini player; check in
  `reports/build5/`); iOS build 5 (23 Nov 2026, the same round 8 code, built on the owner's Mac because Expo's free plan
  had used its iOS builds for the month; recipe below). The Absi group has every build, so a processed build reaches it
  on its own.
- On Windows, `npx eas-cli` inside `mobile/` can fail with npm's "Invalid Version"; run it from another folder, or
  call the cached copy (`node <npx cache>/node_modules/eas-cli/bin/run …`) from `mobile/`, without `NODE_ENV` set.

## iPhone builds on the owner's Mac (23 Nov 2026, build 5)
Expo's free plan allows only a few cloud iOS builds a month. A local build (`eas build --local`) costs no Expo credits:
it runs prebuild, CocoaPods and Xcode on the Mac and still reads the project from Expo, so it needs an Expo token.
About 10 minutes from a cold cache; the upload and Apple's processing about 3 more.
1. **Copy over ssh only.** `git archive HEAD mobile | ssh mac 'cd ~/qareen-builds/commonhall && tar -xf -'`, then the
   git-ignored `credentials.json` and `ios-certs/` the same way (`tar -cf - … | ssh mac …`, `umask 077`). On the Mac,
   use Node 22 (`~/.nvm/versions/node/v22.*/bin` first on `PATH`; a non-login ssh shell has no `node`) and `npm ci`.
   `eas build --local` on iOS needs fastlane (`brew install fastlane`; installed 23 Nov 2026) and CocoaPods.
2. **The Expo token** goes over ssh on stdin (`printf '%s\n' "$T" | ssh mac 'bash build.sh'`, the script starts with
   `read -r EXPO_TOKEN; export EXPO_TOKEN`), never on the Mac's disk or in a command line.
3. **The build number.** With `appVersionSource: remote` and `autoIncrement`, every started build bumps Expo's counter,
   even one that fails or is stopped: build 5's failed cloud try and a stopped local try had taken it to 6. To pick the
   number, switch the Mac copy only to `appVersionSource: local`, `autoIncrement: false` and `ios.buildNumber: "5"`.
   Expo's counter then stays where it is (6 now), so the next cloud build is 7; a skipped number does no harm.
4. **Signing over ssh.** codesign stops with `errSecInternalComponent` when it finds the distribution certificate in a
   locked keychain first (the Mac has it in another app's build keychain at the top of the search list; ssh cannot
   unlock it). For the build, make a temporary keychain with a random password, import `dist.p12`
   (`-T /usr/bin/codesign`), `set-key-partition-list -S apple-tool:,apple:,codesign:`, unlock it, put it first with
   `security list-keychains -d user -s <it> <the saved list>`, and restore the saved list and delete it in an `EXIT`
   trap. Then run `EAS_NO_VCS=1 EAS_LOCAL_BUILD_WORKINGDIR=… npx eas-cli build -p ios --profile testflight --local
   --non-interactive --output out/commonhall-<n>.ipa` (Mac folders have no git, so `EAS_NO_VCS=1`).
5. **Check the .ipa:** `CFBundleVersion` is the number, signed "iPhone Distribution" by team `TA6D5Y2M2U`, profile
   "Commonhall App Store", `aps-environment` production, `get-task-allow` false.
6. **Upload without Expo:** `xcrun altool --upload-app -f <ipa> -t ios --apiKey <key id> --apiIssuer <issuer id>
   --p8-file-path ios-certs/asc-key.p8` (the key ids as in "Submitting" above, never committed). Apple's API then
   shows the build `VALID` with internal state `IN_BETA_TESTING`, and the "Absi" group lists it (it has every build).
   The external state stays "ready for beta submission": nothing is ever sent to external testing or review.
7. **Clean up right after the upload:** delete the copied `credentials.json` and `ios-certs/`, and also what
   `eas build --local` leaves behind: a copy of the certificate (`<uuid>.p12`, one per started build) in the Mac's
   temp folder (`$TMPDIR`), the "Commonhall App Store" profile in `~/Library/MobileDevice/Provisioning Profiles/`, a
   keychain `eas-build-*.keychain` if a build was stopped (`security delete-keychain`), the day's Xcode archive, and
   the CocoaPods download cache it filled (about 4 GB: LiveKit's WebRTC, React Native's prebuilt core). The build
   folder (`~/qareen-builds/commonhall`, about 0.5 GB with `node_modules` and the .ipa) is kept while under 3 GB.

## What was proven, and what wasn't (19 Nov 2026)
- Proven: unit tests (`npm test`, 13), `tsc`, `expo-doctor` 20/20, `expo prebuild` for Android (config plugins apply,
  the local module autolinks), `expo export` for Android and iOS (the native JavaScript bundles compile), and the whole
  journey in the web preview (`scripts/web-preview.mjs`) with real clicks: join, a wrong address refused, sign in by
  code, the token registered, a message alert shown and tapped open on the right page, a voice room joined natively
  with Maya's audio arriving (inbound RTP bytes), hand raised, invited up, unmuted, minimised, left.
- Not built: no APK or iOS build. This PC has no Android SDK or JDK, `eas build --local` doesn't run on Windows, and
  cloud EAS builds need the publishing account. So the Kotlin voice service, push delivery through Expo's real
  service, and background audio on a locked phone are untested on a device.
- Nothing was uploaded to a store.

## Known limits
- In the web preview a wrong address that is a real site reads "couldn't reach" (the browser's CORS hides the answer);
  on a phone it reads "isn't a Commonhall community" (unit-tested).
- Faces in the native room load without the session cookie on iOS unless shared cookies carry over; initials show then.

## Since round 7 (20 Nov 2026)
The room screen has no Tell people (its routes are gone). The room page always sends `hasNotified: true`, which hides
Tell people in TestFlight 3 and the Android test APK; this build reads the flag and ignores it. Starting a room is one
tap on the portal's Rooms page: [room-start-instant NOTES](../room-start-instant/NOTES.md).

## Since round 8 (23 Nov 2026)
- The tab bar is native, with one web view per tab kept alive (ui-polish Part 7): how it works is in
  [../ui-polish/NOTES.md](../ui-polish/NOTES.md) ("Part 7"). It needs store build 5.
