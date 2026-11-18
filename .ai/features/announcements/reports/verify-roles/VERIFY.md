# Verify: announcement role audiences (independent pass, 2026-11-18)

Setup: banned one founder (Zara), opted out the mentor (Grace). All data restored afterwards.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Founders | PASS | Page: 12; Preview = 12 founders (banned Zara and fund_team/experts left out); outbox 12 rows to exactly those ids, no `{` left; post count unchanged (4); audit "... to founders: 12 emails" |
| 2 | Mentors and experts | PASS | Preview: Grace (mentor), Ines, Marcus (expert), Oliver (advisor), Lena (EIR); fund_team Julia/Maya left out; 4 queued; audit "to mentors and experts" |
| 3 | Opt-out | PASS | "4 members will get the email (1 turned announcements off)"; no outbox row for Grace |
| 4 | Empty audience | PASS | All opted out: hint + button disabled, API 422 `announcement_empty_audience`. No experts at all: "Nobody is in this audience yet", API 422. No announcement row was left behind |
| 5 | Repeat sendKey | PASS | 2nd POST returned the same id with `isRepeat:true`; 1 row, 12 emails |
| 6 | Sent list | PASS | Audience column shows "Founders" / "Mentors and experts" (b-sent-list.png) |
| 7 | Member Sam | PASS | page 404, API 403 |
| 8 | Phone 390 px | PASS | scrollWidth 390 = clientWidth; buttons wrap onto 2 rows inside a 324 px group (f-phone.png) |
| 9 | Everyone / cohort | PASS | Everyone 18 (1 off) + feed note; Fund I cohort 3 (Felix, Marcus, Ravi) |

Break attempts: `fund_team`, `Founders` and no audience all get 422. `experts` with a `cohort` field: the cohort is dropped and the send goes to all experts (cohort stored null), which is harmless. Switching the audience while the confirm step is open closes the confirm.

Not tested live: a member with no role. `member_profile.community_role` is NOT NULL, so null only happens for a user with no profile row (left join). The code handles it (`?? founder`).
