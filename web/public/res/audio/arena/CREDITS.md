# Arena sounds (Three.js renderer)

Sounds used by `script/render2/` on top of the shared `res/audio/` set. Cut, converted to MP3 and
trimmed for the arena; the renderer normalises their loudness when it decodes them.

| Files | Source | Licence |
| :--- | :--- | :--- |
| `flesh_*`, `flesh_heavy_*`, `thud_*`, `sand_*`, `clatter_*` | [Impact Sounds](https://kenney.nl/assets/impact-sounds) by Kenney (impactPunch medium/heavy, impactSoft heavy/medium, impactWood light) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `crowd_ambience`, `crowd_chatter`, `cheer_soft_*`, `cheer_strong_*`, `chant`, `chant_2` | "Free Crowd Cheering Sounds" by Gregor Quendel ([www.gregorquendel.com](https://www.gregorquendel.com), via [OpenGameArt](https://opengameart.org/content/free-crowd-cheering-sounds)); excerpts of tracks 10, 07, 05, 06, 03, 04, 01 and 08 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (credit required) |
| `clang_*` | [Medieval sound effects - Weapon impacts](https://opengameart.org/node/146863) by Ben Jaszczak & Brian Nelson (single strikes from "Axe Norse Sword Blade on Blade", "Mace Norse Sword Blade" and "Sabre Norse Sword Blade on Blade") | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `cough_1`-`cough_3` | [80 CC0 creature SFX](https://opengameart.org/content/80-cc0-creature-sfx) by rubberduck (cough_01-03) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `cough_4`, `cough_5` | [sick noises](https://opengameart.org/content/sick-noises) by frosty ham (excerpts of `sickness.wav` at 0.00 s and 4.12 s) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

Fire crackle, poison-gas hiss and wind are synthesised at runtime (`script/render2/soundscape.js`).
