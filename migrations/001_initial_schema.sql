-- Baseline schema for the gladcode database.
-- Extracted (schema only, AUTO_INCREMENT counters reset) from database-2025.3.sql.
-- Tables are dropped and recreated, so this migration is safe to apply on an
-- empty database. It must NOT be edited after it has been applied anywhere;
-- all further schema changes go in new NNN_*.sql migrations.

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;

DROP TABLE IF EXISTS `amizade`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amizade` (
  `cod` int NOT NULL AUTO_INCREMENT,
  `usuario1` int DEFAULT NULL,
  `usuario2` int DEFAULT NULL,
  `pendente` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`cod`),
  KEY `usuario1` (`usuario1`),
  KEY `usuario2` (`usuario2`),
  CONSTRAINT `fk_usuario1` FOREIGN KEY (`usuario1`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_usuario2` FOREIGN KEY (`usuario2`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room` int NOT NULL,
  `time` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `sender` int DEFAULT NULL,
  `message` text NOT NULL,
  `system` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `room` (`room`),
  KEY `chat_messages_fk_sender` (`sender`),
  CONSTRAINT `chat_messages_fk_sender` FOREIGN KEY (`sender`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`room`) REFERENCES `chat_rooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `chat_restrictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_restrictions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room` int NOT NULL,
  `user` int DEFAULT NULL,
  `ban` tinyint(1) NOT NULL,
  `time` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `room` (`room`),
  KEY `chat_restrictions_fk_user` (`user`),
  CONSTRAINT `chat_restrictions_fk_user` FOREIGN KEY (`user`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `chat_restrictions_ibfk_1` FOREIGN KEY (`room`) REFERENCES `chat_rooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `chat_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `creation` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `description` text NOT NULL,
  `public` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `chat_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room` int NOT NULL,
  `user` int DEFAULT NULL,
  `privilege` tinyint NOT NULL DEFAULT '1',
  `joined` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `visited` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `room` (`room`),
  KEY `user` (`user`),
  CONSTRAINT `chat_users_ibfk_1` FOREIGN KEY (`room`) REFERENCES `chat_rooms` (`id`),
  CONSTRAINT `chat_users_ibfk_2` FOREIGN KEY (`user`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `duels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `duels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user1` int DEFAULT NULL,
  `user2` int DEFAULT NULL,
  `gladiator1` int DEFAULT NULL,
  `gladiator2` int DEFAULT NULL,
  `time` datetime DEFAULT NULL,
  `log` varchar(35) DEFAULT NULL,
  `isread` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user1` (`user1`),
  KEY `user2` (`user2`),
  KEY `duels_ibfk_3` (`gladiator1`),
  KEY `duels_ibfk_4` (`gladiator2`),
  CONSTRAINT `duels_ibfk_3` FOREIGN KEY (`gladiator1`) REFERENCES `gladiators` (`cod`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `duels_ibfk_4` FOREIGN KEY (`gladiator2`) REFERENCES `gladiators` (`cod`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_user1` FOREIGN KEY (`user1`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_user2` FOREIGN KEY (`user2`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `gladiator_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gladiator_teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gladiator` int DEFAULT NULL,
  `team` int DEFAULT NULL,
  `visible` tinyint(1) DEFAULT '0',
  `dead` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `gladiator` (`gladiator`),
  KEY `team` (`team`),
  CONSTRAINT `gladiator_teams_ibfk_1` FOREIGN KEY (`gladiator`) REFERENCES `gladiators` (`cod`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `gladiator_teams_ibfk_2` FOREIGN KEY (`team`) REFERENCES `teams` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `gladiator_training`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gladiator_training` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gladiator` int DEFAULT NULL,
  `groupid` int DEFAULT NULL,
  `training` int NOT NULL,
  `score` float NOT NULL DEFAULT '0',
  `lasttime` float NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `groupid` (`groupid`),
  KEY `training` (`training`),
  KEY `gladiator` (`gladiator`),
  CONSTRAINT `gladiator_training_ibfk_2` FOREIGN KEY (`groupid`) REFERENCES `training_groups` (`id`),
  CONSTRAINT `gladiator_training_ibfk_3` FOREIGN KEY (`training`) REFERENCES `training` (`id`),
  CONSTRAINT `gladiator_training_ibfk_4` FOREIGN KEY (`gladiator`) REFERENCES `gladiators` (`cod`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `gladiators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gladiators` (
  `cod` int NOT NULL AUTO_INCREMENT,
  `master` int DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `vstr` int DEFAULT NULL,
  `vagi` int DEFAULT NULL,
  `vint` int DEFAULT NULL,
  `lvl` int DEFAULT NULL,
  `xp` int DEFAULT NULL,
  `skin` varchar(2000) DEFAULT NULL,
  `code` text NOT NULL,
  `blocks` text NOT NULL,
  `mmr` float NOT NULL DEFAULT '0',
  `version` varchar(8) NOT NULL,
  PRIMARY KEY (`cod`),
  KEY `master` (`master`),
  CONSTRAINT `fk_master` FOREIGN KEY (`master`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `group_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `groupid` int DEFAULT NULL,
  `gladiator` int DEFAULT NULL,
  `team` int DEFAULT NULL,
  `lasttime` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `groupid` (`groupid`),
  KEY `team` (`team`),
  KEY `group_teams_ibfk_4` (`gladiator`),
  CONSTRAINT `group_teams_ibfk_1` FOREIGN KEY (`groupid`) REFERENCES `groups` (`id`),
  CONSTRAINT `group_teams_ibfk_3` FOREIGN KEY (`team`) REFERENCES `teams` (`id`),
  CONSTRAINT `group_teams_ibfk_4` FOREIGN KEY (`gladiator`) REFERENCES `gladiators` (`cod`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `round` int DEFAULT NULL,
  `log` int DEFAULT NULL,
  `locked` datetime DEFAULT NULL,
  `deadline` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `log` (`log`),
  CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`log`) REFERENCES `logs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `identifier` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `price` int NOT NULL,
  `lvl` int DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `icon` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `time` datetime DEFAULT NULL,
  `version` varchar(10) DEFAULT NULL,
  `hash` varchar(50) NOT NULL,
  `origin` varchar(15) DEFAULT NULL,
  `expired` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `cod` int NOT NULL AUTO_INCREMENT,
  `time` datetime DEFAULT NULL,
  `message` varchar(2048) DEFAULT NULL,
  `sender` int DEFAULT NULL,
  `receiver` int DEFAULT NULL,
  `replyid` int DEFAULT NULL,
  `isread` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`cod`),
  KEY `sender` (`sender`),
  KEY `receiver` (`receiver`),
  KEY `replyid` (`replyid`),
  CONSTRAINT `fk_receiver` FOREIGN KEY (`receiver`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_sender` FOREIGN KEY (`sender`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`replyid`) REFERENCES `messages` (`cod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `news` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(2048) NOT NULL,
  `time` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `post` mediumtext NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `log` int DEFAULT NULL,
  `gladiator` int DEFAULT NULL,
  `isread` tinyint(1) DEFAULT '0',
  `reward` float NOT NULL,
  `favorite` tinyint(1) NOT NULL DEFAULT '0',
  `comment` varchar(1024) NOT NULL DEFAULT '',
  `started` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `log` (`log`),
  KEY `gladiator` (`gladiator`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`log`) REFERENCES `logs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`gladiator`) REFERENCES `gladiators` (`cod`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `skins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skins` (
  `cod` int NOT NULL AUTO_INCREMENT,
  `hash` varchar(35) NOT NULL,
  `skin` mediumtext,
  PRIMARY KEY (`cod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user` int NOT NULL,
  `item` int DEFAULT NULL,
  `expire` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user` (`user`),
  KEY `slots_ibfk_3` (`item`),
  CONSTRAINT `slots_ibfk_2` FOREIGN KEY (`user`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `slots_ibfk_3` FOREIGN KEY (`item`) REFERENCES `items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats` (
  `cod` int NOT NULL AUTO_INCREMENT,
  `log` int DEFAULT NULL,
  `time` datetime DEFAULT NULL,
  `fireball` int DEFAULT NULL,
  `teleport` int DEFAULT NULL,
  `charge` int DEFAULT NULL,
  `block` int DEFAULT NULL,
  `assassinate` int DEFAULT NULL,
  `ambush` int DEFAULT NULL,
  `melee` int DEFAULT NULL,
  `ranged` int DEFAULT NULL,
  `win` varchar(100) DEFAULT NULL,
  `highSTR` int DEFAULT NULL,
  `highAGI` int DEFAULT NULL,
  `highINT` int DEFAULT NULL,
  `duration` float DEFAULT NULL,
  `avglvl` float DEFAULT NULL,
  `winnerlvl` int DEFAULT NULL,
  `avgmmr` float DEFAULT NULL,
  `potionuse` varchar(255) DEFAULT NULL,
  `potionwin` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`cod`),
  KEY `stats_ibfk_1` (`log`),
  CONSTRAINT `stats_ibfk_1` FOREIGN KEY (`log`) REFERENCES `logs` (`id`) ON DELETE SET NULL ON UPDATE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) DEFAULT NULL,
  `password` varchar(10) DEFAULT NULL,
  `tournament` int DEFAULT NULL,
  `modified` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournament` (`tournament`),
  CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`tournament`) REFERENCES `tournament` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `tournament`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hash` varchar(16) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  `password` varchar(32) DEFAULT NULL,
  `description` text,
  `creation` datetime DEFAULT NULL,
  `maxteams` int NOT NULL DEFAULT '50',
  `flex` tinyint(1) DEFAULT NULL,
  `manager` int DEFAULT NULL,
  `maxtime` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `manager` (`manager`),
  CONSTRAINT `fk_manager` FOREIGN KEY (`manager`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `tournment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournment` (
  `cod` int NOT NULL AUTO_INCREMENT,
  `time` datetime NOT NULL,
  `hash` varchar(35) DEFAULT NULL,
  `bnum` varchar(50) DEFAULT NULL,
  `winners` text NOT NULL,
  `round` mediumtext,
  PRIMARY KEY (`cod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `training`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `creation` datetime(3) NOT NULL,
  `manager` int NOT NULL,
  `maxtime` int NOT NULL,
  `deadline` datetime DEFAULT NULL,
  `hash` varchar(32) DEFAULT NULL,
  `hash_valid` datetime(3) NOT NULL,
  `players` int NOT NULL,
  `weight` float NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `manager` (`manager`),
  CONSTRAINT `training_ibfk_1` FOREIGN KEY (`manager`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `training_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `round` int NOT NULL DEFAULT '1',
  `log` int DEFAULT NULL,
  `deadline` datetime(3) DEFAULT NULL,
  `locked` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `log` (`log`),
  CONSTRAINT `training_groups_ibfk_1` FOREIGN KEY (`log`) REFERENCES `logs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `user_tabs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_tabs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `owner` int NOT NULL,
  `watch` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `owner` (`owner`),
  CONSTRAINT `user_tabs_ibfk_1` FOREIGN KEY (`owner`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `googleid` varchar(32) DEFAULT NULL,
  `apelido` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `nome` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `sobrenome` varchar(300) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `foto` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `spoken_language` varchar(2) NOT NULL DEFAULT 'pt',
  `emoji` varchar(300) NOT NULL DEFAULT '',
  `pasta` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `lvl` int NOT NULL DEFAULT '1',
  `xp` int NOT NULL DEFAULT '0',
  `silver` int NOT NULL DEFAULT '0',
  `credits` float NOT NULL DEFAULT '0',
  `ativo` datetime NOT NULL,
  `premium` datetime DEFAULT NULL,
  `showTutorial` tinyint(1) NOT NULL DEFAULT '1',
  `editor_theme` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'dreamweaver',
  `editor_font` int NOT NULL DEFAULT '18',
  `pref_message` tinyint(1) NOT NULL DEFAULT '1',
  `pref_friend` tinyint(1) NOT NULL DEFAULT '1',
  `pref_update` tinyint(1) NOT NULL DEFAULT '1',
  `pref_duel` tinyint(1) NOT NULL DEFAULT '1',
  `pref_tourn` tinyint(1) NOT NULL DEFAULT '1',
  `email_update` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT '',
  `read_news` timestamp(3) NULL DEFAULT NULL,
  `pref_language` varchar(20) NOT NULL DEFAULT 'c',
  `apothecary` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
