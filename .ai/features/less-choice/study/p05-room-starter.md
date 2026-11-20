# P05: the room starter (a founder who just closed a big deal, on a phone, in a hurry)

Demo http://localhost:9563, signed in as "member" (Sam Lee), phone width 390px. Screenshots are in `measure/shots/p5-*.png`.
Rooms I made: "What closed our biggest deal" (live, Everyone notified, ended by itself after about 2 minutes), "Limit test A/B" (invite only, used to reach the daily limit, both end by themselves) and "Deal debrief part 2" (scheduled Tue 24 Nov 18:00, Notify Everyone).

## Journey summary

| # | Journey | Screens | Taps | Fields typed | Decisions before the first value |
|---|---|---|---|---|---|
| 1 | Start now, everyone notified (first time) | 2 (Rooms with the form open, then the room) | 6: Rooms tab, Start or schedule a room, title, **Notify others switch**, **Everyone** (3rd of 3 segments), Start | 1 (title) | 5: title, When (Now/Schedule), Who can come in (Everyone/Invite only), Notify on/off, Who to notify (My followers/People I pick/Everyone). Notify is **off** the first time. When turned on, it picks **My followers**. Neither default is what the owner wants. |
| 1b | The same, second time | 2 | 3: Start or schedule a room, title, Start | 1 | 1 (title). The last choice is remembered. If you are at the limit, Notify is greyed out. |
| 2 | In the room | 1 | n/a: audio never connected (headless, expected). Stuck on "Joining…" | 0 | The host sees Leave, React, Chat and **Raise hand (greyed out)**. Mute and End room appear only after audio connects. Tell people is hidden because the start already notified. |
| 3 | Schedule for later | 1, and the form closes | 7: Start or schedule a room, title, Schedule segment, date and time picker (native, takes several taps), Notify state, audience, Schedule submit | 2 (title, Starts at) | 6. The room then shows only "Start now" to the host. Others see "Following" + "Remind me". |
| 4 | Receiver: control room alerts | 2 (Rooms → Alerts on → /me/alerts) | 2 taps to arrive. 1 more tap to turn off "People starting or joining rooms" | 0 | 13 top-level controls + 13 inside Custom + a 419-item time zone list + a 20-item mute list. Follow and Remind me are on other screens. |

Counts in the start form (journey 1). Each one I opened:
- Closed state: 1 field, 2 segment pairs (4 options), 1 switch, Start, Cancel = **8 controls**.
- Notify on, My followers: + a 3-option segment = **11 controls**. It asks nothing more. The room goes to the people who follow you, and as a new founder you may have zero followers. No count is shown.
- Notify on, People I pick: + a "Type a name" picker (up to 50 people). **Start is disabled until you pick someone.** On a 390px screen, Start falls under the bottom tab bar (p5-05), so you have to scroll. That makes **12+ controls**.
- Notify on, Everyone: 11 controls and nothing more to answer. Start works at once (p5-08).
- Invite only: + an "Invite" people picker (up to 50).
- Schedule: + a "Starts at" date and time field (`mm/dd/yyyy --:-- --`), and the submit button is relabelled "Schedule".
- At the daily limit (3 notifies in 24 h, shared by starts and "Tell people I'm here"): the switch is greyed out, the audience row disappears, and one line says "3 notifies a day. Back at 7:05 PM." (p5-21). Start still works, without notifying.

Room page controls, from what the code renders once connected (`src/modules/voice/components/live-room.tsx`):
- Bar for the host: Leave, React, Chat, Mute/Unmute, End room. Tell people shows too if the start did not notify.
- Bar for a listener: Leave, React, Chat, Raise hand, Tell people.
- React opens 6 emoji buttons. Chat opens a message box and Send.
- Tell people opens a people picker (**up to 10, picked one by one, no Everyone and no Followers**), with Send and Cancel. It can be used once per room and counts toward the 3 a day.
- Tap a person: up to 4 role actions (Invite to speak, Move to audience, Make co-host, Remove as co-host).
- A Raised hands panel with Invite to speak for each person.
- Invite more people: a picker, Invite and Cancel (invite-only rooms, host and co-hosts).
- The host has about 5 controls on the bar, plus about 4 per person, plus 3 panels.

## Findings

1. **Where:** /rooms › Start or schedule a room › "Notify others" switch.
   **What they faced:** a switch that is OFF the first time. Turning it on reveals 3 audiences, and the preselected one is "My followers".
   **Why it stalls this persona:** the founder wants every founder in the room. The default form starts a room that tells nobody. Even after finding the switch, it still tells only followers, who may be none. Nothing says how many people will hear. The persona believes they announced it and sits alone.
   **Harm:** 5.
   **Simpler default:** Start always notifies everyone. Remove the switch and the audience row.

