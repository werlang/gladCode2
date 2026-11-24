-- The ranking now includes every engine version, so replace the version-leading index with the
-- order the shared ROW_NUMBER uses. Indexes only: no game row, name, price, level or balance changes.
ALTER TABLE `gladiators`
    DROP INDEX `gladiators_rank`,
    ADD INDEX `gladiators_rank_order` (`mmr`, `cod`);
