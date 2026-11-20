-- Round 6: Feed is off by default for new communities. A community that already has members keeps Feed as it is
-- today: where no admin chose, it was on, so that choice is written down before the default flips. A fresh install
-- migrates before anyone joins, so it gets no row and starts with Feed off.
INSERT INTO "instance_settings" ("key", "value")
SELECT 'module_state:feed', 'on'
WHERE EXISTS (SELECT 1 FROM "user")
ON CONFLICT ("key") DO NOTHING;
