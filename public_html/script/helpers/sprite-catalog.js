/**
 * The Universal LPC sprite catalogue: every body, hair, clothing and weapon
 * layer a gladiator's skin can be built from. A skin is a list of these ids.
 *
 * `path` is under sprite/Universal-LPC-spritesheet/; `layer` orders the
 * drawing (an object gives `{ default, down }`); `oversize` weapons use the
 * 192 px sheets; `parent`, `req`, `block`, `select`, `scale`, `posx`, `posy`
 * and `line` drive the gladiator creator.
 */
const BASE_IMAGES = [
    //gender
    {'id': 'male', 'path': 'male.png', 'png': true, 'height': 256, 'width': 256, 'parent': 'gender', 'default': true},
    {'id': 'female', 'path': 'female.png', 'png': true, 'height': 256, 'width': 256, 'parent': 'gender'},
    //male body
    {'id': 'male-light', 'path': 'body/male/light.png', 'parent': 'shape', 'req': 'male', 'layer': 0, 'default': true},
    {'id': 'male-tanned', 'path': 'body/male/tanned.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-tanned2', 'path': 'body/male/tanned2.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-olive', 'path': 'body/male/man_olive.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-dark', 'path': 'body/male/dark.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-brown', 'path': 'body/male/man_brown.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-dark2', 'path': 'body/male/dark2.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-black', 'path': 'body/male/man_black.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-darkelf2', 'path': 'body/male/darkelf2.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-darkelf', 'path': 'body/male/darkelf.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-orc', 'path': 'body/male/orc.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'male-red_orc', 'path': 'body/male/red_orc.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    {'id': 'skeleton', 'path': 'body/male/skeleton.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    //female body
    {'id': 'female-light', 'path': 'body/female/light.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-tanned', 'path': 'body/female/tanned.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-tanned2', 'path': 'body/female/tanned2.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-olive', 'path': 'body/female/woman_olive.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-dark', 'path': 'body/female/dark.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-brown', 'path': 'body/female/woman_brown.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-dark2', 'path': 'body/female/dark2.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-black', 'path': 'body/female/woman_black.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-darkelf2', 'path': 'body/female/darkelf2.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-darkelf', 'path': 'body/female/darkelf.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-orc', 'path': 'body/female/orc.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    {'id': 'female-red_orc', 'path': 'body/female/red_orc.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    //hair style
    {'id': 'hair_none', 'path': '', 'parent': 'style', 'layer': 1, 'default': true},
    //beards
    {'id': 'facial_none', 'path': '', 'parent': 'facial', 'layer': 1, 'default': true},
    {'id': 'fiveoclock_black', 'path': 'facial/male/fiveoclock/black.png', 'parent': 'facial', 'layer': 1, 'block': 'bcolor', 'scale': 4},
    //eyes
    {'id': 'eyes_blue', 'path': 'body/male/eyes/blue.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    {'id': 'eyes_brown', 'path': 'body/male/eyes/brown.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    {'id': 'eyes_gray', 'path': 'body/male/eyes/gray.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    {'id': 'eyes_green', 'path': 'body/male/eyes/green.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    {'id': 'eyes_orange', 'path': 'body/male/eyes/orange.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    {'id': 'eyes_purple', 'path': 'body/male/eyes/purple.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    {'id': 'eyes_red', 'path': 'body/male/eyes/red.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    {'id': 'eyes_yellow', 'path': 'body/male/eyes/yellow.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    //ears
    {'id': 'default_ears', 'path': '', 'parent': 'ears', 'layer': 1, 'default': true},
    {'id': 'bigears_dark', 'path': 'body/male/ears/bigears_dark.png', 'parent': 'ears', 'req': {'or': ['male-dark', 'female-dark']}, 'layer': 1, 'scale': 2},
    {'id': 'bigears_dark2', 'path': 'body/male/ears/bigears_dark2.png', 'parent': 'ears', 'req': {'or': ['male-dark2', 'female-dark2']}, 'layer': 1, 'scale': 2},
    {'id': 'bigears_darkelf', 'path': 'body/male/ears/bigears_darkelf.png', 'parent': 'ears', 'req': {'or': ['male-darkelf', 'female-darkelf']}, 'layer': 1, 'scale': 2},
    {'id': 'bigears_darkelf2', 'path': 'body/male/ears/bigears_darkelf2.png', 'parent': 'ears', 'req': {'or': ['male-darkelf2', 'female-darkelf2']}, 'layer': 1, 'scale': 2},
    {'id': 'bigears_light', 'path': 'body/male/ears/bigears_light.png', 'parent': 'ears', 'req': {'or': ['male-light', 'female-light']}, 'layer': 1, 'scale': 2},
    {'id': 'bigears_tanned', 'path': 'body/male/ears/bigears_tanned.png', 'parent': 'ears', 'req': {'or': ['male-tanned', 'female-tanned']}, 'layer': 1, 'scale': 2},
    {'id': 'bigears_tanned2', 'path': 'body/male/ears/bigears_tanned2.png', 'parent': 'ears', 'req': {'or': ['male-tanned2', 'female-tanned2']}, 'layer': 1, 'scale': 2},
    {'id': 'elvenears_dark', 'path': 'body/male/ears/elvenears_dark.png', 'parent': 'ears', 'req': {'or': ['male-dark', 'female-dark']}, 'layer': 1, 'scale': 2},
    {'id': 'elvenears_dark2', 'path': 'body/male/ears/elvenears_dark2.png', 'parent': 'ears', 'req': {'or': ['male-dark2', 'female-dark2']}, 'layer': 1, 'scale': 2},
    {'id': 'elvenears_darkelf', 'path': 'body/male/ears/elvenears_darkelf.png', 'parent': 'ears', 'req': {'or': ['male-darkelf', 'female-darkelf']}, 'layer': 1, 'scale': 2},
    {'id': 'elvenears_darkelf2', 'path': 'body/male/ears/elvenears_darkelf2.png', 'parent': 'ears', 'req': {'or': ['male-darkelf2', 'female-darkelf2']}, 'layer': 1, 'scale': 2},
    {'id': 'elvenears_light', 'path': 'body/male/ears/elvenears_light.png', 'parent': 'ears', 'req': {'or': ['male-light', 'female-light']}, 'layer': 1, 'scale': 2},
    {'id': 'elvenears_tanned', 'path': 'body/male/ears/elvenears_tanned.png', 'parent': 'ears', 'req': {'or': ['male-tanned', 'female-tanned']}, 'layer': 1, 'scale': 2},
    {'id': 'elvenears_tanned2', 'path': 'body/male/ears/elvenears_tanned2.png', 'parent': 'ears', 'req': {'or': ['male-tanned2', 'female-tanned2']}, 'layer': 1, 'scale': 2},
    //shirt
    {'id': 'shirt_none', 'path': '', 'parent': 'shirt', 'layer': 1, 'default': true},
    {'id': 'female_bikini', 'path': 'torso/dress_female/blue_vest.png', 'parent': 'shirt', 'req': 'female', 'layer': 1},
    {'id': 'female_dress', 'path': 'torso/dress_female/underdress.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    {'id': 'female_dress_sash', 'path': 'torso/dress_female/dress_w_sash_female.png', 'parent': 'shirt', 'req': 'female', 'layer': 2, 'block': ['legs', 'armor']},
    {'id': 'female_tightdress_black', 'path': 'torso/dress_female/tightdress_black.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    {'id': 'female_tightdress_red', 'path': 'torso/dress_female/tightdress_red.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    {'id': 'female_tightdress_white', 'path': 'torso/dress_female/tightdress_white.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    {'id': 'female_tightdress_lightblue', 'path': 'torso/dress_female/tightdress_lightblue.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    //armor
    {'id': 'armor_none', 'path': '', 'parent': 'armor', 'layer': 2, 'default': true},
    {'id': 'male_chain', 'path': 'torso/chain/mail_male.png', 'parent': 'armor', 'req': 'male', 'layer': 2},
    {'id': 'male_leather-chest', 'path': 'torso/leather/chest_male.png', 'parent': 'armor', 'req': 'male', 'layer': 2},
    {'id': 'male_plate-chest', 'path': 'torso/plate/chest_male.png', 'parent': 'armor', 'req': 'male', 'layer': 2},
    {'id': 'male_gold-chest', 'path': 'torso/gold/chest_male.png', 'parent': 'armor', 'req': 'male', 'layer': 2},
    {'id': 'female_chain', 'path': 'torso/chain/mail_female.png', 'parent': 'armor', 'req': 'female', 'layer': 2},
    {'id': 'female_leather-chest', 'path': 'torso/leather/chest_female.png', 'parent': 'armor', 'req': 'female', 'layer': 2},
    {'id': 'female_plate-chest', 'path': 'torso/plate/chest_female.png', 'parent': 'armor', 'req': 'female', 'layer': 2},
    {'id': 'female_gold-chest', 'path': 'torso/gold/chest_female.png', 'parent': 'armor', 'req': 'female', 'layer': 2},
    //legs
    {'id': 'legs_none', 'path': '', 'parent': 'legs', 'layer': 1, 'default': true},
    {'id': 'male_plate-legs', 'path': 'legs/armor/male/metal_pants_male.png', 'parent': 'legs', 'req': 'male', 'layer': 1},
    {'id': 'male_gold-legs', 'path': 'legs/armor/male/golden_greaves_male.png', 'parent': 'legs', 'req': 'male', 'layer': 1},
    {'id': 'male_robe-skirt', 'path': 'legs/skirt/male/robe_skirt_male.png', 'parent': 'legs', 'req': 'male', 'layer': 3},
    {'id': 'female_plate-legs', 'path': 'legs/armor/female/metal_pants_female.png', 'parent': 'legs', 'req': 'female', 'layer': 1},
    {'id': 'female_gold-legs', 'path': 'legs/armor/female/golden_greaves_female.png', 'parent': 'legs', 'req': 'female', 'layer': 1},
    {'id': 'female_robe-skirt', 'path': 'legs/skirt/female/robe_skirt_female.png', 'parent': 'legs', 'req': 'female', 'layer': 3},
    //head
    {'id': 'head_none', 'path': '', 'parent': 'head', 'layer': 2, 'default': true},
    {'id': 'male_cap', 'path': 'head/caps/male/leather_cap_male.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    {'id': 'male_wizard-hat', 'path': 'head/caps/male/wizard_hat_male.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    {'id': 'male_cloth-hood', 'path': 'head/hoods/male/cloth_hood_male.png', 'parent': 'head', 'req': 'male', 'block': 'style', 'layer': 6},
    {'id': 'male_chain-hood', 'path': 'head/hoods/male/chain_hood_male.png', 'parent': 'head', 'req': 'male', 'block': 'style', 'layer': 6},
    {'id': 'male_chain-hat', 'path': 'head/helms/male/chainhat_male.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    {'id': 'male_metal-helmet', 'path': 'head/helms/male/metal_helm_male.png', 'parent': 'head', 'req': 'male', 'block': 'style', 'layer': 6},
    {'id': 'male_gold-helmet', 'path': 'head/helms/male/golden_helm_male.png', 'parent': 'head', 'req': 'male', 'block': 'style', 'layer': 6},
    {'id': 'male_bandana_red', 'path': 'head/bandanas/male/red.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    {'id': 'male_bandana_blue', 'path': 'head/bandanas/male/blue.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    {'id': 'male_bandana_black', 'path': 'head/bandanas/male/black.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    {'id': 'female_cap', 'path': 'head/caps/female/leather_cap_female.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    {'id': 'female_wizard-hat', 'path': 'head/caps/female/wizard_hat_female.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    {'id': 'female_cloth-hood', 'path': 'head/hoods/female/cloth_hood_female.png', 'parent': 'head',  'req': 'female', 'block': 'style', 'layer': 6},
    {'id': 'female_chain-hood', 'path': 'head/hoods/female/chain_hood_female.png', 'parent': 'head',  'req': 'female', 'block': 'style', 'layer': 6},
    {'id': 'female_chain-hat', 'path': 'head/helms/female/chainhat_female.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    {'id': 'female_metal-helmet', 'path': 'head/helms/female/metal_helm_female.png', 'parent': 'head', 'req': 'female', 'block': 'style', 'layer': 6},
    {'id': 'female_gold-helmet', 'path': 'head/helms/female/golden_helm_female.png', 'parent': 'head', 'req': 'female', 'block': 'style', 'layer': 6},
    {'id': 'female_bandana_red', 'path': 'head/bandanas/female/red.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    {'id': 'female_bandana_blue', 'path': 'head/bandanas/female/blue.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    {'id': 'female_bandana_black', 'path': 'head/bandanas/female/black.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    //hands
    {'id': 'hands_none', 'path': '', 'parent': 'hands', 'layer': 1, 'default': true},
    {'id': 'male_gold-gauntlet', 'path': 'hands/gloves/male/golden_gloves_male.png', 'parent': 'hands', 'req': 'male', 'layer': 1, 'scale': 1.4, 'posy': -10},
    {'id': 'male_metal-gauntlet', 'path': 'hands/gloves/male/metal_gloves_male.png', 'parent': 'hands', 'req': 'male', 'layer': 1, 'scale': 1.4, 'posy': -10},
    {'id': 'female_gold-gauntlet', 'path': 'hands/gloves/female/golden_gloves_female.png', 'parent': 'hands', 'req': 'female', 'layer': 1, 'scale': 1.4, 'posy': -10},
    {'id': 'female_metal-gauntlet', 'path': 'hands/gloves/female/metal_gloves_female.png', 'parent': 'hands', 'req': 'female', 'layer': 1, 'scale': 1.4, 'posy': -10},
    //shoulder
    {'id': 'shoulder_none', 'path': '', 'parent': 'shoulder', 'layer': 1, 'default': true},
    {'id': 'male_gold-shoulder', 'path': 'torso/gold/arms_male.png', 'parent': 'shoulder', 'req': 'male', 'layer': 3},
    {'id': 'male_metal-shoulder', 'path': 'torso/plate/arms_male.png', 'parent': 'shoulder', 'req': 'male', 'layer': 3},
    {'id': 'male_leather-shoulder', 'path': 'torso/leather/shoulders_male.png', 'parent': 'shoulder', 'req': 'male', 'layer': 3},
    {'id': 'female_gold-shoulder', 'path': 'torso/gold/arms_female.png', 'parent': 'shoulder', 'req': 'female', 'layer': 3},
    {'id': 'female_metal-shoulder', 'path': 'torso/plate/arms_female.png', 'parent': 'shoulder', 'req': 'female', 'layer': 3},
    {'id': 'female_leather-shoulder', 'path': 'torso/leather/shoulders_female.png', 'parent': 'shoulder', 'req': 'female', 'layer': 3},
    //feet
    {'id': 'feet_none', 'path': '', 'parent': 'feet', 'layer': 1, 'default': true},
    {'id': 'male_gold-feet', 'path': 'feet/armor/male/golden_boots_male.png', 'parent': 'feet', 'req': 'male', 'layer': 2, 'scale': 1.5, 'posy': -25},
    {'id': 'male_metal-feet', 'path': 'feet/armor/male/metal_boots_male.png', 'parent': 'feet', 'req': 'male', 'layer': 2, 'scale': 1.5, 'posy': -25},
    {'id': 'male_shoes_black', 'path': 'feet/shoes/male/black_shoes_male.png', 'parent': 'feet', 'req': 'male', 'layer': 2, 'scale': 1.5, 'posy': -25},
    {'id': 'male_shoes_brown', 'path': 'feet/shoes/male/brown_shoes_male.png', 'parent': 'feet', 'req': 'male', 'layer': 2, 'scale': 1.5, 'posy': -25},
    {'id': 'female_gold-feet', 'path': 'feet/armor/female/golden_boots_female.png', 'parent': 'feet', 'req': 'female', 'layer': 2, 'scale': 1.5, 'posy': -25},
    {'id': 'female_metal-feet', 'path': 'feet/armor/female/metal_boots_female.png', 'parent': 'feet', 'req': 'female', 'layer': 2, 'scale': 1.5, 'posy': -25},
    {'id': 'female_shoes_black', 'path': 'feet/shoes/female/black_shoes_female.png', 'parent': 'feet', 'req': 'female', 'layer': 2, 'scale': 1.5, 'posy': -25},
    {'id': 'female_shoes_brown', 'path': 'feet/shoes/female/brown_shoes_female.png', 'parent': 'feet', 'req': 'female', 'layer': 2, 'scale': 1.5, 'posy': -25},
    //melee weapons
    {'id': 'melee_none', 'path': '', 'parent': 'melee', 'layer': 1, 'default': true},
    //ranged weapons
    {'id': 'ranged_none', 'path': '', 'parent': 'ranged', 'layer': 1, 'default': true},
    {'id': 'bow', 'path': 'weapons/shoot/bow.png', 'parent': 'ranged', 'select': 'arrows', 'layer': 6, 'line': 17, 'col': 3, 'move': 'shoot'},
    {'id': 'greatbow', 'path': 'weapons/shoot/greatbow.png', 'parent': 'ranged', 'select': 'arrows', 'layer': 6, 'line': 17, 'col': 3, 'move': 'shoot'},
    {'id': 'recurvebow', 'path': 'weapons/shoot/recurvebow.png', 'parent': 'ranged', 'select': 'arrows', 'layer': 6, 'line': 17, 'col': 3, 'move': 'shoot'},
    {'id': 'arcoreal', 'path': 'weapons/shoot/arcoreal.png', 'parent': 'ranged', 'select': 'arrows', 'layer': 6, 'line': 17, 'col': 3, 'move': 'shoot'},
    {'id': 'arrows', 'path': 'weapons/misc/arrow.png', 'parent': 'none', 'layer': 1},
    //shield
    {'id': 'shield_none', 'path': '', 'parent': 'shield', 'layer': 1, 'default': true},
    //belt
    {'id': 'belt_none', 'path': '', 'parent': 'belt', 'layer': 1, 'default': true},
    {'id': 'male_belt_white-cloth', 'path': 'belt/cloth/male/white_cloth_male.png', 'parent': 'belt', 'req': 'male', 'layer': 4, 'scale': 1.5, 'posy': -10},
    {'id': 'male_belt_leather', 'path': 'belt/leather/male/leather_male.png', 'parent': 'belt', 'req': 'male', 'layer': 4, 'scale': 1.5, 'posy': -10},
    {'id': 'female_belt_white-cloth', 'path': 'belt/cloth/female/white_cloth_female.png', 'parent': 'belt', 'req': 'female', 'layer': 4, 'scale': 1.5, 'posy': -10},
    {'id': 'female_belt_leather', 'path': 'belt/leather/female/leather_female.png', 'parent': 'belt', 'req': 'female', 'layer': 4, 'scale': 1.5, 'posy': -10},
    //cape
    {'id': 'cape_none', 'path': '', 'parent': 'cape', 'layer': 1, 'default': true},
    //oversize
    {'id': 'oversize_spear', 'path': 'weapons/oversize/two hand/either/spear.png', 'parent': 'melee', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'thrust', 'oversize': true, 'scale': 1.7, 'posx': 50, 'posy': 40},
    {'id': 'oversize_dragonspear', 'path': 'weapons/oversize/two hand/either/dragonspear.png', 'parent': 'melee', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'thrust', 'oversize': true, 'scale': 1.7, 'posx': 50, 'posy': 40},
    {'id': 'oversize_trident', 'path': 'weapons/oversize/two hand/either/trident.png', 'parent': 'melee', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'thrust', 'oversize': true, 'scale': 1.7, 'posx': 50, 'posy': 40},
    {'id': 'male_oversize_mace', 'path': 'weapons/oversize/right hand/male/mace_male.png', 'parent': 'melee', 'req': 'male', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    {'id': 'male_oversize_longsword', 'path': 'weapons/oversize/right hand/male/longsword_male.png', 'parent': 'melee', 'req': 'male', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    {'id': 'male_oversize_rapier', 'path': 'weapons/oversize/right hand/male/rapier_male.png', 'parent': 'melee', 'req': 'male', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    {'id': 'male_oversize_saber', 'path': 'weapons/oversize/right hand/male/saber_male.png', 'parent': 'melee', 'req': 'male', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    {'id': 'female_oversize_mace', 'path': 'weapons/oversize/right hand/female/mace_female.png', 'parent': 'melee', 'req': 'female', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    {'id': 'female_oversize_longsword', 'path': 'weapons/oversize/right hand/female/longsword_female.png', 'parent': 'melee', 'req': 'female', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    {'id': 'female_oversize_rapier', 'path': 'weapons/oversize/right hand/female/rapier_female.png', 'parent': 'melee', 'req': 'female', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    {'id': 'female_oversize_saber', 'path': 'weapons/oversize/right hand/female/saber_female.png', 'parent': 'melee', 'req': 'female', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
];

const GENDERS = ['male', 'female'];

const HAIR_COLORS = ['black', 'blonde', 'blonde2', 'blue', 'blue2', 'brown', 'brown2', 'brunette', 'brunette2', 'dark-blonde', 'gold', 'gray', 'gray2', 'green', 'green2', 'light-blonde', 'light-blonde2', 'pink', 'pink2', 'purple', 'raven', 'raven2', 'redhead', 'redhead2', 'ruby-red', 'white', 'white-blonde', 'white-blonde2', 'white-cyan'];
const BEARDS = ['beard', 'bigstache', 'frenchstache', 'mustache'];
const HAIRSTYLES = ['bangs', 'bangslong', 'bangslong2', 'bangsshort', 'bedhead', 'bunches', 'jewfro', 'long', 'longhawk', 'longknot', 'loose', 'messy1', 'messy2', 'mohawk', 'page', 'page2', 'parted', 'pixie', 'plain', 'ponytail', 'ponytail2', 'princess', 'shorthawk', 'shortknot', 'shoulderl', 'shoulderr', 'swoop', 'unkempt', 'xlong', 'xlongknot'];

const SHIRT_COLORS = ['black', 'blue', 'brown', 'green', 'pink', 'purple', 'red', 'teal', 'white', 'yellow'];
/** Shirt styles per gender, with the sheet path of each colour. */
const SHIRTS = {
    male: [['longsleeve', color => `torso/shirts/longsleeve/male/${color}_longsleeve.png`]],
    female: [
        ['pirate', color => `torso/shirts/sleeveless/female/${color}_pirate.png`],
        ['sleeveless', color => `torso/shirts/sleeveless/female/${color}_sleeveless.png`],
        ['corset', color => `torso/corset_female/corset_${color}.png`],
    ],
};

const PANTS_COLORS = ['black', 'dark-blue', 'teal', 'green', 'brown', 'red', 'magenta', 'white'];

const WEAPONS = [
    { name: 'spear', move: 'thrust', line: 5 },
    { name: 'staff', move: 'thrust', line: 5 },
    { name: 'dagger', move: 'slash', line: 13 },
    { name: 'woodwand', move: 'slash', line: 13 },
    { name: 'steelwand', move: 'slash', line: 13 },
    { name: 'sword', move: 'slash', line: 13 },
    { name: 'warhammer', move: 'slash', line: 13 },
];

const SHIELDS = ['1', '9', '10', '5', '6', '3', '4', '7', '8'];

const CAPE_COLORS = ['black', 'blue', 'brown', 'gray', 'green', 'lavender', 'pink', 'red', 'white', 'yellow'];
const CAPES = [['cape', 'normal'], ['tattercape', 'tattered']];

const OVERSIZE_SWORDS = ['1', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27'];

/**
 * The layers built from combinations: beards and hair in every colour,
 * shirts, pants, weapons, shields, capes (each with the part drawn behind
 * the body) and the oversize sword pack.
 *
 * @returns {object[]}
 */
function generatedImages() {
    const images = [];

    BEARDS.forEach(style => HAIR_COLORS.forEach(color => images.push(
        { id: `${style}_${color}`, path: `facial/male/${style}/${color}.png`, parent: ['facial', 'bcolor'], layer: 1, scale: 4 },
    )));
    HAIRSTYLES.forEach(style => HAIR_COLORS.forEach(color => images.push(
        { id: `${style}_${color}`, path: `hair/male/${style}/${color}.png`, parent: ['style', 'color'], layer: 5 },
    )));

    GENDERS.forEach(gender => SHIRT_COLORS.forEach(color => SHIRTS[gender].forEach(([style, path]) => images.push(
        { id: `${gender}_${style}_${color}`, path: path(color), parent: 'shirt', req: gender, layer: 1 },
    ))));

    GENDERS.forEach(gender => PANTS_COLORS.forEach(color => images.push(
        { id: `${gender}_pants_${color}`, path: `legs/pants/${gender}/${color}_pants_${gender}.png`, parent: 'legs', req: gender, layer: 1 },
    )));

    GENDERS.forEach(gender => WEAPONS.forEach(({ name, move, line }) => images.push(
        { id: `${gender}_${name}`, path: `weapons/${move}/${gender}/${name}.png`, parent: 'melee', req: gender, layer: { default: 6, down: 7 }, line, move },
    )));

    GENDERS.forEach(gender => SHIELDS.forEach(name => images.push(
        { id: `${gender}_shield_${name}`, path: `weapons/shield pack/${gender}/${name}.png`, parent: 'shield', req: gender, layer: 6 },
    )));

    CAPES.forEach(([kind, folder]) => CAPE_COLORS.forEach(color => images.push(
        { id: `${kind}_${color}`, path: `torso/back/cape/${folder}/female/${kind}_${color}.png`, parent: 'cape', layer: 4, select: `${kind}_${color}_behind`, line: 8 },
        { id: `${kind}_${color}_behind`, path: `behind_body/cape/${folder}/female/${kind}_${color}.png`, parent: 'none', layer: -1, line: 8 },
    )));

    GENDERS.forEach(gender => OVERSIZE_SWORDS.forEach(name => images.push(
        { id: `${gender}_oversize_${name}`, path: `weapons/weapon pack/${gender}/bigslash/${name}.png`, parent: 'melee', req: gender, layer: { default: 6, down: 7 }, line: 1, move: 'slash', oversize: true, scale: 3, posx: 150, posy: 110 },
    )));

    return images;
}

/** Every sprite layer, in catalogue order. */
export const images = [...BASE_IMAGES, ...generatedImages()];

const byId = new Map(images.map(image => [image.id, image]));

/**
 * A layer of the catalogue.
 *
 * @param {string} id Layer id.
 * @returns {object|undefined}
 */
export function getImage(id) {
    return byId.get(id);
}

/**
 * Whether a set of layers makes a drawable gladiator (it needs a body).
 *
 * @param {object[]} layers Catalogue layers.
 * @returns {boolean}
 */
export function validateSkin(layers) {
    return layers.some(layer => layer?.parent === 'shape');
}
