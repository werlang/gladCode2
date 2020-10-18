export const assets = {}

// private
const images = {
    //gender
    'male': {'path': 'male.png', 'png': true, 'height': 256, 'width': 256, 'parent': 'gender', 'default': true},
    'female': {'path': 'female.png', 'png': true, 'height': 256, 'width': 256, 'parent': 'gender'},
    //male body
    'male-light': {'path': 'body/male/light.png', 'parent': 'shape', 'req': 'male', 'layer': 0, 'default': true},
    'male-tanned': {'path': 'body/male/tanned.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-tanned2': {'path': 'body/male/tanned2.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-olive': {'path': 'body/male/man_olive.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-dark': {'path': 'body/male/dark.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-brown': {'path': 'body/male/man_brown.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-dark2': {'path': 'body/male/dark2.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-black': {'path': 'body/male/man_black.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-darkelf2': {'path': 'body/male/darkelf2.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-darkelf': {'path': 'body/male/darkelf.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-orc': {'path': 'body/male/orc.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'male-red_orc': {'path': 'body/male/red_orc.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    'skeleton': {'path': 'body/male/skeleton.png', 'parent': 'shape', 'req': 'male', 'layer': 0},
    //female body
    'female-light': {'path': 'body/female/light.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-tanned': {'path': 'body/female/tanned.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-tanned2': {'path': 'body/female/tanned2.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-olive': {'path': 'body/female/woman_olive.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-dark': {'path': 'body/female/dark.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-brown': {'path': 'body/female/woman_brown.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-dark2': {'path': 'body/female/dark2.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-black': {'path': 'body/female/woman_black.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-darkelf2': {'path': 'body/female/darkelf2.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-darkelf': {'path': 'body/female/darkelf.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-orc': {'path': 'body/female/orc.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    'female-red_orc': {'path': 'body/female/red_orc.png', 'parent': 'shape', 'req': 'female', 'layer': 0},
    //hair style
    'hair_none': {'path': '', 'parent': 'style', 'layer': 1, 'default': true},
    //beards
    'facial_none': {'path': '', 'parent': 'facial', 'layer': 1, 'default': true},
    'fiveoclock_black': {'path': 'facial/male/fiveoclock/black.png', 'parent': 'facial', 'layer': 1, 'block': 'bcolor', 'scale': 4},
    //eyes
    'eyes_blue': {'path': 'body/male/eyes/blue.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    'eyes_brown': {'path': 'body/male/eyes/brown.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    'eyes_gray': {'path': 'body/male/eyes/gray.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    'eyes_green': {'path': 'body/male/eyes/green.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    'eyes_orange': {'path': 'body/male/eyes/orange.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    'eyes_purple': {'path': 'body/male/eyes/purple.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    'eyes_red': {'path': 'body/male/eyes/red.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    'eyes_yellow': {'path': 'body/male/eyes/yellow.png', 'parent': 'eyes', 'layer': 1, 'scale': 3},
    //ears
    'default_ears': {'path': '', 'parent': 'ears', 'layer': 1, 'default': true},
    'bigears_dark': {'path': 'body/male/ears/bigears_dark.png', 'parent': 'ears', 'req': {'or': ['male-dark', 'female-dark']}, 'layer': 1, 'scale': 2},
    'bigears_dark2': {'path': 'body/male/ears/bigears_dark2.png', 'parent': 'ears', 'req': {'or': ['male-dark2', 'female-dark2']}, 'layer': 1, 'scale': 2},
    'bigears_darkelf': {'path': 'body/male/ears/bigears_darkelf.png', 'parent': 'ears', 'req': {'or': ['male-darkelf', 'female-darkelf']}, 'layer': 1, 'scale': 2},
    'bigears_darkelf2': {'path': 'body/male/ears/bigears_darkelf2.png', 'parent': 'ears', 'req': {'or': ['male-darkelf2', 'female-darkelf2']}, 'layer': 1, 'scale': 2},
    'bigears_light': {'path': 'body/male/ears/bigears_light.png', 'parent': 'ears', 'req': {'or': ['male-light', 'female-light']}, 'layer': 1, 'scale': 2},
    'bigears_tanned': {'path': 'body/male/ears/bigears_tanned.png', 'parent': 'ears', 'req': {'or': ['male-tanned', 'female-tanned']}, 'layer': 1, 'scale': 2},
    'bigears_tanned2': {'path': 'body/male/ears/bigears_tanned2.png', 'parent': 'ears', 'req': {'or': ['male-tanned2', 'female-tanned2']}, 'layer': 1, 'scale': 2},
    'elvenears_dark': {'path': 'body/male/ears/elvenears_dark.png', 'parent': 'ears', 'req': {'or': ['male-dark', 'female-dark']}, 'layer': 1, 'scale': 2},
    'elvenears_dark2': {'path': 'body/male/ears/elvenears_dark2.png', 'parent': 'ears', 'req': {'or': ['male-dark2', 'female-dark2']}, 'layer': 1, 'scale': 2},
    'elvenears_darkelf': {'path': 'body/male/ears/elvenears_darkelf.png', 'parent': 'ears', 'req': {'or': ['male-darkelf', 'female-darkelf']}, 'layer': 1, 'scale': 2},
    'elvenears_darkelf2': {'path': 'body/male/ears/elvenears_darkelf2.png', 'parent': 'ears', 'req': {'or': ['male-darkelf2', 'female-darkelf2']}, 'layer': 1, 'scale': 2},
    'elvenears_light': {'path': 'body/male/ears/elvenears_light.png', 'parent': 'ears', 'req': {'or': ['male-light', 'female-light']}, 'layer': 1, 'scale': 2},
    'elvenears_tanned': {'path': 'body/male/ears/elvenears_tanned.png', 'parent': 'ears', 'req': {'or': ['male-tanned', 'female-tanned']}, 'layer': 1, 'scale': 2},
    'elvenears_tanned2': {'path': 'body/male/ears/elvenears_tanned2.png', 'parent': 'ears', 'req': {'or': ['male-tanned2', 'female-tanned2']}, 'layer': 1, 'scale': 2},
    //shirt
    'shirt_none': {'path': '', 'parent': 'shirt', 'layer': 1, 'default': true},
    'female_bikini': {'path': 'torso/dress_female/blue_vest.png', 'parent': 'shirt', 'req': 'female', 'layer': 1},
    'female_dress': {'path': 'torso/dress_female/underdress.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    'female_dress_sash': {'path': 'torso/dress_female/dress_w_sash_female.png', 'parent': 'shirt', 'req': 'female', 'layer': 2, 'block': ['legs', 'armor']},
    'female_tightdress_black': {'path': 'torso/dress_female/tightdress_black.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    'female_tightdress_red': {'path': 'torso/dress_female/tightdress_red.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    'female_tightdress_white': {'path': 'torso/dress_female/tightdress_white.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    'female_tightdress_lightblue': {'path': 'torso/dress_female/tightdress_lightblue.png', 'parent': 'shirt', 'req': 'female', 'layer': 3, 'block': ['legs', 'armor']},
    //armor
    'armor_none': {'path': '', 'parent': 'armor', 'layer': 2, 'default': true},
    'male_chain': {'path': 'torso/chain/mail_male.png', 'parent': 'armor', 'req': 'male', 'layer': 2},
    'male_leather-chest': {'path': 'torso/leather/chest_male.png', 'parent': 'armor', 'req': 'male', 'layer': 2},
    'male_plate-chest': {'path': 'torso/plate/chest_male.png', 'parent': 'armor', 'req': 'male', 'layer': 2},
    'male_gold-chest': {'path': 'torso/gold/chest_male.png', 'parent': 'armor', 'req': 'male', 'layer': 2},
    'female_chain': {'path': 'torso/chain/mail_female.png', 'parent': 'armor', 'req': 'female', 'layer': 2},
    'female_leather-chest': {'path': 'torso/leather/chest_female.png', 'parent': 'armor', 'req': 'female', 'layer': 2},
    'female_plate-chest': {'path': 'torso/plate/chest_female.png', 'parent': 'armor', 'req': 'female', 'layer': 2},
    'female_gold-chest': {'path': 'torso/gold/chest_female.png', 'parent': 'armor', 'req': 'female', 'layer': 2},
    //legs
    'legs_none': {'path': '', 'parent': 'legs', 'layer': 1, 'default': true},
    'male_plate-legs': {'path': 'legs/armor/male/metal_pants_male.png', 'parent': 'legs', 'req': 'male', 'layer': 1},
    'male_gold-legs': {'path': 'legs/armor/male/golden_greaves_male.png', 'parent': 'legs', 'req': 'male', 'layer': 1},
    'male_robe-skirt': {'path': 'legs/skirt/male/robe_skirt_male.png', 'parent': 'legs', 'req': 'male', 'layer': 3},
    'female_plate-legs': {'path': 'legs/armor/female/metal_pants_female.png', 'parent': 'legs', 'req': 'female', 'layer': 1},
    'female_gold-legs': {'path': 'legs/armor/female/golden_greaves_female.png', 'parent': 'legs', 'req': 'female', 'layer': 1},
    'female_robe-skirt': {'path': 'legs/skirt/female/robe_skirt_female.png', 'parent': 'legs', 'req': 'female', 'layer': 3},
    //head
    'head_none': {'path': '', 'parent': 'head', 'layer': 2, 'default': true},
    'male_cap': {'path': 'head/caps/male/leather_cap_male.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    'male_wizard-hat': {'path': 'head/caps/male/wizard_hat_male.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    'male_cloth-hood': {'path': 'head/hoods/male/cloth_hood_male.png', 'parent': 'head', 'req': 'male', 'block': 'style', 'layer': 6},
    'male_chain-hood': {'path': 'head/hoods/male/chain_hood_male.png', 'parent': 'head', 'req': 'male', 'block': 'style', 'layer': 6},
    'male_chain-hat': {'path': 'head/helms/male/chainhat_male.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    'male_metal-helmet': {'path': 'head/helms/male/metal_helm_male.png', 'parent': 'head', 'req': 'male', 'block': 'style', 'layer': 6},
    'male_gold-helmet': {'path': 'head/helms/male/golden_helm_male.png', 'parent': 'head', 'req': 'male', 'block': 'style', 'layer': 6},
    'male_bandana_red': {'path': 'head/bandanas/male/red.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    'male_bandana_blue': {'path': 'head/bandanas/male/blue.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    'male_bandana_black': {'path': 'head/bandanas/male/black.png', 'parent': 'head', 'req': 'male', 'layer': 6},
    'female_cap': {'path': 'head/caps/female/leather_cap_female.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    'female_wizard-hat': {'path': 'head/caps/female/wizard_hat_female.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    'female_cloth-hood': {'path': 'head/hoods/female/cloth_hood_female.png', 'parent': 'head',  'req': 'female', 'block': 'style', 'layer': 6},
    'female_chain-hood': {'path': 'head/hoods/female/chain_hood_female.png', 'parent': 'head',  'req': 'female', 'block': 'style', 'layer': 6},
    'female_chain-hat': {'path': 'head/helms/female/chainhat_female.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    'female_metal-helmet': {'path': 'head/helms/female/metal_helm_female.png', 'parent': 'head', 'req': 'female', 'block': 'style', 'layer': 6},
    'female_gold-helmet': {'path': 'head/helms/female/golden_helm_female.png', 'parent': 'head', 'req': 'female', 'block': 'style', 'layer': 6},
    'female_bandana_red': {'path': 'head/bandanas/female/red.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    'female_bandana_blue': {'path': 'head/bandanas/female/blue.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    'female_bandana_black': {'path': 'head/bandanas/female/black.png', 'parent': 'head', 'req': 'female', 'layer': 6},
    //hands
    'hands_none': {'path': '', 'parent': 'hands', 'layer': 1, 'default': true},
    'male_gold-gauntlet': {'path': 'hands/gloves/male/golden_gloves_male.png', 'parent': 'hands', 'req': 'male', 'layer': 1, 'scale': 1.4, 'posy': -10},
    'male_metal-gauntlet': {'path': 'hands/gloves/male/metal_gloves_male.png', 'parent': 'hands', 'req': 'male', 'layer': 1, 'scale': 1.4, 'posy': -10},
    'female_gold-gauntlet': {'path': 'hands/gloves/female/golden_gloves_female.png', 'parent': 'hands', 'req': 'female', 'layer': 1, 'scale': 1.4, 'posy': -10},
    'female_metal-gauntlet': {'path': 'hands/gloves/female/metal_gloves_female.png', 'parent': 'hands', 'req': 'female', 'layer': 1, 'scale': 1.4, 'posy': -10},
    //shoulder
    'shoulder_none': {'path': '', 'parent': 'shoulder', 'layer': 1, 'default': true},
    'male_gold-shoulder': {'path': 'torso/gold/arms_male.png', 'parent': 'shoulder', 'req': 'male', 'layer': 3},
    'male_metal-shoulder': {'path': 'torso/plate/arms_male.png', 'parent': 'shoulder', 'req': 'male', 'layer': 3},
    'male_leather-shoulder': {'path': 'torso/leather/shoulders_male.png', 'parent': 'shoulder', 'req': 'male', 'layer': 3},
    'female_gold-shoulder': {'path': 'torso/gold/arms_female.png', 'parent': 'shoulder', 'req': 'female', 'layer': 3},
    'female_metal-shoulder': {'path': 'torso/plate/arms_female.png', 'parent': 'shoulder', 'req': 'female', 'layer': 3},
    'female_leather-shoulder': {'path': 'torso/leather/shoulders_female.png', 'parent': 'shoulder', 'req': 'female', 'layer': 3},
    //feet
    'feet_none': {'path': '', 'parent': 'feet', 'layer': 1, 'default': true},
    'male_gold-feet': {'path': 'feet/armor/male/golden_boots_male.png', 'parent': 'feet', 'req': 'male', 'layer': 2, 'scale': 1.5, 'posy': -25},
    'male_metal-feet': {'path': 'feet/armor/male/metal_boots_male.png', 'parent': 'feet', 'req': 'male', 'layer': 2, 'scale': 1.5, 'posy': -25},
    'male_shoes_black': {'path': 'feet/shoes/male/black_shoes_male.png', 'parent': 'feet', 'req': 'male', 'layer': 2, 'scale': 1.5, 'posy': -25},
    'male_shoes_brown': {'path': 'feet/shoes/male/brown_shoes_male.png', 'parent': 'feet', 'req': 'male', 'layer': 2, 'scale': 1.5, 'posy': -25},
    'female_gold-feet': {'path': 'feet/armor/female/golden_boots_female.png', 'parent': 'feet', 'req': 'female', 'layer': 2, 'scale': 1.5, 'posy': -25},
    'female_metal-feet': {'path': 'feet/armor/female/metal_boots_female.png', 'parent': 'feet', 'req': 'female', 'layer': 2, 'scale': 1.5, 'posy': -25},
    'female_shoes_black': {'path': 'feet/shoes/female/black_shoes_female.png', 'parent': 'feet', 'req': 'female', 'layer': 2, 'scale': 1.5, 'posy': -25},
    'female_shoes_brown': {'path': 'feet/shoes/female/brown_shoes_female.png', 'parent': 'feet', 'req': 'female', 'layer': 2, 'scale': 1.5, 'posy': -25},
    //melee weapons
    'melee_none': {'path': '', 'parent': 'melee', 'layer': 1, 'default': true},
    //ranged weapons
    'ranged_none': {'path': '', 'parent': 'ranged', 'layer': 1, 'default': true},
    'bow': {'path': 'weapons/shoot/bow.png', 'parent': 'ranged', 'select': 'arrows', 'layer': 6, 'line': 17, 'col': 3, 'move': 'shoot'},
    'greatbow': {'path': 'weapons/shoot/greatbow.png', 'parent': 'ranged', 'select': 'arrows', 'layer': 6, 'line': 17, 'col': 3, 'move': 'shoot'},
    'recurvebow': {'path': 'weapons/shoot/recurvebow.png', 'parent': 'ranged', 'select': 'arrows', 'layer': 6, 'line': 17, 'col': 3, 'move': 'shoot'},
    'arcoreal': {'path': 'weapons/shoot/arcoreal.png', 'parent': 'ranged', 'select': 'arrows', 'layer': 6, 'line': 17, 'col': 3, 'move': 'shoot'},
    'arrows': {'path': 'weapons/misc/arrow.png', 'parent': 'none', 'layer': 1},
    //shield
    'shield_none': {'path': '', 'parent': 'shield', 'layer': 1, 'default': true},
    //belt
    'belt_none': {'path': '', 'parent': 'belt', 'layer': 1, 'default': true},
    'male_belt_white-cloth': {'path': 'belt/cloth/male/white_cloth_male.png', 'parent': 'belt', 'req': 'male', 'layer': 4, 'scale': 1.5, 'posy': -10},
    'male_belt_leather': {'path': 'belt/leather/male/leather_male.png', 'parent': 'belt', 'req': 'male', 'layer': 4, 'scale': 1.5, 'posy': -10},
    'female_belt_white-cloth': {'path': 'belt/cloth/female/white_cloth_female.png', 'parent': 'belt', 'req': 'female', 'layer': 4, 'scale': 1.5, 'posy': -10},
    'female_belt_leather': {'path': 'belt/leather/female/leather_female.png', 'parent': 'belt', 'req': 'female', 'layer': 4, 'scale': 1.5, 'posy': -10},
    //cape
    'cape_none': {'path': '', 'parent': 'cape', 'layer': 1, 'default': true},
    //oversize
    'oversize_spear': {'path': 'weapons/oversize/two hand/either/spear.png', 'parent': 'melee', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'thrust', 'oversize': true, 'scale': 1.7, 'posx': 50, 'posy': 40},
    'oversize_dragonspear': {'path': 'weapons/oversize/two hand/either/dragonspear.png', 'parent': 'melee', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'thrust', 'oversize': true, 'scale': 1.7, 'posx': 50, 'posy': 40},
    'oversize_trident': {'path': 'weapons/oversize/two hand/either/trident.png', 'parent': 'melee', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'thrust', 'oversize': true, 'scale': 1.7, 'posx': 50, 'posy': 40},
    'male_oversize_mace': {'path': 'weapons/oversize/right hand/male/mace_male.png', 'parent': 'melee', 'req': 'male', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    'male_oversize_longsword': {'path': 'weapons/oversize/right hand/male/longsword_male.png', 'parent': 'melee', 'req': 'male', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    'male_oversize_rapier': {'path': 'weapons/oversize/right hand/male/rapier_male.png', 'parent': 'melee', 'req': 'male', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    'male_oversize_saber': {'path': 'weapons/oversize/right hand/male/saber_male.png', 'parent': 'melee', 'req': 'male', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    'female_oversize_mace': {'path': 'weapons/oversize/right hand/female/mace_female.png', 'parent': 'melee', 'req': 'female', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    'female_oversize_longsword': {'path': 'weapons/oversize/right hand/female/longsword_female.png', 'parent': 'melee', 'req': 'female', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    'female_oversize_rapier': {'path': 'weapons/oversize/right hand/female/rapier_female.png', 'parent': 'melee', 'req': 'female', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
    'female_oversize_saber': {'path': 'weapons/oversize/right hand/female/saber_female.png', 'parent': 'melee', 'req': 'female', 'layer': {'default': 6, 'down': 7}, 'line': 1, 'move': 'slash', 'oversize': true, 'scale': 3, 'posx': 150, 'posy': 110},
}

assets.fill = function(){
    let colors = ['black', 'blonde', 'blonde2', 'blue', 'blue2', 'brown', 'brown2', 'brunette', 'brunette2', 'dark-blonde', 'gold', 'gray', 'gray2', 'green', 'green2', 'light-blonde', 'light-blonde2', 'pink', 'pink2', 'purple', 'raven', 'raven2', 'redhead', 'redhead2', 'ruby-red', 'white', 'white-blonde', 'white-blonde2', 'white-cyan'];

    let styles = [
        ['beard', 'bigstache', 'frenchstache', 'mustache'],
        ['bangs', 'bangslong', 'bangslong2', 'bangsshort', 'bedhead', 'bunches', 'jewfro', 'long', 'longhawk', 'longknot', 'loose', 'messy1', 'messy2', 'mohawk', 'page', 'page2', 'parted', 'pixie', 'plain', 'ponytail', 'ponytail2', 'princess', 'shorthawk', 'shortknot', 'shoulderl', 'shoulderr', 'swoop', 'unkempt', 'xlong', 'xlongknot']
    ];

    // beards
    styles[0].forEach(s => colors.forEach(c => {
        images[`${s}_${c}`] = {path: `facial/male/${s}/${c}.png`, parent: ["facial", "bcolor"], layer: 1, scale: 4}
    }))

    // heair
    styles[1].forEach(s => colors.forEach(c => {
        images[`${s}_${c}`] = {path: `hair/male/${s}/${c}.png`, parent: ["style", "color"], layer: 5}
    }))

    //shirts
    colors = ['black', 'blue', 'brown', 'green', 'pink', 'purple', 'red', 'teal', 'white', 'yellow'];
    styles = [
        ['longsleeve'],
        ['pirate', 'sleeveless', 'corset']
    ];
    let gender = ['male', 'female'];

    gender.forEach((g,gi) => colors.forEach(c => styles[gi].forEach((s,si) => {
        const path = [
            [`torso/shirts/longsleeve/male/${c}_${s}.png`],
            [`torso/shirts/sleeveless/female/${c}_${s}.png`, `torso/shirts/sleeveless/female/${c}_${s}.png`, `torso/corset_female/${s}_${c}.png`]
        ]
        images[`${g}_${s}_${c}`] = {path: path[gi][si], parent: "shirt", req: g, layer: 1}
    })))

    //pants
    colors = ['black', 'dark-blue', 'teal', 'green', 'brown', 'red', 'magenta', 'white'];

    gender.forEach(g => colors.forEach(c => {
        images[`${g}_pants_${c}`] = {path: `legs/pants/${g}/${c}_pants_${g}.png`, parent: "legs", req: g, layer: 1}
    }))

    //weapons
    let weapons = [
        {'name': 'spear', 'type': 'thrust', 'line': 5},
        {'name': 'staff', 'type': 'thrust', 'line': 5},
        {'name': 'dagger', 'type': 'slash', 'line': 13},
        {'name': 'woodwand', 'type': 'slash', 'line': 13},
        {'name': 'steelwand', 'type': 'slash', 'line': 13},
        {'name': 'sword', 'type': 'slash', 'line': 13},
        {'name': 'warhammer', 'type': 'slash', 'line': 13},
    ]

    gender.forEach(g => weapons.forEach(w => {
        images[`${g}_${w.name}`] = {path: `weapons/${w.type}/${g}/${w.name}.png`, parent: "melee", req: g, layer: {default: 6, down: 7}, line: w.line, move: w.type}
    }))

    //shields
    var names = ['1', '9', '10', '5', '6', '3', '4', '7', '8'];

    gender.forEach(g => names.forEach(n => {
        images[`${g}_shield_${n}`] = {path: `weapons/shield pack/${g}/${n}.png`, parent: "shield", req: g, layer: 6}
    }))

    //cape
    colors = ['black', 'blue', 'brown', 'gray', 'green', 'lavender', 'pink', 'red', 'white', 'yellow'];

    colors.forEach(c => {
        images[`cape_${c}`] = {path: `torso/back/cape/normal/female/cape_${c}.png`, parent: "cape", layer: 4, select: `cape_${c}_behind`, line: 8}
        images[`cape_${c}_behind`] = {path: `behind_body/cape/normal/female/cape_${c}.png`, parent: "none", layer: -1, line: 8}
        images[`tattercape_${c}`] = {path: `torso/back/cape/tattered/female/tattercape_${c}.png`, parent: "cape", layer: 4, select: `tattercape_${c}_behind`, line: 8}
        images[`tattercape_${c}_behind`] = {path: `behind_body/cape/tattered/female/tattercape_${c}.png`, parent: "none", layer: -1, line: 8}
    })

    //overside weapons sword pack
    names = ['1', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27'];

    gender.forEach(g => names.forEach(n => {
        images[`${g}_oversize_${n}`] = {path: `weapons/weapon pack/${g}/bigslash/${n}.png`, parent: "melee", req: g, layer: {default: 6, down: 7}, line: 1, move: "slash", oversize: true, scale: 3, posx: 150, posy: 110}
    }))
}

assets.fetchSpritesheet = async function(json) {
    return await new Promise(resolve => {
        const move = {
            walk: {'sprites': 9, 'line': 8},
            cast: {'sprites': 7, 'line': 0},
            thrust: {'sprites': 8, 'line': 4},
            slash: {'sprites': 6, 'line': 12},
            shoot: {'sprites': 13, 'line': 16},
        };

        var errorload = false;
        try{
            json = JSON.parse(json);
        }
        catch(error){
            errorload = true;
            json = {};
        }

        let spritesheet = document.createElement("canvas");
        spritesheet.setAttribute("width", 192 * 13);
        spritesheet.setAttribute("height", 192 * 21);
        let spritectx = spritesheet.getContext("2d");

        const selectedArray = [];
        json.filter(e => this.getImage(e)).forEach(e => {
            selectedArray.push(this.getImage(e))
        })
    

        if (!this.validateSkin(selectedArray)){
            errorload = true
        }

        if (!errorload){
            selectedArray.sort(function(a, b){
                if (a.layer == null)
                    return -1;
                else if (b.layer == null)
                    return 1;
                else{
                    if (typeof a.layer === 'object')
                        a.layer = a.layer.down;
                    if (typeof b.layer === 'object')
                        b.layer = b.layer.down;
                    return a.layer - b.layer;
                }
            });

            spritectx.clearRect(0, 0, spritesheet.width, spritesheet.height)
            selectedArray.forEach(e => {
                if (e && e.path != '' && !e.png){
                    const img = new Image()
                    img.src = "sprite/Universal-LPC-spritesheet/" + e.path
                    const load = new Promise(resolve => {
                        img.onload = function() {
                            resolve(true)
                        }
                    })
                    e.img = {image: img, load: load}
                }
            })

            // wait for all the promises
            Promise.all(selectedArray.filter(e => e.img).map(e => e.img.load)).then( () => {
                selectedArray.filter(e => e.img).forEach(e => {
                    if (e.oversize){
                        const line = move[e.move].line
                        const sprites = move[e.move].sprites
                        for (let k=0 ; k<4 ; k++){
                            for (let j=0 ; j<sprites ; j++){
                                spritectx.drawImage(e.img.image, j*192, k*192, 192, 192, j*192, line*192 + k*192, 192, 192)
                            }
                        }
                    }
                    else{
                        for (let k=0 ; k<21 ; k++){
                            for (let j=0 ; j<13 ; j++){
                                spritectx.drawImage(e.img.image, j*64, k*64, 64, 64, 64 + 3*j*64, 64 + 3*k*64, 64, 64)
                            }
                        }
                    }
                })

                resolve(spritesheet)
            })

        }
        else{
            const img = new Image()
            img.src = "res/glad.png"
            img.onload = function() {
                for (var k=0 ; k<21 ; k++){
                    for (var j=0 ; j<13 ; j++){
                        spritectx.drawImage(img, j*64, k*64, 64, 64, 64 + 3*j*64, 64 + 3*k*64, 64, 64)
                    }
                }
                resolve(spritesheet)
            }
        }
    })
}

assets.validateSkin = function(selectedArray){
    for (var i in selectedArray){
        if (selectedArray[i].parent == "shape"){
            return true;
        }
    }
    return false;
}

assets.getImage = function(key){
    return images[key]
}

assets.forAllImages = function(callback){
    for (let i in images){
        callback(images[i], i)
    }
}
