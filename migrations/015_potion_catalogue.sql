-- The engine's potion catalogue (`Payload/gladCodeGlobals.c` itemList) as sellable items. The
-- identifiers must match itemList exactly: useItem() compares the string the gladiator passes with it.
INSERT INTO items (id, identifier, name, price, lvl, description, icon) VALUES
    (1, 'pot-hp-1', 'Poção de Vida I', 40, 1, 'Recupera parte dos pontos de vida na hora.', 'icon/potion.png'),
    (2, 'pot-ap-1', 'Poção de Habilidade I', 40, 1, 'Recupera parte dos pontos de habilidade na hora.', 'icon/potion.png'),
    (3, 'pot-hp-2', 'Poção de Vida II', 80, 2, 'Recupera mais pontos de vida que a de nível I.', 'icon/potion.png'),
    (4, 'pot-ap-2', 'Poção de Habilidade II', 80, 2, 'Recupera mais pontos de habilidade que a de nível I.', 'icon/potion.png'),
    (5, 'pot-hp-3', 'Poção de Vida III', 120, 3, 'Recupera parte dos pontos de vida na hora.', 'icon/potion.png'),
    (6, 'pot-ap-3', 'Poção de Habilidade III', 120, 3, 'Recupera parte dos pontos de habilidade na hora.', 'icon/potion.png'),
    (7, 'pot-hp-4', 'Poção de Vida IV', 200, 4, 'Recupera mais pontos de vida que a de nível III.', 'icon/potion.png'),
    (8, 'pot-ap-4', 'Poção de Habilidade IV', 200, 4, 'Recupera mais pontos de habilidade que a de nível III.', 'icon/potion.png'),
    (9, 'pot-hp-5', 'Poção de Vida V', 300, 5, 'Recupera a maior parte dos pontos de vida na hora.', 'icon/potion.png'),
    (10, 'pot-ap-5', 'Poção de Habilidade V', 300, 5, 'Recupera a maior parte dos pontos de habilidade na hora.', 'icon/potion.png'),
    (11, 'pot-high-1', 'Tônico do Atributo Forte I', 60, 2, 'Reforça o maior atributo do gladiador nesta batalha.', 'icon/potion.png'),
    (12, 'pot-high-2', 'Tônico do Atributo Forte II', 120, 3, 'Reforça o maior atributo do gladiador nesta batalha.', 'icon/potion.png'),
    (13, 'pot-high-3', 'Tônico do Atributo Forte III', 180, 4, 'Reforça o maior atributo do gladiador nesta batalha.', 'icon/potion.png'),
    (14, 'pot-high-4', 'Tônico do Atributo Forte IV', 260, 5, 'Reforça o maior atributo do gladiador nesta batalha.', 'icon/potion.png'),
    (15, 'pot-low-1', 'Tônico do Atributo Fraco I', 60, 2, 'Reforça o menor atributo do gladiador nesta batalha.', 'icon/potion.png'),
    (16, 'pot-low-2', 'Tônico do Atributo Fraco II', 120, 3, 'Reforça o menor atributo do gladiador nesta batalha.', 'icon/potion.png'),
    (17, 'pot-low-3', 'Tônico do Atributo Fraco III', 180, 4, 'Reforça o menor atributo do gladiador nesta batalha.', 'icon/potion.png'),
    (18, 'pot-low-4', 'Tônico do Atributo Fraco IV', 260, 5, 'Reforça o menor atributo do gladiador nesta batalha.', 'icon/potion.png'),
    (19, 'pot-xp-1', 'Poção de Experiência I', 80, 1, 'Concede experiência ao gladiador na hora.', 'icon/potion.png'),
    (20, 'pot-xp-2', 'Poção de Experiência II', 180, 2, 'Concede mais experiência que a de nível I.', 'icon/potion.png'),
    (21, 'pot-xp-3', 'Poção de Experiência III', 260, 3, 'Concede mais experiência que a de nível II.', 'icon/potion.png')
ON DUPLICATE KEY UPDATE
    identifier = VALUES(identifier),
    name = VALUES(name),
    price = VALUES(price),
    lvl = VALUES(lvl),
    description = VALUES(description),
    icon = VALUES(icon);
