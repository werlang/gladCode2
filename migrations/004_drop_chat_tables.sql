-- The chat system was removed: drop its tables. Children first, since
-- chat_messages, chat_restrictions and chat_users reference chat_rooms.
DROP TABLE IF EXISTS `chat_messages`;
DROP TABLE IF EXISTS `chat_restrictions`;
DROP TABLE IF EXISTS `chat_users`;
DROP TABLE IF EXISTS `chat_rooms`;
