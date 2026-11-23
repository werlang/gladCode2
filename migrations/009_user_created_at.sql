-- The profile hero shows when the master joined. Accounts that existed before this column have no
-- known creation date: leave it NULL. `ativo` is the last activity, never a join date.
ALTER TABLE `usuarios` ADD COLUMN `created_at` datetime DEFAULT NULL AFTER `ativo`;
