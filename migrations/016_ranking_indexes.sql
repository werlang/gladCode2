-- Indexes for the current-version ranking window and the 7-day renown aggregate. Indexes only:
-- no game row, price, name or balance is changed.
ALTER TABLE `logs` ADD INDEX `logs_time` (`time`);
ALTER TABLE `gladiators` ADD INDEX `gladiators_rank` (`version`, `mmr`, `cod`);
