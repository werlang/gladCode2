-- A news post may carry the engine version it announces. Posts without one show no version beside
-- the date; the running engine version is not post metadata.
ALTER TABLE `news` ADD COLUMN `version` varchar(8) DEFAULT NULL AFTER `image_alt`;
