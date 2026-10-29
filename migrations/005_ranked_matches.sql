-- Ranked matches are kept on the server until their battle starts, so each match is fought once.
CREATE TABLE IF NOT EXISTS `ranked_matches` (
  `id` char(32) NOT NULL,
  `user` int NOT NULL,
  `gladiator` int NOT NULL,
  `opponents` varchar(255) NOT NULL,
  `expires` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
