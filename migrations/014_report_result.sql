-- How the engine's end state settled each gladiator: 'win', 'loss' or 'draw'. Reports written before
-- this column have no authoritative result; they stay NULL and are excluded from the win-rate
-- denominator instead of counting as losses. A battle with no survivor is a draw (the replay shows
-- "Empate"); with a survivor, battle-results.js's equal-survival-time rule identifies the winners.
ALTER TABLE `reports` ADD COLUMN `result` varchar(6) DEFAULT NULL AFTER `placement`;
