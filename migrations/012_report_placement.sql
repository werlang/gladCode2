-- Ranked reports record the gladiator's placing (0 is first place). The profile win rate counts
-- first places only, not every gladiator that gained renown. Reports written before this column
-- have no known placing and do not count as wins.
ALTER TABLE `reports` ADD COLUMN `placement` int DEFAULT NULL AFTER `reward`;
