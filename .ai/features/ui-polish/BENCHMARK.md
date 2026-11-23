# Benchmark: Commonhall today vs the apps people already use (23 Nov 2026)

**How it was done.** Main as of 23 Nov 2026 (rounds 6 and 7 merged) ran on a throwaway local copy in demo mode with
made-up people, as a production build. Pictures were taken as Sam (member) and Maya (admin) at three sizes: 390 px
inside the store app's web preview (`mobile/scripts/web-preview.mjs`), 390 px in a plain phone browser, and 1280 px
on the web. Sizes were read with `getBoundingClientRect` and `getComputedStyle`. The references are 75 iOS and web
screens from Mobbin, picked per area, with iOS apps first. Their sizes were read off 2x renders of a 393 pt wide phone,
to about ±1–2 pt. Mobbin's pictures are not ours, so they are never in this repo: they stay in the git-ignored
`.ai/tmp/ui-benchmark/mobbin/` and the round's scratch folder, and are described here in words only. 14 key pictures of
our own screens (made-up demo people) are in [reports/](reports/) as `before-*.png`.

In the measurements, 1 px of ours equals 1 pt of an iPhone's. The demo banner (52 px on a phone) shows only in demo mode,
so it is left out of every comparison.

---

## 1. Tab bar and switching tabs

**Ours.** This is the site's own bar, and the store app shows it inside its web view. It is 64 px high with a
1 px top border. Its icons are 22 px Lucide line icons, and its labels are 11 px/500. The active tab is darker, with a
2×34 px line on the top edge; the icon stays the same (no filled version) and the label keeps its weight. The bar's height
*includes* `env(safe-area-inset-bottom)`. On an iPhone with a home indicator (34 px), the room for the icon and label shrinks
to 29 px for 39 px of content, so the **icons start 0 px under the top border** and the badge and live dot sit on the icons.
In a desktop browser, where the inset is 0, the gap is 12 px.
The Inbox badge sits at 7 px from the top and +6 px from the centre; the Rooms dot at 10 px and +8 px.
Switching tabs is a client-side move with no reload and no white flash. At about 16 ms, an outline of the next page
replaces the content. At about 107 ms (on localhost), the real page replaces the outline in a single frame. Nothing
fades or slides. The rows in the outline are 65 px apart and the real ones 72 or 104 px, so **the content jumps** when the
page lands. Each tab opens scrolled to the top.

**References.**
- *Airbnb:* the bar is 91 pt including the 34 pt home zone, so 57 pt are visible. A hairline sits on top, and the 24 pt
  outline icons start **8.5 pt** under it. 11 pt labels sit 5.5 pt below the icons. The active tab has a brand-coloured
  icon and label. Badges are 8 pt dots at the icon's top right.
- *Instagram:* the bar is 83 pt with icons only. The 24 pt icons start **12.5 pt** under the hairline. The active icon is filled.
- *Facebook:* a 3 pt brand line sits on the top edge above the active tab. The 24 pt icons start 11 pt under the top, and
  the labels are 10 pt semibold.
- *LinkedIn:* a 2 pt black line on the top edge above the active tab. The icons start about 4 pt under the top (the
  tightest of the set), and the 12 pt labels sit 8.5 pt below the icons.
- *X, Threads:* icons only, 9–12 pt under the top edge.
- *Slack, Telegram, Linear (iOS 26):* a floating glass capsule 56–64 pt high, inset about 20 pt from the sides. The
  active tab sits on a grey pill, and search is a separate round button.
