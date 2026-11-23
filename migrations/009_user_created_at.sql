-- The profile hero shows when the master joined; the legacy `ativo` column is the last activity.
ALTER TABLE `usuarios` ADD COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `ativo`;
UPDATE `usuarios` SET `created_at` = `ativo` WHERE `created_at` IS NULL OR `created_at` > `ativo`;
