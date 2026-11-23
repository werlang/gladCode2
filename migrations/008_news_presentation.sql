-- News posts gain the presentation fields the Notícias board shows: a category chip, a short excerpt,
-- an optional hero image and its alt text. Empty values keep the old posts readable.
ALTER TABLE `news`
    ADD COLUMN `category` varchar(40) NOT NULL DEFAULT 'Atualização' AFTER `title`,
    ADD COLUMN `excerpt` varchar(300) NOT NULL DEFAULT '' AFTER `category`,
    ADD COLUMN `image` varchar(500) DEFAULT NULL AFTER `excerpt`,
    ADD COLUMN `image_alt` varchar(300) NOT NULL DEFAULT '' AFTER `image`;
