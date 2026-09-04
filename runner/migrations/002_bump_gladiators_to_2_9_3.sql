-- Non-breaking 2.9.2 -> 2.9.3 balance patch: carry gladiators forward automatically.
-- Only rows already on the replaced version move; older versions stay stale and
-- keep hitting the existing version guards (old-version badge, duel cancel,
-- matchmaking pool filter). Omit this kind of migration when a bump is a
-- BREAKING change: stale owners must review their code instead.
UPDATE `gladiators` SET `version` = '2.9.3' WHERE `version` = '2.9.2';