2. **Where:** the start form overall.
   **What they faced:** 5 decisions and 8 to 12 controls before "Start": title, When ×2, Who can come in ×2, Notify on/off, Who to notify ×3, and a picker if People I pick.
   **Why it stalls this persona:** in a hurry on a phone, every row is a "wait, which?" moment. Value (a live room) is behind 6 taps for the right outcome.
   **Harm:** 4.
   **Simpler default:** a title and Start. Put Schedule behind a quiet "Later…" link. Invite only becomes a room setting the host can switch on inside the room.

3. **Where:** the start form, "Who can come in: Everyone | Invite only" and "Who to notify: … | Everyone".
   **What they faced:** the word "Everyone" twice, with two different meanings, 2 rows apart. "Schedule" also appears twice: the segment and the submit button.
   **Why it stalls this persona:** a quick scan reads "Everyone" as already selected for notifying. The first row's "Everyone" is already selected (white chip), so the founder thinks the notify is handled and taps Start with Notify off.
   **Harm:** 4.
   **Simpler default:** drop the access row from the start form. If it stays, label it "Open room / Invite only".

4. **Where:** the start form, Invite only + Notify Everyone.
   **What they faced:** no warning. An invite-only room quietly narrows "Everyone" to the invited. With 0 invitees it reaches nobody, yet it still uses 1 of the 3 daily notifies. I confirmed this: two invite-only rooms with no invitees took me to the limit.
   **Why it stalls this persona:** they burn their notifies with no result, then can't announce the real room.
   **Harm:** 3.
   **Simpler default:** don't count a notify that reaches 0 people. Or, with "Start always notifies", invite-only rooms notify their invitees.

5. **Where:** the daily limit line "3 notifies a day. Back at 7:05 PM." (seen at 7:08 PM).
   **What they faced:** a greyed switch and a time that has already passed today. It means 7:05 PM *tomorrow*. Before the limit, nothing shows how many are left.
   **Why it stalls this persona:** the biggest moment of the founder's week is the one room they can't announce. The line reads as a bug.
   **Harm:** 4.
   **Simpler default:** no sender cap when receivers control what they get (cap per receiver only). Or say "Back tomorrow at 7:05 PM" and show "2 left today" before the limit.

6. **Where:** a scheduled room with Notify on.
   **What they faced:** the notify goes out when the room starts. If the host is at the limit then, it is **silently skipped** (`service.ts` line 318). Nothing tells the host on the scheduled card or when the room starts.
   **Why it stalls this persona:** they scheduled the debrief "with everyone notified" and nobody comes.
   **Harm:** 3.
   **Simpler default:** a scheduled room always notifies at the start, outside the cap. Its followers and reminders are its audience.

7. **Where:** after Start, on the room page.
   **What they faced:** no confirmation that anyone was notified, and no count. The room page says "Joining…", then "Nobody on stage yet".
   **Why it stalls this persona:** they can't tell whether the announcement went out, so they reach for "Tell people", which is hidden because the start already used it.
   **Harm:** 3.
   **Simpler default:** one line on the room: "Everyone was told. 14 alerts sent."

