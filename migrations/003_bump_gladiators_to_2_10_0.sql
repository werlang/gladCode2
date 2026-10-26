-- Non-breaking 2.9.3 -> 2.10.0 release: carry gladiators forward automatically.
-- Only rows already on the replaced version move; older versions stay stale and
-- keep hitting the existing version guards (old-version badge, duel cancel,
-- matchmaking pool filter).
UPDATE `gladiators` SET `version` = '2.10.0' WHERE `version` = '2.9.3';
