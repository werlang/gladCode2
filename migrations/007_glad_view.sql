-- How a master sees gladiators across the site: 'sprite' (the pixel-art sprites) or '3d' (the
-- Synty coliseum style the site shows today). NULL until they choose, when the site uses the 3D
-- coliseum.
ALTER TABLE `usuarios` ADD COLUMN `glad_view` varchar(8) DEFAULT NULL;