8. **Where:** the room page bar › "Tell people" (Tell people I'm here).
   **What they faced:** a people picker for up to 10 names, picked one by one, then Send. It works once per room and is part of the same 3 a day. It is a third audience model, different from the start form's 3 options.
   **Why it stalls this persona:** a joiner who wants to pull others in has to type names.
   **Harm:** 2.
   **Simpler default:** one tap, "Tell everyone I'm here", with receivers filtering. Or remove it if Start already told everyone.

9. **Where:** the start form with People I pick, on a phone.
   **What they faced:** Start and Cancel go under the sticky bottom tab bar (p5-05). Start stays disabled until a name is picked, and no hint says why.
   **Why it stalls this persona:** they tap where Start should be and hit "Today" or "Asks" instead.
   **Harm:** 3.
   **Simpler default:** remove People I pick from Start. Otherwise keep Start above the tab bar.

10. **Where:** a scheduled room, host view (/rooms/<id> for "Deal debrief part 2").
    **What they faced:** the only control is "Start now". There is no edit, cancel, share, or change of time or audience.
    **Why it stalls this persona:** a wrong time or a wrong title is permanent. The only way out is to start it early.
    **Harm:** 2.
    **Simpler default:** a "Cancel room" link. Editing can wait.

11. **Where:** the scheduled room card for receivers: "🔔 Following" next to "Remind me".
    **What they faced:** two bell-like buttons with different scopes: the person (Follow) and this room (Remind me). On the room page only Remind me appears, and it changes to "Reminder on" with no time stated.
    **Why it stalls this persona:** a receiver has to understand two subscriptions to get "tell me when this starts".
    **Harm:** 2.
    **Simpler default:** keep Remind me only on scheduled rooms. Follow lives on profiles.

12. **Where:** /me/alerts (Rooms › "Alerts on").
    **What they faced:** about 13 top-level controls:
    - Pause: 1 hour, Until tomorrow.
    - Quiet times: Change time zone (a 419-item list), 4 presets (Working hours, Evenings, Weekends, Custom), and Custom has 12 more (From, To, All day, 7 days, Save, Cancel).
    - The "Let through intro asks and messages to me" switch.
    - 7 kind switches: All alerts, Intro asks, Messages, Answers, "Rooms you asked to be reminded of", "People starting or joining rooms", New in the library.
    - Muted people: a 20-item list and Mute.

    **Why it stalls a receiver:** to stop room alerts you must find 1 switch among 7 under the heading "From the portfolio". Turning it off also silences people you Follow, which the page doesn't say. You can't choose "only people I follow". You can't see or manage who you follow here.
    **Harm:** 3.
    **Simpler default:** one room question in 3 states: "Rooms: Everyone · People I follow · Off". Muted people stays. Quiet times keep their presets, and the time zone comes from the device.

13. **Where:** /rooms, the live room card for a room the viewer hosts, and cards without listeners' faces.
    **What they faced:** "1 in" with no host name or face. "Pricing your first enterprise deal" shows "Priya + 5", while the room page says "0 listening" because it isn't connected.
    **Why it stalls this persona:** receivers can't see who started a room on the card, which is the main reason to join.
    **Harm:** 2.
    **Simpler default:** always show the host's face and name on the card.

## Room alert controls today (sending and receiving), and what to cut if "Start" always notifies everyone

Sending:
1. "Notify others" switch on Start: **remove**. Start always notifies.
2. "Who to notify" segment (My followers / People I pick / Everyone): **remove**.
3. "Who to notify" people picker (up to 50): **remove**.
4. The remembered last choice ("off included"): **remove** (nothing left to remember).
5. The 3-a-day sender cap and its line "3 notifies a day. Back at …": **remove**, or make it a quiet server-side spam guard. The receiver's cap of 5 a day already protects people.
6. "Tell people I'm here" on the room bar, with its 10-person picker, Send and Cancel: **remove**, or make it one tap with no picker.
7. The scheduled room's stored notify audience: **remove**. It notifies everyone when it starts.
8. "Invite only" and "Invite more people": keep, but move them into the room. Invite-only rooms notify their invitees.

Receiving:
9. Follow / Following on room cards and profiles: keep as the input for "People I follow". Drop it from scheduled cards.
10. Remind me / Reminder on for a scheduled room: **keep**.
11. /me/alerts "People starting or joining rooms" switch: **replace** with the one 3-state "Rooms: Everyone / People I follow / Off".
12. /me/alerts "Rooms you asked to be reminded of" switch: fold it into the same row. Off means off.
13. "All alerts" master switch: keep.
14. Pause (1 hour, Until tomorrow): keep.
15. Quiet times: 4 presets, Custom (12 controls), time zone (419 items), "Let through…" switch. Keep the presets. Hide Custom and the time zone behind "More".
16. Muted people (a 20-item list and Mute): keep. This is the receiver's control over a noisy starter.
17. The hidden receiver cap (5 room alerts a day) and once per room: keep, invisible.

The net change: about 8 sending controls removed. Receiving goes from 2 kind switches, Follow, Remind me and Mute to 1 three-state row, Follow, Remind me and Mute.

## Visibly broken (separately)

- **Audio never connects in headless** (expected): the room stays on "Joining <title>…", "On stage" is empty, and it says "0 listening". It never moved to a failed state in 12+ s, and never showed "Nobody on stage yet". The host sees **"Raise hand" (greyed out)** and no Mute or End room, so the creator can't end their own room until audio connects. With no audio, the rooms ended by themselves after about 2 minutes.
- **The scheduled room didn't appear** in "Coming up" after Schedule (the form closed and the list was unchanged 2.5 s later). It appeared only after a full reload (p5-14 vs p5-15).
- **"Back at 7:05 PM"** shown at 7:08 PM means tomorrow, but reads as the past.
- **A notify that reaches nobody still counts** toward the 3-a-day (invite only, no invitees, Everyone).
- **Start goes under the bottom tab bar** when "People I pick" is open (390px, p5-05).
- **Live card: wrong count.** "Priya + 5" on the card while the room page says "0 listening" (it may only be the unconnected state).
- The shared "member" account's alert state changed under me ("Alerts on" ↔ "Quiet until tomorrow 08:00") because of other concurrent testers. This is a demo artefact, not the app.
- The control counter reports a second switch named "on" in the start form and the alerts page. It is likely the Switch's hidden input and isn't visible to a person, so I didn't count it.
