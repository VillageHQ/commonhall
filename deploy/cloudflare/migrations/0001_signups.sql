-- Call requests from the "Schedule a call" form on commonhall.ai.
CREATE TABLE signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  community TEXT NOT NULL,
  members INTEGER NOT NULL,
  plan TEXT NOT NULL,
  visitor TEXT NOT NULL, -- SHA-256 of the visitor's IP address, only for the hourly limit
  notified INTEGER NOT NULL DEFAULT 0 -- 1 once the email to the team went out
);
CREATE INDEX signups_visitor_time ON signups (visitor, created_at);
