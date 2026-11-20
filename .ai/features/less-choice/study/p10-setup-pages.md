# P10: Set up pages, a second portfolio manager (admin) inheriting a community

Demo at http://localhost:9563, signed in as "admin" (Maya Ortiz). Laptop, 1280px wide. Screenshots are `measure/shots/p10-01..25.png`.
State at the end: Perks and Library are back ON, and the weekly email schedule is back to Thursday 09:00 UTC (the starting value).

## 1. Set up pages and their controls

| Page (path) | Controls by type | Total | Sub-pages / disclosures |
|---|---|---|---|
| Set up, default view (`/admin/settings`) | 4 fields (Community name, Brand colour hex, Asks per member, Days after an intro), 1 file upload, 1 colour picker, 7 colour swatches, 3 Save buttons ("Save settings", "Save", "Save"), 2 rows (Mail, Features), 1 "Advanced" disclosure | 19 | 2 rows + Advanced |
| Set up, Advanced open | adds 8 fields (Logo URL, Short descriptor, From name, Sending domain, Region, Data-protection contact, Who handles data requests, Managed date), 3 selects (Hosted by, Who can message a member, Your plan), a 4th Save button (a second "Save settings" for the same form), 11 rows (Rooms server, Village, Slack and Discord, Perks, Job board, Mail log, Audit log, Flagged, Guided start, Village settings, update guide) | 19 + 23 = **42** | 11 more rows |
| Features (`/admin/features`) | 10 switches, 10 "About X" info buttons, a confirm dialog when switching off | 20 (+1 dialog per switch-off) | none |
| Mail (`/admin/mail`) | 2 buttons (Send a test to me, Check DNS now) · Advanced: 2 fields (DKIM selector, Reply subdomain), 1 Save, the do-not-send list, the sending log | 5 + 1 disclosure | Advanced (also the "Mail log" target) |
| Rooms server (`/admin/rooms`) | none (read-only), 1 "Ports to open" disclosure, 1 link | 1 | none |
| Village (`/admin/village`) | 3 buttons (Replace the keys, Test the connection, Nudge 7 members) · Advanced: 6 fields, 3 switches (2 locked "always on"), 3 selects (1 disabled), 3 radio choices plus a date, 2 Save buttons, 1 "Fill in profiles now" button | **21** | Advanced |
| Slack and Discord (row) | goes to `/admin/features` while chat is off, so no page of its own | 0 | none (dead end) |
| Perks (`/admin/perks`) | 1 textarea (BuiltFirst embed code), 1 switch (Show Perks to members), 1 Save | 3 | none |
| Job board (`/admin/jobs`) | 1 switch (Public job board), 1 Save, 2 copy fields + Copy, 3× Pull now, 3× Hide, an embed section | 11+ | none |
| Mail log (row) | opens `/admin/mail`, the same page as the Mail row | n/a | duplicate |
| Audit log (`/admin/audit`) | none (read-only list, no filter) | 0 | none |
| Flagged (`/admin/reports`) | 2 tabs (Open, Handled) | 2 | none |
| Guided start (`/admin/start`) | 3 steps; buttons: Skip the guided start, Replace the keys, Next, Skip for now | 4 | 3 steps |
| *Weekly email (not linked from Set up)*: Announce › Announcements tab › "Change the schedule" | 1 switch, Day select (7), Hour select (24), Time zone text field with a hidden list (~400 zones), Save, "Preview for anyone" | 6 | the Weekly email tab (`/admin/digest`): member select (21), Send me a test |

Altogether the persona sees **about 130 controls across 13 places**. **6 places to edit mail settings**: the Mail row, Advanced › Mail, Mail › Advanced › DNS settings, the Mail log row, Village's "service email", and Plan.

## 2. Journeys

