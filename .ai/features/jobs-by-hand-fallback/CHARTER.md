# Charter: a careers link with no job board leads to jobs by hand

Approved direction: The owner's brief for the Commonhall onboarding topic (17 Nov 2026): "Crashes and small bugs first."
Found on the LOI demo: "Another tool, or none" + a careers link answered "We couldn't find a job board… or add your
jobs by hand", with no way to add jobs by hand from there.

- **Fix:** under that error, an "Add the jobs by hand instead" button starts the company by hand (the same action as
  "Another tool, or none" with no link), and the "Add a job by hand" form opens.
- **Repair (found by the verifier):** after one click the message and button stayed, so a second click or a double
  click added the same company again and used up the 5-company limit. Now the click clears the message (the button
  goes), the button shows only for "no job board in that link", and the server returns the company already there
  instead of a copy (`createManualSource`).
- **Proof:** real clicks on a test copy with a made-up company: `reports/jobs-error-button.png`, `reports/jobs-by-hand-after.png`.
