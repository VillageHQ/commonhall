# Charter: round 7, the last fixes and the re-study (before TestFlight 4)

Approved as the last part of round 7 by the owner's fix list and decisions (20–21 Nov 2026, kept in the round's
orchestration notes): the fixes the parts' verifiers found, two store-app room changes decided "yes", and the
re-study that [less-choice/SPEC.md](../less-choice/SPEC.md) asks for after its parts. This page records how the part
is built; it adds no choices and no words beyond what each fix needs.

## Direction
Fix what round 7's checks found, grouped by cause, then walk the same 12 personas again and compare. Out: anything the
owner keeps for themself (deleting old notify choices, saved audiences and follows; founders from an invite link
skipping the second confirm; Copy returning the same invite link; merging My network's consent with Privacy).
Today's data stays.

## The fixes, by cause
1. **Invites and first setup say true things.** A pasted list's header-like line that isn't an email is named, not
   skipped silently; `/setup` keeps the setup token after a refused submit; the invite email mentions network search
   only when Village is on; the email next to "Copy link" isn't cut off on a phone.
2. **Rooms: one live room per host, and the store app matches the site.** Start while your own room is live reopens
   it (no second room). The store app's room screen gets Rename and the "nobody was alerted" line.
3. **What's done stops asking.** Today's "Read" line goes once the ask is opened. An answered intro shows its status
   once; a stale tab can't turn a yes into a no. A win doesn't count toward the 5 open posts. The connector's email
   and public page offer the same 2 answers as the app.
4. **Settings are easy to find on a phone.** The avatar menu fits (Sign out reachable); one name for "Password" /
   "How you sign in"; My profile's list has a Settings heading; My network's consent links to Privacy's intro switch
   (it still asks its own consent).
5. **A job with no link.** Apply's message names the job; a member's profile shows Apply for such jobs too.
6. **The map.** The root CLAUDE.md lists the NOTES of every round-7 feature folder (merged lines, not many new ones).

## Re-study
The less-choice audit's 12 personas, the same method (`less-choice/study/walk.mjs`, separate agents, each with no
memory of the others), on this build. Written to `less-choice/RESTUDY.md`: per journey, choices / steps / taps before
and after, and what still makes people hesitate. The top 3 are fixed here when small; the rest become roadmap lines.

## Checks
- Each fix has a test where behaviour changes (the fastest kind), and the touched modules' tests are green.
- A separate verifier drives every fix in a real browser at 390 and 1280 px on a throwaway copy with made-up people,
  and the store app's web preview for the store-app changes.
- CI green, rebased on main, the landing page tour rebuilt last, pull request open and not merged.