**Task 2: switch off Library and Perks, and send the weekly email on Monday morning.**
- Library and Perks: Set up → Features → Perks switch → confirm "Turn off Perks" → Library switch → confirm "Turn off Library". **6 clicks, 2 confirm dialogs.** Neither row says what the feature does until you open its "i".
- Weekly email: Set up shows no weekly email row. Opened Advanced: none there either. Home: none. Announce → "Weekly email" tab: preview only, no schedule. Back to the "Announcements" tab → the "Change the schedule" disclosure → Day (7) → Hour (24) → Time zone (typed "Berlin", rejected with "Pick a time zone from the list" but no list is visible; retyped "Europe/Berlin") → Save → "Saved.", and the card reads "Next: Monday 23 Nov, 08:00 (Europe/Berlin)".
  **About 12 actions, 4 dead ends (Set up, Advanced, Home, the Weekly email tab), 3 decisions (day, hour from 24, zone from a hidden list of about 400), 1 error.**
- Whole task: **about 18 actions, 5 decisions, 4 dead ends.**

**Task 3: see what founders get in the weekly email.** Announce → "Preview for anyone" (or the Weekly email tab) → pick from Member (21 options).
**3 actions, 1 decision.** The preview opens on the admin herself ("Maya, that's everything this week. Nothing needs you"), not a founder. The 21 names show no role, so the persona has to guess who is a founder. "A made-up member" (the useful sample: 1 ask plus 1 intro) is the last option.

**Task 4: is it clear what is left to set up?** The sidebar showed a badge "1" on **Set up**. Nothing on the Set up page explains it (default view). The code (`src/shell/navigation-badges.ts`) adds up setup steps + members waiting + open flags + Village credits. Here the 1 was an open flag, listed only as "Flagged · 1 open" inside **Advanced ("For engineers")**, which is collapsed. It disappeared when another tester handled the flag. Home's "Needs you" shows 3 items and no checklist, because the launch checklist exists only before the first launch. Row statuses on Set up use 7 different words: Done, 9 on, optional, on, always on, none open, 1 open.
**Not clear: 0 places say "here is what's left".**

## 3. Findings

