# Plan check (23 Nov 2026)

A separate helper, who did not write the plan, tested it against the code on 3 situations it was not written from:
- Maya (an admin) on her phone;
- a bright community colour in dark mode, on a 360 px Android phone with large text;
- two builders working at once.

**First pass: 14 findings.** 6 blocked the build, 7 should be fixed, and 1 was small. All were fixed in the plan:
- **Shared files had no single owner.** SPEC.md now has an owners table, and Part 1 (the foundation) builds every shared
  piece first.
- **Nothing said what sits at the bottom of the screen.** There are now shared variables (`--sab`, `--tab-total`,
  `--mini`, `--bottom-stack`) and page attributes (`data-pushed-screen`, `data-own-header`).
- **The room card's sizes lived only in Part 6.** They are now in SPEC.md, so Part 4's builder reads them too.
- **The composer's toolbar didn't fit on a phone.** It now has two short chips, and the allowance moved into the body.
- **Today's title size disagreed between two parts.** It is now one rule in SPEC.md.
- **The back link in the bar had no title to show.** It shows the previous screen's name, as iOS does.
- **Maya's screens were missing.** Part 2 now owns the admin tabs' outlines and checks.
- **Plain button classes were missed.** About 58 files use `.fh-btn` and `.fh-chip` directly; Part 1 now covers them.
- **4 controls the plan called "today's" don't exist:**
  - the "join stage" step (a host's invite puts a listener on stage at once);
  - a chat count;
  - Report on a thread (it is per message);
  - "View my profile" in the menu.

  The plan now describes what really exists.
- **Large text and small screens were not covered.** Fixed sizes became minimums, and buttons stack instead of
  wrapping. The room grid's columns are at least 84 px.
- **Some checks needed a real phone.** Those are now marked for store build 5.
- **Accessibility:** icon-only buttons have names, every tap target is at least 44 px, and an action behind a long
  press also has a tap or keyboard path.

**Re-check: 11 of 14 fixed, 3 partly open, plus 1 new blocker. All of them are now fixed:**
- **The new blocker:** the mini player assumed a 56 px tab bar, which can grow with large text. The page now reports
  the bar's measured height to the app.
- **Dark mode:** the store app's dark palette stays, and its live colour takes the site's dark value.
- **Maya's founder-view strip** is now counted in the Inbox's two-pane height.
- **The large-text check** now uses a 300 px wide screen, plus a real Android check on store build 5.
