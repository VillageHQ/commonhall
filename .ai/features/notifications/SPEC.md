---
id: notifications
status: specced
waits-on: []
size: half a day
touches: ["src/platform/notifications/", "src/app/", "public/", "src/shell/", "drizzle/"]
---
# Spec: Alerts on the phone and the installable web app

**Approved:** 19 Nov 2026 by the owner (decision page "Commonhall: AI library, phone app, voice rooms": a full store app,
and the browser app installs and receives alerts too).

## Problem
Founders live on their phone and open the portal rarely. Commonhall sends email only: no alerts, no app on the home screen.
Voice rooms and "I'm available" broadcasts need instant alerts.

## Core user journey
1. A member opens the portal on a phone and is offered "Add Commonhall to your home screen" (on iPhone: the Share → Add to
   Home Screen steps); the installed app carries the fund's name and logo.
2. They turn on alerts once; the browser asks for permission.
3. They choose in Settings › Alerts what alerts them (intro asks, answers, messages, voice rooms, "I'm available"
   broadcasts) and their quiet hours (from–to, days, their time zone), and can mute broadcasts from chosen people.
4. An event happens; they get an alert that opens the right page. During quiet hours nothing alerts them. **Goal.**

## Scope
In: web app manifest and icons from the fund's branding, a service worker (offline page, push), Web Push with VAPID keys
generated per server and stored in settings, a device table for web push subscriptions AND native push tokens (Expo push
tokens from the store app, part mobile-app), a `notify()` service used by every module, per-kind preferences, quiet hours,
per-person broadcast mutes, a test-alert button, an install card on Today. Out: SMS, email digests changes.

## Contract other parts use (keep these names)
- `notify({ userIds, kind, title, body, url, fromUserId? })` in `src/platform/notifications/`: sends to every device of each
  user unless their preferences, quiet hours or a mute of `fromUserId` say no; returns counts sent and skipped.
- Kinds: `intro`, `answer`, `message`, `voice_room`, `voice_broadcast`, `library`.
- Device registration: `POST /api/notifications/devices` with `{ type: "webpush" | "expo", subscription | token }`.

## Acceptance criteria
1. On Android Chrome and desktop Chrome the app installs and a test alert arrives; on iPhone the install steps show, and
   after install a test alert arrives (checked in a simulator or documented if no device).
2. Quiet hours: an alert during a member's quiet hours (their time zone) is skipped and counted as skipped.
3. A muted person's broadcasts never reach the member who muted them; other kinds still do.
4. A dead subscription (410 from the push service) is removed.
5. Each server makes its own VAPID keys on first start; no central service.
6. Unwanted path: a member who turns alerts off gets none, and the app never asks for permission again unless they press
   the button.

## Verification contract
Unit tests for preferences and quiet hours (time zones); integration test for notify() with a fake push endpoint; a
separate agent installs the app in Chromium, subscribes, sends a test alert, sets quiet hours and a mute.

## Depends on / check-ins
- voice-sessions · needs: `notify()` and kinds `voice_room`, `voice_broadcast` · owner: notifications · check in: keep the
  contract above; tell the orchestrator before changing it.
- mobile-app · needs: device registration with `type: "expo"` · owner: notifications.

## Open questions
None.