- Motion: in every flow, switching tabs is instant. A pushed screen (a thread, Messages from LinkedIn's home) hides the
  bar, and a sheet (a room, a composer) covers it.

**What differs.**
1. The inset is taken out of our 64 px instead of being added to it. Every reference adds the 34 pt home zone to a
   49–57 pt visible bar.
2. The icons need 8–12 pt above them. We have 0 px on a real iPhone.
3. Our active state is weak: the icon is not filled, and the line is thin and only 2 px.
4. Our badge and dot positions differ from each other.
5. The twitch comes from the outline and the page having different layouts. The references avoid it by keeping each
   tab's screen alive (they are native). The owner asked for a slide, which no reference shows for tab switches, so the
   spec adds a short slide and removes the jump (see the forks in SPEC.md).

## 2. Footer inside the app

**Ours.** Every member page ends with "Source code (AGPL-3.0)": 12 px, underlined, under a rule. On short pages it shows
above the fold: at y≈741 on Rooms and y≈539 on Inbox. Today also ends with a "More for you · Jobs · Perks · Library" row.

**References.** No phone app has a page footer. Legal and about links live in a settings or profile list: Airbnb's
Profile tab ends in settings rows of 56 pt, and LinkedIn and Instagram open settings from an icon.

**What differs.** The licence link is the last thing on every app screen. The AGPL still asks us to offer the source,
so it moves to the menu (see SPEC.md).

## 3. Inbox

**Ours (390 px).** A 28 px serif title "Inbox", then chips All / Intros (34 px, radius 6). Then a section header
"Waiting on you" with one intro row, and a section header "Messages" with one message row, then the footer. Below that,
300 px of empty paper.
- Both rows are 64 px with a 36 px avatar, but they are built differently. The intro row has a **16 px** title, cut off at
  216 px ("Marcus Webb asks you for a…"), the date **13 px under** the title, and an "Answer" pill on the right. The
  message row has a **15.5 px** name, a 13 px preview, and the date **12 px on the right**.
- **Nothing marks an unread row**, even though the tab badge says 1. The preview doesn't say when the last line was
  yours.
- Thread: an in-page "‹ Inbox" link, a 22 px name, a 13 px note about email replies, then bubbles. Theirs are white with
  a border, mine grey, radius 12, at most 299 px wide, with meta lines of 11.5 px. The composer card sits *inline after the
  last message*: a 40 px box beside a 32 px Send, so their bottoms differ by **8 px**. A long thread scrolls the composer away.
  The tab bar stays in the thread, and the header has no avatar or link to the person.
- Web: one 926 px column. The first bubble stretches to 796 px. There is no list-and-thread view.

**References.**
- *Airbnb list:* a 32 pt bold title, 40 pt pill chips (the active one filled black), and round 40 pt search and settings
  buttons. Each row has a 56 pt picture with a 40 pt avatar over it, the name at 16 pt (dark when unread, grey when read)
  and the time at 13 pt on the right, a 16 pt preview, a status line with a 6 pt red dot, and an **outlined action
  button right in the row** ("Complete booking", 34 pt). No separators.
- *LinkedIn list:* 75 pt rows with a 48 pt avatar and the text at x72. The name is 17 pt (bold when unread) with the date
  at 12.5 pt on the right. The preview is 15 pt grey on 2 lines. An unread row has a blue count badge, and a hairline
  separator starts at the text.
- *Instagram list:* 72 pt rows with a 56 pt avatar. Unread rows have a bold name and preview and an 8 pt dot. A 44 pt pill
  search field sits above the list.
- *Telegram list:* 76 pt rows with a 60 pt avatar, a 16 pt name, a 15 pt preview on up to 2 lines, and the time at 14 pt
  on the right.
- *Threads (Airbnb, WhatsApp, Instagram, Telegram):* a header with a back chevron, a 36–40 pt avatar, the name at 16–17 pt
  semibold and a grey 12–13 pt subtitle. Bubbles have a radius of 18–22 pt with 16–17 pt text, sit 4 pt apart in a group,
  and take at most about 75% of the width. Outgoing bubbles are dark or in the brand colour; incoming ones are light.
  Days show as centred 13 pt pills. The composer is **pinned to the bottom**: a 36–44 pt pill input with Send on the right
  that only enables once there is text. A new thread opens with a short intro about the person (Instagram: a 92 pt avatar
  and "View profile").
- *Web (LinkedIn, Airbnb):* the list pane is 328–420 pt and the thread fills the rest. The selected row is tinted, and
  LinkedIn adds a 3 pt brand bar on its left. Airbnb adds a third pane with the booking's details, which fits an intro
  request well.

**What differs.**
1. Our two row types disagree in title size, date size and date place. Every reference uses one row shape.
2. We mark no unread rows. Every reference shows unread with a bold name and a dot or count.
3. Our avatars are 36 px; the references use 48–60 pt.
4. Our thread composer is inline and its two controls differ by 8 px. The references pin one pill input with Send to the
   bottom.
5. Our thread keeps the tab bar and has no person header. The references hide the bar and show who you are talking to.
6. On the web we have one column. The references use a list pane beside the thread pane.
7. There is a footer and 300 px of nothing.

## 4. Posting an ask (the composer)

**Ours (390 px).** A card holds a **140 px** text box beside a **40 px** "Post" button pinned to its top corner, which
leaves **100 px** of empty space under the button. Typing makes the card grow from 170 to **265 px**, adding "Post a win
instead", a "Name who you're trying to reach" summary and a quota line. Opening the summary adds two 44 px fields and
makes the card **427 px**, with Post still at the top, above the fields it sends. One screen uses 6 control heights
(140, 52, 44, 40, 34, 26), corner radii of 6 and 10, and font sizes of 13 to 16 px. The text box is 15 px, so iOS zooms
in when it gets focus (it does that below 16 px).

**References.**
- *LinkedIn:* a full-screen composer with the keyboard up at once. The top row has an X, a 32 pt avatar, an "Anyone ▾"
  audience line and a **Post pill of 58×32 pt** on the right, grey until there is text. The text area has **no border**;
  the whole screen is the box, with a 17 pt placeholder "What do you want to talk about?". A 40 pt row of 24 pt icons sits
  right above the keyboard.
- *X:* full screen, Cancel on the left and a Post pill of 61×32 pt on the right (50% opacity when empty). A 32 pt avatar
  with the 17 pt text beside it. Above the keyboard: "Everyone can reply", then a 48 pt bar of icons.
- *Threads:* a sheet with a 12 pt top radius: Cancel, a centred "New thread" title, a 36 pt avatar with a 15 pt
  placeholder, and a bar above the keyboard with "Anyone can reply" and a blue "Post" text button.
- *Facebook:* full screen with an X and the centred title "New post", the author row, a row of 32 pt outlined chips
  (People, Location, Feeling) and a borderless 17 pt text area. A bottom bar holds the icons and "Next" (84×36 pt).
- *How you get there:* Facebook's feed starts with a **64 pt prompt row** (a 40 pt avatar and "What's on your mind?").
  LinkedIn on the web shows a "Start a post" pill of 48 pt that opens a centred dialog.

**What differs.**
1. We show a box and a button side by side with different heights. The references show one borderless text area, with
   Post at the top right (phone) or the bottom right (web dialog).
2. Our extras appear under the text while you type and push the page down. The references keep extras on one quiet line
   or in a toolbar above the keyboard, so nothing jumps.
3. We have no "prompt row" entry. Every reference starts from a one-line prompt that opens the composer.
4. Our text is 15 px; the references use 17 pt.

## 5. People search

**Ours (390 px).** A **52 px** search box (radius 10, with a drop shadow) beside a **40 px** "Filter" button (radius 6,
flat), 8 px apart. That is 12 px of height and 4 px of radius between them. The clear "✕" is the browser's default blue,
the only blue on the page. Rows are 72 px (104 px with pills) with a **36 px** avatar, a 17 px serif name and a 14 px
line with a 16 px company logo. A row without a logo starts its second line 21 px further left than its neighbours.
Typing filters as you type. On the web the box is 821 px beside the same 40 px button.

**References.**
- *LinkedIn:* the field is a 32 pt pill. Results get a row of **31 pt scope chips** under the field. A person row has a
  48 pt avatar, the name at 16 pt semibold, a 14 pt headline, the place in grey, and one outlined action pill of 32 pt. On
  the web the filters are 36 pt pills ("People ▾", "Locations ▾", "All filters").
- *Instagram:* a 36 pt filled field with radius 10. "Cancel" shows while it has focus, and the clear button is a grey
  circle inside the field. Results have text tabs with an underline. Rows are 58 pt with a 52 pt avatar and no buttons.
- *Airbnb:* filters open in a sheet that ends with "Clear all" and a 48 pt Search button. The results have a 32 pt
  filter-chip row.
- *Telegram:* a 44 pt pill field.

**What differs.**
1. The references put every control on the search row at one height (32–44 pt), with no shadow on the field.
2. Their clear button is drawn by the app, not the browser.
3. Their avatars are 48–56 pt; ours are 36 px.
4. Their rows line up even without a logo.

## 6. Today (home)

**Ours (390 px, under the 56 px bar).** A 13 px date, a 28 px greeting ("Sam, 2 things wait for you"), a 32 px "+ Post an
ask" button, then "Waiting on you" (22 px) with two cards, a LIVE NOW card in a tinted fill, and "You could help" (cut by
the tab bar). Only **about 2.5 cards fit above the fold**. Buttons on neighbouring cards come in **32 px/14 px** (Answer,
Read, Post an ask) and **40 px/15 px** (Join, I can help, Not for me). The page ends with a link row and the footer. On the
web the column is capped at 720 px on a 1006 px page, with Asks also at 720 and the other tabs at 926.

