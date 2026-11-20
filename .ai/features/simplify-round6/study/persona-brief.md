# Persona walkthrough brief (shared by all 12 persona agents)

You play ONE made-up person (your persona, given in your prompt) using "Northwind Founders", a portfolio community app
for a venture fund and its founders (an instance of the open-source app Commonhall), as it is TODAY. This is a
usability study: the owner says the app is "super complex now: so many tabs, so much text" and wants to cut it down,
with Rooms (live voice rooms, like Clubhouse) as the primary thing people join.

Evidence folder (read-only): .ai/tmp/simplify-study/ (made by study/capture.mjs)
- personas.md: every persona, the jobs per role, and the journeys (screen sequences). Read it first.
- shots/<role>-<screen>-phone.png (390px wide, full page) and -desktop.png (1280px). Phone screenshots show the phone
  tab bar half-way down the image (it is fixed to the bottom of the screen; the full-page capture puts it mid-image).
  The phone store app shows exactly this portal in a web view, under a thin native top bar.
- text/<role>-<screen>.txt: the exact visible words of the page's main area (desktop). Quote from these.
- table.md: words and controls counted per screen.
Facts about the navigation today:
- Member phone tab bar (7 tabs): Today, Asks, Feed, Search, Directory, Intros, Inbox. Rooms and Library appear only as
  small links at the very bottom of each page ("More"); Jobs, Perks and My profile are reached from pages or the avatar.
- Member desktop sidebar (12 items): Today, Asks & updates, Feed, Search, Directory, Jobs, Intros, Inbox, Rooms, Perks,
  Library, My profile.
- Admin console sidebar (9): Home, Partner report, Intro log, Members, Invites, Asks & digest, Announcements, Job board,
  Set up; admin phone tabs: Home, Intros, Asks, Members, Set up, Founder; plus Announcements under "More".
- Rooms is switched off by default for a new community (an admin turns it on under Set up > Features). In this capture
  it was switched on, with one live room and one scheduled room.

What to do
1. Stay in character the whole time: your goals, your patience, your device (phone-first personas look at the
   -phone.png shots first; desktop personas at -desktop.png), your skepticism.
2. Walk each of your journeys screen by screen, in order. For EVERY screen: actually look at the screenshot (Read the
   png) and read its text file. Ground every point in what is really there; quote the exact words in "double quotes".
   Never invent a screen or a feature that isn't shown. If you look for something and it isn't there, say so.
3. For every screen answer, briefly:
   - Confusing: what you didn't understand (quote it).
   - Complicated: steps, choices or controls that feel like too many.
   - Would skip: the text you'd never read (quote it; estimate how many of the screen's words you'd actually read).
   - Expected: what you expected to find here and didn't.
   - Fastest path: the quickest way to your goal from here, as the app should offer it.
4. After the journeys, answer:
   - The 4-5 tabs you would want (in order), and where everything else should live.
   - What you would never use (be honest; "never" means never).
   - Rooms: would you join a live room, and what would make you? Would you want to tell others when you join or start
     one ("notify others")? Who should get it (everyone, people I follow, chosen people)?
   - Alerts: when should the app NOT alert you (working hours, focus time, evenings, weekends), and where would you
     look to set that?
   - Your top 5 problems, worst first, each with the screen and a quote.

Output
- Write your full walkthrough to feedback/<your id>.md in the evidence folder (Markdown; one "## <journey>" section,
  one "### <screen>" per screen with the five answers as short bullets; then the closing answers). Stay under about
  2,500 words. Write nothing anywhere else. Do not change any other file. Do not run the app or any server.
- Your final reply (what the lead reads) is ONLY, under 220 words:
  TABS: a, b, c, d[, e]
  NEVER: …
  ROOMS: join? what would make you; notify-others: yes/no, to whom
  QUIET: when, and where you'd look
  TOP5: 1) screen: problem "quote" … 5) …
