-- The site theme a master chose in the profile settings: 'arena' (dark) or 'classic' (light).
-- NULL until they choose, when the pages follow the system colour scheme.
ALTER TABLE `usuarios` ADD COLUMN `site_theme` varchar(10) DEFAULT NULL;