**References.**
- *Airbnb host app "Today":* centred 40 pt segmented pills, then one clear message or a list. Its home uses titled
  sections (22 pt semibold) over carousels.
- *Slack Home:* a row of 100×88 pt shortcut cards (Catch up, Huddles, Later), then sections of 44 pt rows.
- *Linear Inbox:* a 24 pt title on the same row as the actions. Rows are 85 pt with a 40 pt avatar, a small type badge on
  the avatar and an 8 pt unread dot. No separators.
- *Facebook / LinkedIn:* a single 44 pt header, then a **prompt row** to post, then the items. Modules have a 16 pt title
  and an X to dismiss. Every action in a list uses one button size (LinkedIn's outlined "+ Follow" pills are 32 pt).

**What differs.**
1. We use two button sizes on one screen. The references use one per list.
2. Our cards are tall (97–196 px), so little fits. The references use compact 72–85 pt rows for "things to do" and keep
   cards for rich items.
3. Our "Post an ask" is a small button. The references use a full-width prompt row.
4. Our page widths differ from tab to tab on the web.

## 7. Rooms: the list, the live room, the mini player

**Ours.**
- *List (390 px):* a "Rooms" title, a full-width "Start a room" (40 px), a line with "Schedule for later", a bordered
  row with a 44×26 switch ("Room alerts on") and "Quiet times", then "Live now" cards. A card has a pulsing dot, a 19 px
  serif title, 4 faces with "Priya + 4", and a **32 px** Join. "Coming up" cards have a 32 px "Remind me". Then the footer.
- *Live room in the app (native):* "↓ Minimise" as a text arrow on the left, and a "● Live" pill with a **green** dot on
  the right (the site's live colour is rust). The title is set in **Georgia** 26 px, while the site uses Newsreader.
  Below it: "ON STAGE / Nobody on stage yet", then "1 LISTENING" with 48 px faces. The controls are Leave / React /
  Raise hand: 48 px circles drawn with **emoji** (✌ ☺ ✋), **bunched on the left** at the bottom, while the site uses line
  icons. The middle of the screen, about 400 px, is empty. The app's room has no Chat button; the web room has one.
- *Mini player:* a **42 px** ink bar *below* the site's tab bar, showing a green dot, the title and "Listening". It has
  **no controls** (no mute, no leave). A tap anywhere opens the room again.
- *Web room page:* the four controls (44 px circles with line icons) sit in a white card after the list of listeners,
  left-aligned (252 px used of 348 px; 270 of 926 on the web).

**References.**
- *Clubhouse hallway (the list):* full-width cards, 124 pt high with a 24 pt radius in a warm fill, 8 pt apart. Each card
  has the club line (16 pt icon and a 15 pt grey name), a **17 pt heavy title on up to 2 lines**, and on the right a cluster
  of 3–5 faces (48 pt main, 32 pt others) with a "+46" count. Start a room is a 76 pt round "+" button centred above the
  tab bar.
- *X Spaces live room:* a **sheet** over the app (top radius 24, a grabber, with the screen behind dimmed). The top row has
  a **chevron-down on the left** to minimise, and share, "…" and a red "End" (host) on the right. The title is 20 pt heavy
  with the topics at 15 pt grey. Then a **grid of 4 columns of 64 pt round faces**, each with the name at 14 pt bold and a
  role line at 13 pt ("Host" with a sound-bars glyph, "● Requested", "Listener", "Speaker"). The **bottom bar** is about
  110 pt: a **big 52 pt round mic button on the left with a caption** ("Mic is off"), and line icons of 22 pt on the right
  (people, react, chat). Hosts get chips above the bar: "Requests (1)" and "Mute everyone".
- *Clubhouse live room:* a sheet with a chevron-down on the left and "✌️ Leave quietly" on the right. Speakers sit in 3
  columns of 75 pt faces, then "Others in the room" in 4 columns of 60 pt. Badges sit on the faces (a muted mic at the
  bottom right, a ring around whoever is speaking). The bottom bar ends with an **80 pt round "raise hand" button**
  captioned "ask to speak". A tap opens a short confirm sheet ("Got something to say?"), then a banner confirms it.
  An invitation to speak arrives as a full-width banner at the top with "Join!" and "Maybe later?".
- *Mini player:* in X it is **docked directly above the tab bar** on every tab: full width, 56 pt, with a thin progress
  line, the host at 15 pt bold and the title at 14 pt grey, and **controls on the right**. In Clubhouse it is a floating
  card of 369×70 pt (radius 22, sitting 8 pt above the tab bar) with faces, "leave quietly" and chat. A tap opens the room
  again.
- *Discord:* before you join a voice channel, a sheet shows who is in it and a big 48 pt "Join Voice" pill. An empty room
  says "No one's here yet! When you are ready to talk, just hop in."

**What differs.**
1. Our native room doesn't look like the rest of the app (Georgia, emoji, a green dot).
2. Our controls are small and bunched to the left. The references give the one main action (mic or raise hand) a big
   round button with a caption, and put the rest in a row of line icons.
3. We show "ON STAGE / LISTENING" as caps labels with an empty middle. The references use one face grid with a role line
   under each name.
4. Our mini player sits under the tab bar and has no controls. The references dock it above the tab bar with mute or
   hand and leave.
5. Our list cards use small 32 px buttons and a small face stack. The references use big faces and the whole card as
   the tap target.
6. Our list starts with settings (the alerts switch). The references start with the rooms.

## 8. Profile and the avatar menu

**Ours.** *Profile (390 px):* an 80 px photo floats **vertically centred** beside a tall column, with about 87 px of
nothing above it. Then three stacked buttons of three widths and two heights: "Message" 108×32, "Ask for an intro" 151×32,
and "Don't notify me about Priya's rooms" 254×**52**, which wraps to 2 lines. Two cards touch (**0 px** gap). The "Apply"
buttons are full pills, while every other button has a 6 px radius. *Avatar menu:* a dropdown of **736 px** with 17 rows
of 44 px. It covers the tab bar and scrolls inside, so Reload, Open in the browser and Switch community are below the
fold.

**References.**
- *LinkedIn profile:* a 100 pt avatar at the top left (over a cover), the name at 24 pt bold, the headline at 16–17 pt,
  and the place at 14–15 pt grey. Then **one row of two equal 32 pt buttons and a 32 pt "…" circle**: primary "Follow"
  and outlined "Connect" on someone else's profile. Sections have a 20 pt title, sit 8 pt apart, and end with a 48 pt
  "Show all".
- *Instagram profile:* a 92 pt avatar, then "Edit profile" and "Share profile" as equal grey 32 pt buttons with a 32 pt
  square beside them.
- *Airbnb Profile tab:* a 32 pt "Profile" title, an identity card (a 104 pt avatar, name, role), then settings rows of
  56 pt with a 24 pt icon and a chevron, in groups.
- *Menus:* LinkedIn and X open your profile and menu from a 32 pt avatar at the top left. On a phone, a long menu is a
  sheet or a page, never a 700 px dropdown.

**What differs.**
1. Our profile header doesn't line up: the photo floats, and the buttons stack in 3 sizes.
2. Our mute choice sits among the main actions. The references put such choices behind "…".
3. Our menu is a dropdown taller than the screen.

## 9. Headers, empty states and the web layout

**Ours.** Every phone screen has the same 56 px bar (the fund's mark and name, "Members", and the avatar) with no page
title and no action. The 28 px serif title sits 20–46 px under the bar. Back links ("‹ Inbox") are 30 px links inside
the page. Empty states are a dashed box with one line and an outlined button. On the web, the sidebar is pinned to the
screen's height but starts under the demo banner, so its bottom 34 px is cut off (in demo mode only; the admin's
credit line is clipped). Content widths are 720 or 926 px depending on the tab.

**References.** Tab roots use either an inline 44 pt header (a logo or avatar, plus 24 pt icons) or a large left-aligned
title (Airbnb 32 pt, Linear 24 pt) on the same row as their actions. A pushed screen has a back chevron and an inline
16–17 pt title in the header, not in the page. Empty states put a 100–200 pt illustration or icon slightly above the
middle, a 17 pt headline, a 15–16 pt grey line of at most 300 pt saying how to fill the screen, and at most one 36 pt
button. Filters stay visible above an empty filtered list.

**What differs.** We have no back chevron in the header on pushed screens, our empty states are dashed boxes, and our
web content widths vary from tab to tab.
