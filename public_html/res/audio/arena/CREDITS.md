# Arena sounds (Three.js renderer)

Sounds used by `script/render2/` on top of the shared `res/audio/` set. Cut, converted to MP3 and
trimmed for the arena; the renderer normalises their loudness when it decodes them.

| Files | Source | Licence |
| :--- | :--- | :--- |
| `flesh_*`, `flesh_heavy_*`, `clang_*`, `thud_*`, `sand_*`, `clatter_*` | [Impact Sounds](https://kenney.nl/assets/impact-sounds) by Kenney (impactPunch medium/heavy, impactMetal heavy, impactSoft heavy/medium, impactWood light) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `creak_*` | [RPG Audio](https://kenney.nl/assets/rpg-audio) by Kenney (creak1-3) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `crowd_ambience`, `crowd_chatter`, `cheer_soft_*`, `cheer_strong_*`, `chant`, `chant_2` | "Free Crowd Cheering Sounds" by Gregor Quendel ([www.gregorquendel.com](https://www.gregorquendel.com), via [OpenGameArt](https://opengameart.org/content/free-crowd-cheering-sounds)); excerpts of tracks 10, 07, 05, 06, 03, 04, 01 and 08 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (credit required) |

Fire crackle, poison-gas hiss and wind are synthesised at runtime (`script/render2/soundscape.js`).
