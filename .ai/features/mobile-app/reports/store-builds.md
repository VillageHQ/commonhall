# Proof: store builds (19 Nov 2026)

Real output, read back from the services after the run.

- **iOS:** EAS build `25bc0f06-22e0-4511-adbe-02025cc260c2` (profile `testflight`, 1.0.0 build 1): FINISHED.
  EAS submission `ae6e8cba-5b7f-4898-beff-d5b805513035`: FINISHED.
  App Store Connect (API, app 6836913644): `BUILD ae691a78-… 1 VALID usesNonExemptEncryption=false`,
  `internalBuildState: IN_BETA_TESTING`, `externalBuildState: READY_FOR_BETA_SUBMISSION` (not submitted: internal only).
  Internal group "Absi" (all builds) with one tester.
- **Android:** EAS build `7010ea28-1e86-4603-83c3-5ceeb782fcd4` (profile `preview`): FINISHED, an APK:
  https://expo.dev/artifacts/eas/d3gsb6nnU0fFxXX_FT7G-OHRsUrxUK1TZ37zldXsGoM.apk
- **Push:** Expo project iOS credentials `64b1ac9c-…` carry push key `633797XK4M` (Production, `ai.commonhall.app` only).
- **Checks:** `npm run typecheck` clean, `npm test` 13/13, `public-repo` + `site-tour` tests 11/11.

Not covered: nobody has installed either build on a phone yet, so a real alert on a device, background audio with the
screen locked and the Android voice service still wait for the owner's phone test.

## Build 3 (20 Nov 2026, after the room hand-off)
- **iOS:** EAS build `e236a56b-62ff-4755-9ee8-1fc2884ca626` (profile `testflight`, 1.0.0 build 3): FINISHED.
  EAS submission `6b7c69b0-6127-495b-addb-e1cfc28cd458`. App Store Connect: build 3 `VALID usesNonExemptEncryption=false`,
  `internalBuildState: IN_BETA_TESTING`, `externalBuildState: READY_FOR_BETA_SUBMISSION` (not submitted: internal only);
  group "Absi" (internal, all builds).
- **Android:** EAS build `5ebc6c79-ba40-4eb6-84ac-948cc0aa70c2` (profile `preview`): FINISHED, an APK:
  https://expo.dev/artifacts/eas/TPMVdOB3W9OE8kQYqKYhyFkkqYrp3sfIIEnwjiLmI-I.apk
- **Web-preview check:** `build3/README.md`.

## Build 4 (21 Nov 2026, round 7: five tabs with Rooms first, shorter screens, one-tap room start, quiet times)
- **iOS:** EAS build `d83eb2b4-178d-458a-b4e7-ea446833bcb2` (profile `testflight`, 1.0.0 build 4): FINISHED.
  EAS submission `c490de1a-ed5b-4cf1-98e2-1f6ec3559c87`. App Store Connect: build 4 `VALID usesNonExemptEncryption=false`,
  `internalBuildState: IN_BETA_TESTING`, `externalBuildState: READY_FOR_BETA_SUBMISSION` (not submitted: internal only);
  group "Absi" (internal, all builds).
- **Android:** EAS build `7a097160-4a7a-4430-b3a6-e1a007ba0471` (profile `preview`): FINISHED, an APK:
  https://expo.dev/artifacts/eas/9G08Vr2xdQyetVwcG3AF1NVUgTKRwdFUmf_k_S0_xdU.apk
- **Web-preview check:** `build4/README.md`.

## Build 5 (23 Nov 2026, round 8: the app's own tab bar, the room sheet and mini player, the redesign)
- **Android:** EAS build `f616659d-3225-4253-9dae-0c57ba66bef2` (profile `preview`): FINISHED, an APK:
  https://expo.dev/artifacts/eas/tuqlmgxxHd7DoE4685hvbCMa74CHEu6c812PRvfRB0o.apk
- **iOS: not built.** `eas build -p ios --profile testflight` stopped before queueing: "This account has used its iOS
  builds from the Free plan this month, which will reset in 7 days (on Tue Dec 01 2026)." More builds need a paid Expo
  plan (the owner's call), or the build runs on 1 Dec. Nothing was submitted to TestFlight.
- **Web-preview check:** `build5/README.md`.

## Build 6 (23 Nov 2026, round 8 with its fix pass: tab preload, the softer slide; both built on the owner's Mac)
- **iOS:** built with `eas build -p ios --profile testflight --local` on the Mac (no Expo cloud), `CFBundleVersion` 6,
  signed "iPhone Distribution" by team `TA6D5Y2M2U` with "Commonhall App Store", `aps-environment` production,
  `get-task-allow` false. Uploaded with `xcrun altool`: "UPLOAD SUCCEEDED", delivery
  `bfc65db7-fa79-4a20-a719-fc8065445ce3`. Apple's API: build 6 `VALID`, `internalBuildState: IN_BETA_TESTING`,
  `externalBuildState: READY_FOR_BETA_SUBMISSION` (not submitted: internal only); the "Absi" group (internal, all builds)
  lists builds 6, 5, 4, 3, 2, 1.
- **Android:** built with `eas build -p android --profile preview --local` on the Mac: `commonhall-6.apk`, 125.6 MB,
  `versionCode` 6 (APK 5 is 1), all four CPU types, V2 signer certificate SHA-256 `1769cda1…dc5e`, the same as APK 5,
  so it installs over it. Not uploaded anywhere: the file is on the owner's PC
  (`C:/ai/code/.workspace/scratch/commonhall-store/commonhall-6.apk`) and in the Mac's build folder (`out/`).
- **The code:** main at `1e6f0b1e` (PR #132). Both JavaScript bundles hold `readBrand`, new in the fix pass.
- **Not re-checked:** no new web-preview run; the fix pass's own check is in `.ai/features/ui-polish/`.
