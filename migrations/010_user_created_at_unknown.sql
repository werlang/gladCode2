-- Repair databases where the first version of migration 009 filled `created_at` from `ativo` (the
-- last activity). A real creation date is preserved; a backfilled row carries the exact activity
-- timestamp, so it is cleared to "unknown" and the profile omits the "desde" phrase.
ALTER TABLE `usuarios` MODIFY COLUMN `created_at` datetime NULL;
UPDATE `usuarios` SET `created_at` = NULL WHERE `created_at` = `ativo`;
