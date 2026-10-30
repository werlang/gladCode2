-- The site theme a master chose in the profile settings: 'classic', 'arena-light' or 'arena-dark'.
-- NULL until they choose, when the pages follow the system colour scheme (Arena light or dark).
ALTER TABLE `usuarios` ADD COLUMN `site_theme` varchar(12) DEFAULT NULL;
