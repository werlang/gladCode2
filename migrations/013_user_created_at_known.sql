-- Whether `created_at` is a real signup date. The original version of migration 009 copied `ativo`
-- (the last activity) into `created_at` for every account that existed when it ran. The migration's
-- application time is recorded in `schema_migrations.applied_at`, so a date before that is not a
-- signup date; a date at or after it was stored by the account insert. This migration never rewrites
-- `created_at`: it only records provenance, leaving unknown dates NULL in the API.
ALTER TABLE `usuarios` ADD COLUMN `created_at_known` tinyint(1) NOT NULL DEFAULT 1 AFTER `created_at`;
UPDATE `usuarios`
SET `created_at_known` = 0
WHERE `created_at` IS NULL
   OR `created_at` < (SELECT `applied_at` FROM `schema_migrations` WHERE `version` = 9);