| # | Where (path + control) | What they faced (count) | Why it stalls this persona | Harm | Simpler default |
|---|---|---|---|---|---|
| 1 | Weekly email schedule: `/admin/announcements` › "Change the schedule" (closed) | Not on Set up (0 links). The "Weekly email" tab has no schedule. Getting there took 4 dead ends. | "Tidy the configuration" means Set up. The weekly email is the main recurring thing members get, and it sits under Announce, inside the wrong tab, behind a disclosure. | 4 | A "Weekly email · Thu 09:00" row on Set up that opens the Weekly email tab, with the schedule on it |
| 2 | `/admin/announcements` › Time zone field | Free text, defaults to UTC, a hidden list of ~400 zones; "Berlin" rejected; the error mentions a list nobody can see | Has to know IANA names ("Europe/Berlin") to say "Monday morning" | 3 | Fill in the browser's own zone; offer a short select of common zones |
| 3 | Sidebar "Set up" badge | Badge 1 = an open flag, shown only under Advanced ("For engineers") › Flagged; the Set up page explains nothing | The badge sends the persona to the wrong page, and the item is under a section labelled for engineers | 4 | Set up's badge counts only setup steps; flags go on Home and Flagged |
| 4 | `/admin/settings` › Advanced, "For engineers" | 11 rows + 8 fields + 3 selects behind one disclosure, including non-engineer choices: Who can message a member, Data-protection contact, Short descriptor, From name, Perks, Job board, Flagged, Audit log | The persona has to open "engineer" settings to see half the configuration | 4 | Keep only Sending domain, Hosting, Plan and keys under Advanced; list every feature page as a visible row |
| 5 | Two switches for Perks: Features › Perks and `/admin/perks` › "Show Perks to members" | 2 switches for 1 outcome. With the feature off, the page switch still reads ON and Status says "members don't see Perks" | Can't tell which switch counts, or whether Perks is off | 3 | One switch (Features); the Perks page holds only the embed code |
| 6 | Features › 10 switches | No description until you open the "i" (10 more buttons). The names don't match the member menu: Inbox = Messages + Intros; People isn't listed; Network vs Village | To keep "Inbox" on, the persona has to work out that it is two switches | 3 | Show a one-line description under each switch, grouped by menu item ("Inbox: messages, intros") |
| 7 | Mail settings spread over 6 places | Mail row; Advanced › From name, Sending domain; Mail › Advanced › DKIM, Reply subdomain; the Mail log row (the same page as Mail); Village service email; Plan | Has to visit 3 pages to answer "who do our emails come from" | 3 | Put every mail field on the Mail page; drop the Mail log row |
| 8 | Save buttons, Set up | 4 Saves on one page: 2 identical "Save settings" for one form, plus 2 per-field "Save". Village has 2, and Mail, Perks, Job board and schedule have 1 each | Unclear which Save covers which field, and whether a Save in one card saves the others | 3 | Save each change on its own, or one sticky Save per page |
| 9 | Branding › Logo file + Advanced › Logo URL; Brand colour | 2 ways to set the logo. The colour (Ink chosen) doesn't change the teal logo tile in the preview | The colour choice seems to do nothing; the two logo inputs may fight | 2 | One logo upload; the preview shows the colour on a button, not on the logo |
| 10 | Advanced › Plan select + "Village sets up mail and the network by" (date) | 3 plan options + 1 date; the hint says they set "the words on the launch checklist" | The community has already launched, so there is no checklist: the setting has no visible effect, and the date shows even on self-host | 2 | Hide Plan after the first launch; show the date only for Managed |
| 11 | Weekly email preview (`/admin/digest`) | Opens on the admin ("Nothing needs you"); the member select has 21 names with no role; the sample is the last option | Has to guess which name is a founder to "see what founders get" | 2 | Open the preview on a founder who has items, or on the made-up sample |
| 12 | Village page (`/admin/village`) | 21 controls, including 2 locked "always on" switches and 1 disabled select | Spends time on controls that can't be changed | 2 | Show the locked ones as plain text |
| 13 | Set up › "Slack and Discord · optional" | Opens Features, not a chat setup page | Dead end: the persona expects chat settings | 2 | The row opens the chat page, with its on/off switch there |
| 14 | Announce › "Sent · Nothing sent yet", right under the Weekly email card | The mail log shows 4 `weekly_email` sent today | Reads as "the weekly email never went out" | 2 | Head it "Announcements sent", or show the last weekly send in the card |
| 15 | Set up › Guided start · optional | Restarts at "Step 1 of 3, Connect Village" when every step is done; 2 skip controls ("Skip the guided start", "Skip for now") | Not sure whether something is still unfinished | 1 | Hide the row once the steps are done |
| 16 | Naming | "Weekly email" (tab, card) vs "Stop the weekly digest" (the email's button) vs `/admin/digest` | Not sure whether these are one thing or two | 1 | Say "weekly email" everywhere |

## 4. Visibly broken things

1. **Mail says "Done" on Set up**, but `/admin/mail` says "1 mail check needs you" and "Inbound replies webhook: not set". The webhook line also appears twice on that page.
2. **The Perks page switch "Show Perks to members" stays ON** after Features › Perks is off, while its Status reads "Not yet: members don't see Perks" (p10-18).
3. **The Perks row on Set up reads "optional"** whether Perks is on or off, so it never shows the state. The Features row did update (9 on → 7 on).
4. **The time zone error "Pick a time zone from the list."** shows with no list visible: it is a datalist that appears only while typing, and "Berlin" is not accepted.
5. **The confirm dialog's dark backdrop stops about 34px short** at the bottom of the window (it is shifted down by the demo banner) (p10-15, p10-16).
6. **The brand colour preview doesn't change**: the logo tile stays teal with "Ink #111110" chosen (p10-01), because the Logo URL image overrides it, so the colour looks broken.
7. Turning a feature off: the dialog repeats the same reassurance twice ("Nothing is deleted, and it all comes back…" and "…kept, and come back when you turn this on again"). Turning one on has no dialog.
8. A note for the testers' tool: on Features, a lookup by the label "Perks" or "Library" finds the "About Perks" info button before the switch. A scripted `check` opens the info popover instead of switching, so the switch was reached by keyboard (Tab, Space).
